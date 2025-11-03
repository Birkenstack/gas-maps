import { memo, useMemo } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import MapView, { LatLng, Marker, Polyline, Region } from 'react-native-maps';

import { useThemeColor } from '@/hooks/use-theme-color';
import type { SampleRoute } from '@/constants/sample-stops';

type RouteMapProps = {
  route: SampleRoute;
};

const MIN_LAT_DELTA = 0.18;
const MIN_LNG_DELTA = 0.18;

const buildRegion = (coordinates: LatLng[]): Region => {
  const lats = coordinates.map((coord) => coord.latitude);
  const lngs = coordinates.map((coord) => coord.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latitude = (maxLat + minLat) / 2;
  const longitude = (maxLng + minLng) / 2;

  const latitudeDelta = Math.max((maxLat - minLat) * 1.6, MIN_LAT_DELTA);
  const longitudeDelta = Math.max((maxLng - minLng) * 1.3, MIN_LNG_DELTA);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
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

const RouteMap = ({ route }: RouteMapProps) => {
  const colorScheme = useColorScheme();
  const accentColor = useThemeColor({ light: '#2b61ff', dark: '#7aa2ff' }, 'tint');
  const stopDotColor = useThemeColor({ light: '#ffffff', dark: '#0b1220' }, 'background');
  const destinationColor = useThemeColor({ light: '#ff6b66', dark: '#ff9a92' }, 'tint');

  const allCoordinates = useMemo(
    () => [route.origin.coordinates, ...route.polyline, route.destination.coordinates],
    [route.destination.coordinates, route.origin.coordinates, route.polyline]
  );

  const region = useMemo(() => buildRegion(allCoordinates), [allCoordinates]);

  return (
    <View style={styles.wrapper}>
      <MapView
        style={styles.map}
        initialRegion={region}
        customMapStyle={colorScheme === 'dark' ? darkMapStyle : lightMapStyle}
        showsCompass={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        toolbarEnabled={false}
        pitchEnabled={false}
      >
        <Polyline coordinates={route.polyline} strokeColor={accentColor} strokeWidth={5} />
        <Marker coordinate={route.origin.coordinates} title={route.origin.label} pinColor={accentColor} />
        {route.stops.map((stop) => (
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
        <Marker
          coordinate={route.destination.coordinates}
          title={route.destination.label}
          pinColor={destinationColor}
        />
      </MapView>
    </View>
  );
};

export default memo(RouteMap);

const styles = StyleSheet.create({
  wrapper: {
    height: 260,
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
});
