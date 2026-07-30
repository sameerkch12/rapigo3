import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useDriverRide } from '../contexts/DriverRideContext';
import { HeaderBar } from '../components/HeaderBar';
import { Colors, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getRideAddress, decodePolyline } from '../utils/ride';
import { api } from '../services/api';
import DriverMapView from '../components/DriverMapView';

export default function AtPickupScreen() {
  const router = useRouter();
  const { activeRide, startRideWithOtp, currentLocation } = useDriverRide();
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!activeRide && !cancelledRef.current) {
      cancelledRef.current = true;
      Alert.alert('Ride Cancelled', 'The ride was cancelled by the user.');
      router.replace('/(tabs)');
    }
  }, [activeRide]);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  const pickupCoords = activeRide?.pickupCoords
    ? { latitude: activeRide.pickupCoords.lat ?? activeRide.pickupCoords.latitude, longitude: activeRide.pickupCoords.lng ?? activeRide.pickupCoords.longitude }
    : null;

  // Fetch route from current location to destination (for after ride starts)
  const destCoords = activeRide?.destinationCoords
    ? { latitude: activeRide.destinationCoords.lat ?? activeRide.destinationCoords.latitude, longitude: activeRide.destinationCoords.lng ?? activeRide.destinationCoords.longitude }
    : null;

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

  const handleStartRide = async () => {
    if (!enteredOtp || enteredOtp.length < 6) {
      Alert.alert('OTP Required', 'Please ask customer for the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await startRideWithOtp(enteredOtp);
      router.replace('/in-ride');
    } catch (err: any) {
      Alert.alert('Invalid OTP', err.message || 'Please enter correct 6-digit customer OTP.');
    } finally {
      setLoading(false);
    }
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

  const riderName = activeRide?.user?.fullname
    ? `${activeRide.user.fullname.firstname || ''} ${activeRide.user.fullname.lastname || ''}`.trim()
    : 'Customer';

  return (
    <View style={styles.container}>
      <HeaderBar title="At Pickup" showBack />
      <Text style={styles.subHeaderBanner}>Waiting for customer</Text>

      {/* Pickup Address & Passenger Card */}
      <TouchableOpacity style={[styles.pickupCard, Shadows.card]} onPress={openGoogleMaps} activeOpacity={0.85}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={18} color={Colors.accentGreen} />
          <View style={styles.addressWrapper}>
            <Text style={styles.labelGreen}>Pickup Location</Text>
            <Text style={styles.addressText}>{getRideAddress(activeRide?.pickup, 'Pickup point')}</Text>
            {pickupCoords && (
              <Text style={styles.coordText}>{pickupCoords.latitude.toFixed(5)}, {pickupCoords.longitude.toFixed(5)}</Text>
            )}
          </View>
          <Ionicons name="navigate-circle" size={24} color={Colors.primary} />
        </View>

        <View style={styles.riderRow}>
          <Ionicons name="person-circle" size={36} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.riderName}>{riderName}</Text>
            <Text style={styles.riderPhone}>{activeRide?.user?.phone || 'Rider'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Map — Driver to Pickup route */}
      <View style={styles.mapCanvas}>
        <DriverMapView
          mode="to-pickup"
          pickup={pickupCoords || activeRide?.pickup}
          driverLocation={currentLocation || undefined}
          routeCoords={routeCoords}
        />
      </View>

      {/* Bottom Card for OTP & Start Ride */}
      <View style={[styles.bottomCard, Shadows.card]}>
        <Text style={styles.otpHeader}>Enter 6-Digit OTP to start ride</Text>

        <View style={styles.otpBox}>
          <TextInput
            style={styles.otpInput}
            value={enteredOtp}
            onChangeText={setEnteredOtp}
            placeholder="======="
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
        <Text style={styles.otpSubText}>Ask customer for their OTP</Text>

        <TouchableOpacity style={styles.startBtn} onPress={handleStartRide} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.startBtnText}>Start Ride</Text>}
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
  pickupCard: {
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
  labelGreen: { fontSize: 10, fontWeight: '800', color: Colors.accentGreen, textTransform: 'uppercase' },
  addressText: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  coordText: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: Colors.surfaceBorder },
  riderName: { fontSize: 14, fontWeight: '800', color: Colors.textDark },
  riderPhone: { fontSize: 12, color: Colors.textMuted },
  mapCanvas: { flex: 1, backgroundColor: '#EBF7F0', alignItems: 'center', justifyContent: 'center' },
  bottomCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  otpHeader: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  otpBox: { marginVertical: 8, width: '100%' },
  otpInput: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.accentGreen,
    letterSpacing: 8,
    textAlign: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    height: 50,
  },
  otpSubText: { fontSize: 11, color: Colors.textMuted, marginBottom: 14 },
  startBtn: {
    backgroundColor: Colors.accentGreen,
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});