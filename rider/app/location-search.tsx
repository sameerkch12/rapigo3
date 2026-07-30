import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mapService } from '@/services/map.service';
import { useRide } from '@/hooks/useRide';
import { Colors, FontSize, FontWeight } from '@/constants/theme';

export default function LocationSearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setDestination, setPickup, ride } = useRide();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(async (value: string) => {
    setQuery(value);
    setError('');
    if (!value || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const results = await mapService.getSuggestions(value);
      if (Array.isArray(results)) {
        const list = results.map((item: any) =>
          typeof item === 'string' ? item : (item.description || item.name || String(item))
        );
        setSuggestions(list);
      } else {
        setSuggestions([]);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const select = async (address: string) => {
    setLoading(true);
    try {
      let coords = { ltd: 21.2514, lng: 81.6296 };
      try {
        coords = await mapService.getCoordinates(address);
      } catch (e) {
        console.warn('Coordinates fetch failed, using fallback:', e);
      }

      if (!ride.pickup) {
        setPickup({
          address: 'Current Location, Raipur',
          latitude: 21.2514,
          longitude: 81.6296,
        });
      }

      setDestination({
        address: address,
        latitude: coords.ltd,
        longitude: coords.lng,
      });

      router.replace('/book-ride');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to select location');
    } finally {
      setLoading(false);
    }
  };

  const suggestionsWithMap = query.trim().length >= 3
    ? [...suggestions, '---select-on-map---']
    : suggestions;

  return (
    <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={26} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Where are you going?</Text>
      </View>

      <View style={styles.search}>
        <MaterialIcons name="search" size={22} color={Colors.text.light} />
        <TextInput
          autoFocus
          value={query}
          onChangeText={search}
          placeholder="Search destination (e.g. Raipur Station)"
          placeholderTextColor={Colors.text.light}
          style={styles.input}
        />
      </View>

      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={suggestionsWithMap}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => {
          if (item === '---select-on-map---') {
            return (
              <TouchableOpacity style={styles.mapRow} onPress={() => router.push('/select-on-map?type=destination')}>
                <View style={styles.mapIconBox}>
                  <MaterialIcons name="map" size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapTitle}>Select on Map</Text>
                  <Text style={styles.mapSubtitle}>Use map pin to set exact location</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Colors.primary} />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity style={styles.row} onPress={() => select(item)}>
              <MaterialIcons name="location-on" size={24} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.primary}>{item}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading && query.length >= 3 ? (
            <View>
              <Text style={styles.empty}>No matching locations found.</Text>
              <TouchableOpacity style={styles.mapRow} onPress={() => router.push('/select-on-map?type=destination')}>
                <View style={styles.mapIconBox}>
                  <MaterialIcons name="map" size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapTitle}>Select on Map</Text>
                  <Text style={styles.mapSubtitle}>Use map pin to set exact location</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.white, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.text.primary },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: { flex: 1, minHeight: 52, fontSize: FontSize.base, color: Colors.text.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  primary: { color: Colors.text.primary, fontWeight: FontWeight.bold, fontSize: FontSize.base },
  error: { color: Colors.error, marginTop: 16 },
  empty: { color: Colors.text.light, textAlign: 'center', marginTop: 28 },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  mapIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTitle: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.base },
  mapSubtitle: { color: '#64748B', fontSize: 12, marginTop: 1 },
});
