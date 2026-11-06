import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';

export class AdminController {
  // GET /api/admin/dashboard - Front Desk KPI and operational metrics
  public static async getDashboard(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const metrics = await AdminService.getDashboardMetrics();
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/reservations - Paginated, searchable, filterable reservation list
  public static async getReservations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AdminService.getPaginatedReservations(req.query as any);
      res.status(200).json({
        success: true,
        data: result.reservations,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/admin/reservations/:id/check-in - Check in guest
  public static async checkIn(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const reservation = await AdminService.checkInGuest(id);
      res.status(200).json({
        success: true,
        message: 'Guest checked in successfully',
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/admin/reservations/:id/check-out - Check out guest
  public static async checkOut(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const reservation = await AdminService.checkOutGuest(id);
      res.status(200).json({
        success: true,
        message: 'Guest checked out successfully',
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/admin/reservations/:id/status - Update reservation lifecycle state
  public static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const reservation = await AdminService.updateStatus(id, req.body.status);
      res.status(200).json({
        success: true,
        message: `Reservation status updated to '${reservation.status}' successfully`,
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }
}

