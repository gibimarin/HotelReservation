import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createReservationSchema,
  cancelReservationSchema,
  myReservationsQuerySchema,
} from '../validators/reservation.validator';

const router = Router();

// All reservation endpoints require authenticated access
router.use(protect);

// POST /api/reservations - Book a room
router.post(
  '/',
  validateRequest(createReservationSchema),
  ReservationController.create
);

// GET /api/reservations/my - View personal reservations for logged-in guest
router.get(
  '/my',
  validateRequest(myReservationsQuerySchema, 'query'),
  ReservationController.getMyReservations
);

// GET /api/reservations/:id - View single reservation with ownership protection
router.get('/:id', ReservationController.getById);

// PATCH /api/reservations/:id/cancel - Cancel eligible reservation
router.patch(
  '/:id/cancel',
  validateRequest(cancelReservationSchema),
  ReservationController.cancel
);

export default router;

