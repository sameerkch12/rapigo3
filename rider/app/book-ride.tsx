import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRide } from '@/hooks/useRide';
import VehicleCard from '@/components/ride/VehicleCard';
import MapView, { Marker, Polyline } from '@/components/ui/MapView';
import { rideService } from '@/services/ride.service';
import { decodePolyline } from '@/utils/polyline';
import { FontWeight, Shadow } from '@/constants/theme';
import { BookRideSkeleton } from '@/components/ui/SkeletonLoader';

const VEHICLE_TYPES = [
  { id: 'bike', name: 'Bike', image: require('@/assets/images/Bike.jpeg'), description: '1 seat • 3 min', eta: 3, seats: 1, rating: 4.7, tag: 'Fastest', tagColor: '#2563EB' },
  { id: 'auto', name: 'Auto', image: require('@/assets/images/Auto.jpeg'), description: '3 seats • 6 min', eta: 6, seats: 3, rating: 4.5, tag: 'Affordable', tagColor: '#16A34A' },
  { id: 'car', name: 'Car', image: require('@/assets/images/Car.jpeg'), description: '4 seats • 8 min', eta: 8, seats: 4, rating: 4.8, tag: 'Premium', tagColor: '#9333EA' },
  { id: 'xl', name: 'Car XL', image: require('@/assets/images/CarXL.jpeg'), description: '6 seats • 10 min', eta: 10, seats: 6, rating: 4.9, tag: 'Spacious', tagColor: '#2563EB' },
];

const { height } = Dimensions.get('window');

