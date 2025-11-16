export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type FuelGrade = 'regular' | 'midgrade' | 'premium';

export type FuelBreakdown = Record<FuelGrade, number>;

export type SampleStop = {
  id: string;
  name: string;
  brand?: string;
  city: string;
  price: string;
  fuelBreakdown?: FuelBreakdown;
  etaMinutes: number;
  distanceOffsetMiles: number;
  distanceMiles?: number;
  lastUpdatedMinutes?: number;
  isOpen?: boolean;
  rating?: number;
  amenities?: string[];
  coordinates: Coordinates;
  note?: string;
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
    brand: 'Sunoco',
    city: 'Odessa, TX',
    price: '$2.89',
    fuelBreakdown: { regular: 2.89, midgrade: 3.15, premium: 3.39 },
    etaMinutes: 45,
    distanceOffsetMiles: 0.5,
    distanceMiles: 0.4,
    lastUpdatedMinutes: 28,
    isOpen: true,
    rating: 4.7,
    amenities: ['Restrooms', 'Air & water'],
    coordinates: { latitude: 31.8455, longitude: -102.3381 },
  },
  {
    id: 'big-spring',
    name: 'Chevron - I-20 Frontage',
    brand: 'Chevron',
    city: 'Big Spring, TX',
    price: '$3.01',
    fuelBreakdown: { regular: 3.01, midgrade: 3.29, premium: 3.55 },
    etaMinutes: 98,
    distanceOffsetMiles: 0.2,
    distanceMiles: 0.6,
    lastUpdatedMinutes: 42,
    isOpen: true,
    rating: 4.5,
    amenities: ['Rewards eligible', 'Restrooms'],
    coordinates: { latitude: 32.2501, longitude: -101.4789 },
  },
  {
    id: 'abilene',
    name: "Buc-ee's",
    brand: "Buc-ee's",
    city: 'Abilene, TX',
    price: '$2.95',
    fuelBreakdown: { regular: 2.95, midgrade: 3.22, premium: 3.48 },
    etaMinutes: 160,
    distanceOffsetMiles: 1.1,
    distanceMiles: 1.2,
    lastUpdatedMinutes: 15,
    isOpen: true,
    rating: 4.9,
    amenities: ['Food court', 'Restrooms', 'EV charging'],
    coordinates: { latitude: 32.4473, longitude: -99.7389 },
    note: 'Popular stop — plan for weekend crowds',
  },
  {
    id: 'lampasas',
    name: 'Shell - US-183',
    brand: 'Shell',
    city: 'Lampasas, TX',
    price: '$3.05',
    fuelBreakdown: { regular: 3.05, midgrade: 3.32, premium: 3.59 },
    etaMinutes: 235,
    distanceOffsetMiles: 0.7,
    distanceMiles: 0.3,
    lastUpdatedMinutes: 70,
    isOpen: false,
    rating: 4.2,
    amenities: ['Air & water'],
    coordinates: { latitude: 31.0636, longitude: -98.181 },
    note: 'Maintenance window 11p–4a',
  },
  {
    id: 'cedar-park',
    name: 'QuikStop - Brushy Creek',
    brand: 'QuikStop',
    city: 'Cedar Park, TX',
    price: '$2.66',
    fuelBreakdown: { regular: 2.66, midgrade: 2.98, premium: 3.24 },
    etaMinutes: 280,
    distanceOffsetMiles: 0.4,
    distanceMiles: 0.5,
    lastUpdatedMinutes: 9,
    isOpen: true,
    rating: 4.6,
    amenities: ['Air & water', 'Mini-mart'],
    coordinates: { latitude: 30.5308, longitude: -97.816 },
    note: 'Short detour for lower premium prices',
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
