import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useDriverRide } from '../contexts/DriverRideContext';
import { HeaderBar } from '../components/HeaderBar';
import { Colors, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getRideAddress, decodePolyline } from '../utils/ride';
import { api } from '../services/api';
import DriverMapView from '../components/DriverMapView';

export default function InRideScreen() {
  const router = useRouter();
  const { activeRide, finishRide, currentLocation } = useDriverRide();
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!activeRide && !cancelledRef.current) {
      cancelledRef.current = true;
      Alert.alert('Ride Cancelled', 'The ride was cancelled by the user.');
      router.replace('/(tabs)');
    }
  }, [activeRide]);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  const destCoords = activeRide?.destinationCoords
    ? { latitude: activeRide.destinationCoords.lat ?? activeRide.destinationCoords.latitude, longitude: activeRide.destinationCoords.lng ?? activeRide.destinationCoords.longitude }
    : null;

  const pickupCoords = activeRide?.pickupCoords
    ? { latitude: activeRide.pickupCoords.lat ?? activeRide.pickupCoords.latitude, longitude: activeRide.pickupCoords.lng ?? activeRide.pickupCoords.longitude }
    : null;

  // Fetch route from current location to destination
  useEffect(() => {
    if (!currentLocation || !destCoords) return;
    let cancelled = false;
    const fetchRoute = async () => {
      try {
        const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
        const dest = `${destCoords.latitude},${destCoords.longitude}`;
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
  }, [currentLocation?.latitude, currentLocation?.longitude, destCoords?.latitude, destCoords?.longitude]);

  const handleFinish = async () => {
    Alert.alert('Complete Ride', 'Have you reached the destination and received payment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'COMPLETE RIDE',
        onPress: async () => {
          try {
            await finishRide();
            router.replace('/ride-completed');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to complete ride');
          }
        },
      },
    ]);
  };

  const openGoogleMaps = () => {
    if (!destCoords) return;
    const { latitude, longitude } = destCoords;
    const url = Platform.select({
      ios: `comgooglemaps://?q=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    });
  };

  const riderName = activeRide?.user?.fullname
    ? `${activeRide.user.fullname.firstname || ''} ${activeRide.user.fullname.lastname || ''}`.trim()
    : 'Customer';

  return (
    <View style={styles.container}>
      <HeaderBar title="In Ride" showBack />
      <Text style={styles.subHeaderBanner}>Heading to Drop Location</Text>

      {/* Drop Location Card & Customer Info */}
      <TouchableOpacity style={[styles.dropCard, Shadows.card]} onPress={openGoogleMaps} activeOpacity={0.85}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={18} color={Colors.danger} />
          <View style={styles.addressWrapper}>
            <Text style={styles.labelRed}>Drop Location</Text>
            <Text style={styles.addressText}>
              {getRideAddress(activeRide?.destination, 'Destination')}
            </Text>
            {destCoords && (
              <Text style={styles.coordText}>{destCoords.latitude.toFixed(5)}, {destCoords.longitude.toFixed(5)}</Text>
            )}
          </View>
          <Ionicons name="navigate-circle" size={24} color={Colors.primary} />
        </View>

        <View style={styles.riderRow}>
          <Ionicons name="person-circle" size={32} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.riderName}>{riderName}</Text>
            <Text style={styles.riderPhone}>{activeRide?.user?.phone || 'Customer'}</Text>
          </View>
          <Text style={styles.fareBadge}>₹{activeRide?.fare || 0}</Text>
        </View>
      </TouchableOpacity>

      {/* Map — Current location to Drop route */}
      <View style={styles.mapCanvas}>
        <DriverMapView
          mode="in-ride"
          pickup={pickupCoords || activeRide?.pickup}
          destination={destCoords || activeRide?.destination}
          driverLocation={currentLocation || undefined}
          routeCoords={routeCoords}
        />
      </View>

      {/* Bottom Complete Ride Button */}
      <View style={[styles.bottomCard, Shadows.card]}>
        <TouchableOpacity style={styles.navBtn} onPress={openGoogleMaps} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color="#FFF" />
          <Text style={styles.navBtnText}>Navigate in Google Maps</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Trip Fare</Text>
            <Text style={styles.statValue}>₹{activeRide?.fare || 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Payment</Text>
            <Text style={styles.statValue}>CASH / ONLINE</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.completeBtn} onPress={handleFinish}>
          <Text style={styles.btnText}>Complete Ride & Collect Fare</Text>
          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
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
  dropCard: {
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
  addressWrapper: { marginLeft: 10, flex: 1 },
  labelRed: { fontSize: 10, fontWeight: '800', color: Colors.danger, textTransform: 'uppercase' },
  addressText: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  coordText: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: Colors.surfaceBorder },
  riderName: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  riderPhone: { fontSize: 12, color: Colors.textMuted },
  fareBadge: { fontSize: 16, fontWeight: '900', color: Colors.accentGreen },
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
  statValue: { fontSize: 16, fontWeight: '900', color: Colors.textDark, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.surfaceBorder },
  completeBtn: {
    backgroundColor: Colors.accentGreen,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});