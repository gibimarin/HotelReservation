import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { RoomType } from '../src/models/RoomType';
import { DailyInventory } from '../src/models/DailyInventory';
import { Reservation } from '../src/models/Reservation';
import { UserRole } from '../src/constants/roles';
import { ReservationStatus } from '../src/constants/reservation';
import { AuthService } from '../src/services/auth.service';
import { normalizeDate } from '../src/utils/dateUtils';

describe('Module 5: Reservation Engine & Concurrency Protection', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  let guest1Token: string;
  let guest1Id: string;

  let guest2Token: string;
  let guest2Id: string;

  let staffToken: string;

  let standardRoom: any;
  let singleInventoryRoom: any;

  beforeAll(async () => {
    // Multi-document ACID transactions require a replica set
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RoomType.deleteMany({});
    await DailyInventory.deleteMany({});
    await Reservation.deleteMany({});

    // 1. Create Guest 1
    const guest1 = await User.create({
      name: 'Guest One',
      email: 'guest1@test.com',
      password: 'Password123!',
      role: UserRole.GUEST,
    });
    guest1Id = guest1._id.toString();
    guest1Token = AuthService.signToken(guest1);

    // 2. Create Guest 2
    const guest2 = await User.create({
      name: 'Guest Two',
      email: 'guest2@test.com',
      password: 'Password123!',
      role: UserRole.GUEST,
    });
    guest2Id = guest2._id.toString();
    guest2Token = AuthService.signToken(guest2);

    // 3. Create Staff User
    const staff = await User.create({
      name: 'Staff Member',
      email: 'staff@test.com',
      password: 'StaffPassword123!',
      role: UserRole.STAFF,
    });
    staffToken = AuthService.signToken(staff);

    // 4. Create Standard Room with totalInventory = 5
    standardRoom = await RoomType.create({
      name: 'Standard Queen Room',
      description: 'Comfortable standard queen room.',
      capacity: 2,
      facilities: ['Wi-Fi', 'TV'],
      pricePerNight: 100,
      totalInventory: 5,
      isActive: true,
      imageUrl: 'https://example.com/queen.jpg',
    });

    // 5. Create Contested Single-Inventory Room (only 1 available in hotel!)
    singleInventoryRoom = await RoomType.create({
      name: 'Exclusive VIP Suite',
      description: 'Only 1 unit exists in the entire property.',
      capacity: 2,
      facilities: ['Private Jacuzzi'],
      pricePerNight: 400,
      totalInventory: 1, // EXACTLY 1 ROOM!
      isActive: true,
      imageUrl: 'https://example.com/vip.jpg',
    });
  });

  describe('Reservation Booking & Price Protection (POST /api/reservations)', () => {
    it('should successfully book a room, compute prices server-side, and decrement DailyInventory', async () => {
      const today = new Date();
      const inDate = new Date(today.getTime() + 86400000 * 5).toISOString().split('T')[0];
      const outDate = new Date(today.getTime() + 86400000 * 8).toISOString().split('T')[0]; // 3 nights

      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({
          roomTypeId: standardRoom._id.toString(),
          checkIn: inDate,
          checkOut: outDate,
          guestCount: 2,
          roomCount: 1,
          specialRequests: 'High floor preferred',
          // Client attempting to tamper with price:
          priceSnapshot: 10,
          totalAmount: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const reservation = res.body.data;
      expect(reservation.reference).toMatch(/^RES-\d{8}-[A-F0-9]{4}$/);
      expect(reservation.status).toBe(ReservationStatus.CONFIRMED);

      // Server-side financial protection: ignores client-sent price
      expect(reservation.priceSnapshot).toBe(100);
      expect(reservation.totalAmount).toBe(300); // 3 nights * $100

      // DailyInventory must be decremented from 5 to 4
      const checkInUTC = normalizeDate(inDate);
      const inventory = await DailyInventory.findOne({
        roomTypeId: standardRoom._id,
        date: checkInUTC,
      });

      expect(inventory).toBeDefined();
      expect(inventory?.availableCount).toBe(4);
      expect(inventory?.reservedCount).toBe(1);
    });

    it('should reject booking if guestCount exceeds room capacity', async () => {
      const today = new Date();
      const inDate = new Date(today.getTime() + 86400000 * 5).toISOString().split('T')[0];
      const outDate = new Date(today.getTime() + 86400000 * 7).toISOString().split('T')[0];

      // standardRoom capacity is 2; sending 5 guests
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({
          roomTypeId: standardRoom._id.toString(),
          checkIn: inDate,
          checkOut: outDate,
          guestCount: 5,
          roomCount: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CAPACITY_EXCEEDED');
    });

    it('should reject booking with past check-in dates', async () => {
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({
          roomTypeId: standardRoom._id.toString(),
          checkIn: '2020-01-01',
          checkOut: '2020-01-05',
          guestCount: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PAST_CHECKIN_DATE');
    });
  });

  describe('Reservation Ownership & Authorization Boundaries', () => {
    let guest1ReservationId: string;

    beforeEach(async () => {
      const today = new Date();
      const inDate = new Date(today.getTime() + 86400000 * 10).toISOString().split('T')[0];
      const outDate = new Date(today.getTime() + 86400000 * 12).toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({
          roomTypeId: standardRoom._id.toString(),
          checkIn: inDate,
          checkOut: outDate,
          guestCount: 2,
        });

      guest1ReservationId = res.body.data._id;
    });

    it('GET /api/reservations/my should list only personal reservations', async () => {
      const res = await request(app)
        .get('/api/reservations/my')
        .set('Authorization', `Bearer ${guest1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0]._id).toBe(guest1ReservationId);

      // Guest 2 should see 0 personal reservations
      const guest2Res = await request(app)
        .get('/api/reservations/my')
        .set('Authorization', `Bearer ${guest2Token}`);

      expect(guest2Res.status).toBe(200);
      expect(guest2Res.body.count).toBe(0);
    });

    it('GET /api/reservations/my should support server-side pagination', async () => {
      const today = new Date();
      const futureDay = (offset: number) =>
        new Date(today.getTime() + 86400000 * offset);

      await Reservation.insertMany([
        {
          reference: 'RES-PAGE-MY-001',
          guest: guest1Id,
          roomType: standardRoom._id,
          checkIn: futureDay(40),
          checkOut: futureDay(42),
          guestCount: 1,
          roomCount: 1,
          priceSnapshot: 100,
          totalAmount: 200,
          status: ReservationStatus.CONFIRMED,
        },
        {
          reference: 'RES-PAGE-MY-002',
          guest: guest1Id,
          roomType: standardRoom._id,
          checkIn: futureDay(45),
          checkOut: futureDay(47),
          guestCount: 1,
          roomCount: 1,
          priceSnapshot: 100,
          totalAmount: 200,
          status: ReservationStatus.PENDING,
        },
      ]);

      const pageOne = await request(app)
        .get('/api/reservations/my')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${guest1Token}`);

      expect(pageOne.status).toBe(200);
      expect(pageOne.body.data.length).toBe(2);
      expect(pageOne.body.pagination.totalCount).toBe(3);
      expect(pageOne.body.pagination.totalPages).toBe(2);
      expect(pageOne.body.pagination.hasNextPage).toBe(true);
      expect(pageOne.body.pagination.hasPrevPage).toBe(false);

      const pageTwo = await request(app)
        .get('/api/reservations/my')
        .query({ page: 2, limit: 2 })
        .set('Authorization', `Bearer ${guest1Token}`);

      expect(pageTwo.status).toBe(200);
      expect(pageTwo.body.data.length).toBe(1);
      expect(pageTwo.body.pagination.currentPage).toBe(2);
      expect(pageTwo.body.pagination.hasNextPage).toBe(false);
      expect(pageTwo.body.pagination.hasPrevPage).toBe(true);
    });

    it('GET /api/reservations/:id should allow owner, but reject other guests with 403 Forbidden', async () => {
      // Owner (Guest 1) accesses: allowed
      const ownerRes = await request(app)
        .get(`/api/reservations/${guest1ReservationId}`)
        .set('Authorization', `Bearer ${guest1Token}`);

      expect(ownerRes.status).toBe(200);

      // Other guest (Guest 2) accesses: 403 Forbidden
      const unauthorizedRes = await request(app)
        .get(`/api/reservations/${guest1ReservationId}`)
        .set('Authorization', `Bearer ${guest2Token}`);

      expect(unauthorizedRes.status).toBe(403);
      expect(unauthorizedRes.body.error.code).toBe('FORBIDDEN');

      // Staff accesses: allowed
      const staffRes = await request(app)
        .get(`/api/reservations/${guest1ReservationId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffRes.status).toBe(200);
    });
  });

  describe('Cancellation Lifecycle & Inventory Restoration', () => {
    it('should cancel reservation and replenish available inventory count', async () => {
      const today = new Date();
      const inDate = new Date(today.getTime() + 86400000 * 15).toISOString().split('T')[0];
      const outDate = new Date(today.getTime() + 86400000 * 18).toISOString().split('T')[0]; // 3 nights

      // 1. Create booking
      const bookRes = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({
          roomTypeId: standardRoom._id.toString(),
          checkIn: inDate,
          checkOut: outDate,
          guestCount: 2,
        });

      const resId = bookRes.body.data._id;
      const checkInUTC = normalizeDate(inDate);

      // Confirm inventory decremented to 4
      const invBeforeCancel = await DailyInventory.findOne({
        roomTypeId: standardRoom._id,
        date: checkInUTC,
      });
      expect(invBeforeCancel?.availableCount).toBe(4);

      // 2. Cancel booking
      const cancelRes = await request(app)
        .patch(`/api/reservations/${resId}/cancel`)
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({ cancellationReason: 'Change of travel plans' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe(ReservationStatus.CANCELLED);
      expect(cancelRes.body.data.cancellationReason).toBe('Change of travel plans');

      // 3. Confirm inventory was replenished back to 5
      const invAfterCancel = await DailyInventory.findOne({
        roomTypeId: standardRoom._id,
        date: checkInUTC,
      });
      expect(invAfterCancel?.availableCount).toBe(5);
      expect(invAfterCancel?.reservedCount).toBe(0);
    });

    it('should restore inventory exactly once under concurrent cancellation requests', async () => {
      const today = new Date();
      const inDate = new Date(today.getTime() + 86400000 * 22)
        .toISOString()
        .split('T')[0];
      const outDate = new Date(today.getTime() + 86400000 * 24)
        .toISOString()
        .split('T')[0];

      const bookRes = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({
          roomTypeId: standardRoom._id.toString(),
          checkIn: inDate,
          checkOut: outDate,
          guestCount: 2,
        });

      const resId = bookRes.body.data._id;
      const checkInUTC = normalizeDate(inDate);

      const [firstCancel, secondCancel] = await Promise.all([
        request(app)
          .patch(`/api/reservations/${resId}/cancel`)
          .set('Authorization', `Bearer ${guest1Token}`),
        request(app)
          .patch(`/api/reservations/${resId}/cancel`)
          .set('Authorization', `Bearer ${guest1Token}`),
      ]);

      const statuses = [firstCancel.status, secondCancel.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      const rejected =
        firstCancel.status === 400 ? firstCancel : secondCancel;
      expect(rejected.body.error.code).toBe('INVALID_CANCELLATION_STATE');

      const inventory = await DailyInventory.findOne({
        roomTypeId: standardRoom._id,
        date: checkInUTC,
      });
      expect(inventory?.availableCount).toBe(5);
      expect(inventory?.reservedCount).toBe(0);

      const cancelledReservation = await Reservation.findById(resId);
      expect(cancelledReservation?.status).toBe(ReservationStatus.CANCELLED);
    });

    it('should reject cancellation of an already cancelled reservation', async () => {
      const today = new Date();
      const inDate = new Date(today.getTime() + 86400000 * 20).toISOString().split('T')[0];
      const outDate = new Date(today.getTime() + 86400000 * 22).toISOString().split('T')[0];

      const bookRes = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({
          roomTypeId: standardRoom._id.toString(),
          checkIn: inDate,
          checkOut: outDate,
          guestCount: 2,
        });

      const resId = bookRes.body.data._id;

      // First cancellation
      await request(app)
        .patch(`/api/reservations/${resId}/cancel`)
        .set('Authorization', `Bearer ${guest1Token}`);

      // Second cancellation attempt
      const secondCancelRes = await request(app)
        .patch(`/api/reservations/${resId}/cancel`)
        .set('Authorization', `Bearer ${guest1Token}`);

      expect(secondCancelRes.status).toBe(400);
      expect(secondCancelRes.body.error.code).toBe('INVALID_CANCELLATION_STATE');
    });
  });

  describe('CRITICAL REQUIREMENT: Concurrent Booking Protection', () => {
    it('should safely handle competing simultaneous booking requests for the last remaining room: exactly one succeeds (201) and one fails (409 Conflict)', async () => {
      const today = new Date();
      const inDate = new Date(today.getTime() + 86400000 * 30).toISOString().split('T')[0];
      const outDate = new Date(today.getTime() + 86400000 * 33).toISOString().split('T')[0]; // 3 nights

      // Pre-seed DailyInventory with EXACTLY 1 room for singleInventoryRoom
      const checkInUTC = normalizeDate(inDate);
      const nightlyDates = [
        checkInUTC,
        new Date(checkInUTC.getTime() + 86400000),
        new Date(checkInUTC.getTime() + 86400000 * 2),
      ];

      for (const d of nightlyDates) {
        await DailyInventory.create({
          roomTypeId: singleInventoryRoom._id,
          date: d,
          totalInventory: 1,
          availableCount: 1, // Only 1 room left for these dates!
          reservedCount: 0,
        });
      }

      // Fire 2 SIMULTANEOUS competing booking requests for the exact same room and dates
      const request1 = request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({
          roomTypeId: singleInventoryRoom._id.toString(),
          checkIn: inDate,
          checkOut: outDate,
          guestCount: 2,
          roomCount: 1,
        });

      const request2 = request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${guest2Token}`)
        .send({
          roomTypeId: singleInventoryRoom._id.toString(),
          checkIn: inDate,
          checkOut: outDate,
          guestCount: 2,
          roomCount: 1,
        });

      // Execute both in parallel
      const [resA, resB] = await Promise.all([request1, request2]);

      const statuses = [resA.status, resB.status];

      // EXACTLY ONE MUST SUCCEED (201) AND EXACTLY ONE MUST RECEIVE 409 CONFLICT!
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      // Verify the 409 response payload has the correct error code
      const conflictRes = resA.status === 409 ? resA : resB;
      expect(conflictRes.body.success).toBe(false);
      expect(conflictRes.body.error.code).toBe('INSUFFICIENT_INVENTORY');

      // Verify database state: EXACTLY ONE reservation was recorded in the database
      const totalReservations = await Reservation.countDocuments({
        roomType: singleInventoryRoom._id,
      });
      expect(totalReservations).toBe(1);

      // Verify inventory: availableCount dropped to exactly 0 (NEVER NEGATIVE / NO OVERBOOKING!)
      const finalInventory = await DailyInventory.find({
        roomTypeId: singleInventoryRoom._id,
      });

      for (const inv of finalInventory) {
        expect(inv.availableCount).toBe(0);
        expect(inv.reservedCount).toBe(1);
      }
    });
  });
});

