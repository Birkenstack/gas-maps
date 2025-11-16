import type { LatLng, Region } from 'react-native-maps';

const MIN_LAT_DELTA = 0.18;
const MIN_LNG_DELTA = 0.18;

export const buildRegionFromCoordinates = (coordinates: LatLng[]): Region => {
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
