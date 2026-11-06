import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { protect } from '../middleware/auth.middleware';
import { env } from '../config/env';

const router = Router();

// Apply rate limiting in non-test environments to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
});

router.post(
  '/register',
  authLimiter,
  validateRequest(registerSchema),
  AuthController.register
);

router.post(
  '/login',
  authLimiter,
  validateRequest(loginSchema),
  AuthController.login
);

router.get('/me', protect, AuthController.getMe);

export default router;

