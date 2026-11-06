import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../services/reservation.service';
import { MyReservationsQueryInput } from '../validators/reservation.validator';

export class ReservationController {
  // POST /api/reservations - Book a room (Protected: Guest/Staff/Admin)
  public static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const guestId = req.user!._id.toString();
      const reservation = await ReservationService.createReservation(
        guestId,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Reservation booked successfully',
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/reservations/my - List authenticated guest's personal reservations
  public static async getMyReservations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const guestId = req.user!._id.toString();
      const result = await ReservationService.getMyReservations(
        guestId,
        req.query as unknown as MyReservationsQueryInput
      );

      res.status(200).json({
        success: true,
        count: result.reservations.length,
        data: result.reservations,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/reservations/:id - View reservation details with ownership guard
  public static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const currentUser = {
        id: req.user!._id.toString(),
        role: req.user!.role,
      };

      const reservation = await ReservationService.getReservationById(
        id,
        currentUser
      );

      res.status(200).json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/reservations/:id/cancel - Cancel eligible reservation
  public static async cancel(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const currentUser = {
        id: req.user!._id.toString(),
        role: req.user!.role,
      };

      const reservation = await ReservationService.cancelReservation(
        id,
        currentUser,
        req.body
      );

      res.status(200).json({
        success: true,
        message: 'Reservation cancelled successfully',
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }
}

