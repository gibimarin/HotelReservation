import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { UserRole } from '../src/constants/roles';

describe('Module 3: Authentication & RBAC Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  const app = createApp();

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
  });

  describe('POST /api/auth/register', () => {
    it('should register a new guest and return a JWT and sanitized profile', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Alice Wonder',
        email: 'alice@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toEqual({
        id: expect.any(String),
        name: 'Alice Wonder',
        email: 'alice@example.com',
        role: UserRole.GUEST,
        createdAt: expect.any(String),
      });

      // Verify password is never leaked in the response
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should prevent privilege escalation by ignoring client-supplied role', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Hacker User',
        email: 'hacker@example.com',
        password: 'Password123!',
        role: 'admin', // Malicious attempt to elevate privileges
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe(UserRole.GUEST);

      // Verify in DB that role is strictly guest
      const createdUser = await User.findOne({ email: 'hacker@example.com' });
      expect(createdUser?.role).toBe(UserRole.GUEST);
    });

    it('should reject registration when email is already in use', async () => {
      await User.create({
        name: 'Existing User',
        email: 'duplicate@example.com',
        password: 'Password123!',
        role: UserRole.GUEST,
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'New Person',
        email: 'duplicate@example.com',
        password: 'NewPassword123!',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject registration with invalid email or weak password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'A', // too short
        email: 'not-an-email',
        password: 'short', // < 8 characters
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        name: 'Login Test User',
        email: 'login@example.com',
        password: 'CorrectPassword123!',
        role: UserRole.GUEST,
      });
    });

    it('should authenticate user and return token with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'CorrectPassword123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('login@example.com');
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'unknown@example.com',
        password: 'AnyPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    it('should return the current user profile when valid Bearer token is provided', async () => {
      // 1. Register user
      const registerRes = await request(app).post('/api/auth/register').send({
        name: 'Token User',
        email: 'token@example.com',
        password: 'Password123!',
      });

      const token = registerRes.body.data.token;

      // 2. Fetch /api/auth/me
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe('token@example.com');
    });

    it('should reject access with 401 when Bearer token is omitted', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject access with 401 when token is invalid or corrupted', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_tampered_token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});

