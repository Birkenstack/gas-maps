import type { SampleStop } from '@/constants/sample-stops';
import type { StationPriceMap } from '@/types/fuel-pricing';

export type FuelPriceState = {
  status: 'ready';
  data: StationPriceMap;
};

export const useFuelPrices = (_stops: SampleStop[]): FuelPriceState => {
  return {
    status: 'ready',
    data: {},
  };
};
