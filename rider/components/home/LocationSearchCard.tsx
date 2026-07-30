import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontWeight, Shadow } from '@/constants/theme';

interface LocationSearchCardProps {
  pickupValue: string;
  onChangePickup: (text: string) => void;
  destinationValue: string;
  onChangeDestination: (text: string) => void;
  isLocating: boolean;
  onFocusPickup: () => void;
  onFocusDestination: () => void;
  onLocateMe: () => void;
  onSelectOnMap: () => void;
  destinationRef?: React.RefObject<TextInput | null>;
}

export default function LocationSearchCard({
  pickupValue,
  onChangePickup,
  destinationValue,
  onChangeDestination,
  isLocating,
  onFocusPickup,
  onFocusDestination,
  onLocateMe,
  onSelectOnMap,
  destinationRef,
}: LocationSearchCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.locationRow}>
        <View style={styles.routeRail}>
          <View style={styles.pickupCircle}>
            <View style={styles.pickupCore} />
          </View>
          <View style={styles.routeDash} />
        </View>

        <View style={styles.locationCopy}>
          <Text style={styles.locationLabel}>Pickup</Text>
          <TextInput
            style={styles.inputField}
            value={pickupValue}
            onChangeText={onChangePickup}
            onFocus={onFocusPickup}
            placeholder="Enter pickup location"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity 
          style={styles.locateButton} 
          activeOpacity={0.8} 
          onPress={onLocateMe}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <MaterialIcons name="my-location" size={18} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.destinationRow}>
        <View style={styles.destinationPin}>
          <MaterialIcons name="location-on" size={24} color={Colors.primary} />
        </View>
        <View style={styles.locationCopy}>
          <Text style={styles.locationLabel}>Where to?</Text>
          <TextInput
            ref={destinationRef}
            style={styles.inputField}
            value={destinationValue}
            onChangeText={onChangeDestination}
            onFocus={onFocusDestination}
            placeholder="Enter destination"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
        </View>
        <MaterialIcons name="search" size={20} color="#64748B" />
      </View>

      <TouchableOpacity style={styles.mapSelector} activeOpacity={0.85} onPress={onSelectOnMap}>
        <View style={styles.mapIconBox}>
          <MaterialIcons name="map" size={20} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mapTitle}>Select on Map</Text>
          <Text style={styles.mapSubtitle}>Choose your exact location</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    ...Shadow.sm,
  },
  locationRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeRail: {
    width: 32,
    alignItems: 'center',
    paddingTop: 2,
  },
  pickupCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  routeDash: {
    width: 1,
    height: 36,
    borderStyle: 'dashed',
    borderLeftWidth: 1,
    borderColor: '#94A3B8',
    marginTop: 2,
  },
  locationCopy: {
    flex: 1,
    paddingTop: 0,
  },
  locationLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  inputField: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: FontWeight.semibold,
    paddingVertical: 2,
    marginRight: 6,
  },
  locateButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 44,
    marginBottom: 10,
    marginTop: 4,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  destinationPin: {
    width: 32,
    alignItems: 'center',
  },
  mapSelector: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  mapIconBox: {
    width: 28,
    alignItems: 'center',
  },
  mapTitle: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: FontWeight.extrabold,
    marginBottom: 1,
  },
  mapSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
});
