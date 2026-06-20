import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS } from '../services/config';

const alerts = [
  { type: 'INFO', title: 'Mental Health Awareness Month', desc: 'Free counseling camps available nationwide. Call Tele-MANAS at 14416.', time: '2h ago' },
  { type: 'ALERT', title: 'Heat Wave Advisory', desc: 'Multiple states under heat wave warning. Stay hydrated and check on vulnerable neighbors.', time: '5h ago' },
  { type: 'INFO', title: 'Disaster Response Teams Active', desc: 'NDRF teams deployed in flood-affected regions. Emergency helpline: 1078.', time: '1d ago' },
  { type: 'ALERT', title: 'Cyclone Preparedness', desc: 'Coastal regions advised to follow evacuation protocols. Control room: 1070.', time: '2d ago' },
];

export default function AlertsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Alerts</Text>
        <Text style={styles.subheader}>Real-time crisis notifications and advisories.</Text>
        {alerts.map((a, i) => (
          <View key={i} style={[styles.card, a.type === 'ALERT' && styles.cardAlert]}>
            <View style={styles.cardHeader}>
              <View style={[styles.badge, a.type === 'ALERT' ? styles.badgeAlert : styles.badgeInfo]}>
                <Text style={styles.badgeText}>{a.type}</Text>
              </View>
              <Text style={styles.time}>{a.time}</Text>
            </View>
            <Text style={styles.cardTitle}>{a.title}</Text>
            <Text style={styles.cardDesc}>{a.desc}</Text>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingTop: 70, paddingHorizontal: 20 },
  header: { color: COLORS.text, fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  subheader: { color: COLORS.textMuted, fontSize: FONTS.body, marginTop: 8, marginBottom: 24 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardAlert: { borderColor: '#FF525233', backgroundColor: '#1A0A0A' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeInfo: { backgroundColor: COLORS.primaryDim + '33' },
  badgeAlert: { backgroundColor: '#FF525233' },
  badgeText: { color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  time: { color: COLORS.textMuted, fontSize: 12 },
  cardTitle: { color: COLORS.text, fontSize: FONTS.body, fontWeight: '700', marginBottom: 6 },
  cardDesc: { color: COLORS.textSecondary, fontSize: FONTS.caption, lineHeight: 18 },
});
