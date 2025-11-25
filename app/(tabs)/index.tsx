import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import RouteMap from '@/components/RouteMap';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MIDLAND_TO_AUSTIN_ROUTE, type SampleRoute } from '@/constants/sample-stops';
import { getBrandStyle } from '@/constants/station-brand';
import { usePreferences } from '@/contexts/preferences-context';
import { useFuelPrices } from '@/hooks/use-fuel-prices';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  fetchRoute,
  fetchSelectedStops,
  removeStopFromPlan,
  type SelectedStopRecord,
} from '@/services/stopService';
import { formatDistance, formatFuelPrice, formatUpdatedLabel } from '@/utils/stations';

type LocationState =
  | { status: 'idle'; coords?: undefined; error?: undefined }
  | { status: 'requesting'; coords?: undefined; error?: undefined }
  | { status: 'ready'; coords: { latitude: number; longitude: number }; error?: undefined }
  | { status: 'denied'; coords?: undefined; error: string };

const DEFAULT_ROUTE = MIDLAND_TO_AUSTIN_ROUTE;
const fuelGradeLabel = {
  regular: 'Regular',
  midgrade: 'Midgrade',
  premium: 'Premium',
} as const;

export default function RoutePlannerScreen() {
  const [destination, setDestination] = useState(DEFAULT_ROUTE.destination.city);
  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [selectedStops, setSelectedStops] = useState<SelectedStopRecord[]>([]);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [clearingPlan, setClearingPlan] = useState(false);
  const [routeState, setRouteState] = useState<SampleRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  const { showTraffic, showOnlyOpenStations, fuelGrade } = usePreferences();
  const activeRoute = routeState ?? DEFAULT_ROUTE;
  const fuelPriceState = useFuelPrices(activeRoute.stops);

  const pageBackground = useThemeColor({ light: '#f5f6fa', dark: '#030712' }, 'background');
  const fieldBackground = useThemeColor(
    { light: 'rgba(255,255,255,0.95)', dark: 'rgba(17,24,39,0.96)' },
    'background'
  );
  const fieldMuted = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'tabIconDefault');
  const overlayShadow = useThemeColor(
    { light: '#0f172a0d', dark: '#00000066' },
    'tabIconDefault'
  );
  const accentColor = useThemeColor({ light: '#2563eb', dark: '#7aa2ff' }, 'tint');
  const cardSurface = useThemeColor({ light: '#ffffff', dark: '#1f2532' }, 'background');

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      setLocationState({ status: 'requesting' });
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationState({
          status: 'denied',
          error: 'Location permission is required to seed the route.',
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocationState({
        status: 'ready',
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to read the current location.';
      setLocationState({ status: 'denied', error: message });
    }
  }, []);

  const handleRemoveStop = useCallback(
    async (selection: SelectedStopRecord) => {
      if (removingId || clearingPlan) {
        return;
      }

      const previous = [...selectedStops];
      setRemovingId(selection.id);
      setSelectedStops((current) => current.filter((stop) => stop.id !== selection.id));

      try {
        await removeStopFromPlan(selection.id);
      } catch (err) {
        console.error('Failed to remove stop from plan', err);
        Alert.alert('Unable to remove stop', 'Please try again.');
        setSelectedStops(previous);
      } finally {
        setRemovingId(null);
      }
    },
    [selectedStops, removingId, clearingPlan]
  );

  const confirmClearPlan = useCallback(() => {
    if (!selectedStops.length || clearingPlan) {
      return;
    }

    Alert.alert('Clear Tank Plan', 'Clear all stops from Tank Plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const previous = [...selectedStops];
          setClearingPlan(true);
          setSelectedStops([]);
          try {
            await Promise.all(previous.map((stop) => removeStopFromPlan(stop.id)));
          } catch (err) {
            console.error('Failed to clear plan', err);
            Alert.alert('Unable to clear plan', 'Please try again.');
            setSelectedStops(previous);
          } finally {
            setClearingPlan(false);
          }
        },
      },
    ]);
  }, [selectedStops, clearingPlan]);

  const formatDurationLabel = useCallback((minutes?: number | null) => {
    if (minutes == null || Number.isNaN(minutes)) return null;
    const total = Math.round(minutes);
    const hours = Math.floor(total / 60);
    const remainder = total % 60;
    if (hours > 0) {
      return `${hours}h ${remainder.toString().padStart(2, '0')}m`;
    }
    return `${remainder}m`;
  }, []);

  const formatMilesLabel = useCallback((miles?: number | null) => {
    if (miles == null || Number.isNaN(miles)) return null;
    return `${Math.round(miles)} miles`;
  }, []);

  const handleStartRoute = useCallback(() => {
    if (!hasLocation) {
      Alert.alert('Set your location', 'Use your current location before starting the route.');
      return;
    }

    if (!routeState) {
      Alert.alert('Route not ready', 'We’re still loading your route. Please try again in a moment.');
      return;
    }

    if (selectedStops.length === 0) {
      Alert.alert(
        'No stops planned',
        'You can still start the route, but you have no Tank Plan stops yet.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start anyway',
            onPress: () => console.log('Starting route without tank plan'),
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Route started',
      `Starting ${routeState.origin.label} → ${routeState.destination.label} with ${selectedStops.length} planned stop${selectedStops.length === 1 ? '' : 's'}.`
    );
    console.log('Route started with plan:', {
      origin: routeState.origin.label,
      destination: routeState.destination.label,
      stops: selectedStops.map((selection) => selection.station?.name ?? `Station ${selection.stopId}`),
    });
  }, [hasLocation, routeState, selectedStops]);

  const hasLocation = locationState.status === 'ready';
  const pendingLocation = locationState.status === 'requesting';
  const locationError = locationState.status === 'denied' ? locationState.error : undefined;
  const canStartRoute = destination.trim().length > 0 && hasLocation;
  const stops = useMemo(() => {
    const baseStops = activeRoute.stops;
    return showOnlyOpenStations ? baseStops.filter((stop) => stop.isOpen !== false) : baseStops;
  }, [activeRoute, showOnlyOpenStations]);
  const stationPrices = fuelPriceState.data;
  const priceStatusLabel =
    fuelPriceState.status === 'ready'
      ? 'Live prices synced'
      : fuelPriceState.status === 'loading'
        ? 'Fetching live prices…'
        : 'Using local sample prices';

  const summaryRoute = routeState;
  const derivedDurationMinutes =
    routeState?.durationMinutes ??
    routeState?.etaMinutes ??
    (routeState as any)?.driveMinutes ??
    null;

  const derivedDistanceMiles =
    routeState?.distanceMiles ??
    (routeState as any)?.totalMiles ??
    (routeState as any)?.miles ??
    null;

  const durationLabel =
    (routeState as any)?.durationText ?? formatDurationLabel(derivedDurationMinutes);
  const distanceLabel =
    (routeState as any)?.distanceText ?? formatMilesLabel(derivedDistanceMiles);

  let routeMetaLabel = 'Route details pending';
  if (routeLoading) {
    routeMetaLabel = 'Loading route…';
  } else if (routeError) {
    routeMetaLabel = 'Route unavailable';
  } else if (routeState) {
    if (durationLabel && distanceLabel) {
      routeMetaLabel = `${durationLabel} • ${distanceLabel}`;
    } else if (durationLabel) {
      routeMetaLabel = durationLabel;
    } else if (distanceLabel) {
      routeMetaLabel = distanceLabel;
    } else {
      routeMetaLabel = 'Live route';
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function loadRoute() {
      try {
        setRouteLoading(true);
        setRouteError(null);
        const data = await fetchRoute('Midland, TX', 'Austin, TX');
        if (isMounted) {
          setRouteState(data);
          setRouteError(null);
        }
      } catch (err) {
        console.error('Failed to load route', err);
        if (isMounted) {
          setRouteError('Failed to load route');
        }
      } finally {
        if (isMounted) {
          setRouteLoading(false);
        }
      }
    }

    loadRoute();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadPlan() {
      try {
        setPlanLoading(true);
        setPlanError(null);
        const data = await fetchSelectedStops();
        if (isMounted) {
          setSelectedStops(data);
        }
      } catch (err) {
        console.error('Failed to load selected stops', err);
        if (isMounted) {
          setPlanError('Failed to load plan');
          setSelectedStops([]);
        }
      } finally {
        if (isMounted) {
          setPlanLoading(false);
        }
      }
    }

    loadPlan();
    return () => {
      isMounted = false;
    };
  }, []);

  const featuredSelection = selectedStops[0];
  const featuredStop = featuredSelection?.station ?? stops[0] ?? null;
  const featuredBrand = featuredStop ? getBrandStyle(featuredStop.brand) : null;
  const featuredPrice = featuredStop
    ? formatFuelPrice(featuredStop, fuelGrade, stationPrices)
    : null;
  const featuredMeta = featuredStop
    ? `${featuredStop.brand ?? featuredStop.name} • ${formatDistance(
        featuredStop.distanceMiles
      )} • ${formatUpdatedLabel(
        stationPrices[featuredStop.id]?.updatedAt,
        featuredStop.lastUpdatedMinutes
      )}`
    : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBackground }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.mapShell}>
          <RouteMap route={activeRoute} selectedStops={selectedStops} />

          <View style={[styles.mapOverlay, { shadowColor: overlayShadow }]} pointerEvents="box-none">
            <View style={[styles.searchCard, { backgroundColor: fieldBackground }]} pointerEvents="auto">
              <View style={styles.fieldRow}>
                <View style={styles.fieldRail}>
                  <View style={[styles.fieldDot, { backgroundColor: accentColor }]} />
                  <View>
                    <ThemedText style={styles.fieldLabel}>Current Location</ThemedText>
                    <ThemedText style={[styles.fieldValue, { color: fieldMuted }]} numberOfLines={1}>
                      {hasLocation
                        ? `${locationState.coords.latitude.toFixed(2)}, ${locationState.coords.longitude.toFixed(2)}`
                        : 'Use device GPS'}
                    </ThemedText>
                  </View>
                </View>
                <Pressable
                  style={[styles.fieldButton, pendingLocation && styles.fieldButtonDisabled]}
                  disabled={pendingLocation}
                  onPress={handleUseCurrentLocation}
                >
                  {pendingLocation ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.fieldButtonLabel}>Use</ThemedText>
                  )}
                </Pressable>
              </View>

              <View style={styles.fieldDivider} />

              <View style={styles.fieldRow}>
                <View style={styles.fieldRail}>
                  <View style={[styles.fieldDot, styles.destinationDot]} />
                  <View style={styles.destinationField}>
                    <ThemedText style={styles.fieldLabel}>Destination</ThemedText>
                    <TextInput
                      placeholder="Enter city or address"
                      placeholderTextColor={fieldMuted}
                      value={destination}
                      onChangeText={setDestination}
                      style={styles.destinationInput}
                      returnKeyType="done"
                    />
                  </View>
                </View>
              </View>
              {locationError && (
                <ThemedText style={styles.errorText}>{locationError}</ThemedText>
              )}
            </View>
          </View>

          {featuredStop && featuredBrand && (
            <View style={styles.priceRailWrapper}>
              <View
                style={[
                  styles.priceChip,
                  { borderColor: featuredBrand.accent, backgroundColor: cardSurface },
                ]}
              >
                <View style={[styles.brandBadge, { backgroundColor: featuredBrand.background }]}>
                  <ThemedText style={styles.brandBadgeEmoji}>{featuredBrand.emoji}</ThemedText>
                </View>
                <View style={styles.priceChipDetails}>
                  <ThemedText style={styles.priceChipValue}>{featuredPrice ?? '—'}</ThemedText>
                  {featuredMeta && (
                    <ThemedText style={[styles.priceChipMeta, { color: fieldMuted }]}>
                      {featuredMeta}
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        <ThemedText style={[styles.priceStatusText, { color: fieldMuted }]}>
          {priceStatusLabel} • {fuelGradeLabel[fuelGrade]}
        </ThemedText>

        <ThemedView style={[styles.planCard, { backgroundColor: cardSurface }]}>
          <View style={styles.planCardHeader}>
            <View>
              <ThemedText type="subtitle">
                {activeRoute.origin.label} → {activeRoute.destination.label}
              </ThemedText>
              <ThemedText style={{ color: fieldMuted }}>{routeMetaLabel}</ThemedText>
              {routeError && !routeLoading && (
                <ThemedText style={styles.errorText}>{routeError}</ThemedText>
              )}
            </View>
            <View style={styles.planBadge}>
              <ThemedText style={styles.planBadgeLabel}>
                {routeLoading ? 'Loading route' : 'Live Route'}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.planHelper, { color: fieldMuted }]}>
            {selectedStops.length > 0
              ? `You have ${selectedStops.length} planned fuel stop${selectedStops.length === 1 ? '' : 's'} on this route.`
              : 'Choose stops from the Along Route tab to build your Tank Plan.'}
          </ThemedText>

          {selectedStops.length === 0 && (
            <ThemedText style={{ color: fieldMuted }}>
              No Tank Plan yet. Add stops from the Along Route tab.
            </ThemedText>
          )}

          {selectedStops.slice(0, 3).map((selection, index) => {
            const station = selection.station;
            const brand = getBrandStyle(station?.brand);
            const rawPrice = station?.price;
            const price =
              typeof rawPrice === 'number'
                ? `$${rawPrice.toFixed(2)}`
                : (rawPrice as string | undefined) || '—';
            const cityLabel = station?.city ?? 'Unknown city';
            const etaLabel =
              typeof station?.etaMinutes === 'number' ? `ETA ${station.etaMinutes} min` : null;
            const detourLabel =
              typeof station?.distanceOffsetMiles === 'number'
                ? `${station.distanceOffsetMiles} mi detour`
                : null;
            const metaLabel = [cityLabel, etaLabel, detourLabel].filter(Boolean).join(' • ') || 'Distance n/a';

            return (
              <View key={selection.id} style={styles.planStopRow}>
                <View style={[styles.planStopIndex, { borderColor: brand.accent }]}>
                  <ThemedText style={{ color: brand.accent }}>{index + 1}</ThemedText>
                </View>
                <View style={styles.planStopContent}>
                  <View style={styles.planStopHeading}>
                    <ThemedText type="defaultSemiBold">
                      {station?.name ?? `Station ${selection.stopId}`}
                    </ThemedText>
                    <ThemedText style={[styles.priceChipValue, { color: brand.accent }]}>{price}</ThemedText>
                  </View>
                  <ThemedText style={[styles.priceChipMeta, { color: fieldMuted }]}>{metaLabel}</ThemedText>
                </View>
              </View>
            );
          })}
        </ThemedView>

        <ThemedView style={[styles.planListCard, { backgroundColor: cardSurface }]}>
          <View style={styles.planListHeader}>
            <ThemedText type="subtitle">Tank Plan</ThemedText>
            <Pressable
              onPress={confirmClearPlan}
              disabled={!selectedStops.length || clearingPlan}
              style={[
                styles.clearPlanButton,
                (!selectedStops.length || clearingPlan) && styles.clearPlanButtonDisabled,
              ]}
            >
              {clearingPlan ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText style={styles.clearPlanButtonLabel}>Clear Plan</ThemedText>
              )}
            </Pressable>
          </View>
          {planLoading && (
            <ThemedText style={{ color: fieldMuted }}>Loading plan…</ThemedText>
          )}
          {planError && !planLoading && (
            <ThemedText style={[styles.errorText, { marginTop: 4 }]}>{planError}</ThemedText>
          )}
          {!planLoading && !planError && selectedStops.length === 0 && (
            <ThemedText style={{ color: fieldMuted }}>
              No stops in your plan yet. Add stops from the Along Route tab.
            </ThemedText>
          )}
          {!planLoading &&
            !planError &&
            selectedStops.map((selection, index) => {
              const station = selection.station;
              const brand = getBrandStyle(station?.brand);
              const rawPrice = station?.price;
              const price =
                typeof rawPrice === 'number'
                  ? `$${(rawPrice as number).toFixed(2)}`
                  : (rawPrice as string | undefined) || '—';

              return (
                <View key={selection.id} style={[styles.planStopRow, styles.planListRow]}>
                  <View style={[styles.planStopIndex, { borderColor: brand.accent }]}>
                    <ThemedText style={{ color: brand.accent }}>{index + 1}</ThemedText>
                  </View>
                  <View style={styles.planStopContent}>
                    <View style={styles.planStopHeading}>
                      <ThemedText type="defaultSemiBold">
                        {station?.name ?? `Station ${selection.stopId}`}
                      </ThemedText>
                      <View style={styles.planStopActions}>
                        <ThemedText style={[styles.planListPrice, { color: brand.accent }]}>
                          {price}
                        </ThemedText>
                        <Pressable
                          onPress={() => handleRemoveStop(selection)}
                          disabled={removingId === selection.id || clearingPlan}
                          style={[
                            styles.planRemoveButton,
                            (removingId === selection.id || clearingPlan) &&
                              styles.planRemoveButtonDisabled,
                          ]}
                        >
                          {removingId === selection.id ? (
                            <ActivityIndicator size="small" color="#f87171" />
                          ) : (
                            <Ionicons name="trash-outline" size={16} color="#f87171" />
                          )}
                        </Pressable>
                      </View>
                    </View>
                    <ThemedText style={[styles.planListMeta, { color: fieldMuted }]}>
                      {station?.city ?? 'Unknown city'} •{' '}
                      {station?.etaMinutes ? `ETA ${station.etaMinutes} min • ` : ''}
                      {station?.distanceMiles ? formatDistance(station.distanceMiles) : 'Distance n/a'}
                    </ThemedText>
                    <View style={styles.planAddedBadge}>
                      <ThemedText style={styles.planAddedBadgeLabel}>Added stop</ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
        </ThemedView>

        <Pressable
          style={[styles.primaryButton, !canStartRoute && styles.primaryButtonDisabled]}
          disabled={!canStartRoute}
          onPress={handleStartRoute}
        >
          <ThemedText style={styles.primaryButtonLabel}>Start Route</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingBottom: 24,
    gap: 20,
    flexGrow: 1,
  },
  mapShell: {
    height: 460,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#d4def3',
  },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  searchCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fieldRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fieldDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  destinationDot: {
    backgroundColor: '#f43f5e',
  },
  fieldLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  fieldDivider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.45)',
  },
  fieldButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1f73ff',
  },
  fieldButtonDisabled: {
    opacity: 0.7,
  },
  fieldButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  destinationField: {
    flex: 1,
  },
  destinationInput: {
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },
  priceRailWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
  },
  priceRail: {
    paddingLeft: 16,
    paddingRight: 32,
    gap: 12,
  },
  priceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    marginRight: 12,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeEmoji: {
    fontSize: 20,
  },
  priceChipDetails: {
    gap: 2,
  },
  priceChipValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  priceChipMeta: {
    fontSize: 13,
  },
  priceMarker: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  priceMarkerValue: {
    fontWeight: '700',
  },
  priceMarkerMeta: {
    fontSize: 12,
  },
  priceStatusText: {
    textAlign: 'center',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  planCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    gap: 16,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  planBadgeLabel: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  planHelper: {
    fontSize: 14,
    lineHeight: 20,
  },
  planStopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  planStopIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  planStopContent: {
    flex: 1,
    gap: 4,
  },
  planStopHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planListCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    gap: 16,
  },
  planListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  planListRow: {
    alignItems: 'flex-start',
  },
  planListPrice: {
    fontWeight: '700',
  },
  planListMeta: {
    fontSize: 13,
  },
  planAddedBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(37,99,235,0.12)',
  },
  planAddedBadgeLabel: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planStopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planRemoveButton: {
    padding: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(248,113,113,0.8)',
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  planRemoveButtonDisabled: {
    opacity: 0.5,
  },
  clearPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#2563eb',
  },
  clearPlanButtonDisabled: {
    opacity: 0.5,
  },
  clearPlanButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  primaryButton: {
    marginHorizontal: 20,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  primaryButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
  },
});
