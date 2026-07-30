import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDriverAuth } from '../contexts/DriverAuthContext';
import { Colors, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const router = useRouter();
  const { sendPhoneOtp, verifyPhoneOtp, driver } = useDriverAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  useEffect(() => {
    if (driver) {
      router.replace('/(tabs)');
    }
  }, [driver]);

  const handleSendOtp = async () => {
    setError('');
    if (!/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await sendPhoneOtp(phone);
      if (res.isDemo && res.otp) {
        setDemoOtp(res.otp);
      } else {
        setDemoOtp(null);
      }
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await verifyPhoneOtp(phone, otp);
      if (res.isNewCaptain) {
        // First-time captain — collect profile + vehicle details
        router.replace({ pathname: '/register-details', params: { phone } });
      } else {
        // Returning captain — logged in, go home
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Hero Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroGraphicBox}>
          <Ionicons name="car-sport" size={64} color="#FFF" />
        </View>
        <Text style={styles.welcomeTitle}>RapiGo Captain</Text>
        <Text style={styles.welcomeSub}>Drive & Earn on your schedule</Text>
      </View>

      {/* Bottom Sheet Card */}
      <View style={[styles.bottomCard, Shadows.card]}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          {step === 'phone' ? (
            <>
              <Text style={styles.cardHeader}>Login / Sign up</Text>
              <Text style={styles.helperText}>
                Enter your phone number to receive a verification code.
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputBox}>
                <Ionicons name="call-outline" size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
                  placeholder="10-digit mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <TouchableOpacity style={styles.continueBtn} onPress={handleSendOtp} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.continueBtnText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardHeader}>Verify OTP</Text>
              <Text style={styles.helperText}>
                Enter the 6-digit code sent to +91 {phone}.
              </Text>

              {demoOtp ? (
                <View style={styles.demoBox}>
                  <Text style={styles.demoText}>Demo OTP: {demoOtp}</Text>
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>OTP</Text>
              <View style={styles.inputBox}>
                <Ionicons name="keypad-outline" size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ''))}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity style={styles.continueBtn} onPress={handleVerifyOtp} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.continueBtnText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerBtn}
                onPress={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
              >
                <Text style={styles.registerBtnText}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  heroBanner: { height: '38%', alignItems: 'center', justifyContent: 'center', paddingTop: 20 },
  heroGraphicBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  welcomeTitle: { fontSize: 26, fontWeight: '900', color: '#FFF' },
  welcomeSub: { fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginTop: 4 },
  bottomCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  formScroll: { paddingBottom: 24 },
  cardHeader: { fontSize: 20, fontWeight: '800', color: Colors.textDark, marginBottom: 6 },
  helperText: { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  errorBox: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 12 },
  errorText: { color: '#DC2626', fontSize: 13 },
  demoBox: { backgroundColor: Colors.primaryLight, padding: 10, borderRadius: 8, marginBottom: 12 },
  demoText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 6 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, color: Colors.textDark },
  continueBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  continueBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  registerBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  registerBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
});
