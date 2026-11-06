export type UserRole = 'guest' | 'staff' | 'admin';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface RoomType {
  _id: string;
  name: string;
  description: string;
  capacity: number;
  facilities: string[];
  pricePerNight: number;
  totalInventory: number;
  isActive: boolean;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableRoomOption {
  roomType: RoomType;
  nights: number;
  requestedRooms: number;
  availableRooms: number;
  pricePerNight: number;
  totalPrice: number;
}

export interface AvailabilitySearchResult {
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  rooms: number;
  availableRooms: AvailableRoomOption[];
}

export interface Reservation {
  _id: string;
  reference: string;
  guest: User | string;
  roomType: RoomType | string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  roomCount: number;
  priceSnapshot: number;
  totalAmount: number;
  status: ReservationStatus;
  specialRequests?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMetadata {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface DashboardMetrics {
  todaysArrivals: number;
  todaysDepartures: number;
  occupiedRooms: number;
  pendingReservations: number;
  confirmedReservations: number;
  totalActiveRooms: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
  pagination?: PaginationMetadata;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

