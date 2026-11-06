import { z } from 'zod';
import { ReservationStatus } from '../constants/reservation';

export const createReservationSchema = z.object({
  roomTypeId: z
    .string({ required_error: 'Room type ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid roomTypeId ObjectId format'),
  checkIn: z.string({ required_error: 'Check-in date is required' }),
  checkOut: z.string({ required_error: 'Check-out date is required' }),
  guestCount: z
    .number({ required_error: 'Guest count is required' })
    .int('Guest count must be an integer')
    .min(1, 'At least 1 guest is required'),
  roomCount: z
    .number()
    .int('Room count must be an integer')
    .min(1, 'Must book at least 1 room')
    .default(1),
  specialRequests: z
    .string()
    .trim()
    .max(500, 'Special requests cannot exceed 500 characters')
    .optional(),
});

export const cancelReservationSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .max(500, 'Cancellation reason cannot exceed 500 characters')
    .optional(),
});

export const myReservationsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 10 : Math.min(parsed, 50);
    }),
  status: z.nativeEnum(ReservationStatus).optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
export type MyReservationsQueryInput = z.infer<typeof myReservationsQuerySchema>;

