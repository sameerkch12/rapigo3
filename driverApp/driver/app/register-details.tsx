import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { HeaderBar } from '../components/HeaderBar';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterDetailsScreen() {
  const router = useRouter();
  const { registerPhoneCaptain, isLoading } = useDriverAuth();
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = typeof params.phone === 'string' ? params.phone : '';

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleType, setVehicleType] = useState<'car' | 'bike' | 'auto'>('bike');
  const [vehicleColor, setVehicleColor] = useState('Black');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [capacity, setCapacity] = useState('2');

  // This screen is only reachable after phone-OTP verification.
  // If somehow opened without a verified phone, send back to login.
  useEffect(() => {
    if (!phone) {
      router.replace('/login');
    }
  }, [phone]);

  const handleSave = async () => {
    if (!firstname || firstname.length < 3) {
      Alert.alert('Validation Error', 'First name must be at least 3 characters.');
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    if (!vehicleNumber || vehicleNumber.length < 3) {
      Alert.alert('Validation Error', 'Please enter a valid vehicle plate number.');
      return;
    }

    try {
      await registerPhoneCaptain({
        phone,
        fullname: { firstname, lastname },
        email,
        vehicle: {
          color: vehicleColor || 'Black',
          number: vehicleNumber.toUpperCase(),
          capacity: parseInt(capacity) || 2,
          type: vehicleType,
        },
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Registration failed');
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar title="Complete Your Profile" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitleHeader}>Personal Information</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.input, styles.readonlyBox]}>
            <Text style={styles.readonlyText}>+91 {phone}</Text>
            <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={firstname}
            onChangeText={setFirstname}
            placeholder="John"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={lastname}
            onChangeText={setLastname}
            placeholder="Doe"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="captain@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Vehicle Details */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="car-sport" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.typeSelectorRow}>
            {(['bike', 'auto', 'car'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeOption, vehicleType === t && styles.activeTypeOption]}
                onPress={() => setVehicleType(t)}
              >
                <Text style={[styles.typeText, vehicleType === t && styles.activeTypeText]}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Plate Number *</Text>
          <TextInput
            style={styles.input}
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            placeholder="e.g. CG 04 AB 1234"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Vehicle Color</Text>
          <TextInput
            style={styles.input}
            value={vehicleColor}
            onChangeText={setVehicleColor}
            placeholder="e.g. Black"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Passenger Capacity</Text>
          <TextInput
            style={styles.input}
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
            placeholder="2"
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Complete Registration</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 20 },
  subtitleHeader: { fontSize: 16, fontWeight: '800', color: Colors.textDark, marginBottom: 14 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    fontWeight: '600',
  },
  readonlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
  },
  readonlyText: { fontSize: 14, color: Colors.textDark, fontWeight: '700' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textDark },
  typeSelectorRow: { flexDirection: 'row', gap: 8 },
  typeOption: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTypeOption: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeText: { fontSize: 13, fontWeight: '800', color: Colors.textMuted },
  activeTypeText: { color: Colors.primary },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
