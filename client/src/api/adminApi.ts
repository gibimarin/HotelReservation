import { apiClient } from './client';
import type {
  DashboardMetrics,
  Reservation,
  RoomType,
  ReservationStatus,
  PaginationMetadata,
  ApiResponse,
} from '../types';

export interface AdminReservationQueryParams {
  page?: number;
  limit?: number;
  status?: ReservationStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminReservationsResponse {
  reservations: Reservation[];
  pagination: PaginationMetadata;
}

export interface CreateRoomPayload {
  name: string;
  description: string;
  capacity: number;
  facilities: string[];
  pricePerNight: number;
  totalInventory: number;
  imageUrl: string;
  isActive?: boolean;
}

export type UpdateRoomPayload = Partial<CreateRoomPayload>;

export const adminApi = {
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const res = await apiClient.get<ApiResponse<DashboardMetrics>>(
      '/admin/dashboard'
    );
    return res.data.data;
  },

  getReservations: async (
    params?: AdminReservationQueryParams
  ): Promise<AdminReservationsResponse> => {
    const res = await apiClient.get<ApiResponse<Reservation[]>>(
      '/admin/reservations',
      { params }
    );
    return {
      reservations: res.data.data,
      pagination: res.data.pagination!,
    };
  },

  checkIn: async (reservationId: string): Promise<Reservation> => {
    const res = await apiClient.patch<ApiResponse<Reservation>>(
      `/admin/reservations/${reservationId}/check-in`
    );
    return res.data.data;
  },

  checkOut: async (reservationId: string): Promise<Reservation> => {
    const res = await apiClient.patch<ApiResponse<Reservation>>(
      `/admin/reservations/${reservationId}/check-out`
    );
    return res.data.data;
  },

  updateReservationStatus: async (
    reservationId: string,
    status: ReservationStatus
  ): Promise<Reservation> => {
    const res = await apiClient.patch<ApiResponse<Reservation>>(
      `/admin/reservations/${reservationId}/status`,
      { status }
    );
    return res.data.data;
  },

  getAllRooms: async (): Promise<RoomType[]> => {
    const res = await apiClient.get<ApiResponse<RoomType[]>>('/admin/rooms');
    return res.data.data;
  },

  createRoom: async (payload: CreateRoomPayload): Promise<RoomType> => {
    const res = await apiClient.post<ApiResponse<RoomType>>(
      '/admin/rooms',
      payload
    );
    return res.data.data;
  },

  updateRoom: async (
    id: string,
    payload: UpdateRoomPayload
  ): Promise<RoomType> => {
    const res = await apiClient.put<ApiResponse<RoomType>>(
      `/admin/rooms/${id}`,
      payload
    );
    return res.data.data;
  },

  toggleRoomStatus: async (
    id: string,
    isActive: boolean
  ): Promise<RoomType> => {
    const res = await apiClient.patch<ApiResponse<RoomType>>(
      `/admin/rooms/${id}/status`,
      { isActive }
    );
    return res.data.data;
  },
};
