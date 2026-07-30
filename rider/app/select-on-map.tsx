import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, FlatList, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView from 'react-native-maps';
import { mapService } from '@/services/map.service';
import { useRide } from '@/hooks/useRide';
import { Colors, FontWeight, Shadow } from '@/constants/theme';



export default function SelectOnMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { setPickup, setDestination, ride } = useRide();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState({
    latitude: ride.pickup?.latitude || 21.2514,
    longitude: ride.pickup?.longitude || 81.6296,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [address, setAddress] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reverseGeocodeCenter = useCallback(async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      let addr = '';
      if (Platform.OS !== 'web') {
        try {
          const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (result) {
            addr = [result.name, result.street, result.district, result.city, result.region]
              .filter(Boolean).join(', ');
          }
        } catch {
          // fallback
        }
      }
      if (!addr) {
        const result = await mapService.getReverseGeocode(lat, lng);
        addr = result.address;
      }
      setAddress(addr || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setLoadingAddress(false);
    }
  }, []);

  const handleRegionChangeComplete = useCallback((newRegion: any) => {
    setRegion(newRegion);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      reverseGeocodeCenter(newRegion.latitude, newRegion.longitude);
    }, 400);
  }, [reverseGeocodeCenter]);

  useEffect(() => {
    reverseGeocodeCenter(region.latitude, region.longitude);
  }, []);

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await mapService.getSuggestions(text);
      setSuggestions(Array.isArray(results) ? results : []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSelectSuggestion = useCallback(async (item: string) => {
    setSearchQuery(item);
    setSuggestions([]);
    try {
      const coords = await mapService.getCoordinates(item);
      const newRegion = {
        latitude: coords.ltd,
        longitude: coords.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      mapRef.current?.animateToRegion(newRegion, 600);
      setRegion(newRegion);
      setAddress(item);
    } catch {
      // ignore
    }
  }, []);

  const handleConfirm = useCallback(() => {
    const loc = {
      address: address || `${region.latitude.toFixed(6)}, ${region.longitude.toFixed(6)}`,
      latitude: region.latitude,
      longitude: region.longitude,
    };

    if (type === 'pickup') {
      setPickup(loc);
      setTimeout(() => router.back(), 100);
    } else {
      if (!ride.pickup) {
        setPickup({ address: 'Current Location', latitude: region.latitude, longitude: region.longitude });
      }
      setDestination(loc);
      setTimeout(() => router.replace('/book-ride'), 100);
    }
  }, [address, region, type, setPickup, setDestination, ride.pickup, router]);

  const label = type === 'pickup' ? 'Pickup' : 'Drop';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.searchInputWrap}>
          <MaterialIcons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder={`Search ${label.toLowerCase()} location`}
            placeholderTextColor="#94A3B8"
          />
          {searchLoading && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
      </View>

      {suggestions.length > 0 && (
        <View style={[styles.dropdown, { top: insets.top + 56 }]}>
          <FlatList
            data={suggestions}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionRow} onPress={() => handleSelectSuggestion(item)}>
                <MaterialIcons name="location-on" size={18} color={Colors.primary} />
                <Text style={styles.suggestionText} numberOfLines={2}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton
        />
        <View style={styles.pinContainer} pointerEvents="none">
          <MaterialIcons name="location-on" size={44} color={Colors.primary} />
        </View>
        <View style={styles.pinStem} pointerEvents="none" />
      </View>

      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.addressRow}>
          <MaterialIcons name="location-on" size={20} color={Colors.primary} />
          {loadingAddress ? (
            <View style={styles.addressLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.addressLoadingText}>Getting address...</Text>
            </View>
          ) : (
            <Text style={styles.addressText} numberOfLines={2}>{address || 'Move map to select location'}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.confirmBtn, !address && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={!address}
        >
          <MaterialIcons name="check" size={20} color="#fff" />
          <Text style={styles.confirmText}>Set {label} Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    zIndex: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  dropdown: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 250,
    zIndex: 30,
    ...Shadow.md,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  pinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -22,
    marginTop: -44,
    zIndex: 10,
    alignItems: 'center',
  },
  pinStem: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -1.5,
    marginTop: 2,
    width: 3,
    height: 18,
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    ...Shadow.lg,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
    minHeight: 44,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: FontWeight.semibold,
    color: '#0F172A',
    lineHeight: 20,
  },
  addressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressLoadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  confirmBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: FontWeight.extrabold,
  },
});
