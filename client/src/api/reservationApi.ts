import { apiClient } from './client';
import type {
  Reservation,
  ApiResponse,
  PaginationMetadata,
  ReservationStatus,
} from '../types';

export interface CreateReservationPayload {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  roomCount?: number;
  specialRequests?: string;
}

export interface MyReservationsQueryParams {
  page?: number;
  limit?: number;
  status?: ReservationStatus;
}

export interface MyReservationsResponse {
  reservations: Reservation[];
  pagination: PaginationMetadata;
}

export const reservationApi = {
  create: async (payload: CreateReservationPayload): Promise<Reservation> => {
    const res = await apiClient.post<ApiResponse<Reservation>>(
      '/reservations',
      payload
    );
    return res.data.data;
  },

  getMyReservations: async (
    params?: MyReservationsQueryParams
  ): Promise<MyReservationsResponse> => {
    const res = await apiClient.get<ApiResponse<Reservation[]>>(
      '/reservations/my',
      { params }
    );
    return {
      reservations: res.data.data,
      pagination: res.data.pagination!,
    };
  },

  getById: async (id: string): Promise<Reservation> => {
    const res = await apiClient.get<ApiResponse<Reservation>>(
      `/reservations/${id}`
    );
    return res.data.data;
  },

  cancel: async (id: string, reason?: string): Promise<Reservation> => {
    const res = await apiClient.patch<ApiResponse<Reservation>>(
      `/reservations/${id}/cancel`,
      { cancellationReason: reason }
    );
    return res.data.data;
  },
};
