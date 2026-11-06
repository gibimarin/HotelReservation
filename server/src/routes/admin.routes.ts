import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';
import { AdminController } from '../controllers/admin.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { UserRole } from '../constants/roles';
import {
  createRoomSchema,
  updateRoomSchema,
  updateRoomStatusSchema,
} from '../validators/room.validator';
import {
  adminReservationsQuerySchema,
  updateReservationStatusSchema,
} from '../validators/admin.validator';

const router = Router();

// Restrict all routes in this router to authenticated Staff and Admin users
router.use(protect, authorize(UserRole.ADMIN, UserRole.STAFF));

// 1. Dashboard Metrics Endpoint
router.get('/dashboard', AdminController.getDashboard);

// 2. Room Management Endpoints
router.get('/rooms', RoomController.getAllRoomsAdmin);

router.post(
  '/rooms',
  validateRequest(createRoomSchema),
  RoomController.createRoom
);

router.put(
  '/rooms/:id',
  validateRequest(updateRoomSchema),
  RoomController.updateRoom
);

router.patch(
  '/rooms/:id/status',
  validateRequest(updateRoomStatusSchema),
  RoomController.updateRoomStatus
);

// 3. Reservation Management & Front Desk Endpoints
router.get(
  '/reservations',
  validateRequest(adminReservationsQuerySchema, 'query'),
  AdminController.getReservations
);

router.patch('/reservations/:id/check-in', AdminController.checkIn);

router.patch('/reservations/:id/check-out', AdminController.checkOut);

router.patch(
  '/reservations/:id/status',
  validateRequest(updateReservationStatusSchema),
  AdminController.updateStatus
);

export default router;
