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
import type { SampleRoute } from '@/constants/sample-stops';
import { getBrandStyle } from '@/constants/station-brand';
import { usePreferences } from '@/contexts/preferences-context';
import { useFuelPrices } from '@/hooks/use-fuel-prices';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  fetchRoute,
  fetchSelectedStops,
  type RouteResponse,
  type SelectedStopRecord,
} from '@/services/stopService';
import { formatDistance, formatFuelPrice, formatUpdatedLabel } from '@/utils/stations';

type LocationState =
  | { status: 'idle'; coords?: undefined; error?: undefined }
  | { status: 'requesting'; coords?: undefined; error?: undefined }
  | { status: 'ready'; coords: { latitude: number; longitude: number }; error?: undefined }
  | { status: 'denied'; coords?: undefined; error: string };

const fuelGradeLabel = {
  regular: 'Regular',
  midgrade: 'Midgrade',
  premium: 'Premium',
} as const;

const isValidCoordinate = (
  point?: { latitude?: number; longitude?: number } | null
): point is { latitude: number; longitude: number } =>
  !!point &&
  typeof point.latitude === 'number' &&
  Number.isFinite(point.latitude) &&
  typeof point.longitude === 'number' &&
  Number.isFinite(point.longitude);

export default function RoutePlannerScreen() {
  const [destination, setDestination] = useState<string>('');
  const [debouncedDestination, setDebouncedDestination] = useState<string>('');
  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
  const [selectedStops, setSelectedStops] = useState<SelectedStopRecord[]>([]);
  const [routeState, setRouteState] = useState<RouteResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isDriving, setIsDriving] = useState(false);
  const { showTraffic, showOnlyOpenStations, fuelGrade } = usePreferences();
  const activeRoute = routeState;
  const fuelPriceState = useFuelPrices(activeRoute?.stops ?? []);

  const pageBackground = useThemeColor({ light: '#F7F7F7', dark: '#030712' }, 'background');
  const fieldMuted = useThemeColor({ light: '#9AA0A6', dark: '#9ca3af' }, 'tabIconDefault');
  const secondaryTextColor = useThemeColor(
    { light: '#6A6A6A', dark: '#d1d5db' },
    'tabIconDefault'
  );
  const primaryTextColor = useThemeColor({ light: '#1A1A1A', dark: '#F9FAFB' }, 'text');
  const accentColor = useThemeColor({ light: '#3B82F6', dark: '#7aa2ff' }, 'tint');
  const cardSurface = useThemeColor({ light: '#FFFFFF', dark: '#1f2532' }, 'background');

  const hasLocation = locationState.status === 'ready';
  const pendingLocation = locationState.status === 'requesting';
  const locationError = locationState.status === 'denied' ? locationState.error : undefined;
  const destinationInput = destination.trim();
  const hasDestination = destinationInput.length > 0;
  const hasActiveRoute = Boolean(activeRoute);
  const canStartRoute = hasDestination && hasLocation && hasActiveRoute && !routeLoading;
  const originCoordinatesKey =
    locationState.status === 'ready'
      ? `${locationState.coords.latitude},${locationState.coords.longitude}`
      : null;

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

    const originLabelSafe = routeState.origin?.label ?? 'Origin';
    const destinationLabelSafe = routeState.destination?.label ?? 'Destination';

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
      `Starting ${originLabelSafe} → ${destinationLabelSafe} with ${selectedStops.length} planned stop${selectedStops.length === 1 ? '' : 's'}.`
    );
    console.log('Route started with plan:', {
      origin: originLabelSafe,
      destination: destinationLabelSafe,
      stops: selectedStops.map((selection) => selection.station?.name ?? `Station ${selection.stopId}`),
    });
    setIsDriving(true);
    setShowAllSteps(false);
    setActiveStepIndex(0);
  }, [hasLocation, routeState, selectedStops]);

  const stops = useMemo(() => {
    const baseStops = activeRoute?.stops ?? [];
    return showOnlyOpenStations ? baseStops.filter((stop) => stop.isOpen !== false) : baseStops;
  }, [activeRoute, showOnlyOpenStations]);

  const bestAvailableStop = useMemo(() => {
    if (!stops.length) return null;

    const backendBest = stops.find(
      (stop) => stop.id && routeState?.bestStopId && String(stop.id) === String(routeState.bestStopId)
    );
    if (backendBest) {
      return backendBest;
    }

    const priceValue = (stop: SampleRoute['stops'][number]) => {
      const breakdown = stop.fuelBreakdown?.[fuelGrade];
      if (typeof breakdown === 'number') return breakdown;
      const raw = stop.price;
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'string') {
        const parsed = Number(raw.replace(/[^0-9.]/g, ''));
        return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
      }
      return Number.POSITIVE_INFINITY;
    };
    const detourValue = (stop: SampleRoute['stops'][number]) =>
      typeof stop.distanceOffsetMiles === 'number' ? stop.distanceOffsetMiles : Number.POSITIVE_INFINITY;

    const sorted = [...stops].sort((a, b) => {
      const detourDiff = detourValue(a) - detourValue(b);
      if (Math.abs(detourDiff) > 0.01) return detourDiff;
      return priceValue(a) - priceValue(b);
    });

    return sorted[0] ?? null;
  }, [stops, fuelGrade, routeState?.bestStopId]);
  const stationPrices = fuelPriceState.data;
  const bestStopPrice = bestAvailableStop
    ? formatFuelPrice(bestAvailableStop, fuelGrade, stationPrices)
    : null;
  const bestStopDistanceLabel =
    bestAvailableStop && typeof bestAvailableStop.distanceMiles === 'number'
      ? formatDistance(bestAvailableStop.distanceMiles)
      : null;
  const bestStopDetourLabel =
    bestAvailableStop && typeof bestAvailableStop.distanceOffsetMiles === 'number'
      ? `${bestAvailableStop.distanceOffsetMiles} mi detour`
      : null;
  const bestStopMeta = [bestStopDistanceLabel, bestStopPrice, bestStopDetourLabel]
    .filter(Boolean)
    .join(' • ');
  const priceStatusLabel =
    hasActiveRoute && fuelPriceState.status === 'ready' ? 'Live prices synced' : null;

  const summaryRoute = activeRoute;
  const derivedDurationMinutes = summaryRoute?.durationMinutes ?? null;
  const derivedDistanceMiles = summaryRoute?.distanceMiles ?? null;

  const durationLabel =
    summaryRoute?.durationText ?? formatDurationLabel(derivedDurationMinutes);
  const distanceLabel =
    summaryRoute?.distanceText ?? formatMilesLabel(derivedDistanceMiles);

  let routeMetaLabel = hasDestination
    ? 'Route details pending'
    : 'Enter a destination to see your route.';
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
    if (locationState.status === 'idle') {
      handleUseCurrentLocation();
    }
  }, [locationState.status, handleUseCurrentLocation]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedDestination(destinationInput);
    }, 500);
    return () => clearTimeout(handle);
  }, [destinationInput]);

  useEffect(() => {
    if (debouncedDestination.length === 0 || locationState.status !== 'ready') {
      setRouteState(null);
      setRouteError(null);
      setRouteLoading(false);
      setShowAllSteps(false);
      setIsDriving(false);
      return;
    }

    let isMounted = true;
    async function loadRoute() {
      const destinationLabel = debouncedDestination;
      const originLabel = `${locationState.coords.latitude},${locationState.coords.longitude}`;

      try {
        setRouteLoading(true);
        setRouteError(null);
        setSelectedStops([]);
        setShowAllSteps(false);
        setIsDriving(false);
        const data = await fetchRoute(originLabel, destinationLabel);
        if (isMounted) {
          setRouteState(data);
          setRouteError(null);
        }
      } catch (err) {
        console.error('Failed to load route', err);
        if (isMounted) {
          setRouteError('Failed to load route');
          setRouteState(null);
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
  }, [debouncedDestination, originCoordinatesKey, locationState.status]);

  useEffect(() => {
    if (!activeRoute) return;

    let isMounted = true;
    async function loadPlan() {
      try {
        const data = await fetchSelectedStops();
        if (isMounted) {
          setSelectedStops(data);
        }
      } catch (err) {
        console.error('Failed to load selected stops', err);
        if (isMounted) {
          setSelectedStops([]);
        }
      }
    }

    loadPlan();
    return () => {
      isMounted = false;
    };
  }, [activeRoute]);

  useEffect(() => {
    if (!activeRoute) {
      setSelectedStops([]);
    }
  }, [activeRoute]);

  useEffect(() => {
    if (!activeRoute) return;
    if (!bestAvailableStop) return;
    if (selectedStops.length > 0) return;

    setSelectedStops([
      {
        id: -1,
        stopId: String(bestAvailableStop.id),
        routeId: activeRoute?.id ?? 'live-route',
        recordedAt: new Date().toISOString(),
        station: bestAvailableStop,
      },
    ]);
  }, [selectedStops.length, bestAvailableStop, activeRoute?.id]);

  const featuredSelection = hasActiveRoute ? selectedStops[0] : null;
  const featuredStop = hasActiveRoute
    ? featuredSelection?.station ?? bestAvailableStop ?? stops[0] ?? null
    : null;
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

  const polylinePoints = useMemo(
    () => (activeRoute?.polyline ?? []).filter((point) => isValidCoordinate(point)),
    [activeRoute?.polyline]
  );

  const turnByTurnSteps = useMemo(() => {
    if (!activeRoute) return [];

    const liveSteps = activeRoute?.steps;
    if (liveSteps && liveSteps.length > 0) {
      return liveSteps.map((step, index) => ({
        title: step.instruction ?? `Step ${index + 1}`,
        meta: step.distanceText ?? step.durationText ?? undefined,
      }));
    }

    const steps: { title: string; meta?: string }[] = [];
    const originLabel =
      locationState.status === 'ready'
        ? 'Current location'
        : activeRoute?.origin?.label ?? 'Current location';
    const destinationLabel =
      destinationInput.length > 0
        ? destinationInput
        : activeRoute?.destination?.label ?? 'Destination';

    steps.push({ title: 'Depart', meta: originLabel });
    if (bestAvailableStop) {
      steps.push({
        title: bestAvailableStop.name,
        meta: bestStopMeta || bestAvailableStop.city,
      });
    }
    steps.push({
      title: 'Arrive',
      meta: destinationLabel,
    });
    return steps;
  }, [activeRoute, destinationInput, bestAvailableStop, bestStopMeta, locationState.status]);

  const activeStep = turnByTurnSteps[activeStepIndex] ?? null;

  const navFocusCoordinate = useMemo(() => {
    if (!isDriving) return null;
    if (polylinePoints.length === 0) {
      return hasLocation ? locationState.coords : null;
    }

    if (turnByTurnSteps.length <= 1) {
      return polylinePoints[0];
    }

    const progress = Math.min(
      1,
      Math.max(0, turnByTurnSteps.length > 1 ? activeStepIndex / (turnByTurnSteps.length - 1) : 0)
    );
    const targetIndex = Math.round(progress * (polylinePoints.length - 1));
    return polylinePoints[targetIndex] ?? polylinePoints[polylinePoints.length - 1] ?? null;
  }, [
    isDriving,
    polylinePoints,
    turnByTurnSteps.length,
    activeStepIndex,
    hasLocation,
    locationState.coords,
  ]);

  const visibleSteps = useMemo(() => {
    if (showAllSteps || turnByTurnSteps.length <= 1) {
      return turnByTurnSteps;
    }
    return activeStep ? [activeStep] : [];
  }, [showAllSteps, turnByTurnSteps, activeStep]);

  useEffect(() => {
    setActiveStepIndex(0);
  }, [turnByTurnSteps.length, activeRoute?.id]);

  const handleCycleStep = useCallback(() => {
    if (turnByTurnSteps.length === 0) return;
    setShowAllSteps(false);
    setActiveStepIndex((prev) => (prev + 1) % turnByTurnSteps.length);
  }, [turnByTurnSteps.length]);

  return (
    <SafeAreaView style={[styles.fullScreen, { backgroundColor: pageBackground }]}>
      <View style={styles.mapWrapper}>
        <RouteMap
          route={activeRoute}
          selectedStops={selectedStops}
          userLocation={hasLocation ? locationState.coords : null}
          driving={isDriving}
          focusCoordinate={navFocusCoordinate}
        />

        <View style={[styles.topControls, { backgroundColor: cardSurface }]}>
          <View style={styles.inputRow}>
            <View style={[styles.inputDot, styles.inputDotDestination]} />
            <View style={styles.inputCopy}>
              <ThemedText style={[styles.inputLabel, { color: fieldMuted }]}>Destination</ThemedText>
              <TextInput
                placeholder="Where to?"
                placeholderTextColor={fieldMuted}
                value={destination}
                onChangeText={setDestination}
                style={[styles.destinationInput, { color: primaryTextColor }]}
                returnKeyType="done"
              />
            </View>
          </View>
          <View style={styles.locationRow}>
            {pendingLocation ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <View
                style={[
                  styles.locationStatusDot,
                  { backgroundColor: hasLocation ? accentColor : '#f87171' },
                ]}
              />
            )}
            <ThemedText
              style={[styles.locationCopy, { color: hasLocation ? fieldMuted : '#f87171' }]}
              numberOfLines={1}
            >
              {pendingLocation
                ? 'Detecting your location…'
                : hasLocation
                  ? 'Origin set to your current location'
                  : 'Enable location services to plan a route'}
            </ThemedText>
            {!hasLocation && !pendingLocation && (
              <Pressable onPress={handleUseCurrentLocation}>
                <ThemedText style={[styles.inlineLinkLabel, { color: accentColor }]}>Retry</ThemedText>
              </Pressable>
            )}
          </View>
          {locationError && (
            <ThemedText style={[styles.errorText, { marginTop: 4 }]}>{locationError}</ThemedText>
          )}
        </View>

        {bestAvailableStop && (
          <Pressable style={[styles.recommendationPill, { backgroundColor: cardSurface }]}>
            <ThemedText style={[styles.recommendationLabel, { color: fieldMuted }]}>
              Recommended stop
            </ThemedText>
            <ThemedText style={[styles.recommendationName, { color: primaryTextColor }]} numberOfLines={1}>
              {bestAvailableStop.name}
            </ThemedText>
            <ThemedText style={[styles.recommendationMeta, { color: fieldMuted }]} numberOfLines={1}>
              {bestStopMeta || bestAvailableStop.city}
            </ThemedText>
          </Pressable>
        )}

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
                <ThemedText style={[styles.priceChipValue, { color: primaryTextColor }]}>
                  {featuredPrice ?? '—'}
                </ThemedText>
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

      <ThemedView style={[styles.directionsSheet, { backgroundColor: cardSurface }]}>
        <View style={styles.directionsHeader}>
          <View>
            <ThemedText type="subtitle">Turn-by-turn</ThemedText>
            <ThemedText style={{ color: secondaryTextColor }}>{routeMetaLabel}</ThemedText>
          </View>
          <View style={styles.directionsActions}>
            {priceStatusLabel && (
              <ThemedText style={{ color: fieldMuted }}>{priceStatusLabel}</ThemedText>
            )}
            <Pressable
              onPress={handleCycleStep}
              disabled={turnByTurnSteps.length === 0 || routeLoading}
              style={[
                styles.simButton,
                (turnByTurnSteps.length === 0 || routeLoading) && styles.simButtonDisabled,
              ]}
            >
              <ThemedText style={styles.simButtonLabel}>
                Next turn {turnByTurnSteps.length > 0 ? `(${activeStepIndex + 1}/${turnByTurnSteps.length})` : ''}
              </ThemedText>
            </Pressable>
          </View>
        </View>
        {activeStep && (
          <View style={[styles.simBanner, { backgroundColor: cardSurface }]}>
            <View style={[styles.stepIndex, { borderColor: accentColor }]}>
              <ThemedText style={{ color: accentColor }}>{activeStepIndex + 1}</ThemedText>
            </View>
            <View style={styles.stepCopy}>
              <ThemedText style={[styles.stepTitle, { color: primaryTextColor }]}>
                {activeStep.title}
              </ThemedText>
              {activeStep.meta && (
                <ThemedText style={[styles.stepMeta, { color: fieldMuted }]} numberOfLines={2}>
                  {activeStep.meta}
                </ThemedText>
              )}
            </View>
          </View>
        )}
        <ScrollView
          style={styles.stepList}
          contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {visibleSteps.length === 0 ? (
            <ThemedText style={[styles.emptyStateText, { color: fieldMuted }]}>
              Enter a destination to see turn-by-turn directions with the best gas stop.
            </ThemedText>
          ) : (
            <>
              {visibleSteps.map((step, index) => (
                <View key={`${step.title}-${index}`} style={styles.stepRow}>
                  <View style={[styles.stepIndex, { borderColor: accentColor }]}>
                    <ThemedText style={{ color: accentColor }}>
                      {showAllSteps ? index + 1 : 'Next'}
                    </ThemedText>
                  </View>
                  <View style={styles.stepCopy}>
                    <ThemedText style={[styles.stepTitle, { color: primaryTextColor }]}>
                      {step.title}
                    </ThemedText>
                    {step.meta && (
                      <ThemedText style={[styles.stepMeta, { color: fieldMuted }]} numberOfLines={2}>
                        {step.meta}
                      </ThemedText>
                    )}
                  </View>
                </View>
              ))}
              {turnByTurnSteps.length > 1 && (
                <Pressable
                  onPress={() => setShowAllSteps((prev) => !prev)}
                  style={styles.expandButton}
                >
                  <ThemedText style={{ color: accentColor, fontWeight: '700' }}>
                    {showAllSteps ? 'Hide full route' : `Show all steps (${turnByTurnSteps.length})`}
                  </ThemedText>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
        <Pressable
          style={[
            styles.primaryButton,
            !canStartRoute && styles.primaryButtonDisabled,
          ]}
          disabled={!canStartRoute}
          onPress={handleStartRoute}
        >
          <ThemedText style={styles.primaryButtonLabel}>
            {routeLoading ? 'Loading route…' : 'Start driving'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  topControls: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26,26,26,0.08)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  inputDotDestination: {
    backgroundColor: '#f43f5e',
  },
  inputCopy: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  destinationInput: {
    fontSize: 18,
    fontWeight: '700',
    padding: 0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationCopy: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  inlineLinkLabel: {
    fontWeight: '700',
    fontSize: 14,
  },
  recommendationPill: {
    position: 'absolute',
    top: 120,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 2,
    maxWidth: '60%',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26,26,26,0.08)',
  },
  recommendationLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  recommendationName: {
    fontSize: 16,
    fontWeight: '700',
  },
  recommendationMeta: {
    fontSize: 13,
  },
  priceRailWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  priceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    marginRight: 12,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeEmoji: {
    fontSize: 18,
  },
  priceChipDetails: {
    gap: 2,
  },
  priceChipValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  priceChipMeta: {
    fontSize: 13,
  },
  directionsSheet: {
    padding: 16,
    gap: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26,26,26,0.08)',
  },
  directionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  directionsActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  stepList: {
    maxHeight: 240,
  },
  simButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
  },
  simButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  simButtonLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  simBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    borderColor: 'rgba(26,26,26,0.08)',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCopy: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepMeta: {
    fontSize: 14,
  },
  expandButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
  },
  primaryButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
  },
});
