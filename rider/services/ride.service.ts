import { api } from '@/lib/api';
import { FareResponse } from './map.service';

export interface Ride {
  _id: string;
  user: any;
  captain?: any;
  pickup: string;
  destination: string;
  pickupCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
  fare: number;
  vehicle: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  otp?: string;
  distance?: number;
  duration?: number;
  messages?: Array<{
    msg: string;
    by: 'user' | 'captain';
    time: string;
    date: string;
    timestamp: string;
  }>;
}

export const rideService = {
  async getFare(pickup: string, destination: string): Promise<FareResponse> {
    return await api<FareResponse>(
      `/ride/get-fare?pickup=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(destination)}`
    );
  },

  async createRide(data: {
    pickup: string;
    destination: string;
    vehicleType: string;
  }): Promise<Ride> {
    return await api<Ride>('/ride/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async cancelRide(rideId: string): Promise<Ride> {
    return await api<Ride>(`/ride/cancel?rideId=${rideId}`);
  },

  async getActiveRide(): Promise<{ ride: Ride | null }> {
    return await api<{ ride: Ride | null }>('/ride/active-ride');
  },

  async getChatDetails(rideId: string): Promise<{
    user: any;
    captain: any;
    messages: any[];
  }> {
    return await api(`/ride/chat-details/${rideId}`);
  },
};
