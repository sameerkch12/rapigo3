import polyline from '@mapbox/polyline';
import { RouteCoordinate } from '@/services/map.service';

export function decodePolyline(encoded: string): RouteCoordinate[] {
  if (!encoded) return [];
  try {
    return polyline.decode(encoded).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));
  } catch {
    console.warn('Failed to decode polyline');
    return [];
  }
}
