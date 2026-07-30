import { api } from '@/lib/api';

export interface LocationCoords {
  ltd: number;
  lng: number;
}

export interface DistanceTimeResponse {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  status: string;
  polyline?: string;
}

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface FareResponse {
  fare: {
    auto: number;
    car: number;
    bike: number;
  };
  distanceTime: DistanceTimeResponse;
  polyline?: string;
}

export const mapService = {
  async getSuggestions(input: string): Promise<string[]> {
    if (!input || input.length < 3) return [];
    try {
      return await api<string[]>(`/map/get-suggestions?input=${encodeURIComponent(input)}`);
    } catch {
      return [];
    }
  },


  async getCoordinates(address: string): Promise<LocationCoords> {
  try {
    console.log("Request Address:", address);

    const response = await api<LocationCoords>(
      `/map/get-coordinates?address=${encodeURIComponent(address)}`
    );

    console.log("Coordinates Response:", response);

    return response;
  } catch (error) {
    console.error("getCoordinates Error:", error);
    throw error;
  }
},

  async getReverseGeocode(lat: number, lng: number): Promise<{ address: string; placeId?: string }> {
    try {
      return await api<{ address: string; placeId?: string }>(
        `/map/reverse-geocode?lat=${lat}&lng=${lng}`
      );
    } catch {
      return { address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
    }
  },

  async getDistanceTime(origin: string, destination: string): Promise<DistanceTimeResponse> {
    return await api<DistanceTimeResponse>(
      `/map/get-distance-time?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    );
  },
};
