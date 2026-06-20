import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../services/config';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
        <Text style={styles.name}>Anonymous User</Text>
        <Text style={styles.status}>No active crises</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Profile management coming soon.
        </Text>
        <Text style={styles.placeholderSub}>
          Your data stays on-device and is never stored on our servers.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 70, paddingHorizontal: 20 },
  header: { color: COLORS.text, fontSize: 28, fontWeight: '800', letterSpacing: 1, marginBottom: 28 },
  card: { alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText: { color: COLORS.primary, fontSize: 28, fontWeight: '800' },
  name: { color: COLORS.text, fontSize: FONTS.subtitle, fontWeight: '700' },
  status: { color: COLORS.textMuted, fontSize: FONTS.body, marginTop: 4 },
  placeholder: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  placeholderText: { color: COLORS.textSecondary, fontSize: FONTS.body, textAlign: 'center' },
  placeholderSub: { color: COLORS.textMuted, fontSize: FONTS.caption, textAlign: 'center', marginTop: 8 },
});
