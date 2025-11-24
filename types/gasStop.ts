export interface GasStop {
  id: string;
  name: string;
  city: string;
  price: number;
  etaMinutes: number;
  distanceMiles: number;
  distanceOffsetMiles: number;
  latitude: number;
  longitude: number;
  isOpen?: boolean;
  lastUpdatedMinutes?: number;
}