export default function BookRideScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ride, selectVehicle, startSearch, applyCoupon, setPaymentMethod, setPickup, setDestination } = useRide();



  const MAP_HEIGHT = height * 0.36;

  // Calculate region that fits both pickup and drop zoomed in closely
  const mapRegion = useMemo(() => {
    if (ride.pickup && ride.destination) {
      const minLat = Math.min(ride.pickup.latitude, ride.destination.latitude);
      const maxLat = Math.max(ride.pickup.latitude, ride.destination.latitude);
      const minLng = Math.min(ride.pickup.longitude, ride.destination.longitude);
      const maxLng = Math.max(ride.pickup.longitude, ride.destination.longitude);
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      
      const latPad = Math.max(latDiff * 0.15, 0.008);
      const lngPad = Math.max(lngDiff * 0.15, 0.008);
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(latDiff + latPad * 2, 0.02),
        longitudeDelta: Math.max(lngDiff + lngPad * 2, 0.02),
      };
    }
    return {
      latitude: ride.pickup?.latitude || 21.2514,
      longitude: ride.pickup?.longitude || 81.6296,
      latitudeDelta: 0.025,
      longitudeDelta: 0.025,
    };
  }, [ride.pickup, ride.destination]);

  const [selectedId, setSelectedId] = useState<string>('bike');
  const [couponText, setCouponText] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [searching, setSearching] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  // Real data from /places/route API — replaces hardcoded Haversine + priceTable
  const [apiFares, setApiFares] = useState<Record<string, number>>({});
  const [apiDistanceKm, setApiDistanceKm] = useState<number>(0);
  const [loadingFare, setLoadingFare] = useState(true);

  // Fetch actual turn-by-turn road route coordinates between pickup and destination
  useEffect(() => {
    if (!ride.pickup || !ride.destination) {
      setRouteCoordinates([]);
      return;
    }

    setRouteCoordinates([]);
    setApiDistanceKm(0);
    setApiFares({});

    let isCancelled = false;

    const fetchRoadRoute = async () => {
      setLoadingFare(true);
      try {
        const pickupAddr = ride.pickup?.address || `${ride.pickup!.latitude},${ride.pickup!.longitude}`;
        const destAddr = ride.destination?.address || `${ride.destination!.latitude},${ride.destination!.longitude}`;

        const response = await rideService.getFare(pickupAddr, destAddr);

        if (isCancelled) return;

        // Decode the real driving route polyline; fall back to straight line
        const decoded = response.polyline ? decodePolyline(response.polyline) : [];
        if (decoded.length > 0) {
          setRouteCoordinates(decoded);
        } else {
          setRouteCoordinates([
            { latitude: ride.pickup!.latitude, longitude: ride.pickup!.longitude },
            { latitude: ride.destination!.latitude, longitude: ride.destination!.longitude },
          ]);
        }

        if (response.distanceTime?.distance?.value) {
          setApiDistanceKm(Math.round((response.distanceTime.distance.value / 1000) * 10) / 10);
        }
        if (response.fare) {
          const fares: Record<string, number> = {
            bike: response.fare.bike || 0,
            auto: response.fare.auto || 0,
            car: response.fare.car || 0,
            xl: Math.round((response.fare.car || 0) * 1.4),
          };
          setApiFares(fares);
          selectVehicle(selectedId, fares[selectedId] || 0);
        }
      } catch (err) {
        if (isCancelled) return;
        console.warn('Fetching fare from backend failed:', err);
        setRouteCoordinates([
          { latitude: ride.pickup!.latitude, longitude: ride.pickup!.longitude },
          { latitude: ride.destination!.latitude, longitude: ride.destination!.longitude },
        ]);
      } finally {
        if (!isCancelled) setLoadingFare(false);
      }
    };

    fetchRoadRoute();

    return () => {
      isCancelled = true;
    };
  }, [ride.pickup?.address, ride.pickup?.latitude, ride.pickup?.longitude, ride.destination?.address, ride.destination?.latitude, ride.destination?.longitude]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);

  const slideAnim = useRef(new Animated.Value(height * 0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    selectVehicle(id, apiFares[id] || 0);
  };

  const handleSwapRoute = () => {
    if (ride.pickup && ride.destination) {
      const temp = ride.pickup;
      setPickup(ride.destination);
      setDestination(temp);
    }
  };

  const handleCoupon = () => {
    const result = applyCoupon(couponText);
    if (result) {
      setCouponApplied(true);
      setCouponError('');
      setShowCouponModal(false);
    } else {
      setCouponError('Invalid coupon code');
    }
  };

  const handleBook = async () => {
    setSearching(true);
    try {
      await startSearch(apiDistanceKm, currentFare); // fare bhi bhejo — backend dobara calculate nahi karega
      router.push('/live-tracking');
    } catch (error) {
      console.error('Booking failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const getFare = (id: string) => apiFares[id] || 0;
  const currentFare = getFare(selectedId);
  const discountedFare = couponApplied ? Math.round(currentFare * 0.7) : currentFare;
  const selectedVehicleObj = VEHICLE_TYPES.find((v) => v.id === selectedId) || VEHICLE_TYPES[0];

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: 'payments' },
    { id: 'wallet', label: 'Wallet', icon: 'account-balance-wallet' },
    { id: 'card', label: 'Card', icon: 'credit-card' },
  ] as const;

  const currentPaymentLabel = paymentMethods.find((p) => p.id === ride.paymentMethod)?.label || 'Cash';

  const [mapReady, setMapReady] = useState(false);

  if (loadingFare) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={[styles.mapArea, { height: MAP_HEIGHT, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
        <View style={[styles.sheet]}>
          <BookRideSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Clean Interactive Map View */}
      <View style={[styles.mapArea, { height: MAP_HEIGHT }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          region={mapRegion}
          onMapReady={() => setMapReady(true)}
        >
          {ride.pickup && (
            <Marker
              key={`pickup-${ride.pickup.latitude}-${ride.pickup.longitude}`}
              coordinate={{ latitude: ride.pickup.latitude, longitude: ride.pickup.longitude }}
              pinColor="#16A34A"
            />
          )}
          {ride.destination && (
            <Marker
              key={`drop-${ride.destination.latitude}-${ride.destination.longitude}`}
              coordinate={{ latitude: ride.destination.latitude, longitude: ride.destination.longitude }}
              pinColor="#DC2626"
            />
          )}
          {routeCoordinates.length > 0 && (
            <Polyline
              key={`route-${routeCoordinates.length}`}
              coordinates={routeCoordinates}
              strokeColor="#2563EB"
              strokeWidth={5}
            />
          )}
        </MapView>

        {/* Back Button (Top Left) */}
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        {/* Distance Badge (Top Right) */}
        <View style={[styles.distanceBadge, { top: insets.top + 12 }]}>
          <MaterialIcons name="map" size={16} color="#2563EB" />
          <Text style={styles.distanceText}>{apiDistanceKm > 0 ? `${apiDistanceKm} km` : '...'}</Text>
        </View>
      </View>

      {/* Bottom Sheet Card */}
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 12 },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <>
        {/* Location Summary Box with Green/Red Edit Buttons & Swap Arrow */}
        <View style={styles.locationContainerRow}>
          <View style={styles.locationSummaryBox}>
            {/* Pickup Row */}
            <View style={styles.locRow}>
              <View style={[styles.locRing, { borderColor: '#16A34A' }]}>
                <View style={[styles.locDot, { backgroundColor: '#16A34A' }]} />
              </View>
              <Text style={styles.locText} numberOfLines={1}>
                {ride.pickup?.address || 'Pickup location'}
              </Text>
              <TouchableOpacity
                style={[styles.editPillBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                onPress={() => router.push('/select-on-map?type=pickup' as any)}
              >
                <MaterialIcons name="edit" size={13} color="#16A34A" />
                <Text style={[styles.editPillText, { color: '#16A34A' }]}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Dotted Line */}
            <View style={styles.locDottedLine} />

            {/* Drop Row */}
            <View style={styles.locRow}>
              <View style={[styles.locRing, { borderColor: '#DC2626' }]}>
                <View style={[styles.locDot, { backgroundColor: '#DC2626' }]} />
              </View>
              <Text style={styles.locText} numberOfLines={1}>
                {ride.destination?.address || 'Drop location'}
              </Text>
              <TouchableOpacity
                style={[styles.editPillBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                onPress={() => router.push('/select-on-map?type=destination' as any)}
              >
                <MaterialIcons name="edit" size={13} color="#DC2626" />
                <Text style={[styles.editPillText, { color: '#DC2626' }]}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Swap Vertical Button */}
          <TouchableOpacity style={styles.swapVerticalBtn} onPress={handleSwapRoute}>
            <MaterialIcons name="swap-vert" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* Section Heading */}
        <Text style={styles.chooseTitle}>Choose a ride</Text>

        {/* Vehicles List */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {VEHICLE_TYPES.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              fare={getFare(v.id)}
              selected={selectedId === v.id}
              onSelect={() => handleSelect(v.id)}
            />
          ))}
        </ScrollView>

        {/* Bottom Payment & Offers Controls Row */}
        <View style={styles.bottomControlsRow}>
          <TouchableOpacity 
            style={styles.controlPill} 
            onPress={() => setShowPaymentModal(true)}
          >
            <MaterialIcons name="payment" size={18} color="#2563EB" />
            <Text style={styles.controlLabel}>{currentPaymentLabel}</Text>
            <MaterialIcons name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.controlPill} 
            onPress={() => setShowCouponModal(true)}
          >
            <MaterialIcons name="percent" size={18} color="#2563EB" />
            <Text style={styles.controlLabel}>
              {couponApplied ? 'Offers Applied' : 'Offers'}
            </Text>
            <MaterialIcons name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Book Ride Button */}
        <TouchableOpacity
          style={[styles.bookRideButton, searching && styles.bookRideButtonDisabled]}
          onPress={handleBook}
          disabled={searching}
          activeOpacity={0.85}
        >
          <MaterialIcons name="local-taxi" size={20} color="#FFFFFF" />
          <Text style={styles.bookRideButtonText}>
            {searching ? 'Finding Driver...' : `Book ${selectedVehicleObj.name} • ₹${discountedFare}`}
          </Text>
        </TouchableOpacity>
        </>
      </Animated.View>

      {/* Payment Selection Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            {paymentMethods.map((pm) => (
              <TouchableOpacity
                key={pm.id}
                style={styles.modalRow}
                onPress={() => {
                  setPaymentMethod(pm.id);
                  setShowPaymentModal(false);
                }}
              >
                <MaterialIcons name={pm.icon} size={22} color="#2563EB" />
                <Text style={styles.modalRowText}>{pm.label}</Text>
                {ride.paymentMethod === pm.id && (
                  <MaterialIcons name="check" size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPaymentModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Offers / Coupon Modal */}
      <Modal visible={showCouponModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply Offer / Coupon</Text>
            <TextInput
              style={styles.couponInputModal}
              placeholder="Enter coupon code (e.g. RAPIGO30)"
              placeholderTextColor="#94A3B8"
              value={couponText}
              onChangeText={(t) => { setCouponText(t); setCouponError(''); }}
              autoCapitalize="characters"
            />
            {couponError ? <Text style={styles.errorTextModal}>{couponError}</Text> : null}
            <TouchableOpacity style={styles.applyBtnModal} onPress={handleCoupon}>
              <Text style={styles.applyBtnTextModal}>Apply Offer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCouponModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mapArea: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  distanceBadge: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: FontWeight.extrabold,
    color: '#0F172A',
  },
  backBtn: {
    position: 'absolute',
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
    zIndex: 10,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
    ...Shadow.lg,
  },
  locationContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  locationSummaryBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 10,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  locText: {
    flex: 1,
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
  },
  locDottedLine: {
    width: 1,
    height: 12,
    borderStyle: 'dashed',
    borderLeftWidth: 1,
    borderColor: '#CBD5E1',
    marginLeft: 6,
    marginVertical: 3,
  },
  editPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  editPillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  swapVerticalBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseTitle: {
    fontSize: 15,
    fontWeight: FontWeight.extrabold,
    color: '#0F172A',
    marginBottom: 8,
  },
  bottomControlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  controlPill: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  controlLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
  },
  bookRideButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    ...Shadow.md,
  },
  bookRideButtonDisabled: {
    opacity: 0.7,
  },
  bookRideButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: FontWeight.extrabold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: FontWeight.extrabold,
    color: '#0F172A',
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
  },
  couponInputModal: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  errorTextModal: {
    color: '#DC2626',
    fontSize: 11,
    marginBottom: 10,
  },
  applyBtnModal: {
    backgroundColor: '#2563EB',
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  applyBtnTextModal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  closeBtn: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  closeBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
});
