import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { RoomType } from '../src/models/RoomType';
import { DailyInventory } from '../src/models/DailyInventory';
import { UserRole } from '../src/constants/roles';
import { AuthService } from '../src/services/auth.service';
import { normalizeDate } from '../src/utils/dateUtils';

describe('Module 4: Room Management & Availability Search', () => {
  let mongoServer: MongoMemoryServer;
  const app = createApp();

  let adminToken: string;
  let guestToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RoomType.deleteMany({});
    await DailyInventory.deleteMany({});

    // Create Admin user
    const admin = await User.create({
      name: 'Admin Boss',
      email: 'admin@test.com',
      password: 'AdminPassword123!',
      role: UserRole.ADMIN,
    });
    adminToken = AuthService.signToken(admin);

    // Create Guest user
    const guest = await User.create({
      name: 'Regular Guest',
      email: 'guest@test.com',
      password: 'GuestPassword123!',
      role: UserRole.GUEST,
    });
    guestToken = AuthService.signToken(guest);
  });

  describe('Public Room Endpoints', () => {
    it('GET /api/rooms should return only active room types', async () => {
      await RoomType.create([
        {
          name: 'Active Deluxe',
          description: 'A great room with luxury features.',
          capacity: 2,
          facilities: ['Wi-Fi'],
          pricePerNight: 150,
          totalInventory: 5,
          isActive: true,
          imageUrl: 'https://example.com/deluxe.jpg',
        },
        {
          name: 'Inactive Budget Room',
          description: 'Under renovation right now.',
          capacity: 1,
          facilities: ['Wi-Fi'],
          pricePerNight: 80,
          totalInventory: 2,
          isActive: false,
          imageUrl: 'https://example.com/budget.jpg',
        },
      ]);

      const res = await request(app).get('/api/rooms');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Active Deluxe');
    });

    it('GET /api/rooms/:id should return single room details or 404 if not found', async () => {
      const room = await RoomType.create({
        name: 'Presidential Suite',
        description: 'Spectacular penthouse with top amenities.',
        capacity: 4,
        facilities: ['Jacuzzi', 'Butler'],
        pricePerNight: 500,
        totalInventory: 1,
        isActive: true,
        imageUrl: 'https://example.com/penthouse.jpg',
      });

      const res = await request(app).get(`/api/rooms/${room._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Presidential Suite');

      const nonExistentId = new mongoose.Types.ObjectId();
      const notFoundRes = await request(app).get(`/api/rooms/${nonExistentId}`);
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body.error.code).toBe('ROOM_NOT_FOUND');
    });
  });

  describe('Availability Search Engine (GET /api/availability)', () => {
    let suiteRoom: any;

    beforeEach(async () => {
      suiteRoom = await RoomType.create({
        name: 'Ocean View Suite',
        description: 'Room overlooking the ocean.',
        capacity: 3,
        facilities: ['Wi-Fi', 'Balcony'],
        pricePerNight: 200,
        totalInventory: 3,
        isActive: true,
        imageUrl: 'https://example.com/ocean.jpg',
      });
    });

    it('should reject past check-in dates with 400', async () => {
      const res = await request(app).get('/api/availability').query({
        checkIn: '2020-01-01',
        checkOut: '2020-01-05',
        guests: 2,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PAST_CHECKIN_DATE');
    });

    it('should reject check-out dates on or before check-in date with 400', async () => {
      const futureCheckIn = new Date();
      futureCheckIn.setDate(futureCheckIn.getDate() + 10);
      const isoCheckIn = futureCheckIn.toISOString().split('T')[0];

      const res = await request(app).get('/api/availability').query({
        checkIn: isoCheckIn,
        checkOut: isoCheckIn, // 0 nights
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('should return available room with correct night and price calculations', async () => {
      const date1 = new Date();
      date1.setDate(date1.getDate() + 5);
      const date2 = new Date();
      date2.setDate(date2.getDate() + 8); // 3 nights

      const checkInStr = date1.toISOString().split('T')[0];
      const checkOutStr = date2.toISOString().split('T')[0];

      const res = await request(app).get('/api/availability').query({
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guests: 2,
        rooms: 1,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.nights).toBe(3);
      expect(res.body.data.availableRooms.length).toBe(1);

      const option = res.body.data.availableRooms[0];
      expect(option.pricePerNight).toBe(200);
      expect(option.totalPrice).toBe(600); // 3 nights * 200
      expect(option.availableRooms).toBe(3);
    });

    it('should exclude room if sold out on ANY single night within the stay', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 10);
      const mid = new Date();
      mid.setDate(mid.getDate() + 11);
      const end = new Date();
      end.setDate(end.getDate() + 13); // 3 nights total

      // Mock that the middle night has 0 available rooms
      await DailyInventory.create({
        roomTypeId: suiteRoom._id,
        date: normalizeDate(mid),
        totalInventory: 3,
        availableCount: 0, // SOLD OUT on night 2!
        reservedCount: 3,
      });

      const res = await request(app).get('/api/availability').query({
        checkIn: start.toISOString().split('T')[0],
        checkOut: end.toISOString().split('T')[0],
        guests: 2,
        rooms: 1,
      });

      expect(res.status).toBe(200);
      // Because night 2 is sold out, room must NOT be available for the entire 3-night stay
      expect(res.body.data.availableRooms.length).toBe(0);
    });

    it('should filter out rooms that do not meet requested guest capacity', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 10);
      const end = new Date();
      end.setDate(end.getDate() + 12);

      // suiteRoom capacity is 3. Search for 5 guests:
      const res = await request(app).get('/api/availability').query({
        checkIn: start.toISOString().split('T')[0],
        checkOut: end.toISOString().split('T')[0],
        guests: 5,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.availableRooms.length).toBe(0);
    });

    it('should consider capacity across multiple requested rooms', async () => {
      const start = new Date();
      start.setDate(start.getDate() + 10);
      const end = new Date();
      end.setDate(end.getDate() + 12);

      const res = await request(app).get('/api/availability').query({
        checkIn: start.toISOString().split('T')[0],
        checkOut: end.toISOString().split('T')[0],
        guests: 6,
        rooms: 2,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.availableRooms.length).toBe(1);

      const option = res.body.data.availableRooms[0];
      expect(option.requestedRooms).toBe(2);
      expect(option.totalPrice).toBe(800);
    });
  });

  describe('Admin Room Management Endpoints', () => {
    it('should reject non-admin/staff users with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/rooms')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          name: 'Unauthorized Room',
          description: 'Should fail',
          capacity: 2,
          facilities: ['Wi-Fi'],
          pricePerNight: 100,
          totalInventory: 2,
          imageUrl: 'https://example.com/test.jpg',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow Admin to create a room type and auto-generate 60-day inventory', async () => {
      const res = await request(app)
        .post('/api/admin/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Garden Suite',
          description: 'Freshly built ground-level suite with patio.',
          capacity: 2,
          facilities: ['Wi-Fi', 'Patio', 'Garden Access'],
          pricePerNight: 220,
          totalInventory: 4,
          imageUrl: 'https://example.com/garden.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('New Garden Suite');

      // Verify that 60 days of DailyInventory were generated
      const inventoryCount = await DailyInventory.countDocuments({
        roomTypeId: res.body.data._id,
      });
      expect(inventoryCount).toBe(60);
    });

    it('should allow Admin to toggle room status between active and inactive', async () => {
      const room = await RoomType.create({
        name: 'Toggle Test Room',
        description: 'Room to test activation toggling.',
        capacity: 2,
        facilities: ['Wi-Fi'],
        pricePerNight: 140,
        totalInventory: 3,
        isActive: true,
        imageUrl: 'https://example.com/toggle.jpg',
      });

      // Deactivate
      const patchRes = await request(app)
        .patch(`/api/admin/rooms/${room._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.isActive).toBe(false);

      // Verify public API no longer lists it
      const publicRes = await request(app).get('/api/rooms');
      expect(publicRes.body.data.some((r: any) => r.name === 'Toggle Test Room')).toBe(
        false
      );
    });
  });
});

