export function getRideAddress(value: any, fallback: string) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (value?.address && typeof value.address === 'string') {
    return value.address;
  }

  return fallback;
}

export function getRideDistanceKm(value: any) {
  if (typeof value === 'number') {
    return Math.round((value / 1000) * 10) / 10;
  }

  return 0;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getPickupDistanceKm(
  driverLat: number,
  driverLng: number,
  pickup: any
): number {
  if (!pickup) return 0;
  const pLat = pickup.lat ?? pickup.latitude;
  const pLng = pickup.lng ?? pickup.longitude;
  if (!pLat || !pLng) return 0;
  return Math.round(haversineDistance(driverLat, driverLng, pLat, pLng) * 10) / 10;
}

export function getEtaMinutes(distanceKm: number): number {
  return Math.max(1, Math.round(distanceKm / 0.5));
}

export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  if (!encoded) return [];
  const coords: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dLat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dLng;
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}
