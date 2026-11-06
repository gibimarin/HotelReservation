import mongoose from 'mongoose';
import { RoomType, IRoomTypeDocument } from '../models/RoomType';
import { DailyInventory } from '../models/DailyInventory';
import { AppError } from '../utils/appError';
import {
  calculateNights,
  getNightlyDateRange,
  getTodayUTC,
  normalizeDate,
} from '../utils/dateUtils';
import {
  CreateRoomInput,
  UpdateRoomInput,
  AvailabilityQueryInput,
} from '../validators/room.validator';

export interface AvailableRoomOption {
  roomType: IRoomTypeDocument;
  nights: number;
  requestedRooms: number;
  availableRooms: number;
  pricePerNight: number;
  totalPrice: number;
}

export interface AvailabilityResult {
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  rooms: number;
  availableRooms: AvailableRoomOption[];
}

export class RoomService {
  /**
   * Retrieve all room types. Optional filter by isActive status.
   */
  public static async getAllRooms(onlyActive = true): Promise<IRoomTypeDocument[]> {
    const filter = onlyActive ? { isActive: true } : {};
    return RoomType.find(filter).sort({ pricePerNight: 1 });
  }

  /**
   * Retrieve a single room type by ID.
   */
  public static async getRoomById(id: string): Promise<IRoomTypeDocument> {
    const room = await RoomType.findById(id);
    if (!room) {
      throw new AppError('Room type not found.', 404, 'ROOM_NOT_FOUND');
    }
    return room;
  }

  /**
   * Search for room availability across a continuous date range.
   * Ensures room is available on EVERY single night of the requested stay.
   */
  public static async searchAvailability(
    query: AvailabilityQueryInput
  ): Promise<AvailabilityResult> {
    const checkIn = normalizeDate(query.checkIn);
    const checkOut = normalizeDate(query.checkOut);
    const nights = calculateNights(checkIn, checkOut);
    const nightlyDates = getNightlyDateRange(checkIn, checkOut);
    const requestedRooms = query.rooms;
    const guestCount = query.guests;

    // 1. Fetch active rooms that can seat the party across the requested
    // number of rooms. A room type is eligible when
    // capacity * requestedRooms >= guestCount.
    const minimumCapacityPerRoom = Math.ceil(guestCount / requestedRooms);
    const eligibleRooms = await RoomType.find({
      isActive: true,
      capacity: { $gte: minimumCapacityPerRoom },
    }).sort({ pricePerNight: 1 });

    const availableOptions: AvailableRoomOption[] = [];

    // 2. Evaluate inventory for each eligible room type
    for (const room of eligibleRooms) {
      // Find existing daily inventory records for all dates in the requested stay
      const inventoryRecords = await DailyInventory.find({
        roomTypeId: room._id,
        date: { $in: nightlyDates },
      });

      // Create a date-indexed lookup map for O(1) checking
      const inventoryMap = new Map<number, number>();
      inventoryRecords.forEach((record) => {
        inventoryMap.set(record.date.getTime(), record.availableCount);
      });

      let minAvailableAcrossStay = room.totalInventory;
      let hasSufficientInventory = true;

      // Verify each night individually
      for (const targetDate of nightlyDates) {
        const dateTime = targetDate.getTime();
        // If an inventory record exists, use its available count;
        // if not yet pre-generated, default to the room's totalInventory
        const availableOnNight = inventoryMap.has(dateTime)
          ? inventoryMap.get(dateTime)!
          : room.totalInventory;

        if (availableOnNight < requestedRooms) {
          hasSufficientInventory = false;
          break; // Sold out on at least one night of the stay
        }

        if (availableOnNight < minAvailableAcrossStay) {
          minAvailableAcrossStay = availableOnNight;
        }
      }

      if (hasSufficientInventory) {
        const totalPrice = nights * room.pricePerNight * requestedRooms;
        availableOptions.push({
          roomType: room,
          nights,
          requestedRooms,
          availableRooms: minAvailableAcrossStay,
          pricePerNight: room.pricePerNight,
          totalPrice,
        });
      }
    }

    return {
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      nights,
      guests: guestCount,
      rooms: requestedRooms,
      availableRooms: availableOptions,
    };
  }

  /**
   * Create a new room type and pre-generate 60 days of DailyInventory.
   */
  public static async createRoom(
    data: CreateRoomInput
  ): Promise<IRoomTypeDocument> {
    const existing = await RoomType.findOne({ name: data.name.trim() });
    if (existing) {
      throw new AppError(
        'A room type with this name already exists.',
        409,
        'DUPLICATE_ROOM_NAME'
      );
    }

    const room = await RoomType.create(data);

    // Initialize 60 days of inventory for this new room
    const inventoryDocs = [];
    const today = normalizeDate(new Date());

    for (let i = 0; i < 60; i++) {
      const targetDate = new Date(today);
      targetDate.setUTCDate(today.getUTCDate() + i);

      inventoryDocs.push({
        roomTypeId: room._id,
        date: targetDate,
        totalInventory: room.totalInventory,
        availableCount: room.totalInventory,
        reservedCount: 0,
      });
    }

    await DailyInventory.insertMany(inventoryDocs);

    return room;
  }

  /**
   * Update an existing room type details.
   */
  public static async updateRoom(
    id: string,
    data: UpdateRoomInput
  ): Promise<IRoomTypeDocument> {
    const existingRoom = await RoomType.findById(id);
    if (!existingRoom) {
      throw new AppError('Room type not found.', 404, 'ROOM_NOT_FOUND');
    }

    if (data.name) {
      const duplicate = await RoomType.findOne({
        name: data.name.trim(),
        _id: { $ne: id },
      });
      if (duplicate) {
        throw new AppError(
          'Another room type with this name already exists.',
          409,
          'DUPLICATE_ROOM_NAME'
        );
      }
    }

    const nextTotalInventory = data.totalInventory;
    const inventoryDelta =
      nextTotalInventory === undefined
        ? 0
        : nextTotalInventory - existingRoom.totalInventory;

    if (inventoryDelta === 0) {
      const updated = await RoomType.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });

      return updated!;
    }

    const today = getTodayUTC();
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Never allow the total to shrink below rooms already reserved on a
        // future date. Otherwise available inventory would become negative.
        if (inventoryDelta < 0) {
          const blockingInventory = await DailyInventory.findOne({
            roomTypeId: id,
            date: { $gte: today },
            reservedCount: { $gt: nextTotalInventory },
          })
            .select('_id')
            .session(session);

          if (blockingInventory) {
            throw new AppError(
              'Cannot reduce total inventory below the number of rooms already reserved for one or more future dates.',
              409,
              'INVENTORY_BELOW_RESERVED'
            );
          }
        }

        await RoomType.findByIdAndUpdate(id, data, {
          new: true,
          runValidators: true,
          session,
        });

        // Keep future DailyInventory totals and availability in sync with the
        // operator's inventory change.
        await DailyInventory.updateMany(
          { roomTypeId: id, date: { $gte: today } },
          {
            $inc: {
              totalInventory: inventoryDelta,
              availableCount: inventoryDelta,
            },
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    const updated = await RoomType.findById(id);
    return updated!;
  }

  /**
   * Toggle room active status (activation / deactivation).
   */
  public static async toggleRoomStatus(
    id: string,
    isActive: boolean
  ): Promise<IRoomTypeDocument> {
    const updated = await RoomType.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!updated) {
      throw new AppError('Room type not found.', 404, 'ROOM_NOT_FOUND');
    }

    return updated;
  }
}

