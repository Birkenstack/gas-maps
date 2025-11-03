export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type SampleStop = {
  id: string;
  name: string;
  city: string;
  price: string;
  etaMinutes: number;
  distanceOffsetMiles: number;
  coordinates: Coordinates;
};

export type SampleRouteEndpoint = {
  label: string;
  city: string;
  coordinates: Coordinates;
};

export type SampleRoute = {
  id: string;
  title: string;
  summary: string;
  origin: SampleRouteEndpoint;
  destination: SampleRouteEndpoint;
  polyline: Coordinates[];
  stops: SampleStop[];
};

export const MIDLAND_TO_AUSTIN_STOPS: SampleStop[] = [
  {
    id: 'odessa',
    name: 'Sunoco - Loop 338',
    city: 'Odessa, TX',
    price: '$2.89',
    etaMinutes: 45,
    distanceOffsetMiles: 0.5,
    coordinates: { latitude: 31.8455, longitude: -102.3381 },
  },
  {
    id: 'big-spring',
    name: 'Chevron - I-20 Frontage',
    city: 'Big Spring, TX',
    price: '$3.01',
    etaMinutes: 98,
    distanceOffsetMiles: 0.2,
    coordinates: { latitude: 32.2501, longitude: -101.4789 },
  },
  {
    id: 'abilene',
    name: "Buc-ee's",
    city: 'Abilene, TX',
    price: '$2.95',
    etaMinutes: 160,
    distanceOffsetMiles: 1.1,
    coordinates: { latitude: 32.4473, longitude: -99.7389 },
  },
  {
    id: 'lampasas',
    name: 'Shell - US-183',
    city: 'Lampasas, TX',
    price: '$3.05',
    etaMinutes: 235,
    distanceOffsetMiles: 0.7,
    coordinates: { latitude: 31.0636, longitude: -98.181 },
  },
];

export const MIDLAND_TO_AUSTIN_ROUTE: SampleRoute = {
  id: 'midland-to-austin',
  title: 'Midland → Austin',
  summary: 'Scenic 5-hour stretch across West Texas with curated fuel stops along I-20 and US-183.',
  origin: {
    label: 'Midland Downtown',
    city: 'Midland, TX',
    coordinates: { latitude: 31.9973, longitude: -102.0779 },
  },
  destination: {
    label: 'Austin Capitol',
    city: 'Austin, TX',
    coordinates: { latitude: 30.2672, longitude: -97.7431 },
  },
  polyline: [
    { latitude: 31.9973, longitude: -102.0779 },
    { latitude: 31.8582, longitude: -102.2985 },
    { latitude: 31.8455, longitude: -102.3381 },
    { latitude: 32.0451, longitude: -101.9482 },
    { latitude: 32.2501, longitude: -101.4789 },
    { latitude: 32.3177, longitude: -100.9186 },
    { latitude: 32.4724, longitude: -100.4059 },
    { latitude: 32.4473, longitude: -99.7389 },
    { latitude: 32.2021, longitude: -99.1288 },
    { latitude: 31.9076, longitude: -98.6523 },
    { latitude: 31.4523, longitude: -98.2635 },
    { latitude: 31.0636, longitude: -98.181 },
    { latitude: 30.7425, longitude: -97.9156 },
    { latitude: 30.5052, longitude: -97.8203 },
    { latitude: 30.387, longitude: -97.7398 },
    { latitude: 30.2672, longitude: -97.7431 },
  ],
  stops: MIDLAND_TO_AUSTIN_STOPS,
};
