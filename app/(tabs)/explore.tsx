import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import RouteMap from '@/components/RouteMap';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { FuelGrade, SampleStop } from '@/constants/sample-stops';
import { MIDLAND_TO_AUSTIN_ROUTE } from '@/constants/sample-stops';
import { getBrandStyle } from '@/constants/station-brand';
import { usePreferences } from '@/contexts/preferences-context';
import { useFuelPrices } from '@/hooks/use-fuel-prices';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  addStopToPlan,
  fetchRoute,
  fetchSelectedStops,
  fetchStopsForRoute,
  removeStopFromPlan,
  type SelectedStopRecord,
} from '@/services/stopService';
import { formatDistance, formatFuelPrice, formatUpdatedLabel } from '@/utils/stations';

type SortKey = 'distance' | 'price' | 'updated';
type FilterId = 'all' | 'open' | 'rewards' | 'detour';

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'distance', label: 'Distance' },
  { key: 'price', label: 'Price' },
  { key: 'updated', label: 'Updated' },
];

const filterChips: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All stops' },
  { id: 'open', label: 'Open now' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'detour', label: '< 0.5 mi detour' },
];

const fuelGradeLabel = {
  regular: 'Regular',
  midgrade: 'Midgrade',
  premium: 'Premium',
} as const;

