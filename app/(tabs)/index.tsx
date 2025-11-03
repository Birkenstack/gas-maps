import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MIDLAND_TO_AUSTIN_STOPS } from '@/constants/sample-stops';

type LocationState =
  | { status: 'idle'; coords?: undefined; error?: undefined }
  | { status: 'requesting'; coords?: undefined; error?: undefined }
  | { status: 'ready'; coords: { latitude: number; longitude: number }; error?: undefined }
  | { status: 'denied'; coords?: undefined; error: string };

export default function RoutePlannerScreen() {
  const [destination, setDestination] = useState('');
  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
  const [showPlan, setShowPlan] = useState(false);

  const fieldBackground = useThemeColor(
    { light: 'rgba(39,76,119,0.08)', dark: 'rgba(255,255,255,0.08)' },
    'background'
  );
  const fieldTextColor = useThemeColor({ light: '#1b1b1d', dark: '#f9fafb' }, 'text');
  const mutedTextColor = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'tabIconDefault');

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

  const handlePreviewPlan = useCallback(() => {
    Keyboard.dismiss();
    setShowPlan(true);
  }, []);

  const hasLocation = locationState.status === 'ready';
  const pendingLocation = locationState.status === 'requesting';
  const locationError = locationState.status === 'denied' ? locationState.error : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.header} lightColor="transparent" darkColor="transparent">
        <ThemedText type="title">Plan a Fuel-Efficient Trip</ThemedText>
        <ThemedText>
          Enter your destination and we&apos;ll seed the route with your current location. Future
          iterations will plug in live pricing and turn-by-turn guidance.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card} lightColor="#ffffff" darkColor="#1f2933">
        <ThemedText type="subtitle">Trip Details</ThemedText>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Current Location</ThemedText>
          {hasLocation ? (
            <ThemedText>
              {locationState.coords.latitude.toFixed(4)}° N,{' '}
              {locationState.coords.longitude.toFixed(4)}° W
            </ThemedText>
          ) : (
            <ThemedText>We&apos;ll request permission when you&apos;re ready.</ThemedText>
          )}
          {locationError && (
            <ThemedText style={[styles.errorText, { color: '#f87171' }]}>{locationError}</ThemedText>
          )}
          <Pressable
            style={[styles.button, !pendingLocation ? styles.primaryButton : styles.disabledButton]}
            onPress={handleUseCurrentLocation}
            disabled={pendingLocation}>
            {pendingLocation ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonLabel}>Use Current Location</ThemedText>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Destination</ThemedText>
          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g., Austin, TX"
            placeholderTextColor={mutedTextColor}
            style={[styles.input, { backgroundColor: fieldBackground, color: fieldTextColor }]}
            returnKeyType="done"
          />
        </View>

        <Pressable
          style={[
            styles.button,
            destination.trim() && hasLocation ? styles.primaryButton : styles.disabledButton,
          ]}
          disabled={!destination.trim() || !hasLocation}
          onPress={handlePreviewPlan}>
          <ThemedText style={styles.buttonLabel}>Preview Route Shell</ThemedText>
        </Pressable>
      </ThemedView>

      {showPlan && (
        <ThemedView style={styles.card} lightColor="#ffffff" darkColor="#1f2933">
          <ThemedText type="subtitle">Draft Route Overview</ThemedText>
          <ThemedText>
            Midland → {destination || 'Destination'} • Est. 5h 20m • 308 miles
          </ThemedText>
          <ThemedText style={[styles.helperText, { color: mutedTextColor }]}>
            These stops are placeholders. Wire up Google Directions and live fuel pricing to replace
            them with real data.
          </ThemedText>

          {MIDLAND_TO_AUSTIN_STOPS.map((stop, index) => (
            <View key={stop.id} style={styles.stopRow}>
              <View style={styles.stopBadge}>
                <ThemedText style={styles.stopBadgeLabel}>{index + 1}</ThemedText>
              </View>
              <View style={styles.stopDetails}>
                <ThemedText type="defaultSemiBold">{stop.name}</ThemedText>
                <ThemedText>{stop.city}</ThemedText>
                <ThemedText style={[styles.stopMeta, { color: mutedTextColor }]}>
                  {stop.price} • {stop.etaMinutes} min from start • {stop.distanceOffsetMiles} mi off
                  route
                </ThemedText>
              </View>
            </View>
          ))}
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  header: {
    gap: 12,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#274c77',
  },
  disabledButton: {
    backgroundColor: '#c0c5cb',
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginTop: -2,
  },
  helperText: {
    marginTop: -6,
  },
  stopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stopBadge: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: '#274c77',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  stopBadgeLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  stopDetails: {
    flex: 1,
    gap: 2,
  },
  stopMeta: {},
});
