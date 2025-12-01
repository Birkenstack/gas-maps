import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import type { SampleRoute } from '@/constants/sample-stops';
import { usePreferences } from '@/contexts/preferences-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { SelectedStopRecord } from '@/services/stopService';
import { buildRegionFromCoordinates } from '@/utils/map';

type LatLng = { latitude: number; longitude: number };

type RouteMapProps = {
  route: SampleRoute | null;
  selectedStops?: SelectedStopRecord[];
};

const lightMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#ebe8ff' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b6b80' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#d5d2ff' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c0e4ff' }],
  },
];

const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#10131a' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9aa0b7' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#10131a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2a2f3a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3c4559' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#182233' }],
  },
];

const defaultRegion = {
  latitude: 31.5,
  longitude: -99.5,
  latitudeDelta: 6.5,
  longitudeDelta: 6.5,
};

const RouteMap = ({ route, selectedStops }: RouteMapProps) => {
  const mapRef = useRef<MapView | null>(null);
  const colorScheme = useColorScheme();
  const { showTraffic, showOnlyOpenStations } = usePreferences();
  const accentColor = useThemeColor({ light: '#2b61ff', dark: '#7aa2ff' }, 'tint');
  const stopDotColor = useThemeColor({ light: '#ffffff', dark: '#0b1220' }, 'background');
  const destinationColor = useThemeColor({ light: '#ff6b66', dark: '#ff9a92' }, 'tint');
  const selectedAccent = useThemeColor({ light: '#f97316', dark: '#ffb357' }, 'tint');

  const validCoordinate = (point?: LatLng | null): point is LatLng =>
    !!point &&
    typeof point.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude);

  const originCoordinate: LatLng | null =
    (route?.origin?.coordinates as LatLng) ?? (route?.origin?.coords as LatLng) ?? null;
  const destinationCoordinate: LatLng | null =
    (route?.destination?.coordinates as LatLng) ??
    (route?.destination?.coords as LatLng) ??
    null;

  const hasOrigin = validCoordinate(originCoordinate);
  const hasDestination = validCoordinate(destinationCoordinate);

  const mapRegion = useMemo(() => {
    if (hasOrigin && hasDestination && originCoordinate && destinationCoordinate) {
      return buildRegionFromCoordinates([originCoordinate, destinationCoordinate]);
    }
    if (hasOrigin && originCoordinate) {
      return {
        latitude: originCoordinate.latitude,
        longitude: originCoordinate.longitude,
        latitudeDelta: defaultRegion.latitudeDelta / 2,
        longitudeDelta: defaultRegion.longitudeDelta / 2,
      };
    }
    if (hasDestination && destinationCoordinate) {
      return {
        latitude: destinationCoordinate.latitude,
        longitude: destinationCoordinate.longitude,
        latitudeDelta: defaultRegion.latitudeDelta / 2,
        longitudeDelta: defaultRegion.longitudeDelta / 2,
      };
    }
    return defaultRegion;
  }, [hasOrigin, hasDestination, originCoordinate, destinationCoordinate]);

  const stops = useMemo(() => {
    if (!route) return [];
    const baseStops = Array.isArray(route?.stops) ? route.stops : [];
    const openStops = showOnlyOpenStations
      ? baseStops.filter((stop) => stop.isOpen !== false)
      : baseStops;
    return openStops.filter((stop) => validCoordinate(stop.coordinates));
  }, [route, showOnlyOpenStations]);

  const selectedMarkers = useMemo(() => {
    if (!selectedStops) return [];
    return selectedStops
      .map((record) => record.station)
      .filter((station): station is NonNullable<typeof station> => Boolean(station))
      .filter((station) => validCoordinate(station.coordinates));
  }, [selectedStops]);

  useEffect(() => {
    const coordinates: LatLng[] = [];
    if (hasOrigin && originCoordinate) coordinates.push(originCoordinate);
    stops.forEach((stop) => coordinates.push(stop.coordinates));
    selectedMarkers.forEach((station) => coordinates.push(station.coordinates));
    if (hasDestination && destinationCoordinate) coordinates.push(destinationCoordinate);

    if (coordinates.length === 0) return;
    const padding = { top: 60, right: 60, bottom: 120, left: 60 };
    requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: padding,
        animated: true,
      });
    });
  }, [hasOrigin, hasDestination, originCoordinate, destinationCoordinate, stops, selectedMarkers]);

  if (!route) {
    return <View style={styles.wrapper} />;
  }

  return (
    <View style={styles.wrapper}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={mapRegion}
        customMapStyle={colorScheme === 'dark' ? darkMapStyle : lightMapStyle}
        showsCompass={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        showsTraffic={showTraffic}
        showsUserLocation
        showsMyLocationButton
        showsScale
      >
        {Array.isArray(route.polyline) && route.polyline.length > 0 && (
          <Polyline
            coordinates={route.polyline.filter((point): point is LatLng => validCoordinate(point))}
            strokeColor={accentColor}
            strokeWidth={5}
          />
        )}
        {hasOrigin && originCoordinate && (
          <Marker coordinate={originCoordinate} title={route.origin.label} pinColor={accentColor} />
        )}
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={stop.coordinates}
            title={stop.name}
            description={`${stop.city} • ${stop.price}`}
          >
            <View style={[styles.stopMarker, { borderColor: accentColor }]}>
              <View style={[styles.stopMarkerInner, { backgroundColor: accentColor }]} />
              <View style={[styles.stopMarkerCore, { backgroundColor: stopDotColor }]} />
            </View>
          </Marker>
        ))}
        {selectedMarkers.map((station) => (
          <Marker
            key={`selected-${station.id}`}
            coordinate={station.coordinates}
            title={station.name}
            description={`${station.city} • ${station.price ?? ''}`}
          >
            <View style={[styles.stopMarker, { borderColor: selectedAccent }]}>
              <View style={[styles.selectedMarkerInner, { borderColor: selectedAccent }]}>
                <View style={[styles.stopMarkerCore, { backgroundColor: stopDotColor }]} />
              </View>
            </View>
          </Marker>
        ))}
        {hasDestination && destinationCoordinate && (
          <Marker
            coordinate={destinationCoordinate}
            title={route.destination.label}
            pinColor={destinationColor}
          />
        )}
      </MapView>
    </View>
  );
};

export default memo(RouteMap);

const styles = StyleSheet.create({
  wrapper: {
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  stopMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  stopMarkerInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  stopMarkerCore: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedMarkerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