const priceValue = (stop: SampleStop, grade: FuelGrade) => {
  // 1) Prefer a specific fuelBreakdown price if available
  const breakdown = stop.fuelBreakdown?.[grade];
  if (typeof breakdown === 'number') {
    return breakdown;
  }

  // 2) Fall back to stop.price, which may be a number or a string
  const rawPrice: unknown = (stop as any).price;

  if (typeof rawPrice === 'number') {
    // API already returns a numeric price (e.g. 2.89)
    return rawPrice;
  }

  if (typeof rawPrice === 'string') {
    // Handle values like \"$2.89\" or \"2.89\"
    const cleaned = rawPrice.replace('$', '').trim();
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  // 3) Fallback if price is missing/invalid
  return 0;
};

export default function ExploreScreen() {
  const [route, setRoute] = useState(MIDLAND_TO_AUSTIN_ROUTE);
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [filter, setFilter] = useState<FilterId>('all');

  const [stops, setStops] = useState<SampleStop[]>(route.stops);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStops, setSelectedStops] = useState<Record<string, SelectedStopRecord>>({});

  const { showOnlyOpenStations, fuelGrade } = usePreferences();
  const fuelPriceState = useFuelPrices(stops);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [routeData, stopsData, selectionData] = await Promise.all([
          fetchRoute('Midland, TX', 'Austin, TX'),
          fetchStopsForRoute('Midland, TX', 'Austin, TX'),
          fetchSelectedStops(),
        ]);
        console.log('Fetched route:', routeData);
        console.log('Fetched stops:', stopsData);
        console.log('Fetched selected stops:', selectionData);

        setRoute(routeData);
        setStops(stopsData);
        setSelectedStops(
          selectionData.reduce<Record<string, SelectedStopRecord>>((acc, record) => {
            const key = String(record.stopId ?? record.station?.id ?? '');
            if (key) {
              acc[key] = record;
            }
            return acc;
          }, {})
        );
      } catch (err) {
        console.error(err);
        setError('Failed to load live data. Showing fallback route.');
        setRoute(MIDLAND_TO_AUSTIN_ROUTE);
        setStops(MIDLAND_TO_AUSTIN_ROUTE.stops);
        setSelectedStops({});
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const mutedTextColor = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'tabIconDefault');
  const cardSurface = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const accentColor = useThemeColor({ light: '#2563eb', dark: '#7aa2ff' }, 'tint');
  const borderColor = useThemeColor(
    { light: 'rgba(15,23,42,0.08)', dark: 'rgba(255,255,255,0.12)' },
    'tabIconDefault'
  );
  const helperSurface = useThemeColor({ light: '#f3f4ff', dark: '#1c2537' }, 'background');

  const preferenceStops = useMemo(
    () => (showOnlyOpenStations ? stops.filter((stop) => stop.isOpen !== false) : stops),
    [showOnlyOpenStations, stops]
  );

  const filteredStops = useMemo(() => {
    return preferenceStops.filter((stop) => {
      if (filter === 'open') return stop.isOpen;
      if (filter === 'rewards') return stop.amenities?.includes('Rewards eligible');
      if (filter === 'detour') return (stop.distanceOffsetMiles ?? 0) <= 0.5;
      return true;
    });
  }, [filter, preferenceStops]);

  const sortedStops = useMemo(() => {
    const next = [...filteredStops];
    next.sort((a, b) => {
      if (sortKey === 'price') {
        return priceValue(a, fuelGrade) - priceValue(b, fuelGrade);
      }
      if (sortKey === 'updated') {
        return (a.lastUpdatedMinutes ?? 999) - (b.lastUpdatedMinutes ?? 999);
      }

      return (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0);
    });
    return next;
  }, [filteredStops, sortKey, fuelGrade]);

  const driveMinutes = 320;
  const driveHours = Math.floor(driveMinutes / 60);
  const driveLeftover = driveMinutes % 60;

  const activeSort = sortOptions.find((option) => option.key === sortKey) ?? sortOptions[0];

  const cycleSort = () => {
    const currentIndex = sortOptions.findIndex((option) => option.key === sortKey);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortKey(sortOptions[nextIndex].key);
  };

  const handleToggleStop = async (stop: SampleStop) => {
    try {
      const routeId = (route as any).id ?? 'midland-to-austin';
      const stopKey = String(stop.id ?? '');
      if (!stopKey) {
        return;
      }

      const existing = selectedStops[stopKey];

      if (existing) {
        await removeStopFromPlan(existing.id);
        setSelectedStops((prev) => {
          const next = { ...prev };
          delete next[stopKey];
          return next;
        });
        console.log('Removed stop from plan:', existing);
        return;
      }

      const result = await addStopToPlan(stopKey, routeId);
      console.log('Added stop to plan:', result);
      setSelectedStops((prev) => ({ ...prev, [stopKey]: result }));
    } catch (err) {
      console.error('Failed to toggle stop', err);
    }
  };

  const stationPrices = fuelPriceState.data;
  const priceStatusLabel =
    fuelPriceState.status === 'ready'
      ? 'Live prices'
      : fuelPriceState.status === 'loading'
        ? 'Refreshing live prices…'
        : 'Offline price cache';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={[styles.heroCard, { backgroundColor: cardSurface }]}>
        <View style={styles.heroHeader}>
          <ThemedText type="title">Along Route</ThemedText>
          <ThemedText style={[styles.heroSubheading, { color: mutedTextColor }]}>
            Curated stations synced to your Midland → Austin path.
          </ThemedText>
        </View>
        <View style={styles.heroMetaRow}>
          <View style={[styles.heroMetaCard, { backgroundColor: helperSurface }]}>
            <ThemedText style={styles.heroMetaLabel}>Drive Time</ThemedText>
            <ThemedText style={styles.heroMetaValue}>
              {driveHours}h {driveLeftover.toString().padStart(2, '0')}m
            </ThemedText>
            <ThemedText style={[styles.heroMetaCaption, { color: mutedTextColor }]}>
              With rest + fuel breaks
            </ThemedText>
          </View>
          <View style={[styles.heroMetaCard, { backgroundColor: helperSurface }]}>
            <ThemedText style={styles.heroMetaLabel}>Stops</ThemedText>
            <ThemedText style={styles.heroMetaValue}>{stops.length}</ThemedText>
            <ThemedText style={[styles.heroMetaCaption, { color: mutedTextColor }]}>
              Swap in alternates
            </ThemedText>
          </View>
          <View style={[styles.heroMetaCard, { backgroundColor: helperSurface }]}>
            <ThemedText style={styles.heroMetaLabel}>Savings</ThemedText>
            <ThemedText style={styles.heroMetaValue}>~$12</ThemedText>
            <ThemedText style={[styles.heroMetaCaption, { color: mutedTextColor }]}>
              Per tank plan
            </ThemedText>
          </View>
        </View>

        <View style={styles.heroMapWrapper}>
          <RouteMap route={route} />
        </View>
      </ThemedView>

      <View style={styles.toolbar}>
        <Pressable style={[styles.sortButton, { borderColor }]} onPress={cycleSort}>
          <Ionicons name="swap-vertical" size={18} color={accentColor} />
          <ThemedText style={styles.sortLabel}>Sort by {activeSort.label}</ThemedText>
          <Ionicons name="chevron-down" size={18} color={accentColor} />
        </Pressable>
        <Pressable style={[styles.viewButton, { backgroundColor: helperSurface }]}>
          <Ionicons name="map-outline" size={18} color={accentColor} />
          <ThemedText style={[styles.viewButtonLabel, { color: accentColor }]}>Map</ThemedText>
        </Pressable>
      </View>
      <ThemedText style={[styles.priceStatusText, { color: mutedTextColor }]}>
        {priceStatusLabel} • {fuelGradeLabel[fuelGrade]}
      </ThemedText>

      <View style={styles.filterRow}>
        {filterChips.map((chip) => (
          <Pressable
            key={chip.id}
            onPress={() => setFilter(chip.id)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === chip.id ? accentColor : 'transparent',
                borderColor,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterChipLabel,
                { color: filter === chip.id ? '#ffffff' : mutedTextColor },
              ]}
            >
              {chip.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {sortedStops.map((stop) => {
        const brand = getBrandStyle(stop.brand);
        const stopKey = String(stop.id ?? '');
        const isSelected = stopKey ? Boolean(selectedStops[stopKey]) : false;
        return (
          <ThemedView
            key={stop.id}
            style={[styles.stopCard, { backgroundColor: cardSurface, borderColor }]}
          >
            <View style={styles.stopHeader}>
              <View style={styles.brandRow}>
                <View style={[styles.brandBadge, { backgroundColor: brand.background }]}>
                  <ThemedText style={styles.brandEmoji}>{brand.emoji}</ThemedText>
                </View>
                <View>
                  <ThemedText type="defaultSemiBold">{stop.name}</ThemedText>
                  <ThemedText style={[styles.stopCity, { color: mutedTextColor }]}>
                    {stop.city}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.priceStack}>
                <ThemedText style={styles.priceValue}>
                  {formatFuelPrice(stop, fuelGrade, stationPrices)}
                </ThemedText>
                <ThemedText style={[styles.priceCaption, { color: mutedTextColor }]}>
                  per gal
                </ThemedText>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Ionicons name="locate" size={14} color={accentColor} />
                <ThemedText style={[styles.metaLabel, { color: accentColor }]}>
                  {formatDistance(stop.distanceMiles)} away
                </ThemedText>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="git-branch" size={14} color={accentColor} />
                <ThemedText style={[styles.metaLabel, { color: accentColor }]}>
                  {stop.distanceOffsetMiles} mi detour
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: stop.isOpen ? 'rgba(34,197,94,0.14)' : 'rgba(248,113,113,0.14)' },
                ]}
              >
                <ThemedText
                  style={[
                    styles.statusPillLabel,
                    { color: stop.isOpen ? '#15803d' : '#b91c1c' },
                  ]}
                >
                  {stop.isOpen ? 'Open' : 'Closed'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={14} color="#fbbf24" />
                <ThemedText style={styles.ratingLabel}>{stop.rating?.toFixed(1) ?? '4.5'}</ThemedText>
              </View>
              <ThemedText style={[styles.updatedText, { color: mutedTextColor }]}>
                {formatUpdatedLabel(stationPrices[stop.id]?.updatedAt, stop.lastUpdatedMinutes)}
              </ThemedText>
            </View>

            {stop.note && (
              <View style={[styles.noteBanner, { backgroundColor: helperSurface }]}>
                <Ionicons name="alert-circle" size={16} color={accentColor} />
                <ThemedText style={styles.noteText}>{stop.note}</ThemedText>
              </View>
            )}

            <View style={styles.stopFooter}>
              <View>
                <ThemedText style={styles.footerLabel}>
                  ETA {stop.etaMinutes} min • Rewards ready
                </ThemedText>
                <ThemedText style={[styles.footerCaption, { color: mutedTextColor }]}>
                  Includes {stop.amenities?.join(', ') ?? 'standard amenities'}
                </ThemedText>
              </View>
              <Pressable
                style={[
                  styles.stopButton,
                  { backgroundColor: accentColor },
                  isSelected && styles.stopButtonSelected,
                ]}
                onPress={() => handleToggleStop(stop)}
              >
                <ThemedText
                  style={[
                    styles.stopButtonLabel,
                    isSelected && styles.stopButtonLabelSelected,
                  ]}
                >
                  {isSelected ? 'Added' : 'Add Stop'}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
    paddingBottom: 32,
  },
  heroCard: {
    padding: 20,
    borderRadius: 28,
    gap: 18,
  },
  heroHeader: {
    gap: 8,
  },
  heroSubheading: {
    fontSize: 16,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroMetaCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  heroMetaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroMetaValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroMetaCaption: {
    fontSize: 12,
  },
  heroMapWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  sortButton: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  sortLabel: {
    fontWeight: '600',
    flex: 1,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  viewButtonLabel: {
    fontWeight: '600',
  },
  priceStatusText: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  stopCard: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  brandRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandEmoji: {
    fontSize: 24,
  },
  stopCity: {
    fontSize: 14,
  },
  priceStack: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  priceCaption: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  updatedText: {
    fontSize: 13,
  },
  noteBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
  },
  stopFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerLabel: {
    fontWeight: '600',
  },
  footerCaption: {
    fontSize: 13,
  },
  stopButton: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  stopButtonSelected: {
    opacity: 0.85,
  },
  stopButtonLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  stopButtonLabelSelected: {
    color: '#e0e7ff',
  },
});
