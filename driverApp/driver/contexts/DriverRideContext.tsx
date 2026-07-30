import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useDriverAuth } from './DriverAuthContext';
import { captainService } from '../services/api';
import {
  subscribeToNewRide,
  subscribeToRideCancelled,
  subscribeToRideUnavailable,
  updateCaptainLocation,
  joinRideRoom,
} from '../services/socket';

interface DriverRideContextType {
  isOnline: boolean;
  isRestoringRide: boolean;
  activeRide: any | null;
  requests: any[];
  currentLocation: { latitude: number; longitude: number } | null;
  toggleOnline: () => Promise<void>;
  acceptRide: (rideId: string) => Promise<any>;
  startRideWithOtp: (otp: string) => Promise<any>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; message?: string; ride?: any }>;
  reachedPickup: () => Promise<void>;
  finishRide: () => Promise<any>;
  fetchRequests: () => Promise<void>;
  fetchActiveRides: () => Promise<void>;
  setActiveRide: (ride: any | null) => void;
  dismissRequest: (rideId: string) => void;
  requestLocationPermission: () => Promise<boolean>;
}

const DriverRideContext = createContext<DriverRideContextType | undefined>(undefined);

const normalizeRideForDriverUi = (ride: any) => {
  if (!ride) return ride;
  if (ride.status === 'accepted') {
    return { ...ride, status: 'driver_assigned' };
  }
  return ride;
};

