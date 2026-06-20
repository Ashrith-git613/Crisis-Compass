import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS } from '../services/config';

const resources = [
  { name: 'Tele-MANAS', number: '14416', desc: 'National Mental Health Helpline — 24/7, 20 languages' },
  { name: 'Childline', number: '1098', desc: 'Children in distress — 24/7' },
  { name: 'Women Helpline', number: '181', desc: 'Domestic abuse & distress — 24/7' },
  { name: 'Police', number: '100', desc: 'Emergency police assistance' },
  { name: 'Ambulance', number: '102', desc: 'Emergency medical services' },
  { name: 'National De-addiction', number: '14446', desc: 'Substance use counseling — 24/7' },
  { name: 'KIRAN', number: '1800-599-0019', desc: 'Mental health support & rehabilitation' },
  { name: 'Cyber Crime', number: '1930', desc: 'Cyber crime reporting' },
];

export default function ResourcesScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>National Helplines</Text>
        <Text style={styles.subheader}>Verified, free, and available 24/7 across India.</Text>
        {resources.map((r, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardNumber}>{r.number}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardName}>{r.name}</Text>
              <Text style={styles.cardDesc}>{r.desc}</Text>
            </View>
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
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLeft: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginRight: 14,
    paddingVertical: 12,
  },
  cardNumber: { color: COLORS.primary, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  cardRight: { flex: 1, justifyContent: 'center' },
  cardName: { color: COLORS.text, fontSize: FONTS.body, fontWeight: '700' },
  cardDesc: { color: COLORS.textMuted, fontSize: FONTS.caption, marginTop: 3 },
});
