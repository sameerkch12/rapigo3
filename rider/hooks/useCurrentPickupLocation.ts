import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { useRide } from '@/hooks/useRide';

function formatAddress(address: Location.LocationGeocodedAddress) {
  if (address.formattedAddress) return address.formattedAddress;
  return [address.name, address.street, address.district, address.city, address.region]
    .filter(Boolean)
    .join(', ');
}

export function useCurrentPickupLocation() {
  const { ride, setPickup } = useRide();
  const hasRequestedLocation = useRef(false);
  const [pickupText, setPickupText] = useState('Getting current location...');
  const [isLocating, setIsLocating] = useState(true);

  useEffect(() => {
    if (hasRequestedLocation.current || ride.pickup) {
      if (ride.pickup) {
        setPickupText(ride.pickup.address);
        setIsLocating(false);
      }
      return;
    }

    hasRequestedLocation.current = true;

    async function loadCurrentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setPickupText('Location permission denied');
          return;
        }

        // Step 1: Get cached location instantly (takes < 1s)
        let lat = 21.2514;
        let lng = 81.6296;
        try {
          const last = await Location.getLastKnownPositionAsync({ maxAge: 30000 });
          if (last) {
            lat = last.coords.latitude;
            lng = last.coords.longitude;
          }
        } catch {
          // fallback to default
        }

        // Show fallback address immediately so user sees something
        setPickup({
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          latitude: lat,
          longitude: lng,
        });
        setPickupText('Locating...');

        // Step 2: Fire fresh GPS in background (may take time)
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        }).then(async (currentLocation) => {
          const { latitude, longitude } = currentLocation.coords;
          let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

          if (Platform.OS !== 'web') {
            try {
              const [rev] = await Location.reverseGeocodeAsync({ latitude, longitude });
              if (rev) address = formatAddress(rev) || address;
            } catch {
              // use lat/lng fallback
            }
          }

          setPickup({ address, latitude, longitude });
          setPickupText(address);
        }).catch(() => {
          // GPS failed, keep last known
          const lastAddr = ride.pickup?.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setPickupText(lastAddr);
        }).finally(() => {
          setIsLocating(false);
        });
      } catch {
        setPickupText('Unable to get current location');
        setIsLocating(false);
      }
    }

    loadCurrentLocation();
  }, [ride.pickup, setPickup]);

  return { pickupText, isLocating };
}
