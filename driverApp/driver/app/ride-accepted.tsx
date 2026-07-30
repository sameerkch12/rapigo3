import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Linking, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDriverRide } from '../contexts/DriverRideContext';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { HeaderBar } from '../components/HeaderBar';
import { Colors, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getRideAddress, getRideDistanceKm, getPickupDistanceKm, getEtaMinutes, decodePolyline } from '../utils/ride';
import { api } from '../services/api';
import DriverMapView from '../components/DriverMapView';

export default function RideAcceptedScreen() {
  const router = useRouter();
  const { activeRide, reachedPickup, currentLocation } = useDriverRide();
  const { driver } = useDriverAuth();
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!activeRide && !cancelledRef.current) {
      cancelledRef.current = true;
      Alert.alert('Ride Cancelled', 'The ride was cancelled by the user.');
      router.replace('/(tabs)');
    }
  }, [activeRide]);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  const pickupAddress = getRideAddress(activeRide?.pickup, 'Pickup location');
  const dropAddress = getRideAddress(activeRide?.destination, 'Drop location');

  const pickupCoords = activeRide?.pickupCoords
    ? { latitude: activeRide.pickupCoords.lat ?? activeRide.pickupCoords.latitude, longitude: activeRide.pickupCoords.lng ?? activeRide.pickupCoords.longitude }
    : null;
  const destCoords = activeRide?.destinationCoords
    ? { latitude: activeRide.destinationCoords.lat ?? activeRide.destinationCoords.latitude, longitude: activeRide.destinationCoords.lng ?? activeRide.destinationCoords.longitude }
    : null;

  const distanceToPickup = currentLocation && pickupCoords
    ? getPickupDistanceKm(currentLocation.latitude, currentLocation.longitude, pickupCoords)
    : 0;
  const etaMinutes = getEtaMinutes(distanceToPickup);
  const totalDistance = activeRide?.distanceKm || getRideDistanceKm(activeRide?.distance);

  // Fetch road route from driver to pickup
  useEffect(() => {
    if (!currentLocation || !pickupCoords) return;
    let cancelled = false;
    const fetchRoute = async () => {
      try {
        const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
        const dest = `${pickupCoords.latitude},${pickupCoords.longitude}`;
        const res: any = await api(`/map/get-distance-time?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`);
        if (cancelled) return;
        if (res.polyline) {
          const decoded = decodePolyline(res.polyline);
          if (decoded.length > 0) setRouteCoords(decoded);
        }
      } catch {
        if (!cancelled) setRouteCoords([]);
      }
    };
    fetchRoute();
    return () => { cancelled = true; };
  }, [currentLocation?.latitude, currentLocation?.longitude, pickupCoords?.latitude, pickupCoords?.longitude]);

  const handleReachedPickup = async () => {
    await reachedPickup();
    router.replace('/at-pickup');
  };

  const openGoogleMaps = () => {
    if (!pickupCoords) return;
    const { latitude, longitude } = pickupCoords;
    const url = Platform.select({
      ios: `comgooglemaps://?q=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    });
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="Ride Accepted" showSupport showOptions />

      <Text style={styles.subHeaderBanner}>Head to Pickup</Text>

      {/* Top Address Summary Card */}
      <TouchableOpacity style={[styles.addressCard, Shadows.card]} onPress={openGoogleMaps} activeOpacity={0.85}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={18} color={Colors.accentGreen} />
          <View style={styles.addressTextWrapper}>
            <Text style={styles.labelGreen}>Pickup</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {pickupAddress}
            </Text>
            {pickupCoords && (
              <Text style={styles.coordText}>{pickupCoords.latitude.toFixed(5)}, {pickupCoords.longitude.toFixed(5)}</Text>
            )}
          </View>
          <View style={styles.distBadge}>
            <Text style={styles.distText}>{distanceToPickup} km</Text>
            <TouchableOpacity style={styles.compassBtn} onPress={openGoogleMaps}>
              <Ionicons name="navigate-circle" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.lineDivider} />

        <View style={styles.addressRow}>
          <Ionicons name="location" size={18} color={Colors.danger} />
          <View style={styles.addressTextWrapper}>
            <Text style={styles.labelRed}>Drop</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {dropAddress}
            </Text>
            {destCoords && (
              <Text style={styles.coordText}>{destCoords.latitude.toFixed(5)}, {destCoords.longitude.toFixed(5)}</Text>
            )}
          </View>
          <Text style={styles.totalDistText}>{totalDistance || '--'} km</Text>
        </View>
      </TouchableOpacity>

      {/* Real Map — Driver to Pickup route */}
      <View style={styles.mapCanvas}>
        <DriverMapView
          mode="to-pickup"
          pickup={pickupCoords || activeRide?.pickup}
          driverLocation={currentLocation || undefined}
          routeCoords={routeCoords}
        />
      </View>

      {/* Bottom Action Floating Card */}
      <View style={[styles.bottomCard, Shadows.card]}>
        <TouchableOpacity style={styles.navBtn} onPress={openGoogleMaps} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color="#FFF" />
          <Text style={styles.navBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Time to reach</Text>
            <Text style={styles.statValue}>{etaMinutes} min</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{distanceToPickup} km</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.reachedBtn} onPress={handleReachedPickup}>
          <Text style={styles.btnText}>Reached Pickup</Text>
          <Ionicons name="chevron-forward-circle" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  subHeaderBanner: {
    backgroundColor: Colors.primary,
    color: '#FFF',
    textAlign: 'center',
    paddingBottom: 10,
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.9,
  },
  addressCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: -4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    zIndex: 10,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addressTextWrapper: { flex: 1, marginLeft: 10 },
  labelGreen: { fontSize: 10, fontWeight: '800', color: Colors.accentGreen, textTransform: 'uppercase' },
  labelRed: { fontSize: 10, fontWeight: '800', color: Colors.danger, textTransform: 'uppercase' },
  addressText: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  coordText: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  distBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  compassBtn: { padding: 2 },
  totalDistText: { fontSize: 12, fontWeight: '800', color: Colors.textMuted },
  lineDivider: { height: 1, backgroundColor: Colors.surfaceBorder, marginVertical: 8 },
  mapCanvas: { flex: 1, backgroundColor: '#EBF3FB', alignItems: 'center', justifyContent: 'center' },
  bottomCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 44,
    marginBottom: 12,
  },
  navBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statCol: { alignItems: 'center' },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '900', color: Colors.textDark, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.surfaceBorder },
  reachedBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});