import { useEffect, useMemo, useState } from 'react';

import type { SampleStop } from '@/constants/sample-stops';
import { fetchFuelPrices, type FuelPriceRecord } from '@/services/fuel-prices';
import type { StationPriceMap } from '@/types/fuel-pricing';

type FuelPriceState =
  | { status: 'idle'; data: StationPriceMap }
  | { status: 'loading'; data: StationPriceMap }
  | { status: 'ready'; data: StationPriceMap }
  | { status: 'error'; data: StationPriceMap; error: string };

const buildStationPriceMap = (records: FuelPriceRecord[]): StationPriceMap =>
  records.reduce<StationPriceMap>((acc, record) => {
    acc[record.stopId] = {
      grades: record.grades,
      updatedAt: record.updatedAt,
    };
    return acc;
  }, {});

export const useFuelPrices = (stops: SampleStop[]) => {
  const [state, setState] = useState<FuelPriceState>({ status: 'idle', data: {} });

  const stopIds = useMemo(() => stops.map((stop) => stop.id).sort(), [stops]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!stopIds.length) {
        return;
      }

      setState((prev) => ({ ...prev, status: 'loading' }));
      const response = await fetchFuelPrices(stopIds);

      if (!active) {
        return;
      }

      if (response?.data?.length) {
        setState({ status: 'ready', data: buildStationPriceMap(response.data) });
      } else {
        setState({ status: 'error', data: {}, error: 'Remote prices unavailable' });
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [stopIds]);

  return state;
};
