import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDriverAuth } from '../../contexts/DriverAuthContext';
import { useDriverRide } from '../../contexts/DriverRideContext';
import { HeaderBar } from '../../components/HeaderBar';
import { RideRequestFeedCard } from '../../components/RideRequestFeedCard';
import { Colors, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getPickupDistanceKm } from '../../utils/ride';

export default function HomeFeedScreen() {
  const router = useRouter();
  const { driver } = useDriverAuth();
  const { isOnline, requests, toggleOnline, fetchRequests, acceptRide, activeRide, fetchActiveRides, dismissRequest, currentLocation } = useDriverRide();
  const [refreshing, setRefreshing] = useState(false);

  const isPending = driver?.verificationStatus === 'pending' || driver?.isVerified === false;

  useEffect(() => {
    fetchActiveRides();
    fetchRequests();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActiveRides();
    await fetchRequests();
    setRefreshing(false);
  };

  const handleToggleOnline = async () => {
    if (isPending) {
      Alert.alert(
        'Verification Pending',
        'Your vehicle details and documents are currently being verified by our onboarding team. You will be called shortly to complete activation.'
      );
      return;
    }
    await toggleOnline();
  };

  const handleAcceptRide = async (rideId: string) => {
    try {
      await acceptRide(rideId);
      router.push('/ride-accepted');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept ride');
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="Home" showMenu showNotification />

      {/* Online / Offline Top Status Pill Switch */}
      <View style={styles.topSwitchBox}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.statusPill,
            isOnline ? styles.onlinePill : styles.offlinePill,
            isOnline && Shadows.glowGreen,
          ]}
          onPress={handleToggleOnline}
        >
          <View style={[styles.statusDot, isOnline ? styles.dotGreen : styles.dotRed]} />
          <Text style={[styles.statusText, isOnline ? styles.textGreen : styles.textRed]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Verification Pending Alert Banner */}
        {isPending && (
          <View style={[styles.pendingCard, Shadows.card]}>
            <View style={styles.pendingHeaderRow}>
              <Ionicons name="time-outline" size={24} color={Colors.accentGold} />
              <Text style={styles.pendingTitle}>Account Verification Pending</Text>
            </View>
            <Text style={styles.pendingSub}>
              Your vehicle registration & document details have been submitted. Our onboarding team will call you to verify your profile. Once verified, you will be able to go Online.
            </Text>
          </View>
        )}

        {/* If Active Ride exists, show active ride banner launcher */}
        {activeRide && (
          <TouchableOpacity
            style={[styles.activeRideLauncher, Shadows.card]}
            onPress={() => {
              if (activeRide.status === 'driver_assigned') router.push('/ride-accepted');
              else if (activeRide.status === 'reached_pickup') router.push('/at-pickup');
              else if (activeRide.status === 'ongoing') router.push('/in-ride');
              else if (activeRide.status === 'completed') router.push('/ride-completed');
            }}
          >
            <View style={styles.launcherBadge}>
              <Text style={styles.launcherBadgeText}>
                {activeRide.status === 'driver_assigned' ? 'RIDE ACCEPTED' : activeRide.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.launcherTitle}>Tap to return to active trip</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {/* Available Ride Requests Feed Cards */}
        {isOnline && !isPending ? (
          requests.length > 0 ? (
            requests.map((req) => (
              <RideRequestFeedCard
                key={req._id || req.id}
                request={req}
                onAccept={handleAcceptRide}
                onReject={dismissRequest}
                autoDismissSeconds={50}
                pickupDistanceKm={currentLocation ? getPickupDistanceKm(currentLocation.latitude, currentLocation.longitude, req.pickupCoords || req.pickup) : 0}
              />
            ))
          ) : (
            <View style={styles.emptyFeedBox}>
              <Ionicons name="pulse" size={48} color={Colors.primary} />
              <Text style={styles.emptyTitle}>Searching for nearby rides...</Text>
              <Text style={styles.emptySub}>Stay online to receive live ride requests in your area.</Text>
            </View>
          )
        ) : (
          <View style={styles.offlineBox}>
            <Ionicons name="moon-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.offlineTitle}>
              {isPending ? 'Verification Pending' : 'You are currently Offline'}
            </Text>
            <Text style={styles.offlineSub}>
              {isPending
                ? 'Complete phone call verification with support to unlock Online status.'
                : 'Tap the status switch above to go Online and receive rides.'}
            </Text>
          </View>
        )}

        {/* Safety Alert Banner */}
        <View style={styles.safetyBanner}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.safetyText}>Stay safe. You can cancel ride anytime.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topSwitchBox: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
  },
  onlinePill: {
    backgroundColor: Colors.surface,
    borderColor: Colors.accentGreen,
  },
  offlinePill: {
    backgroundColor: Colors.surface,
    borderColor: Colors.danger,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotGreen: {
    backgroundColor: Colors.accentGreen,
  },
  dotRed: {
    backgroundColor: Colors.danger,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
  },
  textGreen: {
    color: Colors.accentGreen,
  },
  textRed: {
    color: Colors.danger,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.accentGold,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingSub: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
    fontWeight: '600',
  },
  activeRideLauncher: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  launcherBadge: {
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 10,
  },
  launcherBadgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 10,
  },
  launcherTitle: {
    flex: 1,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  emptyFeedBox: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  offlineBox: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: 12,
  },
  offlineSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  safetyText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
});
