import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = Radius.sm, style }: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: '#E2EFF4', opacity },
        style,
      ]}
    />
  );
}

export function RideCardSkeleton() {
  return (
    <View style={skStyles.card}>
      <View style={skStyles.row}>
        <Skeleton width={48} height={48} borderRadius={12} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} />
        </View>
        <Skeleton width={64} height={36} borderRadius={10} />
      </View>
    </View>
  );
}

export function HomeSkeletonLoader() {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <View style={skStyles.row}>
        <Skeleton width={52} height={52} borderRadius={26} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="70%" height={11} />
        </View>
      </View>
      <Skeleton height={56} borderRadius={16} />
      <Skeleton height={56} borderRadius={16} />
      <View style={skStyles.grid}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={58} height={72} borderRadius={16} />
        ))}
      </View>
      <Skeleton height={120} borderRadius={20} />
    </View>
  );
}

export function ActivitySkeleton() {
  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Skeleton height={36} borderRadius={10} style={{ marginBottom: 8 }} />
      {[1, 2, 3, 4].map((i) => (
        <RideCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function BookRideSkeleton() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={skStyles.row}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <Skeleton width="70%" height={14} />
      </View>
      <View style={skStyles.row}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <Skeleton width="60%" height={14} />
      </View>
      <Skeleton height={1} style={{ marginVertical: 4 }} />
      <Skeleton width="40%" height={16} style={{ marginTop: 8 }} />
      {[1, 2, 3].map((i) => (
        <View key={i} style={[skStyles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Skeleton width={48} height={48} borderRadius={12} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="50%" height={14} />
            <Skeleton width="30%" height={11} />
          </View>
          <Skeleton width={72} height={32} borderRadius={10} />
        </View>
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
