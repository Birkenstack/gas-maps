import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import RouteMap from '@/components/RouteMap';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { FuelGrade, SampleStop } from '@/constants/sample-stops';
import { MIDLAND_TO_AUSTIN_ROUTE } from '@/constants/sample-stops';
import { getBrandStyle } from '@/constants/station-brand';
import { usePreferences } from '@/contexts/preferences-context';
import { useFuelPrices } from '@/hooks/use-fuel-prices';
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

const Colors = {
  light: {
    background: '#F7F7F7',
    card: '#FFFFFF',
    primaryText: '#1A1A1A',
    secondaryText: '#6A6A6A',
    metadataText: '#9AA0A6',
    accent: '#3B82F6',
  },
  dark: {
    background: '#0D1117',
    card: '#161B22',
    primaryText: '#E6E6E6',
    secondaryText: '#9EA6B5',
    metadataText: '#7D8694',
    accent: '#3B82F6',
  },
} as const;

const fuelGradeLabel = {
  regular: 'Regular',
  midgrade: 'Midgrade',
  premium: 'Premium',
} as const;

const priceValue = (stop: SampleStop, grade: FuelGrade) => {
  const breakdown = stop.fuelBreakdown?.[grade];
  if (typeof breakdown === 'number') {
    return breakdown;
  }

  const rawPrice: unknown = (stop as any).price;

  if (typeof rawPrice === 'number') {
    return rawPrice;
  }

  if (typeof rawPrice === 'string') {
    const cleaned = rawPrice.replace('$', '').trim();
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

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
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const cardChromeStyle = colorScheme === 'dark' ? styles.darkCardBorder : styles.lightCardShadow;
  const helperSurface = colorScheme === 'dark' ? '#202A38' : '#EEF3FF';
  const metaPillBackground = colorScheme === 'dark' ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)';
  const ratingBackground = colorScheme === 'dark' ? 'rgba(251,191,36,0.25)' : '#FFF7DA';
  const noteBackground = colorScheme === 'dark' ? '#1F2633' : '#EEF3FF';
  const openStatusBackground = colorScheme === 'dark' ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.15)';
  const closedStatusBackground = colorScheme === 'dark' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)';

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [routeData, stopsData, selectionData] = await Promise.all([
          fetchRoute('Midland, TX', 'Austin, TX'),
          fetchStopsForRoute('Midland, TX', 'Austin, TX'),
          fetchSelectedStops(),
        ]);

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
        return;
      }

      const result = await addStopToPlan(stopKey, routeId);
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
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.container}>
      <ThemedView style={[styles.heroCard, cardChromeStyle, { backgroundColor: theme.card }]}>
        <View style={styles.heroHeader}>
          <ThemedText type="title" style={[styles.heroTitle, { color: theme.primaryText }]}>
            Along Route
          </ThemedText>
          <ThemedText style={[styles.heroSubheading, { color: theme.secondaryText }]}>
            Curated stations synced to your Midland → Austin path.
          </ThemedText>
        </View>
        <View style={styles.heroMetaRow}>
          <View style={[styles.heroMetaCard, { backgroundColor: helperSurface }]}>
            <ThemedText style={[styles.heroMetaLabel, { color: theme.secondaryText }]}>Drive Time</ThemedText>
            <ThemedText style={[styles.heroMetaValue, { color: theme.primaryText }]}>
              {driveHours}h {driveLeftover.toString().padStart(2, '0')}m
            </ThemedText>
            <ThemedText style={[styles.heroMetaCaption, { color: theme.secondaryText }]}>With rest + fuel breaks</ThemedText>
          </View>
          <View style={[styles.heroMetaCard, { backgroundColor: helperSurface }]}>
            <ThemedText style={[styles.heroMetaLabel, { color: theme.secondaryText }]}>Stops</ThemedText>
            <ThemedText style={[styles.heroMetaValue, { color: theme.primaryText }]}>{stops.length}</ThemedText>
            <ThemedText style={[styles.heroMetaCaption, { color: theme.secondaryText }]}>Swap in alternates</ThemedText>
          </View>
          <View style={[styles.heroMetaCard, { backgroundColor: helperSurface }]}>
            <ThemedText style={[styles.heroMetaLabel, { color: theme.secondaryText }]}>Savings</ThemedText>
            <ThemedText style={[styles.heroMetaValue, { color: theme.primaryText }]}>~$12</ThemedText>
            <ThemedText style={[styles.heroMetaCaption, { color: theme.secondaryText }]}>Per tank plan</ThemedText>
          </View>
        </View>

        <View style={[styles.heroMapWrapper, cardChromeStyle, { backgroundColor: theme.card }]}>
          <View style={styles.heroMapContent}>
            <RouteMap route={route} />
          </View>
        </View>
      </ThemedView>

      <View style={styles.toolbar}>
        <Pressable
          style={[
            styles.sortButton,
            cardChromeStyle,
            { backgroundColor: theme.card, borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' },
          ]}
          onPress={cycleSort}
        >
          <Ionicons name="swap-vertical" size={18} color={theme.accent} />
          <ThemedText style={[styles.sortLabel, { color: theme.primaryText }]}>Sort by {activeSort.label}</ThemedText>
          <Ionicons name="chevron-down" size={18} color={theme.accent} />
        </Pressable>
        <Pressable style={[styles.viewButton, { backgroundColor: helperSurface }]}>
          <Ionicons name="map-outline" size={18} color={theme.accent} />
          <ThemedText style={[styles.viewButtonLabel, { color: theme.primaryText }]}>Map</ThemedText>
        </Pressable>
      </View>
      <ThemedText style={[styles.priceStatusText, { color: theme.secondaryText }]}>
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
                backgroundColor: filter === chip.id ? theme.accent : theme.card,
                borderColor: filter === chip.id ? theme.accent : 'transparent',
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterChipLabel,
                { color: filter === chip.id ? theme.primaryText : theme.secondaryText },
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
          <ThemedView key={stop.id} style={[styles.stopCard, cardChromeStyle, { backgroundColor: theme.card }]}>
            <View style={styles.stopHeader}>
              <View style={styles.brandRow}>
                <View style={[styles.brandBadge, { backgroundColor: brand.background }]}>
                  <ThemedText style={styles.brandEmoji}>{brand.emoji}</ThemedText>
                </View>
                <View>
                  <ThemedText style={[styles.stopName, { color: theme.primaryText }]}>{stop.name}</ThemedText>
                  <ThemedText style={[styles.stopCity, { color: theme.secondaryText }]}>{stop.city}</ThemedText>
                </View>
              </View>
              <View style={styles.priceStack}>
                <ThemedText style={[styles.priceValue, { color: theme.primaryText }]}>
                  {formatFuelPrice(stop, fuelGrade, stationPrices)}
                </ThemedText>
                <ThemedText style={[styles.priceCaption, { color: theme.secondaryText }]}>per gal</ThemedText>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={[styles.metaPill, { backgroundColor: metaPillBackground }]}>
                <Ionicons name="locate" size={14} color={theme.accent} />
                <ThemedText style={[styles.metaLabel, { color: theme.secondaryText }]}>
                  {formatDistance(stop.distanceMiles)} away
                </ThemedText>
              </View>
              <View style={[styles.metaPill, { backgroundColor: metaPillBackground }]}>
                <Ionicons name="git-branch" size={14} color={theme.accent} />
                <ThemedText style={[styles.metaLabel, { color: theme.secondaryText }]}>
                  {stop.distanceOffsetMiles} mi detour
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: stop.isOpen ? openStatusBackground : closedStatusBackground },
                ]}
              >
                <ThemedText style={[styles.statusPillLabel, { color: theme.primaryText }]}>
                  {stop.isOpen ? 'Open' : 'Closed'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={[styles.ratingPill, { backgroundColor: ratingBackground }]}>
                <Ionicons name="star" size={14} color="#fbbf24" />
                <ThemedText style={[styles.ratingLabel, { color: theme.primaryText }]}>
                  {stop.rating?.toFixed(1) ?? '4.5'}
                </ThemedText>
              </View>
              <ThemedText style={[styles.updatedText, { color: theme.secondaryText }]}>
                {formatUpdatedLabel(stationPrices[stop.id]?.updatedAt, stop.lastUpdatedMinutes)}
              </ThemedText>
            </View>

            {stop.note && (
              <View style={[styles.noteBanner, { backgroundColor: noteBackground }]}>
                <Ionicons name="alert-circle" size={16} color={theme.accent} />
                <ThemedText style={[styles.noteText, { color: theme.primaryText }]}>{stop.note}</ThemedText>
              </View>
            )}

            <View style={styles.stopFooter}>
              <View>
                <ThemedText style={[styles.footerLabel, { color: theme.primaryText }]}>
                  ETA {stop.etaMinutes} min • Rewards ready
                </ThemedText>
                <ThemedText style={[styles.footerCaption, { color: theme.secondaryText }]}>
                  Includes {stop.amenities?.join(', ') ?? 'standard amenities'}
                </ThemedText>
              </View>
              <Pressable
                style={[
                  styles.stopButton,
                  { backgroundColor: theme.accent },
                  isSelected && styles.stopButtonSelected,
                ]}
                onPress={() => handleToggleStop(stop)}
              >
                <ThemedText style={[styles.stopButtonLabel, { color: theme.primaryText }]}>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  lightCardShadow: {
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  darkCardBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroCard: {
    padding: 20,
    borderRadius: 20,
    gap: 20,
  },
  heroHeader: {
    gap: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
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
    padding: 16,
    gap: 6,
  },
  heroMetaLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroMetaValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  heroMetaCaption: {
    fontSize: 13,
  },
  heroMapWrapper: {
    borderRadius: 20,
    padding: 12,
  },
  heroMapContent: {
    borderRadius: 16,
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
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  stopCard: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
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
  stopName: {
    fontSize: 18,
    fontWeight: '700',
  },
  stopCity: {
    fontSize: 14,
  },
  priceStack: {
    alignItems: 'flex-end',
    gap: 2,
  },
  priceValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  priceCaption: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaLabel: {
    fontSize: 13,
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
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  updatedText: {
    fontSize: 14,
  },
  noteBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 12,
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
    marginTop: 12,
  },
  footerLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  footerCaption: {
    fontSize: 13,
  },
  stopButton: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  stopButtonSelected: {
    opacity: 0.9,
  },
  stopButtonLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
});
