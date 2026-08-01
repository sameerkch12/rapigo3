import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Radius, Shadow } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sendPhoneOtp, verifyPhoneOtp, registerPhoneUser, isLoading } = useAuth();

  const [otpStep, setOtpStep] = useState<'phone' | 'otp' | 'profile'>('phone');

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 10 }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Handle Requesting OTP
  const handleSendOtp = async () => {
    setError('');
    setInfoMessage('');
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      const res = await sendPhoneOtp(phone);
      setOtpStep('otp');
      if (res.isDemo && res.otp) {
        setDemoOtpHint(res.otp);
        setOtp(res.otp); // Pre-fill for quick testing ease
        setInfoMessage(`Demo Mode: Use code ${res.otp}`);
      } else {
        setInfoMessage('OTP sent successfully to your mobile number');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    }
  };

  // Handle Verifying OTP
  const handleVerifyOtp = async () => {
    setError('');
    setInfoMessage('');
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    try {
      const res = await verifyPhoneOtp(phone, otp);
      if (res.isNewUser) {
        // First-time user: move to profile registration step
        setOtpStep('profile');
        setInfoMessage('Mobile verified! Please fill in your name and email to complete registration.');
      } else {
        // Returning user: logged in directly!
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e.message || 'Invalid or expired OTP');
    }
  };

  // Handle First-Time Profile Submission
  const handleCompleteProfile = async () => {
    setError('');
    if (!firstname || firstname.length < 2) {
      setError('Please enter a valid first name');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await registerPhoneUser({
        phone,
        fullname: { firstname, lastname },
        email,
      });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Failed to complete registration');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={[styles.hero, { paddingTop: insets.top + 25 }]}
        >
          <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoEmoji}>⚡</Text>
            </View>
            <Text style={styles.appName}>RapiGo</Text>
            <Text style={styles.tagline}>Fast, reliable & affordable rides</Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.cardContainer}>
          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={18} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {infoMessage ? (
              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={18} color="#2563EB" />
                <Text style={styles.infoText}>{infoMessage}</Text>
              </View>
            ) : null}

            {/* Step 1: Phone Input */}
            {otpStep === 'phone' && (
              <>
                <Text style={styles.sectionTitle}>Login or Register</Text>
                <Text style={styles.sectionSubtitle}>Enter your mobile number to receive a 6-digit OTP code</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mobile Phone Number</Text>
                  <View style={styles.inputBox}>
                    <Text style={styles.countryCode}>+91</Text>
                    <View style={styles.verticalDivider} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 10 digit number"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>

                <Button
                  title="Get OTP Code"
                  onPress={handleSendOtp}
                  loading={isLoading}
                  style={{ marginTop: 12 }}
                />
              </>
            )}

            {/* Step 2: OTP Verification */}
            {otpStep === 'otp' && (
              <>
                <View style={styles.stepHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setOtpStep('phone');
                      setError('');
                      setInfoMessage('');
                    }}
                  >
                    <MaterialIcons name="arrow-back" size={22} color={Colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepTitle}>Enter Verification Code</Text>
                </View>

                <Text style={styles.sectionSubtitle}>
                  Code sent to <Text style={{ fontWeight: '700', color: Colors.text.primary }}>+91 {phone}</Text>
                </Text>

                {demoOtpHint && (
                  <View style={styles.demoBadge}>
                    <MaterialIcons name="bug-report" size={16} color="#D97706" />
                    <Text style={styles.demoBadgeText}>Demo OTP: {demoOtpHint}</Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>6-Digit OTP</Text>
                  <View style={styles.inputBox}>
                    <MaterialIcons name="security" size={20} color={Colors.text.secondary} />
                    <TextInput
                      style={[styles.input, { letterSpacing: 4, fontSize: 18, fontWeight: '700' }]}
                      placeholder="123456"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={setOtp}
                    />
                  </View>
                </View>

                <Button
                  title="Verify OTP & Continue"
                  onPress={handleVerifyOtp}
                  loading={isLoading}
                  style={{ marginTop: 12 }}
                />

                <TouchableOpacity style={styles.resendBtn} onPress={handleSendOtp} disabled={isLoading}>
                  <Text style={styles.resendText}>Didn{"'"}t receive code? Resend OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 3: Complete Profile (First-Time User) */}
            {otpStep === 'profile' && (
              <>
                <Text style={styles.sectionTitle}>Welcome to RapiGo</Text>
                <Text style={styles.sectionSubtitle}>Please provide your name and email to complete your setup</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>First Name</Text>
                  <View style={styles.inputBox}>
                    <MaterialIcons name="person" size={20} color={Colors.text.secondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Rahul"
                      value={firstname}
                      onChangeText={setFirstname}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Last Name</Text>
                  <View style={styles.inputBox}>
                    <MaterialIcons name="person-outline" size={20} color={Colors.text.secondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Sharma"
                      value={lastname}
                      onChangeText={setLastname}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputBox}>
                    <MaterialIcons name="email" size={20} color={Colors.text.secondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="name@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>

                <Button
                  title="Complete & Enter App"
                  onPress={handleCompleteProfile}
                  loading={isLoading}
                  style={{ marginTop: 12 }}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroContent: {
    alignItems: 'center',
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginTop: -25,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: Radius.xl,
    padding: 20,
    ...Shadow.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    marginBottom: 14,
    gap: 6,
  },
  demoBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  countryCode: {
    fontSize: 15,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    paddingHorizontal: 4,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  resendBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 13,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 14,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#2563EB',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: FontWeight.medium,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },
});
