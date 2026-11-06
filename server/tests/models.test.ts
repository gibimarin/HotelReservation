import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { RoomType } from '../src/models/RoomType';
import { DailyInventory } from '../src/models/DailyInventory';
import { Reservation } from '../src/models/Reservation';
import { UserRole } from '../src/constants/roles';
import {
  ReservationStatus,
  isValidStatusTransition,
} from '../src/constants/reservation';

describe('Module 2: Mongoose Models & Schema Constraints', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('User Model', () => {
    it('should hash the user password on save and never leak password in toJSON', async () => {
      const rawPassword = 'SecretPassword123!';
      const user = await User.create({
        name: 'Test Guest',
        email: 'testguest@example.com',
        password: rawPassword,
        role: UserRole.GUEST,
      });

      // Password in database must not equal plain text
      expect(user.password).toBeDefined();
      expect(user.password).not.toBe(rawPassword);

      // Method comparePassword should verify correctly
      const isMatch = await user.comparePassword(rawPassword);
      const isWrongMatch = await user.comparePassword('WrongPassword!');
      expect(isMatch).toBe(true);
      expect(isWrongMatch).toBe(false);

      // toJSON transform must omit the password field
      const json = user.toJSON();
      expect(json.password).toBeUndefined();
      expect(json.name).toBe('Test Guest');
    });

    it('should reject invalid email formats', async () => {
      await expect(
        User.create({
          name: 'Invalid Email User',
          email: 'not-an-email',
          password: 'Password123!',
          role: UserRole.GUEST,
        })
      ).rejects.toThrow();
    });
  });

  describe('RoomType Model', () => {
    it('should enforce positive price and valid capacity', async () => {
      const room = await RoomType.create({
        name: 'Standard Room',
        description: 'Cozy and quiet standard room.',
        capacity: 2,
        facilities: ['Wi-Fi', 'AC'],
        pricePerNight: 120,
        totalInventory: 5,
        isActive: true,
        imageUrl: 'https://example.com/room.jpg',
      });

      expect(room._id).toBeDefined();
      expect(room.pricePerNight).toBe(120);
      expect(room.capacity).toBe(2);

      // Reject negative price
      await expect(
        RoomType.create({
          name: 'Negative Price Room',
          description: 'Invalid',
          capacity: 2,
          pricePerNight: -50,
          totalInventory: 2,
          imageUrl: 'https://example.com/room.jpg',
        })
      ).rejects.toThrow();
    });
  });

  describe('DailyInventory Model (Concurrency Prerequisite)', () => {
    it('should reject negative availableCount', async () => {
      const dummyRoomId = new mongoose.Types.ObjectId();
      const today = new Date('2026-12-01T00:00:00.000Z');

      await expect(
        DailyInventory.create({
          roomTypeId: dummyRoomId,
          date: today,
          totalInventory: 5,
          availableCount: -1, // Invalid: should trigger min constraint
          reservedCount: 6,
        })
      ).rejects.toThrow();
    });
  });

  describe('Reservation Status Lifecycle Rules', () => {
    it('should allow valid status transitions according to business matrix', () => {
      expect(
        isValidStatusTransition(
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED
        )
      ).toBe(true);

      expect(
        isValidStatusTransition(
          ReservationStatus.CONFIRMED,
          ReservationStatus.CHECKED_IN
        )
      ).toBe(true);

      expect(
        isValidStatusTransition(
          ReservationStatus.CHECKED_IN,
          ReservationStatus.CHECKED_OUT
        )
      ).toBe(true);

      expect(
        isValidStatusTransition(
          ReservationStatus.CONFIRMED,
          ReservationStatus.CANCELLED
        )
      ).toBe(true);
    });

    it('should reject invalid or backward status transitions', () => {
      // Cannot check out before checking in
      expect(
        isValidStatusTransition(
          ReservationStatus.CONFIRMED,
          ReservationStatus.CHECKED_OUT
        )
      ).toBe(false);

      // Cannot reopen a checked-out reservation
      expect(
        isValidStatusTransition(
          ReservationStatus.CHECKED_OUT,
          ReservationStatus.CONFIRMED
        )
      ).toBe(false);

      // Cannot reactivate a cancelled reservation
      expect(
        isValidStatusTransition(
          ReservationStatus.CANCELLED,
          ReservationStatus.CHECKED_IN
        )
      ).toBe(false);
    });
  });
});

