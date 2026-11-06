import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z
    .string({ required_error: 'Room type name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters long')
    .max(2000, 'Description cannot exceed 2000 characters'),
  capacity: z
    .number({ required_error: 'Capacity is required' })
    .int('Capacity must be an integer')
    .min(1, 'Capacity must be at least 1 guest')
    .max(10, 'Capacity cannot exceed 10 guests'),
  facilities: z
    .array(z.string().trim().min(1, 'Facility item cannot be empty'), {
      required_error: 'Facilities are required',
    })
    .min(1, 'Must specify at least one facility'),
  pricePerNight: z
    .number({ required_error: 'Price per night is required' })
    .min(0, 'Price per night cannot be negative'),
  totalInventory: z
    .number({ required_error: 'Total inventory count is required' })
    .int('Total inventory must be an integer')
    .min(1, 'Total inventory must be at least 1 room'),
  imageUrl: z
    .string({ required_error: 'Image URL is required' })
    .trim()
    .min(5, 'Valid image URL is required'),
  isActive: z.boolean().optional().default(true),
});

export const updateRoomSchema = createRoomSchema.partial();

export const updateRoomStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});

export const availabilityQuerySchema = z.object({
  checkIn: z.string({ required_error: 'checkIn date is required' }),
  checkOut: z.string({ required_error: 'checkOut date is required' }),
  guests: z
    .string()
    .optional()
    .default('1')
    .transform((val) => {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  rooms: z
    .string()
    .optional()
    .default('1')
    .transform((val) => {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type UpdateRoomStatusInput = z.infer<typeof updateRoomStatusSchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;