export const DriverRideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { driver } = useDriverAuth();
  const [isOnline, setIsOnline] = useState<boolean>(driver?.status === 'active');
  const [isRestoringRide, setIsRestoringRide] = useState<boolean>(true);
  const [activeRide, setActiveRide] = useState<any | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (driver) {
      setIsOnline(driver.status === 'active');
    }
  }, [driver?.status]);

  useEffect(() => {
    if (!driver) return;

    const checkPermission = async () => {
      await requestLocationPermission();
    };

    checkPermission();
    fetchActiveRides();
  }, [driver]);

  // Request Location Permission
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      if (!('geolocation' in navigator)) {
        Alert.alert('Location Unavailable', 'Your browser does not support location services.');
        return false;
      }

      try {
        if ('permissions' in navigator) {
          const permissionStatus = await (navigator as any).permissions.query({ name: 'geolocation' });
          if (permissionStatus.state === 'granted') {
            return true;
          }
          if (permissionStatus.state === 'prompt') {
            return new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(
                () => resolve(true),
                () => {
                  Alert.alert(
                    'Location Permission Required',
                    'Please enable location access in your browser settings to go Online.'
                  );
                  resolve(false);
                }
              );
            });
          }
          Alert.alert(
            'Location Permission Required',
            'Please enable location access in your browser settings to go Online.'
          );
          return false;
        }

        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => {
              Alert.alert('Location Permission Required', 'Please enable location access in your browser settings to go Online.');
              resolve(false);
            }
          );
        });
      } catch (err) {
        console.warn('Error requesting browser location permission:', err);
        Alert.alert('Location Permission Required', 'Please enable location access in your browser settings to go Online.');
        return false;
      }
    }

    try {
      const currentPermissions = await Location.getForegroundPermissionsAsync();
      if (currentPermissions.status === 'granted') {
        return true;
      }

      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        return true;
      }

      Alert.alert(
        'Location Permission Required',
        canAskAgain
          ? 'RapiGo Captain needs your GPS location permission to detect nearby rides and share live trip navigation. Please grant location access to go Online.'
          : 'Location access is blocked. Please enable location permission from your device settings to continue.'
      );
      return false;
    } catch (err) {
      console.warn('Error requesting location permission:', err);
      Alert.alert('Location Permission Required', 'Please enable location access from your device settings to go Online.');
      return false;
    }
  };

  // Listen to socket new-ride events when online
  useEffect(() => {
    if (!driver || !isOnline) {
      setRequests([]);
      return;
    }

    subscribeToNewRide((newRide: any) => {
      console.log('[DriverRideContext] New ride incoming:', newRide);
      setRequests((prev) => {
        const exists = prev.some((r) => r._id === newRide._id);
        if (exists) return prev;
        return [newRide, ...prev];
      });
    });

    subscribeToRideCancelled((cancelledRide: any) => {
      console.log('[DriverRideContext] Ride cancelled by rider:', cancelledRide);
      setRequests((prev) => prev.filter((r) => r._id !== cancelledRide._id));
      if (activeRide && activeRide._id === cancelledRide._id) {
        setActiveRide(null);
      }
    });

    subscribeToRideUnavailable((data) => {
      console.log('[DriverRideContext] Ride unavailable:', data);
      setRequests((prev) => prev.filter((r) => r._id !== data.rideId));
    });
  }, [driver, isOnline, activeRide]);

  // Real GPS Location Streaming to backend
  useEffect(() => {
    if (!driver || !isOnline) return;

    let locationSubscription: any = null;
    let watchId: number | null = null;
    let fallbackInterval: any = null;

    const startGpsTracking = async () => {
      if (Platform.OS === 'web') {
        if ('geolocation' in navigator) {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setCurrentLocation({ latitude: lat, longitude: lng });
              updateCaptainLocation(driver._id, lat, lng, activeRide?._id);
            },
            (err) => console.warn('Browser geolocation watch error:', err),
            { enableHighAccuracy: true, maximumAge: 5000 }
          );
        }
      } else {
        try {
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 5000,
              distanceInterval: 5,
            },
            (loc) => {
              const lat = loc.coords.latitude;
              const lng = loc.coords.longitude;
              setCurrentLocation({ latitude: lat, longitude: lng });
              updateCaptainLocation(driver._id, lat, lng, activeRide?._id);
            }
          );
        } catch (err) {
          console.warn('Expo location watch position error:', err);
          fallbackInterval = setInterval(async () => {
            try {
              const currentLoc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              const lat = currentLoc.coords.latitude;
              const lng = currentLoc.coords.longitude;
              setCurrentLocation({ latitude: lat, longitude: lng });
              updateCaptainLocation(driver._id, lat, lng, activeRide?._id);
            } catch (err) {
              console.warn('Fallback location fetch failed:', err);
            }
          }, 8000);
        }
      }
    };

    const initializeLocationTracking = async () => {
      const permitted = await requestLocationPermission();
      if (!permitted) {
        setIsOnline(false);
        return;
      }
      await startGpsTracking();
    };

    initializeLocationTracking();

    return () => {
      if (locationSubscription && locationSubscription.remove) {
        locationSubscription.remove();
      }
      if (watchId !== null && Platform.OS === 'web' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [driver, isOnline, activeRide?._id]);

  const fetchRequests = async () => {
    setRequests((prev: any[]) => prev);
  };

  const fetchActiveRides = async () => {
    try {
      const { ride } = await captainService.getActiveRide();
      if (ride) {
        const normalized = normalizeRideForDriverUi(ride);
        setActiveRide(normalized);
        if (normalized._id) {
          joinRideRoom(normalized._id);
        }
      }
    } catch (e) {
      console.log('[DriverRideContext] Could not restore active ride:', e);
    } finally {
      setIsRestoringRide(false);
    }
  };

  const toggleOnline = async () => {
    if (!isOnline) {
      // Must verify location permission first before going Online!
      const permitted = await requestLocationPermission();
      if (!permitted) {
        return;
      }

      // Initial immediate GPS position fetch
      try {
        if (Platform.OS === 'web' && 'geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setCurrentLocation({ latitude: lat, longitude: lng });
            if (driver) {
              updateCaptainLocation(driver._id, lat, lng, activeRide?._id);
            }
          });
        } else {
          const currentLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const lat = currentLoc.coords.latitude;
          const lng = currentLoc.coords.longitude;
          setCurrentLocation({ latitude: lat, longitude: lng });
          if (driver) {
            updateCaptainLocation(driver._id, lat, lng, activeRide?._id);
          }
        }
      } catch (e) {
        console.warn('Initial GPS fetch error:', e);
      }
    }

    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    if (driver) {
      await captainService.updateProfile({ status: nextStatus ? 'active' : 'inactive' }).catch(() => undefined);
    }
  };

  const dismissRequest = (rideId: string) => {
    setRequests((prev) => prev.filter((r) => r._id !== rideId));
  };

  const acceptRide = async (rideId: string) => {
    const confirmedRide = await captainService.confirmRide(rideId);
    const uiRide = normalizeRideForDriverUi(confirmedRide);
    setActiveRide(uiRide);
    joinRideRoom(rideId);
    setRequests((prev) => prev.filter((r) => r._id !== rideId));
    return uiRide;
  };

  const startRideWithOtp = async (otp: string) => {
    if (!activeRide) throw new Error('No active ride');
    const startedRide = await captainService.startRide(activeRide._id, otp);
    setActiveRide(startedRide);
    return startedRide;
  };

  const verifyOtp = async (otp: string) => {
    try {
      const ride = await startRideWithOtp(otp);
      return { success: true, ride };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const reachedPickup = async () => {
    setActiveRide((prev: any | null) => (prev ? { ...prev, status: 'reached_pickup' } : prev));
  };

  const finishRide = async () => {
    if (!activeRide) throw new Error('No active ride');
    const endedRide = await captainService.endRide(activeRide._id);
    setActiveRide(endedRide);
    return { success: true, ride: endedRide };
  };

  return (
    <DriverRideContext.Provider
      value={{
        isOnline,
        isRestoringRide,
        activeRide,
        requests,
        currentLocation,
        toggleOnline,
        acceptRide,
        startRideWithOtp,
        verifyOtp,
        reachedPickup,
        finishRide,
        fetchRequests,
        fetchActiveRides,
        setActiveRide,
        dismissRequest,
        requestLocationPermission,
      }}
    >
      {children}
    </DriverRideContext.Provider>
  );
};

export const useDriverRide = () => {
  const context = useContext(DriverRideContext);
  if (!context) {
    throw new Error('useDriverRide must be used within a DriverRideProvider');
  }
  return context;
};
