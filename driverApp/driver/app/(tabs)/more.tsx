import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDriverAuth } from '../../contexts/DriverAuthContext';
import { HeaderBar } from '../../components/HeaderBar';
import { Colors, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function MoreScreen() {
  const router = useRouter();
  const { driver, logout } = useDriverAuth();

  const driverName = driver?.fullname
    ? `${driver.fullname.firstname} ${driver.fullname.lastname || ''}`.trim()
    : (driver?.name || 'Captain');
  const driverId = driver?._id ? `CAP-${driver._id.slice(-6).toUpperCase()}` : 'CAP-DRIVER';
  const rating = driver?.rating || 5.0;


  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of your driver account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const MENU_ITEMS = [
    { id: '1', title: 'My Profile', icon: 'person-outline', route: '/register-details' },
    { id: '2', title: 'My Wallet', icon: 'wallet-outline', route: '/wallet' },
    { id: '3', title: 'My Vehicles', icon: 'bicycle-outline' },
    { id: '4', title: 'Bank Details', icon: 'card-outline' },
    { id: '5', title: 'Documents', icon: 'document-text-outline' },
    { id: '6', title: 'Refer & Earn', icon: 'gift-outline', isNew: true },
    { id: '7', title: 'Privacy Policy', icon: 'shield-checkmark-outline' },
    { id: '8', title: 'Terms & Conditions', icon: 'newspaper-outline' },
  ];

  return (
    <View style={styles.container}>
      <HeaderBar title="More" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header Card */}
        <View style={[styles.profileCard, Shadows.card]}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color={Colors.primary} />
          </View>
          <View style={styles.profileTextWrapper}>
            <Text style={styles.profileName}>{driverName}</Text>
            <Text style={styles.profileId}>ID: {driverId}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#FFF" />
                <Text style={styles.ratingText}>{rating}</Text>
              </View>

              <View
                style={[
                  styles.verifyBadge,
                  driver?.verificationStatus === 'approved' || driver?.isVerified
                    ? styles.verifyBadgeApproved
                    : styles.verifyBadgePending,
                ]}
              >
                <Text
                  style={[
                    styles.verifyBadgeText,
                    driver?.verificationStatus === 'approved' || driver?.isVerified
                      ? styles.verifyTextApproved
                      : styles.verifyTextPending,
                  ]}
                >
                  {driver?.verificationStatus === 'approved' || driver?.isVerified
                    ? 'VERIFIED'
                    : 'PENDING'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Navigation Items List */}
        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuRow}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <Ionicons name={item.icon as any} size={20} color={Colors.primary} style={styles.menuIcon} />
              <Text style={styles.menuTitle}>{item.title}</Text>
              {item.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          ))}

          {/* Logout Action */}
          <TouchableOpacity style={[styles.menuRow, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} style={styles.menuIcon} />
            <Text style={[styles.menuTitle, { color: Colors.danger }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileTextWrapper: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textDark,
  },
  profileId: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentGold,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 11,
  },
  verifyBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  verifyBadgeApproved: {
    backgroundColor: Colors.accentGreenLight,
    borderColor: Colors.accentGreen,
  },
  verifyBadgePending: {
    backgroundColor: '#FFFBEB',
    borderColor: Colors.accentGold,
  },
  verifyBadgeText: {
    fontWeight: '800',
    fontSize: 10,
  },
  verifyTextApproved: {
    color: Colors.accentGreen,
  },
  verifyTextPending: {
    color: '#B45309',
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  menuIcon: {
    marginRight: 14,
  },
  menuTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  newBadge: {
    backgroundColor: Colors.accentGreenLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 10,
  },
  newBadgeText: {
    color: Colors.accentGreen,
    fontWeight: '800',
    fontSize: 10,
  },
});
