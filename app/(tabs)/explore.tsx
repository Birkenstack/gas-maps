import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MIDLAND_TO_AUSTIN_STOPS } from '@/constants/sample-stops';

export default function StopsScreen() {
  const borderColor = useThemeColor(
    { light: 'rgba(39,76,119,0.2)', dark: 'rgba(255,255,255,0.2)' },
    'tabIconDefault'
  );
  const mutedTextColor = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'tabIconDefault');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.card} lightColor="#ffffff" darkColor="#1f2933">
        <ThemedText type="title">Stops & Pricing</ThemedText>
        <ThemedText style={[styles.bodyText, { color: mutedTextColor }]}>
          This tab will surface real-time fuel prices, detours, and routing overlays once the Google
          Directions and pricing providers are connected.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card} lightColor="#ffffff" darkColor="#1f2933">
        <ThemedText type="subtitle">Route Preview</ThemedText>
        <View style={[styles.mapPlaceholder, { borderColor }]}>
          <ThemedText style={styles.mapPlaceholderText}>Map preview placeholder</ThemedText>
          <ThemedText style={[styles.bodyText, styles.mapHint, { color: mutedTextColor }]}>
            Render the Google Maps polyline here, centered on the active route.
          </ThemedText>
        </View>
      </ThemedView>

      <ThemedView style={styles.card} lightColor="#ffffff" darkColor="#1f2933">
        <ThemedText type="subtitle">Sample Stop Order</ThemedText>
        {MIDLAND_TO_AUSTIN_STOPS.map((stop, index) => (
          <View key={stop.id} style={[styles.stopRow, { borderColor }]}>
            <View style={styles.stopBadge}>
              <ThemedText style={styles.stopBadgeLabel}>{index + 1}</ThemedText>
            </View>
            <View style={styles.stopDetails}>
              <ThemedText type="defaultSemiBold">{stop.name}</ThemedText>
              <ThemedText>{stop.city}</ThemedText>
              <ThemedText style={[styles.bodyText, { color: mutedTextColor }]}>
                {stop.price} • ETA {stop.etaMinutes} min • {stop.distanceOffsetMiles} mi off route
              </ThemedText>
            </View>
          </View>
        ))}
      </ThemedView>

      <ThemedView style={styles.card} lightColor="#ffffff" darkColor="#1f2933">
        <ThemedText type="subtitle">Next Build Tasks</ThemedText>
        <View style={styles.taskItem}>
          <View style={[styles.bullet, { backgroundColor: borderColor }]} />
          <ThemedText style={styles.bodyText}>
            Integrate Google Directions API for route geometry and travel time.
          </ThemedText>
        </View>
        <View style={styles.taskItem}>
          <View style={[styles.bullet, { backgroundColor: borderColor }]} />
          <ThemedText style={styles.bodyText}>
            Add a fuel pricing provider (GasBuddy commercial API or alternative) with caching.
          </ThemedText>
        </View>
        <View style={styles.taskItem}>
          <View style={[styles.bullet, { backgroundColor: borderColor }]} />
          <ThemedText style={styles.bodyText}>
            Plot stops on the map and sync selections with the route planner tab.
          </ThemedText>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    gap: 14,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 22,
  },
  mapPlaceholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
  },
  mapHint: {
    textAlign: 'center',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stopBadge: {
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: '#274c77',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stopBadgeLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  stopDetails: {
    flex: 1,
    gap: 2,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    height: 8,
    width: 8,
    borderRadius: 4,
    marginTop: 7,
  },
});
