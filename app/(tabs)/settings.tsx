import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { FuelGrade } from '@/constants/sample-stops';
import { useThemeColor } from '@/hooks/use-theme-color';
import { usePreferences } from '@/contexts/preferences-context';

const infoLinks = [
  { id: 'about', label: 'About', caption: 'Release notes & roadmap' },
  { id: 'privacy', label: 'Privacy', caption: 'Your data on-device' },
  { id: 'data', label: 'Data Sources', caption: 'GasBuddy, DOT, OpenChargeMap' },
];

const fuelGrades: FuelGrade[] = ['regular', 'midgrade', 'premium'];

export default function SettingsScreen() {
  const {
    darkMode,
    setDarkMode,
    showTraffic,
    setShowTraffic,
    showOnlyOpenStations,
    setShowOnlyOpenStations,
    fuelGrade,
    setFuelGrade,
  } = usePreferences();

  const pageBackground = useThemeColor({ light: '#F7F7F7', dark: '#030712' }, 'background');
  const cardSurface = useThemeColor({ light: '#FFFFFF', dark: '#111827' }, 'background');
  const primaryText = useThemeColor({ light: '#1A1A1A', dark: '#F9FAFB' }, 'text');
  const muted = useThemeColor({ light: '#6A6A6A', dark: '#d1d5db' }, 'tabIconDefault');
  const metadata = useThemeColor({ light: '#9AA0A6', dark: '#9ca3af' }, 'tabIconDefault');
  const accent = useThemeColor({ light: '#3B82F6', dark: '#7aa2ff' }, 'tint');
  const helperSurface = useThemeColor({ light: '#EEF3FF', dark: '#1f2537' }, 'background');

  return (
    <ScrollView
      style={{ backgroundColor: pageBackground }}
      contentContainerStyle={styles.container}
    >
      <ThemedView style={[styles.sectionCard, styles.cardShadow, { backgroundColor: cardSurface }]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: primaryText }]}>
            Preferred Fuel Type
          </ThemedText>
          <ThemedText style={[styles.sectionCaption, { color: metadata }]}>
            Personalize price surfacing and alerts.
          </ThemedText>
        </View>
        <View style={styles.chipRow}>
          {fuelGrades.map((grade) => (
            <Pressable
              key={grade}
              onPress={() => setFuelGrade(grade)}
              style={[
                styles.gradeChip,
                {
                  backgroundColor: fuelGrade === grade ? accent : helperSurface,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.gradeChipLabel,
                  { color: fuelGrade === grade ? '#ffffff' : primaryText },
                ]}
              >
                {grade === 'regular'
                  ? 'Regular'
                  : grade === 'midgrade'
                    ? 'Midgrade'
                    : 'Premium'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={[styles.sectionCard, styles.cardShadow, { backgroundColor: cardSurface }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { color: primaryText }]}>Map Options</ThemedText>
        <SettingRow
          label="Dark Mode"
          description="Match device setting or force a theme"
          value={darkMode}
          onValueChange={setDarkMode}
          accent={accent}
          muted={metadata}
        />
        <SettingRow
          label="Show Traffic"
          description="Overlay live incidents on the map"
          value={showTraffic}
          onValueChange={setShowTraffic}
          accent={accent}
          muted={metadata}
        />
        <SettingRow
          label="Show Only Open Stations"
          description="Hide stops that are temporarily closed"
          value={showOnlyOpenStations}
          onValueChange={setShowOnlyOpenStations}
          accent={accent}
          muted={metadata}
        />
      </ThemedView>

      <ThemedView style={[styles.sectionCard, styles.cardShadow, { backgroundColor: cardSurface }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { color: primaryText }]}>App Info</ThemedText>
        {infoLinks.map((link) => (
          <Pressable key={link.id} style={styles.linkRow}>
            <View>
              <ThemedText type="defaultSemiBold">{link.label}</ThemedText>
              <ThemedText style={[styles.linkCaption, { color: metadata }]}>{link.caption}</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={muted} />
          </Pressable>
        ))}
      </ThemedView>
    </ScrollView>
  );
}

type SettingRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  accent: string;
  muted: string;
};

const SettingRow = ({ label, description, value, onValueChange, accent, muted }: SettingRowProps) => (
  <View style={styles.settingRow}>
    <View style={styles.settingCopy}>
      <ThemedText style={styles.settingLabel}>{label}</ThemedText>
      {description && (
        <ThemedText style={[styles.settingDescription, { color: muted }]}>{description}</ThemedText>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#D0D5DD', true: accent }}
      thumbColor="#ffffff"
      ios_backgroundColor="#D0D5DD"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  cardShadow: {
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 16,
    gap: 20,
  },
  sectionHeader: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionCaption: {
    fontSize: 14,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gradeChip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  gradeChipLabel: {
    fontWeight: '600',
    fontSize: 15,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 16,
  },
  settingCopy: {
    flex: 1,
    gap: 6,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E7EC',
  },
  linkCaption: {
    fontSize: 13,
    marginTop: 2,
  },
});
