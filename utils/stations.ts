import type { FuelGrade, SampleStop } from '@/constants/sample-stops';
import type { StationPriceMap } from '@/types/fuel-pricing';

const resolveFuelPrice = (
  stop: SampleStop,
  grade: FuelGrade,
  stationPrices?: StationPriceMap
) => {
  const liveValue = stationPrices?.[stop.id]?.grades?.[grade];
  if (typeof liveValue === 'number') {
    return liveValue;
  }

  const value = stop.fuelBreakdown?.[grade];
  if (typeof value === 'number') {
    return value;
  }

  const rawPrice: unknown = (stop as any).price;

  if (typeof rawPrice === 'number') {
    return rawPrice;
  }

  if (typeof rawPrice === 'string') {
    const cleaned = rawPrice.replace('$', '').trim();
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

export const formatFuelPrice = (
  stop: SampleStop,
  grade: FuelGrade,
  stationPrices?: StationPriceMap
) => {
  const value = resolveFuelPrice(stop, grade, stationPrices);
  return `$${value.toFixed(2)}`;
};

export const formatUpdatedAgo = (minutes?: number) => {
  if (minutes === undefined) {
    return 'Updated recently';
  }

  if (minutes < 60) {
    return `Updated ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
};

const minutesSinceIso = (iso?: string) => {
  if (!iso) {
    return undefined;
  }

  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  const diffMs = Date.now() - parsed;
  return Math.max(0, Math.round(diffMs / 60000));
};

export const formatUpdatedLabel = (iso?: string, fallbackMinutes?: number) => {
  const minutes = minutesSinceIso(iso) ?? fallbackMinutes;
  return formatUpdatedAgo(minutes);
};

export const formatDistance = (miles?: number) => {
  if (miles === undefined) {
    return 'On route';
  }

  return `${miles.toFixed(1)} mi`;
};

export const getLivePriceMeta = (
  stop: SampleStop,
  grade: FuelGrade,
  stationPrices?: StationPriceMap
) => {
  const record = stationPrices?.[stop.id];
  return {
    formatted: formatFuelPrice(stop, grade, stationPrices),
    updatedAt: record?.updatedAt,
  };
};
