import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { RoomType } from '../src/models/RoomType';
import { Reservation } from '../src/models/Reservation';
import { DailyInventory } from '../src/models/DailyInventory';
import { UserRole } from '../src/constants/roles';
import { ReservationStatus } from '../src/constants/reservation';
import { AuthService } from '../src/services/auth.service';
import { getTodayUTC } from '../src/utils/dateUtils';

describe('Module 6: Admin Dashboard & Server-Side Pagination', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  let adminToken: string;
  let staffToken: string;
  let guestToken: string;

  let guestUser: any;
  let sampleRoom: any;

  beforeAll(async () => {
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
    await Reservation.deleteMany({});
    await DailyInventory.deleteMany({});

    // 1. Create Admin
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@test.com',
      password: 'AdminPassword123!',
      role: UserRole.ADMIN,
    });
    adminToken = AuthService.signToken(admin);

    // 2. Create Staff
    const staff = await User.create({
      name: 'Front Desk Staff',
      email: 'staff@test.com',
      password: 'StaffPassword123!',
      role: UserRole.STAFF,
    });
    staffToken = AuthService.signToken(staff);

    // 3. Create Guest
    guestUser = await User.create({
      name: 'Regular Customer',
      email: 'customer@test.com',
      password: 'GuestPassword123!',
      role: UserRole.GUEST,
    });
    guestToken = AuthService.signToken(guestUser);

    // 4. Create Room Type
    sampleRoom = await RoomType.create({
      name: 'Luxury Suite',
      description: 'Spacious suite with balcony.',
      capacity: 3,
      facilities: ['Wi-Fi', 'TV', 'Balcony'],
      pricePerNight: 200,
      totalInventory: 10,
      isActive: true,
      imageUrl: 'https://example.com/suite.jpg',
    });
  });

  describe('GET /api/admin/dashboard (Operational Metrics)', () => {
    it('should aggregate arrivals, departures, occupied rooms, and active room counts', async () => {
      const today = getTodayUTC();
      const tomorrow = new Date(today.getTime() + 86400000);
      const dayAfter = new Date(today.getTime() + 86400000 * 2);

      // Create 1 arrival today
      await Reservation.create({
        reference: 'RES-TODAY-ARR1',
        guest: guestUser._id,
        roomType: sampleRoom._id,
        checkIn: today,
        checkOut: tomorrow,
        guestCount: 2,
        roomCount: 1,
        priceSnapshot: 200,
        totalAmount: 200,
        status: ReservationStatus.CONFIRMED,
      });

      // Create 1 occupied room departing today
      await Reservation.create({
        reference: 'RES-TODAY-DEP1',
        guest: guestUser._id,
        roomType: sampleRoom._id,
        checkIn: new Date(today.getTime() - 86400000),
        checkOut: today,
        guestCount: 1,
        roomCount: 1,
        priceSnapshot: 200,
        totalAmount: 200,
        status: ReservationStatus.CHECKED_IN,
      });

      // Create 1 pending reservation
      await Reservation.create({
        reference: 'RES-PENDING-01',
        guest: guestUser._id,
        roomType: sampleRoom._id,
        checkIn: tomorrow,
        checkOut: dayAfter,
        guestCount: 2,
        roomCount: 1,
        priceSnapshot: 200,
        totalAmount: 200,
        status: ReservationStatus.PENDING,
      });

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const metrics = res.body.data;
      expect(metrics.todaysArrivals).toBe(1);
      expect(metrics.todaysDepartures).toBe(1);
      expect(metrics.occupiedRooms).toBe(1);
      expect(metrics.pendingReservations).toBe(1);
      expect(metrics.totalActiveRooms).toBe(1);
    });

    it('should reject unauthenticated or non-staff users with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Server-Side Pagination & Filtering (GET /api/admin/reservations)', () => {
    beforeEach(async () => {
      // Create 12 reservations across different statuses
      const today = getTodayUTC();
      const docs = [];

      for (let i = 1; i <= 12; i++) {
        docs.push({
          reference: `RES-PAGE-${String(i).padStart(3, '0')}`,
          guest: guestUser._id,
          roomType: sampleRoom._id,
          checkIn: new Date(today.getTime() + 86400000 * i),
          checkOut: new Date(today.getTime() + 86400000 * (i + 2)),
          guestCount: 2,
          roomCount: 1,
          priceSnapshot: 200,
          totalAmount: 400,
          status: i % 2 === 0 ? ReservationStatus.CONFIRMED : ReservationStatus.CHECKED_IN,
        });
      }

      await Reservation.insertMany(docs);
    });

    it('should paginate results server-side with limit, page, and total count', async () => {
      const res = await request(app)
        .get('/api/admin/reservations')
        .query({ page: '1', limit: '5' })
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(5);

      const pag = res.body.pagination;
      expect(pag.totalCount).toBe(12);
      expect(pag.totalPages).toBe(3);
      expect(pag.currentPage).toBe(1);
      expect(pag.pageSize).toBe(5);
      expect(pag.hasNextPage).toBe(true);
      expect(pag.hasPrevPage).toBe(false);

      // Fetch page 2
      const page2Res = await request(app)
        .get('/api/admin/reservations')
        .query({ page: '2', limit: '5' })
        .set('Authorization', `Bearer ${staffToken}`);

      expect(page2Res.body.data.length).toBe(5);
      expect(page2Res.body.pagination.currentPage).toBe(2);
      expect(page2Res.body.pagination.hasNextPage).toBe(true);
      expect(page2Res.body.pagination.hasPrevPage).toBe(true);

      // Fetch page 3 (remaining 2 items)
      const page3Res = await request(app)
        .get('/api/admin/reservations')
        .query({ page: '3', limit: '5' })
        .set('Authorization', `Bearer ${staffToken}`);

      expect(page3Res.body.data.length).toBe(2);
      expect(page3Res.body.pagination.hasNextPage).toBe(false);
    });

    it('should filter reservations by status in MongoDB query', async () => {
      const res = await request(app)
        .get('/api/admin/reservations')
        .query({ status: ReservationStatus.CHECKED_IN })
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.totalCount).toBe(6);
      res.body.data.forEach((r: any) => {
        expect(r.status).toBe(ReservationStatus.CHECKED_IN);
      });
    });

    it('should search reservations by reference regex in MongoDB query', async () => {
      const res = await request(app)
        .get('/api/admin/reservations')
        .query({ search: 'RES-PAGE-007' })
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].reference).toBe('RES-PAGE-007');
    });

    it('should filter by check-in date range and sort ascending', async () => {
      const today = getTodayUTC();
      const isoDate = (offset: number) =>
        new Date(today.getTime() + 86400000 * offset)
          .toISOString()
          .split('T')[0];

      const res = await request(app)
        .get('/api/admin/reservations')
        .query({
          startDate: isoDate(5),
          endDate: isoDate(7),
          sortBy: 'checkIn',
          sortOrder: 'asc',
        })
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.totalCount).toBe(3);
      expect(res.body.data.map((r: any) => r.reference)).toEqual([
        'RES-PAGE-005',
        'RES-PAGE-006',
        'RES-PAGE-007',
      ]);
    });
  });

  describe('Front Desk Check-in & Check-out Operations', () => {
    let testReservation: any;

    beforeEach(async () => {
      const today = getTodayUTC();
      testReservation = await Reservation.create({
        reference: 'RES-DESK-TEST1',
        guest: guestUser._id,
        roomType: sampleRoom._id,
        checkIn: today,
        checkOut: new Date(today.getTime() + 86400000 * 2),
        guestCount: 2,
        roomCount: 1,
        priceSnapshot: 200,
        totalAmount: 400,
        status: ReservationStatus.CONFIRMED,
      });
    });

    it('PATCH /api/admin/reservations/:id/check-in should check in a confirmed reservation', async () => {
      const res = await request(app)
        .patch(`/api/admin/reservations/${testReservation._id}/check-in`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ReservationStatus.CHECKED_IN);
      expect(res.body.data.checkedInAt).toBeDefined();
    });

    it('should reject check-in on a reservation that is not confirmed', async () => {
      // Mark as cancelled
      testReservation.status = ReservationStatus.CANCELLED;
      await testReservation.save();

      const res = await request(app)
        .patch(`/api/admin/reservations/${testReservation._id}/check-in`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('PATCH /api/admin/reservations/:id/check-out should check out a checked-in guest', async () => {
      // Check in first
      testReservation.status = ReservationStatus.CHECKED_IN;
      testReservation.checkedInAt = new Date();
      await testReservation.save();

      // Check out
      const res = await request(app)
        .patch(`/api/admin/reservations/${testReservation._id}/check-out`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ReservationStatus.CHECKED_OUT);
      expect(res.body.data.checkedOutAt).toBeDefined();
    });

    it('should reject check-out on a reservation that has not been checked in yet', async () => {
      // Current status is CONFIRMED (not checked-in)
      const res = await request(app)
        .patch(`/api/admin/reservations/${testReservation._id}/check-out`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('Room Inventory Synchronization', () => {
    it('should update future DailyInventory totals and availability when totalInventory changes', async () => {
      const targetDate = new Date(getTodayUTC().getTime() + 86400000 * 3);

      await DailyInventory.create({
        roomTypeId: sampleRoom._id,
        date: targetDate,
        totalInventory: 10,
        availableCount: 8,
        reservedCount: 2,
      });

      const res = await request(app)
        .put(`/api/admin/rooms/${sampleRoom._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ totalInventory: 12 });

      expect(res.status).toBe(200);
      expect(res.body.data.totalInventory).toBe(12);

      const inventory = await DailyInventory.findOne({
        roomTypeId: sampleRoom._id,
        date: targetDate,
      });

      expect(inventory?.totalInventory).toBe(12);
      expect(inventory?.availableCount).toBe(10);
      expect(inventory?.reservedCount).toBe(2);
    });

    it('should reject reducing totalInventory below already reserved rooms', async () => {
      const targetDate = new Date(getTodayUTC().getTime() + 86400000 * 4);

      await DailyInventory.create({
        roomTypeId: sampleRoom._id,
        date: targetDate,
        totalInventory: 10,
        availableCount: 7,
        reservedCount: 3,
      });

      const res = await request(app)
        .put(`/api/admin/rooms/${sampleRoom._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ totalInventory: 2 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVENTORY_BELOW_RESERVED');
    });
  });
});

