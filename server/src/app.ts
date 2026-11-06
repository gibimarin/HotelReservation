import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import reservationRoutes from './routes/reservation.routes';
import adminRoutes from './routes/admin.routes';
import { RoomController } from './controllers/room.controller';
import { validateRequest } from './middleware/validate.middleware';
import { availabilityQuerySchema } from './validators/room.validator';
import { errorHandler } from './middleware/error.middleware';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Security HTTP Headers
  app.use(helmet());

  // 2. Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 3. Body parsers with payload size bounds
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // 4. API Health-Check Endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    const dbStatusMap: Record<number, string> = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
    };

    const dbState = mongoose.connection.readyState;

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Hotel Reservation & Front Desk Management API',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatusMap[dbState] || 'Unknown',
        connected: dbState === 1,
      },
    });
  });

  // 5. Domain API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.get(
    '/api/availability',
    validateRequest(availabilityQuerySchema, 'query'),
    RoomController.searchAvailability
  );
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/admin', adminRoutes);

  // 6. 404 Handler for Unrecognized Endpoints
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
      },
    });
  });

  // 7. Centralized Global Error Handler
  app.use(errorHandler);

  return app;
};
