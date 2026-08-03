import React, { createContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { rideService, Ride } from '@/services/ride.service';
import {
  joinRideRoom,
  subscribeToRideConfirmed,
  subscribeToRideStarted,
  subscribeToRideCompleted,
  subscribeToRideCancelled,
  subscribeToDriverLocation,
} from '@/services/socket';

export type RideStatus = 'idle' | 'searching' | 'driver_found' | 'ongoing' | 'completed' | 'cancelled';

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleNumber?: string;
  vehicleType?: string;
  color?: string;
  location: { latitude: number; longitude: number };
}

export interface RideState {
  id: string | null;
  status: RideStatus;
  pickup: Location | null;
  destination: Location | null;
  selectedVehicle: string | null;
  selectedDriver: Driver | null;
  fare: number;
  otp: string;
  coupon: string;
  paymentMethod: 'wallet' | 'cash' | 'card';
  rawRide: Ride | null;
  isDriverNearPickup: boolean;
}

interface RideContextType {
  ride: RideState;
  isRestoringRide: boolean;
  setPickup: (loc: Location) => void;
  setDestination: (loc: Location) => void;
  clearDestination: () => void;
  selectVehicle: (id: string, fare: number) => void;
  startSearch: (distanceKm: number, fare: number) => Promise<void>;
  cancelRide: () => Promise<void>;
  completeRide: () => void;
  applyCoupon: (code: string) => boolean;
  setPaymentMethod: (method: 'wallet' | 'cash' | 'card') => void;
  resetRideState: () => void;
}

