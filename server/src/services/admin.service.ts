import { Reservation, IReservationDocument } from '../models/Reservation';
import { RoomType } from '../models/RoomType';
import { User } from '../models/User';
import {
  ReservationStatus,
  isValidStatusTransition,
} from '../constants/reservation';
import { UserRole } from '../constants/roles';
import { AppError } from '../utils/appError';
import { normalizeDate, getTodayUTC } from '../utils/dateUtils';
import { AdminReservationsQueryInput } from '../validators/admin.validator';
import { ReservationService } from './reservation.service';

export interface DashboardMetrics {
  todaysArrivals: number;
  todaysDepartures: number;
  occupiedRooms: number;
  pendingReservations: number;
  confirmedReservations: number;
  totalActiveRooms: number;
}

export interface PaginatedReservationsResult {
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

export class AdminService {
  /**
   * Aggregate operational hotel metrics for front desk dashboard.
   */
  public static async getDashboardMetrics(): Promise<DashboardMetrics> {
    const today = getTodayUTC();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    const [
      todaysArrivals,
      todaysDepartures,
      occupiedRooms,
      pendingReservations,
      confirmedReservations,
      totalActiveRooms,
    ] = await Promise.all([
      // 1. Today's expected arrivals
      Reservation.countDocuments({
        status: ReservationStatus.CONFIRMED,
        checkIn: { $gte: today, $lt: tomorrow },
      }),
      // 2. Today's expected departures
      Reservation.countDocuments({
        status: ReservationStatus.CHECKED_IN,
        checkOut: { $gte: today, $lt: tomorrow },
      }),
      // 3. Currently occupied rooms
      Reservation.countDocuments({
        status: ReservationStatus.CHECKED_IN,
      }),
      // 4. Pending reservations awaiting confirmation
      Reservation.countDocuments({
        status: ReservationStatus.PENDING,
      }),
      // 5. Total confirmed reservations
      Reservation.countDocuments({
        status: ReservationStatus.CONFIRMED,
      }),
      // 6. Total active room types in catalog
      RoomType.countDocuments({
        isActive: true,
      }),
    ]);

    return {
      todaysArrivals,
      todaysDepartures,
      occupiedRooms,
      pendingReservations,
      confirmedReservations,
      totalActiveRooms,
    };
  }

  /**
   * Server-side paginated, searchable, and filterable reservation query.
   * Performs all filtering, regex search, and pagination directly inside MongoDB.
   */
  public static async getPaginatedReservations(
    query: AdminReservationsQueryInput
  ): Promise<PaginatedReservationsResult> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    // 1. Filter by status if provided
    if (query.status) {
      filter.status = query.status;
    }

    // 2. Filter by check-in date range
    if (query.startDate || query.endDate) {
      filter.checkIn = {};
      if (query.startDate) {
        filter.checkIn.$gte = normalizeDate(query.startDate);
      }
      if (query.endDate) {
        const end = normalizeDate(query.endDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.checkIn.$lte = end;
      }
    }

    // 3. Search by reservation reference or guest name/email
    if (query.search && query.search.trim().length > 0) {
      const escapedSearch = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');

      // Find any user matching search text to filter by guest ObjectId
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { reference: searchRegex },
        { guest: { $in: userIds } },
      ];
    }

    // 4. Determine sorting
    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
    const sortObj: Record<string, 1 | -1> = {
      [sortField]: sortDirection,
      _id: sortDirection,
    };

    // 5. Execute MongoDB queries (Total count + paginated subset)
    const [totalCount, reservations] = await Promise.all([
      Reservation.countDocuments(filter),
      Reservation.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('guest', 'name email role')
        .populate('roomType', 'name imageUrl capacity pricePerNight'),
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
   * Front Desk Check-in: transition Confirmed -> Checked-in.
   */
  public static async checkInGuest(reservationId: string): Promise<IReservationDocument> {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new AppError('Reservation not found.', 404, 'RESERVATION_NOT_FOUND');
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new AppError(
        `Cannot check in a reservation with status '${reservation.status}'. Only confirmed reservations can be checked in.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Atomic guard prevents two concurrent check-in requests from both
    // succeeding against the same confirmed reservation.
    const updated = await Reservation.findOneAndUpdate(
      { _id: reservationId, status: ReservationStatus.CONFIRMED },
      {
        $set: {
          status: ReservationStatus.CHECKED_IN,
          checkedInAt: new Date(),
        },
      },
      { new: true }
    )
      .populate('guest', 'name email')
      .populate('roomType', 'name imageUrl pricePerNight');

    if (!updated) {
      throw new AppError(
        'The reservation was updated by another request. Please refresh and try again.',
        409,
        'CONCURRENT_UPDATE'
      );
    }

    return updated;
  }

  /**
   * Front Desk Check-out: transition Checked-in -> Checked-out.
   */
  public static async checkOutGuest(reservationId: string): Promise<IReservationDocument> {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new AppError('Reservation not found.', 404, 'RESERVATION_NOT_FOUND');
    }

    if (reservation.status !== ReservationStatus.CHECKED_IN) {
      throw new AppError(
        `Cannot check out a reservation with status '${reservation.status}'. Only checked-in guests can be checked out.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const updated = await Reservation.findOneAndUpdate(
      { _id: reservationId, status: ReservationStatus.CHECKED_IN },
      {
        $set: {
          status: ReservationStatus.CHECKED_OUT,
          checkedOutAt: new Date(),
        },
      },
      { new: true }
    )
      .populate('guest', 'name email')
      .populate('roomType', 'name imageUrl pricePerNight');

    if (!updated) {
      throw new AppError(
        'The reservation was updated by another request. Please refresh and try again.',
        409,
        'CONCURRENT_UPDATE'
      );
    }

    return updated;
  }

  /**
   * General reservation status update governed by the state transition matrix.
   */
  public static async updateStatus(
    reservationId: string,
    nextStatus: ReservationStatus
  ): Promise<IReservationDocument> {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new AppError('Reservation not found.', 404, 'RESERVATION_NOT_FOUND');
    }

    // Verify state transition validity
    if (!isValidStatusTransition(reservation.status, nextStatus)) {
      throw new AppError(
        `Invalid status transition from '${reservation.status}' to '${nextStatus}'.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Route to specialized logic for check-in and check-out
    if (nextStatus === ReservationStatus.CHECKED_IN) {
      return this.checkInGuest(reservationId);
    }

    if (nextStatus === ReservationStatus.CHECKED_OUT) {
      return this.checkOutGuest(reservationId);
    }

    // If transitioning to cancelled, reuse the guest cancellation path so the
    // conditional status guard and inventory replenishment stay consistent.
    if (nextStatus === ReservationStatus.CANCELLED) {
      return ReservationService.cancelReservation(
        reservationId,
        { id: reservation.guest.toString(), role: UserRole.STAFF },
        { cancellationReason: 'Cancelled by staff administration' }
      );
    }

    // Standard status update (e.g., PENDING -> CONFIRMED)
    reservation.status = nextStatus;
    await reservation.save();

    const updated = await Reservation.findById(reservationId)
      .populate('guest', 'name email')
      .populate('roomType', 'name imageUrl pricePerNight');

    return updated!;
  }
}

