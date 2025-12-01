import { useMemo } from 'react';

import type { SampleStop } from '@/constants/sample-stops';
import type { StationPriceMap } from '@/types/fuel-pricing';

export type FuelPriceState = {
  status: 'ready' | 'offline';
  data: StationPriceMap;
};

export const useFuelPrices = (stops: SampleStop[]): FuelPriceState => {
  return useMemo(() => {
    const map: StationPriceMap = {};

    stops.forEach((stop) => {
      if (!stop?.id) return;
      const grades = stop.fuelBreakdown ?? {};
      const gradeKeys = Object.keys(grades ?? {});

      if (gradeKeys.length > 0) {
        map[stop.id] = {
          grades,
          updatedAt: stop.priceFetchedAt,
        };
        return;
      }

      if (typeof stop.price === 'number') {
        map[stop.id] = {
          grades: { regular: stop.price },
          updatedAt: stop.priceFetchedAt,
        };
      }
    });

    const hasCollectApi = stops.some((stop) => stop.priceSource === 'collectapi');

    return {
      status: hasCollectApi ? 'ready' : 'offline',
      data: map,
    };
  }, [stops]);
};
