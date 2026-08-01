import { useContext } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '@/contexts/AuthContext';
import { RideContext } from '@/contexts/RideContext';

export default function Index() {
  const auth = useContext(AuthContext);
  const rideCtx = useContext(RideContext);

  if (!auth || !rideCtx) return null;

  const { isAuthenticated, isLoading } = auth;
  const { ride, isRestoringRide } = rideCtx;

  if (isLoading || isRestoringRide) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (ride.id && ride.status !== 'idle' && ride.status !== 'searching') {
    return <Redirect href="/live-tracking" />;
  }

  return <Redirect href="/(tabs)" />;
}