export const RideContext = createContext<RideContextType | undefined>(undefined);

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function RideProvider({ children }: { children: ReactNode }) {
  const [ride, setRide] = useState<RideState>({
    id: null,
    status: 'idle',
    pickup: null,
    destination: null,
    selectedVehicle: null,
    selectedDriver: null,
    fare: 0,
    otp: '',
    coupon: '',
    paymentMethod: 'wallet',
    rawRide: null,
    isDriverNearPickup: false,
  });
  const [isRestoringRide, setIsRestoringRide] = useState(true);
  const rideIdRef = useRef<string | null>(null);
  const isCurrentRide = (payload: any) => {
    const payloadRideId = payload?._id || payload?.rideId;
    return Boolean(payloadRideId && rideIdRef.current && payloadRideId.toString() === rideIdRef.current);
  };

  // Socket setup once and use current ride id for matching events
  useEffect(() => {
    const updateRideIdRef = () => {
      rideIdRef.current = ride.id;
    };
    updateRideIdRef();
  }, [ride.id]);

  useEffect(() => {
    subscribeToRideConfirmed((confirmedRide: any) => {
      if (!isCurrentRide(confirmedRide)) return;
      console.log('[RideContext] Ride confirmed by captain:', confirmedRide);
      const captain = confirmedRide.captain;

      setRide((prev) => {
        let driverObj: Driver | null = null;
        if (captain) {
          let coords = { latitude: prev.pickup?.latitude || 0, longitude: prev.pickup?.longitude || 0 };
          if (captain.location && Array.isArray(captain.location.coordinates)) {
            coords = { latitude: captain.location.coordinates[1], longitude: captain.location.coordinates[0] };
          }
          driverObj = {
            id: captain._id || captain.id,
            name: `${captain.fullname?.firstname || ''} ${captain.fullname?.lastname || ''}`.trim(),
            phone: captain.phone || '',
            vehicleNumber: captain.vehicle?.number || '',
            vehicleType: captain.vehicle?.type || prev.selectedVehicle || '',
            color: captain.vehicle?.color || '',
            location: coords,
          };
        }

        return {
          ...prev,
          status: 'driver_found',
          selectedDriver: driverObj,
          otp: confirmedRide.otp || prev.otp,
          rawRide: confirmedRide,
        };
      });
    });

    subscribeToRideStarted((startedRide: any) => {
      if (!isCurrentRide(startedRide)) return;
      console.log('[RideContext] Ride started:', startedRide);
      setRide((prev) => ({
        ...prev,
        status: 'ongoing',
        rawRide: startedRide,
      }));
    });

    subscribeToRideCompleted((completedRide: any) => {
      if (!isCurrentRide(completedRide)) return;
      console.log('[RideContext] Ride completed:', completedRide);
      setRide((prev) => ({
        ...prev,
        status: 'completed',
        rawRide: completedRide,
      }));
    });

    subscribeToRideCancelled((cancelledRide: any) => {
      if (!isCurrentRide(cancelledRide)) return;
      console.log('[RideContext] Ride cancelled:', cancelledRide);
      setRide((prev) => ({
        ...prev,
        status: 'cancelled',
        rawRide: cancelledRide?._id ? cancelledRide : prev.rawRide,
      }));
    });

    subscribeToDriverLocation((locData) => {
      if (!rideIdRef.current || !locData || typeof locData.latitude !== 'number' || typeof locData.longitude !== 'number') return;
      setRide((prev) => {
        if (!prev.selectedDriver) return prev;
        const distance = prev.pickup
          ? haversineMeters(prev.pickup.latitude, prev.pickup.longitude, locData.latitude, locData.longitude)
          : Infinity;
        return {
          ...prev,
          isDriverNearPickup: distance <= 100,
          selectedDriver: {
            ...prev.selectedDriver,
            location: {
              latitude: locData.latitude,
              longitude: locData.longitude,
            },
          },
        };
      });
    });
  }, []);

  useEffect(() => {
    if (ride.id) {
      joinRideRoom(ride.id);
    }
  }, [ride.id]);

  useEffect(() => {
    const restoreActiveRide = async () => {
      try {
        const { ride: activeRide } = await rideService.getActiveRide();
        if (activeRide && activeRide.status === 'pending') {
          // Stale searching/pending ride — cancel on backend and don't restore
          try { await rideService.cancelRide(activeRide._id); } catch {}
        } else if (activeRide) {
          const captain = activeRide.captain;
          let driverObj: Driver | null = null;
          if (captain) {
            let coords = { latitude: 0, longitude: 0 };
            if (captain.location && Array.isArray(captain.location.coordinates)) {
              coords = { latitude: captain.location.coordinates[1], longitude: captain.location.coordinates[0] };
            }
            driverObj = {
              id: captain._id,
              name: `${captain.fullname?.firstname || ''} ${captain.fullname?.lastname || ''}`.trim(),
              phone: captain.phone || '',
              vehicleNumber: captain.vehicle?.number || '',
              vehicleType: captain.vehicle?.type || '',
              color: captain.vehicle?.color || '',
              location: coords,
            };
          }

          let status: RideStatus = 'searching';
          if (activeRide.status === 'accepted') status = 'driver_found';
          else if (activeRide.status === 'ongoing') status = 'ongoing';

          rideIdRef.current = activeRide._id;
          joinRideRoom(activeRide._id);

          setRide({
            id: activeRide._id,
            status,
            pickup: {
              address: activeRide.pickup,
              latitude: activeRide.pickupCoords?.lat ?? 0,
              longitude: activeRide.pickupCoords?.lng ?? 0,
            },
            destination: {
              address: activeRide.destination,
              latitude: activeRide.destinationCoords?.lat ?? 0,
              longitude: activeRide.destinationCoords?.lng ?? 0,
            },
            selectedVehicle: activeRide.vehicle,
            selectedDriver: driverObj,
            fare: activeRide.fare,
            otp: activeRide.otp || '',
            coupon: '',
            paymentMethod: 'wallet',
            rawRide: activeRide,
            isDriverNearPickup: false,
          });
        }
      } catch (e) {
        console.log('[RideContext] Could not restore active ride:', e);
      } finally {
        setIsRestoringRide(false);
      }
    };
    restoreActiveRide();
  }, []);

  const setPickup = useCallback((loc: Location) => {
    setRide((r) => ({ ...r, pickup: loc }));
  }, []);

  const setDestination = useCallback((loc: Location) => {
    setRide((r) => ({ ...r, destination: loc }));
  }, []);

  const clearDestination = useCallback(() => {
    setRide((r) => ({ ...r, destination: null }));
  }, []);

  const selectVehicle = useCallback((id: string, fare: number) => {
    setRide((r) => ({ ...r, selectedVehicle: id, fare }));
  }, []);

  const startSearch = async (distanceKm: number, fare: number) => {
    if (!ride.pickup || !ride.destination || !ride.selectedVehicle) {
      throw new Error('Please select pickup, destination, and vehicle');
    }
    setRide((current) => ({ ...current, status: 'searching' }));

    const createdRide = await rideService.createRide({
      pickup: ride.pickup.address,
      destination: ride.destination.address,
      vehicleType: ride.selectedVehicle === 'xl' ? 'car' : ride.selectedVehicle,
      paymentMethod: ride.paymentMethod === 'cash' ? 'cash' : 'online',
    });

    rideIdRef.current = createdRide._id;
    joinRideRoom(createdRide._id);

    setRide((current) => ({
      ...current,
      id: createdRide._id,
      status: 'searching',
      fare: createdRide.fare || fare,
      otp: createdRide.otp || '',
      rawRide: createdRide,
    }));
  };

  const cancelRide = async () => {
    if (ride.id) {
      try {
        await rideService.cancelRide(ride.id);
      } catch (e) {
        console.error('Error cancelling ride:', e);
      }
    }
    setRide((r) => ({
      ...r,
      id: null,
      status: 'idle',
      selectedDriver: null,
      otp: '',
      rawRide: null,
    }));
  };

  const completeRide = () => {
    setRide((r) => ({ ...r, status: 'completed' }));
  };

  const resetRideState = () => {
    setRide({
      id: null,
      status: 'idle',
      pickup: null,
      destination: null,
      selectedVehicle: null,
      selectedDriver: null,
      fare: 0,
      otp: '',
      coupon: '',
      paymentMethod: 'wallet',
      rawRide: null,
      isDriverNearPickup: false,
    });
  };

  const applyCoupon = (code: string): boolean => {
    if (code.trim().length >= 3) {
      setRide((r) => ({ ...r, coupon: code.toUpperCase() }));
      return true;
    }
    return false;
  };

  const setPaymentMethod = (method: 'wallet' | 'cash' | 'card') => {
    setRide((r) => ({ ...r, paymentMethod: method }));
  };

  return (
    <RideContext.Provider
      value={{
        ride,
        isRestoringRide,
        setPickup,
        setDestination,
        clearDestination,
        selectVehicle,
        startSearch,
        cancelRide,
        completeRide,
        applyCoupon,
        setPaymentMethod,
        resetRideState,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}
