import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/theme';
import { captainService } from '../services/api';

type WalletData = Awaited<ReturnType<typeof captainService.getWallet>>;

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  ride_cash: { icon: 'cash-outline', label: 'Cash ride commission', color: '#DC2626' },
  ride_online: { icon: 'card-outline', label: 'Online ride earnings', color: '#16A34A' },
  recharge: { icon: 'add-circle-outline', label: 'Wallet recharge', color: '#2563EB' },
  withdraw: { icon: 'arrow-redo-outline', label: 'Withdrawal', color: '#9333EA' },
  adjustment: { icon: 'create-outline', label: 'Adjustment', color: '#64748B' },
};

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await captainService.getWallet();
      setData(res);
    } catch (e) {
      console.warn('Failed to load wallet:', e);
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

  const balance = data?.balance ?? 0;
  const rechargeLimit = data?.rechargeLimit ?? -500;
  const transactions = data?.transactions ?? [];

  const handleRecharge = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setMessage('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const res = await captainService.rechargeWallet(amt, '', 'Driver recharge request');
      setMessage(`Recharge successful! Balance: ₹${res.balance}`);
      setAmount('');
      setShowRecharge(false);
      load();
    } catch (e: any) {
      setMessage(e.message || 'Recharge failed. Contact admin.');
      setShowRecharge(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
        <Text style={[styles.balanceAmount, balance < 0 && styles.balanceAmountNegative]}>
          {balance < 0 ? '-' : ''}₹{Math.abs(balance).toLocaleString('en-IN')}
        </Text>
        {balance < 0 ? (
          <Text style={styles.balanceSubNegative}>
            Balance minus hai. ₹{Math.abs(rechargeLimit)} tak pahunchne pe aap rides accept nahi kar payenge.
          </Text>
        ) : (
          <Text style={styles.balanceSub}>Ye amount aap withdraw kar sakte hain.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.rechargeBtn} onPress={() => setShowRecharge(true)}>
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.rechargeBtnText}>Recharge Wallet</Text>
      </TouchableOpacity>

      {balance <= rechargeLimit && (
        <View style={styles.blockedBox}>
          <Ionicons name="warning" size={20} color="#DC2626" />
          <Text style={styles.blockedText}>Balance limit cross ho gaya. Rides accept karne se pehle recharge karein.</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>TRANSACTIONS</Text>

      <FlatList
        data={transactions}
        keyExtractor={(item: any) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="wallet-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
          </View>
        }
        renderItem={({ item }: { item: any }) => {
          const meta = TYPE_META[item.type] || TYPE_META.adjustment;
          const positive = item.amount >= 0;
          return (
            <View style={[styles.txCard, Shadows.small]}>
              <View style={[styles.txIcon, { backgroundColor: meta.color + '1A' }]}>
                <Ionicons name={meta.icon as any} size={20} color={meta.color} />
              </View>
              <View style={styles.txBody}>
                <Text style={styles.txLabel}>{meta.label}</Text>
                {item.note ? <Text style={styles.txNote} numberOfLines={1}>{item.note}</Text> : null}
                <Text style={styles.txDate}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, positive ? styles.txAmountPositive : styles.txAmountNegative]}>
                  {positive ? '+' : ''}₹{item.amount.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.txBalance}>Bal ₹{item.balanceAfter.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showRecharge} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recharge Wallet</Text>
            <Text style={styles.modalHint}>UPI pe pay karke ye amount wallet me add hoga (demo mode me turant credit).</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Amount (₹)"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={amount}
              onChangeText={(t) => { setAmount(t); setMessage(''); }}
            />
            <Text style={styles.upiLine}>UPI ID: <Text style={styles.upiBold}>rapigo@upi</Text></Text>
            {message ? <Text style={styles.errorText}>{message}</Text> : null}
            <TouchableOpacity style={styles.applyBtn} onPress={handleRecharge} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyBtnText}>Recharge</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowRecharge(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textDark,
  },
  balanceBox: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.primary,
    marginVertical: 6,
  },
  balanceAmountNegative: {
    color: '#DC2626',
  },
  balanceSub: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  balanceSubNegative: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  rechargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  rechargeBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  blockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  blockedText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txBody: {
    flex: 1,
  },
  txLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textDark,
  },
  txNote: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  txDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
  txAmountPositive: {
    color: '#16A34A',
  },
  txAmountNegative: {
    color: '#DC2626',
  },
  txBalance: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
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
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textDark,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textDark,
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  amountInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
  },
  upiLine: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  upiBold: {
    fontWeight: '800',
    color: Colors.textDark,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  closeBtnText: {
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
});
