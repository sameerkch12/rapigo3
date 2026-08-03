import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { Colors, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { captainService } from '../../services/api';

type PeriodKey = 'today' | 'week' | 'month';

export default function EarningsScreen() {
  const router = useRouter();
  const [data, setData] = useState<Awaited<ReturnType<typeof captainService.getEarnings>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>('week');

  const load = useCallback(async () => {
    try {
      const res = await captainService.getEarnings();
      setData(res);
    } catch (e) {
      console.warn('Failed to load earnings:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const summary = data?.summary;
  const trips = data?.trips ?? [];
  const periodData = summary?.[period] ?? { rides: 0, netEarnings: 0, gross: 0 };

  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <TouchableOpacity style={styles.walletBtn} onPress={() => router.push('/wallet' as never)}>
          <Ionicons name="wallet-outline" size={16} color="#fff" />
          <Text style={styles.walletBtnText}>Wallet</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>NET EARNINGS ({periods.find((p) => p.key === period)?.label.toUpperCase()})</Text>
        <Text style={styles.summaryAmount}>₹{periodData.netEarnings.toLocaleString('en-IN')}</Text>
        <Text style={styles.summarySub}>{periodData.rides} rides completed</Text>
      </View>

      <View style={styles.periodTabs}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodTab, period === p.key && styles.periodTabActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodTabText, period === p.key && styles.periodTabTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.splitRow}>
        <View style={[styles.splitCard, Shadows.small]}>
          <Text style={styles.splitLabel}>Cash Collected</Text>
          <Text style={styles.splitValueGreen}>₹{summary?.cashCollected.toLocaleString('en-IN') ?? 0}</Text>
          <Text style={styles.splitSub}>Aapke haath me</Text>
        </View>
        <View style={[styles.splitCard, Shadows.small]}>
          <Text style={styles.splitLabel}>Online Pending</Text>
          <Text style={styles.splitValueBlue}>₹{summary?.onlinePending.toLocaleString('en-IN') ?? 0}</Text>
          <Text style={styles.splitSub}>Payout hone ko</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary?.totalRides ?? 0}</Text>
          <Text style={styles.statLabel}>Total Rides</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>₹{summary?.totalGross.toLocaleString('en-IN') ?? 0}</Text>
          <Text style={styles.statLabel}>Total Fare</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>₹{summary?.totalCommission.toLocaleString('en-IN') ?? 0}</Text>
          <Text style={styles.statLabel}>Commission</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>RECENT COMPLETED TRIPS</Text>

      <FlatList
        data={trips}
        keyExtractor={(item: any) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No completed trips yet</Text>
            <Text style={styles.emptySub}>Your completed trip earnings will appear here.</Text>
          </View>
        }
        renderItem={({ item }: { item: any }) => (
          <View style={[styles.tripCard, Shadows.small]}>
            <View style={styles.tripHeader}>
              <View style={styles.tripLeft}>
                <View style={[styles.payBadge, item.paymentMethod === 'cash' ? styles.payBadgeCash : styles.payBadgeOnline]}>
                  <Text style={[styles.payBadgeText, item.paymentMethod === 'cash' ? styles.payBadgeTextCash : styles.payBadgeTextOnline]}>
                    {item.paymentMethod === 'cash' ? 'CASH' : 'ONLINE'}
                  </Text>
                </View>
                <Text style={styles.tripDate}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Trip'}
                </Text>
              </View>
              <Text style={styles.tripFare}>+₹{item.driverEarning ?? 0}</Text>
            </View>
            <View style={styles.tripRow}>
              <Ionicons name="radio-button-on" size={14} color={Colors.primary} />
              <Text style={styles.tripText} numberOfLines={1}>{item.pickup || 'Pickup location'}</Text>
            </View>
            <View style={styles.tripRow}>
              <Ionicons name="location" size={14} color={Colors.danger} />
              <Text style={styles.tripText} numberOfLines={1}>{item.destination || 'Destination'}</Text>
            </View>
            <View style={styles.tripFooter}>
              <Text style={styles.tripFareDetail}>Fare ₹{item.fare} · Commission ₹{item.commission ?? 0}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textDark,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  walletBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  summaryBox: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.primary,
    marginVertical: 6,
  },
  summarySub: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: Colors.primary,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  periodTabTextActive: {
    color: '#fff',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  splitCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  splitLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  splitValueGreen: {
    fontSize: 22,
    fontWeight: '900',
    color: '#16A34A',
    marginVertical: 4,
  },
  splitValueBlue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2563EB',
    marginVertical: 4,
  },
  splitSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textDark,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  tripCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  payBadgeCash: {
    backgroundColor: '#F0FDF4',
  },
  payBadgeOnline: {
    backgroundColor: '#EFF6FF',
  },
  payBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  payBadgeTextCash: {
    color: '#16A34A',
  },
  payBadgeTextOnline: {
    color: '#2563EB',
  },
  tripDate: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  tripFare: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  tripText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  tripFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tripFareDetail: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
