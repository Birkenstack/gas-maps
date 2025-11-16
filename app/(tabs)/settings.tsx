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

  const cardSurface = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const muted = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'tabIconDefault');
  const accent = useThemeColor({ light: '#2563eb', dark: '#7aa2ff' }, 'tint');
  const helperSurface = useThemeColor({ light: '#f3f4ff', dark: '#1f2537' }, 'background');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={[styles.sectionCard, { backgroundColor: cardSurface }]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Preferred Fuel Type</ThemedText>
          <ThemedText style={[styles.sectionCaption, { color: muted }]}>
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
                  { color: fuelGrade === grade ? '#ffffff' : '#111827' },
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

      <ThemedView style={[styles.sectionCard, { backgroundColor: cardSurface }]}>
        <ThemedText type="subtitle">Map Options</ThemedText>
        <SettingRow
          label="Dark Mode"
          description="Match device setting or force a theme"
          value={darkMode}
          onValueChange={setDarkMode}
          accent={accent}
          muted={muted}
        />
        <SettingRow
          label="Show Traffic"
          description="Overlay live incidents on the map"
          value={showTraffic}
          onValueChange={setShowTraffic}
          accent={accent}
          muted={muted}
        />
        <SettingRow
          label="Show Only Open Stations"
          description="Hide stops that are temporarily closed"
          value={showOnlyOpenStations}
          onValueChange={setShowOnlyOpenStations}
          accent={accent}
          muted={muted}
        />
      </ThemedView>

      <ThemedView style={[styles.sectionCard, { backgroundColor: cardSurface }]}>
        <ThemedText type="subtitle">App Info</ThemedText>
        {infoLinks.map((link) => (
          <Pressable key={link.id} style={styles.linkRow}>
            <View>
              <ThemedText type="defaultSemiBold">{link.label}</ThemedText>
              <ThemedText style={[styles.linkCaption, { color: muted }]}>{link.caption}</ThemedText>
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
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {description && (
        <ThemedText style={[styles.settingDescription, { color: muted }]}>{description}</ThemedText>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: 'rgba(148,163,184,0.4)', true: accent }}
      thumbColor="#ffffff"
      ios_backgroundColor="rgba(148,163,184,0.4)"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 24,
    gap: 16,
  },
  sectionHeader: {
    gap: 6,
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
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  gradeChipLabel: {
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingCopy: {
    flex: 1,
    gap: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  linkCaption: {
    fontSize: 13,
  },
});
