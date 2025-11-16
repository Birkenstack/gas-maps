import { Platform } from 'react-native';

import type { FuelGrade, SampleStop } from '@/constants/sample-stops';

export type FuelPriceRecord = {
  stopId: string;
  brand: string;
  city: string;
  coordinates: SampleStop['coordinates'];
  grades: Partial<Record<FuelGrade, number>>;
  updatedAt: string;
};

export type FuelPriceResponse = {
  data: FuelPriceRecord[];
  generatedAt: string;
};

const API_URL = process.env.EXPO_PUBLIC_FUEL_PRICE_API_URL;
const API_KEY = process.env.EXPO_PUBLIC_FUEL_PRICE_API_KEY;

export const fetchFuelPrices = async (stopIds: string[]): Promise<FuelPriceResponse | null> => {
  if (!API_URL || !API_KEY) {
    if (__DEV__) {
      console.info(
        '[fuel-prices] Missing EXPO_PUBLIC_FUEL_PRICE_API_URL or API key. Falling back to local data.'
      );
    }
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'x-platform': Platform.OS,
      },
      body: JSON.stringify({ stops: stopIds }),
    });

    if (!response.ok) {
      throw new Error(`Fuel price request failed: ${response.status}`);
    }

    const payload = (await response.json()) as FuelPriceResponse;
    return payload;
  } catch (error) {
    console.warn('[fuel-prices] Unable to fetch remote prices:', error);
    return null;
  }
};
