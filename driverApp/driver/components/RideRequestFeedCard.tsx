import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Shadows } from '../constants/theme';
import { RouteTimeline } from './RouteTimeline';
import { Ionicons } from '@expo/vector-icons';
import { getRideAddress, getRideDistanceKm } from '../utils/ride';

interface Props {
  request: any;
  onAccept: (id: string) => void;
  onReject?: (id: string) => void;
  /** Seconds before the request auto-expires and is dismissed. Default 50. */
  autoDismissSeconds?: number;
  /** Distance from driver's current location to pickup in km */
  pickupDistanceKm?: number;
}

export const RideRequestFeedCard: React.FC<Props> = ({
  request,
  onAccept,
  onReject,
  autoDismissSeconds = 50,
  pickupDistanceKm,
}) => {
  const reqId = request._id || request.id;
  const fare = request.fare || 54;
  const paymentMethod = (request.paymentMethod || 'Cash').toUpperCase();
  const distanceKm = request.distanceKm || getRideDistanceKm(request.distance);

  const [secondsLeft, setSecondsLeft] = useState(autoDismissSeconds);

  // Keep the latest onReject without re-triggering the countdown effect.
  const onRejectRef = useRef(onReject);
  onRejectRef.current = onReject;

  // Tick down once per second.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Auto-dismiss when the countdown reaches zero.
  useEffect(() => {
    if (secondsLeft <= 0) {
      onRejectRef.current?.(reqId);
    }
  }, [secondsLeft, reqId]);

  const progress = Math.max(0, Math.min(1, secondsLeft / autoDismissSeconds));
  const isUrgent = secondsLeft <= 10;
  const timerColor = isUrgent ? Colors.danger : Colors.primary;

  return (
    <View style={[styles.card, Shadows.card]}>
      {/* Top Banner Tag + Countdown */}
      <View style={styles.topTagRow}>
        <Text style={styles.topTagText}>New Ride Request</Text>
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={13} color={timerColor} />
          <Text style={[styles.timerText, { color: timerColor }]}>{secondsLeft}s</Text>
        </View>
      </View>

      {/* Countdown progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: timerColor },
          ]}
        />
      </View>

      {/* Main Body */}
      <View style={styles.bodyRow}>
        {/* Left Side Fare Badge */}
        <View style={styles.fareBox}>
          <Text style={styles.youReceiveLabel}>You will receive</Text>
          <Text style={styles.fareAmount}>₹{fare}</Text>
          <View style={styles.cashBadge}>
            <Text style={styles.cashText}>{paymentMethod}</Text>
          </View>
        </View>

        {/* Right Side Route Timeline */}
        <View style={styles.timelineWrapper}>
          <RouteTimeline
            pickupAddress={getRideAddress(request.pickup, 'Pickup Point')}
            dropAddress={getRideAddress(request.destination, 'Drop Point')}
            pickupDistance={pickupDistanceKm ? `${pickupDistanceKm} km` : '0 km'}
            totalDistance={distanceKm ? `${distanceKm} km` : undefined}
          />
        </View>
      </View>

      {/* Bottom Action Row: Reject + Accept */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.rejectBtn}
          onPress={() => onReject?.(reqId)}
        >
          <Ionicons name="close" size={18} color={Colors.danger} />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.acceptBtn, Shadows.button]}
          onPress={() => onAccept(reqId)}
        >
          <View style={styles.btnLeft}>
            <View style={styles.arrowCircle}>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.acceptText}>Accept Ride</Text>
          </View>
          <Text style={styles.btnTagText}>₹{fare}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  topTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  fareBox: {
    width: 95,
    alignItems: 'flex-start',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBorder,
  },
  youReceiveLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  fareAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
    marginVertical: 2,
  },
  cashBadge: {
    backgroundColor: Colors.accentGreenLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  cashText: {
    color: Colors.accentGreen,
    fontWeight: '800',
    fontSize: 10,
  },
  timelineWrapper: {
    flex: 1,
    paddingLeft: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  rejectText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  acceptText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnTagText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    opacity: 0.95,
  },
});
