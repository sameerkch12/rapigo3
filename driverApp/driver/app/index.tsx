import { Redirect } from 'expo-router';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { useDriverRide } from '../contexts/DriverRideContext';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../constants/theme';

export default function Index() {
  const { driver, isLoading } = useDriverAuth();
  const { activeRide, isRestoringRide } = useDriverRide();

  if (isLoading || (driver && isRestoringRide)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!driver) {
    return <Redirect href="/login" />;
  }

  if (activeRide) {
    if (activeRide.status === 'driver_assigned') return <Redirect href="/ride-accepted" />;
    if (activeRide.status === 'reached_pickup') return <Redirect href="/at-pickup" />;
    if (activeRide.status === 'ongoing') return <Redirect href="/in-ride" />;
  }

  return <Redirect href="/(tabs)" />;
}
