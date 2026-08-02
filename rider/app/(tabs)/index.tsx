import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { useAuth } from '@/hooks/useAuth';
import { useRide } from '@/hooks/useRide';
import { useCurrentPickupLocation } from '@/hooks/useCurrentPickupLocation';
import { HomeServiceId } from '@/constants/home';
import HomeHeader from '@/components/home/HomeHeader';
import LocationSearchCard from '@/components/home/LocationSearchCard';
import QuickServicesGrid from '@/components/home/QuickServicesGrid';
import RidePassBanner from '@/components/home/RidePassBanner';
import RecentPlacesList from '@/components/home/RecentPlacesList';
import SectionHeader from '@/components/home/SectionHeader';
import { Colors, FontWeight, Shadow } from '@/constants/theme';
import { mapService } from '@/services/map.service';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

type Suggestion = { placeId: string; description: string; primaryText: string };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { ride, setPickup, setDestination, clearDestination } = useRide();
  const { pickupText, isLocating } = useCurrentPickupLocation();

  const [pickupInput, setPickupInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [activeField, setActiveField] = useState<'pickup' | 'destination' | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingManual, setIsLocatingManual] = useState(false);

  const isEditingPickup = useRef(false);
  const isEditingDestination = useRef(false);
  const destinationRef = useRef<TextInput>(null!);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 13, bounciness: 4 }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Clear destination & auto-focus destination field every time home screen gains focus
  useFocusEffect(
    useCallback(() => {
      clearDestination();
      setDestinationInput('');
      isEditingDestination.current = false;
      setTimeout(() => destinationRef.current?.focus(), 500);
    }, [clearDestination])
  );

  // Sync pickup input text when current location is resolved
  useEffect(() => {
    if (ride.pickup && !isEditingPickup.current) {
      setPickupInput(ride.pickup.address);
    }
  }, [ride.pickup]);

  const openBooking = () => router.push('/location-search' as any);
  const openWallet = () => router.push('/wallet');
  const openPass = () => router.push('/monthly-pass');
  const handleSelectOnMap = () => {
    const field = activeField || 'destination';
    router.push(`/select-on-map?type=${field}` as any);
  };

  const handleServicePress = (serviceId: HomeServiceId) => {
    if (serviceId === 'parcel') {
      router.push('/parcel');
      return;
    }
    if (serviceId === 'pass') {
      openPass();
      return;
    }
    openBooking();
  };

  // Handle typing inside Pickup or Destination fields
  const handleInputChange = async (text: string, field: 'pickup' | 'destination') => {
    if (field === 'pickup') {
      isEditingPickup.current = true;
      setPickupInput(text);
    } else {
      isEditingDestination.current = true;
      setDestinationInput(text);
    }

    setActiveField(field);

    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await mapService.getSuggestions(text);
      console.log('[Suggestions Result]', response);

      if (Array.isArray(response)) {
        const formatted = response.map((item: any) => {
          const desc = typeof item === 'string' ? item : (item.description || item.name || String(item));
          return {
            placeId: desc,
            description: desc,
            primaryText: desc.split(',')[0] || desc,
          };
        });
        setSuggestions(formatted);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select place from the dropdown list
  const handleSelectPlace = async (place: Suggestion) => {
    setIsSearching(true);
    try {
      const coordinates = await mapService.getCoordinates(place.description);
      console.log('[Selected Place Coordinates]', coordinates);
      const location = {
        address: place.description,
        latitude: coordinates.ltd,
        longitude: coordinates.lng,
      };

      if (activeField === 'pickup') {
        setPickup(location);
        setPickupInput(location.address);
        isEditingPickup.current = false;
        
        // If destination is already set, jump straight to booking page
        if (ride.destination) {
          router.push('/book-ride');
        }
      } else {
        setDestination(location);
        setDestinationInput(location.address);
        isEditingDestination.current = false;

        // Ensure pickup exists before jumping to booking page
        if (!ride.pickup) {
          setPickup({
            address: 'Current Location, Raipur',
            latitude: 21.2514,
            longitude: 81.6296,
          });
        }
        router.push('/book-ride');
      }
    } catch (err) {
      console.error('Error getting location details:', err);
    } finally {
      setIsSearching(false);
      setActiveField(null);
      setSuggestions([]);
    }
  };

  // Request current GPS position manually (on clicking locate button)
  const handleLocateMe = async () => {
    setIsLocatingManual(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        setIsLocatingManual(false);
        return;
      }

      // Get last known instantly, then refine in background
      let lat = 21.2514;
      let lng = 81.6296;
      try {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 30000 });
        if (last) {
          lat = last.coords.latitude;
          lng = last.coords.longitude;
        }
      } catch {
        // fallback
      }

      // Show fast result with cached location
      setPickup({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, latitude: lat, longitude: lng });
      setPickupInput('Locating...');
      isEditingPickup.current = true;

      // Refine with fresh GPS in background
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }).then(async (fresh) => {
        const { latitude, longitude } = fresh.coords;
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

        if (Platform.OS !== 'web') {
          try {
            const [rev] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (rev) {
              address = [rev.name, rev.street, rev.district, rev.city, rev.region]
                .filter(Boolean).join(', ') || address;
            }
          } catch {
            // use lat/lng
          }
        }

        setPickup({ address, latitude, longitude });
        setPickupInput(address);
        isEditingPickup.current = false;
      }).catch(() => {
        const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setPickupInput(fallback);
        isEditingPickup.current = false;
      }).finally(() => {
        setIsLocatingManual(false);
      });
    } catch (err) {
      console.error('Manual locate failed:', err);
      setIsLocatingManual(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <HomeHeader
            firstName={user?.name?.split(' ')[0] ?? 'Rider'}
            greeting={getGreeting()}
            walletBalance={user?.walletBalance ?? 0}
            onWalletPress={openWallet}
          />

          {/* Inline search card */}
          <LocationSearchCard
            pickupValue={pickupInput}
            onChangePickup={(text) => handleInputChange(text, 'pickup')}
            destinationValue={destinationInput}
            onChangeDestination={(text) => handleInputChange(text, 'destination')}
            isLocating={isLocating || isLocatingManual}
            onFocusPickup={() => setActiveField('pickup')}
            onFocusDestination={() => setActiveField('destination')}
            onLocateMe={handleLocateMe}
            onSelectOnMap={handleSelectOnMap}
            destinationRef={destinationRef}
          />

          {/* Suggestions Dropdown overlay */}
          {activeField && 
           ((activeField === 'pickup' && pickupInput.trim().length >= 3) || 
            (activeField === 'destination' && destinationInput.trim().length >= 3)) && 
           (isSearching || suggestions.length > 0) && (
            <View style={styles.dropdown}>
              {isSearching && (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              )}

              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.placeId}
                  style={styles.suggestionRow}
                  onPress={() => handleSelectPlace(item)}
                >
                  <MaterialIcons name="location-on" size={20} color={Colors.primary} />
                  <View style={styles.suggestionTextWrap}>
                    <Text style={styles.suggestionPrimary} numberOfLines={1}>
                      {item.primaryText}
                    </Text>
                    <Text style={styles.suggestionSecondary} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <SectionHeader title="Quick Services" onSeeAll={openBooking} />
          <QuickServicesGrid onServicePress={handleServicePress} />

          <Text style={styles.offerTitle}>Offers & Deals</Text>
          <RidePassBanner onPress={openPass} />

          <SectionHeader title="Recent Places" onSeeAll={openBooking} />
          <RecentPlacesList onPlacePress={openBooking} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 16,
  },
  offerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: FontWeight.extrabold,
    marginBottom: 10,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    marginTop: -16,
    marginBottom: 20,
    ...Shadow.md,
    zIndex: 100,
  },
  loaderContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionPrimary: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: FontWeight.bold,
  },
  suggestionSecondary: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 14,
  },
});
