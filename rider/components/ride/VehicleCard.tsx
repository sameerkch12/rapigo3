import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontWeight, Radius } from '@/constants/theme';

interface VehicleCardProps {
  vehicle: {
    id: string;
    name: string;
    image: any;
    description: string;
    eta: number;
    seats: number;
    rating: number;
    tag: string;
    tagColor: string;
  };
  fare: number;
  selected: boolean;
  onSelect: () => void;
}

export default function VehicleCard({ vehicle, fare, selected, onSelect }: VehicleCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  return (
    <Pressable onPress={onSelect} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          styles.card,
          selected ? styles.cardSelected : styles.cardUnselected,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconWrap}>
          <Image source={vehicle.image} style={styles.vehicleImg} resizeMode="contain" />
        </View>

        <View style={styles.details}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{vehicle.name}</Text>
            {vehicle.tag ? (
              <View style={[styles.tagPill, { backgroundColor: vehicle.tagColor + '15' }]}>
                <Text style={[styles.tagText, { color: vehicle.tagColor }]}>{vehicle.tag}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.subInfoRow}>
            <View style={styles.infoItem}>
              <MaterialIcons name="person-outline" size={11} color="#94A3B8" />
              <Text style={styles.infoText}>{vehicle.seats} {vehicle.seats === 1 ? 'seat' : 'seats'}</Text>
            </View>
            <Text style={styles.dot}>{'\u2022'}</Text>
            <View style={styles.infoItem}>
              <MaterialIcons name="access-time" size={11} color="#94A3B8" />
              <Text style={styles.infoText}>{vehicle.eta} min</Text>
            </View>
          </View>

          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingText}>{vehicle.rating}</Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.fare}>{'\u20B9'}{fare}</Text>
          {selected && (
            <View style={styles.checkCircle}>
              <MaterialIcons name="check" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  cardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  cardUnselected: {
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  iconWrap: {
    width: 52,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vehicleImg: {
    width: 48,
    height: 34,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: FontWeight.extrabold,
    color: '#0F172A',
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  infoText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: FontWeight.medium,
  },
  dot: {
    color: '#CBD5E1',
    fontSize: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: FontWeight.bold,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fare: {
    fontSize: 17,
    fontWeight: FontWeight.extrabold,
    color: '#0F172A',
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
