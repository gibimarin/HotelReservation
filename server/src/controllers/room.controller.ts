import { Request, Response, NextFunction } from 'express';
import { RoomService } from '../services/room.service';

export class RoomController {
  // Public: Get all active rooms
  public static async getActiveRooms(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rooms = await RoomService.getAllRooms(true);
      res.status(200).json({
        success: true,
        count: rooms.length,
        data: rooms,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin/Staff: Get all rooms (including inactive)
  public static async getAllRoomsAdmin(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rooms = await RoomService.getAllRooms(false);
      res.status(200).json({
        success: true,
        count: rooms.length,
        data: rooms,
      });
    } catch (error) {
      next(error);
    }
  }

  // Public: Get room by ID
  public static async getRoomById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const room = await RoomService.getRoomById(id);
      res.status(200).json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  // Public: Search availability
  public static async searchAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await RoomService.searchAvailability(req.query as any);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create room
  public static async createRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const room = await RoomService.createRoom(req.body);
      res.status(201).json({
        success: true,
        message: 'Room type created successfully',
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update room details
  public static async updateRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const room = await RoomService.updateRoom(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Room type updated successfully',
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: Toggle room status
  public static async updateRoomStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const room = await RoomService.toggleRoomStatus(
        id,
        req.body.isActive
      );
      res.status(200).json({
        success: true,
        message: `Room type ${room.isActive ? 'activated' : 'deactivated'} successfully`,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }
}
