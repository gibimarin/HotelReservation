import mongoose from 'mongoose';
import { Reservation, IReservationDocument } from '../models/Reservation';
import { RoomType } from '../models/RoomType';
import { DailyInventory } from '../models/DailyInventory';
import { ReservationStatus } from '../constants/reservation';
import { UserRole } from '../constants/roles';
import { AppError } from '../utils/appError';
import {
  calculateNights,
  getNightlyDateRange,
  normalizeDate,
  isDateInPast,
} from '../utils/dateUtils';
import { generateReservationReference } from '../utils/referenceGenerator';
import {
  CreateReservationInput,
  CancelReservationInput,
  MyReservationsQueryInput,
} from '../validators/reservation.validator';

export interface PaginatedMyReservationsResult {
  reservations: IReservationDocument[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class ReservationService {
  /**
   * Concurrency-safe room booking using MongoDB Multi-Document ACID Transactions.
   * Decrements inventory conditionally per night and rolls back completely on contention.
   */
  public static async createReservation(
    guestId: string,
    input: CreateReservationInput
  ): Promise<IReservationDocument> {
    const checkIn = normalizeDate(input.checkIn);
    const checkOut = normalizeDate(input.checkOut);
    const nights = calculateNights(checkIn, checkOut);
    const nightlyDates = getNightlyDateRange(checkIn, checkOut);
    const roomCount = input.roomCount || 1;

    // 1. Verify room type exists and is active
    const room = await RoomType.findById(input.roomTypeId);
    if (!room || !room.isActive) {
      throw new AppError('The selected room type is unavailable.', 404, 'ROOM_NOT_FOUND');
    }

    // 2. Validate guest capacity strictly on server
    const maxAllowedGuests = room.capacity * roomCount;
    if (input.guestCount > maxAllowedGuests) {
      throw new AppError(
        `Guest count (${input.guestCount}) exceeds maximum capacity of ${maxAllowedGuests} for ${roomCount} room(s).`,
        400,
        'CAPACITY_EXCEEDED'
      );
    }

    // 3. Authoritative server-side pricing calculation (Zero-trust client policy)
    const priceSnapshot = room.pricePerNight;
    const totalAmount = nights * priceSnapshot * roomCount;
    const reference = generateReservationReference();

    // 4. Ensure a DailyInventory row exists for each night before opening the
    // transaction. Upserts are safe under concurrency: a competing request may
    // insert the row first, in which case the duplicate-key error is harmless
    // because the row now exists with the correct initial values.
    await Promise.all(
      nightlyDates.map(async (targetDate) => {
        try {
          await DailyInventory.updateOne(
            { roomTypeId: room._id, date: targetDate },
            {
              $setOnInsert: {
                roomTypeId: room._id,
                date: targetDate,
                totalInventory: room.totalInventory,
                availableCount: room.totalInventory,
                reservedCount: 0,
              },
            },
            { upsert: true }
          );
        } catch (error) {
          const mongoError = error as { code?: number };
          if (mongoError.code !== 11000) {
            throw error;
          }
        }
      })
    );

    // 5. Start MongoDB Transaction Session for atomic inventory decrement
    const session = await mongoose.startSession();
    let createdReservation: IReservationDocument;

    try {
      await session.withTransaction(async () => {
        // Attempt atomic conditional decrement for every night of the stay
        for (const targetDate of nightlyDates) {
          const updateResult = await DailyInventory.updateOne(
            {
              roomTypeId: room._id,
              date: targetDate,
              availableCount: { $gte: roomCount },
            },
            {
              $inc: {
                availableCount: -roomCount,
                reservedCount: roomCount,
              },
            },
            { session }
          );

          if (updateResult.matchedCount === 0) {
            // A zero matched count means the atomic guard failed: there is not
            // enough available inventory on this night. Aborting the
            // transaction rolls back every earlier night's decrement.
            throw new AppError(
              'The requested room is sold out for one or more selected dates.',
              409,
              'INSUFFICIENT_INVENTORY'
            );
          }
        }

        // Create the reservation record inside the transaction
        const [reservation] = await Reservation.create(
          [
            {
              reference,
              guest: guestId,
              roomType: room._id,
              checkIn,
              checkOut,
              guestCount: input.guestCount,
              roomCount,
              priceSnapshot,
              totalAmount,
              status: ReservationStatus.CONFIRMED,
              specialRequests: input.specialRequests,
            },
          ],
          { session }
        );

        createdReservation = reservation;
      });
    } finally {
      await session.endSession();
    }

    // Return populated reservation document
    const populated = await Reservation.findById(createdReservation!._id)
      .populate('roomType', 'name imageUrl capacity pricePerNight facilities')
      .populate('guest', 'name email');

    return populated!;
  }

  /**
   * Retrieve the authenticated guest's reservations with server-side
   * pagination, filtering and a stable newest-first sort.
   */
  public static async getMyReservations(
    guestId: string,
    query: MyReservationsQueryInput
  ): Promise<PaginatedMyReservationsResult> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { guest: guestId };
    if (query.status) {
      filter.status = query.status;
    }

    const [totalCount, reservations] = await Promise.all([
      Reservation.countDocuments(filter),
      Reservation.find(filter)
        .populate('roomType', 'name imageUrl capacity pricePerNight')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      reservations,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Retrieve a single reservation by ID with strict ownership verification.
   */
  public static async getReservationById(
    reservationId: string,
    currentUser: { id: string; role: UserRole }
  ): Promise<IReservationDocument> {
    const reservation = await Reservation.findById(reservationId)
      .populate('roomType', 'name imageUrl capacity pricePerNight facilities')
      .populate('guest', 'name email');

    if (!reservation) {
      throw new AppError('Reservation not found.', 404, 'RESERVATION_NOT_FOUND');
    }

    // Ownership check: Guests can only access their own reservations
    const guestId = (reservation.guest as any)._id?.toString() || reservation.guest.toString();
    if (currentUser.role === UserRole.GUEST && guestId !== currentUser.id) {
      throw new AppError(
        'Forbidden: You are not authorized to view this reservation.',
        403,
        'FORBIDDEN'
      );
    }

    return reservation;
  }

  /**
   * Cancel an eligible reservation and atomically restore DailyInventory.
   */
  public static async cancelReservation(
    reservationId: string,
    currentUser: { id: string; role: UserRole },
    input?: CancelReservationInput
  ): Promise<IReservationDocument> {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new AppError('Reservation not found.', 404, 'RESERVATION_NOT_FOUND');
    }

    // 1. Ownership check
    const guestId = reservation.guest.toString();
    if (currentUser.role === UserRole.GUEST && guestId !== currentUser.id) {
      throw new AppError(
        'Forbidden: You are not authorized to cancel this reservation.',
        403,
        'FORBIDDEN'
      );
    }

    // 2. Lifecycle state check: only PENDING or CONFIRMED reservations can be cancelled
    if (
      reservation.status !== ReservationStatus.CONFIRMED &&
      reservation.status !== ReservationStatus.PENDING
    ) {
      throw new AppError(
        `Cannot cancel a reservation with status '${reservation.status}'. Only pending or confirmed reservations can be cancelled.`,
        400,
        'INVALID_CANCELLATION_STATE'
      );
    }

    // 3. Reject cancellation if check-in date has already passed
    if (isDateInPast(reservation.checkIn)) {
      throw new AppError(
        'Reservations cannot be cancelled after the check-in date has passed.',
        400,
        'PAST_CHECKIN_CANCELLATION'
      );
    }

    const nightlyDates = getNightlyDateRange(reservation.checkIn, reservation.checkOut);

    // 4. Atomic cancellation inside a transaction. The status transition is
    // guarded by a conditional update so two concurrent cancellation requests
    // cannot both win and restore the same inventory twice.
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const transition = await Reservation.updateOne(
          {
            _id: reservation._id,
            status: {
              $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
            },
          },
          {
            $set: {
              status: ReservationStatus.CANCELLED,
              cancelledAt: new Date(),
              cancellationReason:
                input?.cancellationReason || 'Cancelled by guest request',
            },
          },
          { session }
        );

        if (transition.matchedCount === 0) {
          throw new AppError(
            'This reservation has already been cancelled or can no longer be cancelled.',
            400,
            'INVALID_CANCELLATION_STATE'
          );
        }

        // Replenish availableCount across all nights of the cancelled stay.
        // The reservedCount guard prevents inventory from going negative.
        for (const targetDate of nightlyDates) {
          await DailyInventory.updateOne(
            {
              roomTypeId: reservation.roomType,
              date: targetDate,
              reservedCount: { $gte: reservation.roomCount },
            },
            {
              $inc: {
                availableCount: reservation.roomCount,
                reservedCount: -reservation.roomCount,
              },
            },
            { session }
          );
        }
      });
    } finally {
      await session.endSession();
    }

    const updated = await Reservation.findById(reservationId)
      .populate('roomType', 'name imageUrl capacity pricePerNight')
      .populate('guest', 'name email');

    return updated!;
  }
}

