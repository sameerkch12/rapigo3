import React from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

export interface DriverMapViewProps {
  pickup?: { latitude: number; longitude: number } | string;
  destination?: { latitude: number; longitude: number } | string;
  driverLocation?: { latitude: number; longitude: number };
  mode?: 'to-pickup' | 'in-ride' | 'overview';
  style?: any;
  routeCoords?: { latitude: number; longitude: number }[];
}

const toCoords = (loc?: { latitude: number; longitude: number } | string): { latitude: number; longitude: number } | null => {
  if (!loc) return null;
  if (typeof loc === 'object') return loc;
  return null;
};

function NativeDriverMap({ pickup, destination, driverLocation, mode, routeCoords }: DriverMapViewProps) {
  const pickupCoords = toCoords(pickup);
  const destCoords = toCoords(destination);

  const region = {
    latitude: driverLocation?.latitude || pickupCoords?.latitude || 21.2514,
    longitude: driverLocation?.longitude || pickupCoords?.longitude || 81.6296,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
        followsUserLocation
      >
        {pickupCoords && (
          <Marker coordinate={pickupCoords} title="Pickup" pinColor="#00C853" />
        )}
        {destCoords && (
          <Marker coordinate={destCoords} title="Drop" pinColor="#EF4444" />
        )}
        {routeCoords && routeCoords.length > 0 ? (
          <Polyline coordinates={routeCoords} strokeColor="#2563EB" strokeWidth={5} />
        ) : (
          <>
            {driverLocation && mode === 'to-pickup' && pickupCoords && (
              <Polyline coordinates={[driverLocation, pickupCoords]} strokeColor="#2563EB" strokeWidth={4} />
            )}
            {mode === 'in-ride' && pickupCoords && destCoords && (
              <Polyline coordinates={[pickupCoords, destCoords]} strokeColor="#2563EB" strokeWidth={4} />
            )}
          </>
        )}
      </MapView>
    </View>
  );
}

function WebDriverMap({ pickup, destination, driverLocation, mode }: DriverMapViewProps) {
  const [loaded, setLoaded] = React.useState(false);
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';

  const toLocationParam = (loc?: { latitude: number; longitude: number } | string): string => {
    if (!loc) return '';
    if (typeof loc === 'string') return encodeURIComponent(loc);
    return `${loc.latitude},${loc.longitude}`;
  };

  const buildUrl = (): string => {
    const pickupParam = toLocationParam(pickup);
    const destParam = toLocationParam(destination);
    const driverParam = driverLocation
      ? `${driverLocation.latitude},${driverLocation.longitude}`
      : '';

    if (!apiKey) {
      let lat = 21.2514, lng = 81.6296;
      if (pickup && typeof pickup !== 'string') { lat = pickup.latitude; lng = pickup.longitude; }
      else if (driverLocation) { lat = driverLocation.latitude; lng = driverLocation.longitude; }
      let osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.025},${lat - 0.025},${lng + 0.025},${lat + 0.025}&layer=mapnik`;
      if (pickup && typeof pickup !== 'string') osmUrl += `&marker=${pickup.latitude},${pickup.longitude}`;
      if (destination && typeof destination !== 'string') osmUrl += `&marker=${destination.latitude},${destination.longitude}`;
      return osmUrl;
    }

    if (mode === 'to-pickup' && driverParam && pickupParam) {
      return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${driverParam}&destination=${pickupParam}&mode=driving`;
    }
    if (mode === 'to-pickup' && pickupParam) {
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${pickupParam}&zoom=15`;
    }
    if (mode === 'in-ride' && pickupParam && destParam) {
      return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${pickupParam}&destination=${destParam}&mode=driving`;
    }
    if (pickupParam && destParam) {
      return `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${pickupParam}&destination=${destParam}&mode=driving`;
    }
    if (pickupParam) {
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${pickupParam}&zoom=14`;
    }
    return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=21.2514,81.6296&zoom=13`;
  };

  return (
    <View style={styles.container}>
      {!loaded && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Map load ho raha hai...</Text>
        </View>
      )}
      <iframe
        src={buildUrl()}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: loaded ? 'block' : 'none',
        }}
        onLoad={() => setLoaded(true)}
        allowFullScreen
        title="Driver Map"
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </View>
  );
}

export default function DriverMapView(props: DriverMapViewProps) {
  if (Platform.OS === 'web') {
    return <WebDriverMap {...props} />;
  }
  return <NativeDriverMap {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#EBF3FB',
    overflow: 'hidden',
  },
  loader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    zIndex: 10,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
});
