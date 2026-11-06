import { z } from 'zod';
import { ReservationStatus } from '../constants/reservation';

export const adminReservationsQuerySchema = z.object({
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
      return isNaN(parsed) || parsed < 1 ? 10 : Math.min(parsed, 100);
    }),
  status: z.nativeEnum(ReservationStatus).optional(),
  search: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'checkIn', 'checkOut', 'totalAmount'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const updateReservationStatusSchema = z.object({
  status: z.nativeEnum(ReservationStatus, {
    required_error: 'Status is required',
  }),
});

export type AdminReservationsQueryInput = z.infer<typeof adminReservationsQuerySchema>;
export type UpdateReservationStatusInput = z.infer<typeof updateReservationStatusSchema>;
