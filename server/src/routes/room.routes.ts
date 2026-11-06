import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';

const router = Router();

// GET /api/rooms - Browse active room types
router.get('/', RoomController.getActiveRooms);

// GET /api/rooms/:id - View single room type details
router.get('/:id', RoomController.getRoomById);

export default router;
