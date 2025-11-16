import * as Location from 'expo-location';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { usePreferences } from '@/contexts/preferences-context';
import { MIDLAND_TO_AUSTIN_ROUTE } from '@/constants/sample-stops';
import { getBrandStyle } from '@/constants/station-brand';
import { useFuelPrices } from '@/hooks/use-fuel-prices';
import { buildRegionFromCoordinates } from '@/utils/map';
import { formatDistance, formatFuelPrice, formatUpdatedLabel } from '@/utils/stations';

type LocationState =
  | { status: 'idle'; coords?: undefined; error?: undefined }
  | { status: 'requesting'; coords?: undefined; error?: undefined }
  | { status: 'ready'; coords: { latitude: number; longitude: number }; error?: undefined }
  | { status: 'denied'; coords?: undefined; error: string };

const route = MIDLAND_TO_AUSTIN_ROUTE;
const fuelGradeLabel = {
  regular: 'Regular',
  midgrade: 'Midgrade',
  premium: 'Premium',
} as const;
const allCoordinates = [
  route.origin.coordinates,
  ...route.polyline,
  route.destination.coordinates,
];

export default function RoutePlannerScreen() {
  const [destination, setDestination] = useState(route.destination.city);
  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
  const { showTraffic, showOnlyOpenStations, fuelGrade } = usePreferences();
  const fuelPriceState = useFuelPrices(route.stops);

  const region = useMemo(() => buildRegionFromCoordinates(allCoordinates), []);
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

  const handleStartRoute = useCallback(() => {
    console.log('Start route tapped');
  }, []);

  const hasLocation = locationState.status === 'ready';
  const pendingLocation = locationState.status === 'requesting';
  const locationError = locationState.status === 'denied' ? locationState.error : undefined;
  const canStartRoute = destination.trim().length > 0 && hasLocation;
  const stops = useMemo(
    () => (showOnlyOpenStations ? route.stops.filter((stop) => stop.isOpen !== false) : route.stops),
    [showOnlyOpenStations]
  );
  const stationPrices = fuelPriceState.data;
  const priceStatusLabel =
    fuelPriceState.status === 'ready'
      ? 'Live prices synced'
      : fuelPriceState.status === 'loading'
        ? 'Fetching live prices…'
        : 'Using local sample prices';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBackground }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.mapShell}>
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            showsCompass={false}
            showsPointsOfInterest={false}
            showsBuildings={false}
            toolbarEnabled={false}
            pitchEnabled={false}
            showsTraffic={showTraffic}
          >
            <Polyline coordinates={route.polyline} strokeColor={accentColor} strokeWidth={4} />
            <Marker coordinate={route.origin.coordinates} title={route.origin.label} pinColor={accentColor} />
            <Marker coordinate={route.destination.coordinates} title={route.destination.label} pinColor="#ef4444" />
            {stops.map((stop) => {
              const brand = getBrandStyle(stop.brand);
              return (
                <Marker key={stop.id} coordinate={stop.coordinates} title={stop.name}>
                  <View
                    style={[
                      styles.priceMarker,
                      {
                        borderColor: brand.accent,
                        backgroundColor: brand.background,
                        shadowColor: overlayShadow,
                      },
                    ]}
                  >
                    <ThemedText style={styles.priceMarkerValue}>
                      {formatFuelPrice(stop, fuelGrade, stationPrices)}
                    </ThemedText>
                    <ThemedText style={[styles.priceMarkerMeta, { color: fieldMuted }]}>
                      {formatDistance(stop.distanceMiles)}
                    </ThemedText>
                  </View>
                </Marker>
              );
            })}
          </MapView>

          <View style={[styles.mapOverlay, { shadowColor: overlayShadow }]}>
            <View style={[styles.searchCard, { backgroundColor: fieldBackground }]}>
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.priceRail}
            style={styles.priceRailWrapper}
          >
            {stops.map((stop) => {
              const brand = getBrandStyle(stop.brand);
              return (
                <View
                  key={stop.id}
                  style={[
                    styles.priceChip,
                    { borderColor: brand.accent, backgroundColor: cardSurface },
                  ]}
                >
                  <View style={[styles.brandBadge, { backgroundColor: brand.background }]}>
                    <ThemedText style={styles.brandBadgeEmoji}>{brand.emoji}</ThemedText>
                  </View>
                  <View style={styles.priceChipDetails}>
                    <ThemedText style={styles.priceChipValue}>
                      {formatFuelPrice(stop, fuelGrade, stationPrices)}
                    </ThemedText>
                    <ThemedText style={[styles.priceChipMeta, { color: fieldMuted }]}>
                      {stop.brand ?? stop.name} • {formatDistance(stop.distanceMiles)} •{' '}
                      {formatUpdatedLabel(
                        stationPrices[stop.id]?.updatedAt,
                        stop.lastUpdatedMinutes
                      )}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <ThemedText style={[styles.priceStatusText, { color: fieldMuted }]}>
          {priceStatusLabel} • {fuelGradeLabel[fuelGrade]}
        </ThemedText>

        <ThemedView style={[styles.planCard, { backgroundColor: cardSurface }]}>
          <View style={styles.planCardHeader}>
            <View>
              <ThemedText type="subtitle">Midland → {destination || 'Destination'}</ThemedText>
              <ThemedText style={{ color: fieldMuted }}>Est. 5h 20m • 308 miles</ThemedText>
            </View>
            <View style={styles.planBadge}>
              <ThemedText style={styles.planBadgeLabel}>Route Shell</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.planHelper, { color: fieldMuted }]}>
            Live traffic, EV availability, and alternative stations wire up here once the real APIs land.
          </ThemedText>

          {stops.slice(0, 3).map((stop, index) => {
            const brand = getBrandStyle(stop.brand);
            return (
              <View key={stop.id} style={styles.planStopRow}>
                <View style={[styles.planStopIndex, { borderColor: brand.accent }]}>
                  <ThemedText style={{ color: brand.accent }}>{index + 1}</ThemedText>
                </View>
                <View style={styles.planStopContent}>
                  <View style={styles.planStopHeading}>
                    <ThemedText type="defaultSemiBold">{stop.name}</ThemedText>
                    <ThemedText style={[styles.priceChipValue, { color: brand.accent }]}>
                      {formatFuelPrice(stop, fuelGrade, stationPrices)}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.priceChipMeta, { color: fieldMuted }]}>
                    {stop.city} • ETA {stop.etaMinutes} min • {stop.distanceOffsetMiles} mi detour
                  </ThemedText>
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
