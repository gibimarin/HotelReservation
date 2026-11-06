import { apiClient } from './client';
import type { RoomType, AvailabilitySearchResult, ApiResponse } from '../types';

export interface AvailabilitySearchParams {
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
}

export const roomApi = {
  getActiveRooms: async (): Promise<RoomType[]> => {
    const res = await apiClient.get<ApiResponse<RoomType[]>>('/rooms');
    return res.data.data;
  },

  getRoomById: async (id: string): Promise<RoomType> => {
    const res = await apiClient.get<ApiResponse<RoomType>>(`/rooms/${id}`);
    return res.data.data;
  },

  searchAvailability: async (
    params: AvailabilitySearchParams
  ): Promise<AvailabilitySearchResult> => {
    const res = await apiClient.get<ApiResponse<AvailabilitySearchResult>>(
      '/availability',
      { params }
    );
    return res.data.data;
  },
};
