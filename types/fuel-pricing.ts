import type { FuelGrade } from '@/constants/sample-stops';

export type StationPriceMap = Record<
  string,
  {
    grades: Partial<Record<FuelGrade, number>>;
    updatedAt?: string;
  }
>;
