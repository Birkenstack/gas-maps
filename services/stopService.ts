import { Platform } from "react-native";

import type { SampleStop } from "@/constants/sample-stops";

const LOCAL_DEV_HOST = Platform.select({
  android: "10.0.2.2",
  ios: "127.0.0.1",
  default: "127.0.0.1",
});

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${LOCAL_DEV_HOST ?? "127.0.0.1"}:5000`;

export type SelectedStopRecord = {
  id: number;
  stopId: string;
  routeId: string;
  recordedAt: string;
  station?: SampleStop;
};

export async function fetchStopsForRoute(
  origin: string,
  destination: string
): Promise<SampleStop[]> {
  const params = new URLSearchParams({ origin, destination });

  console.log("Fetching from backend:", `${BASE_URL}/stations`);
  const response = await fetch(`${BASE_URL}/stations?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch stops");
  }

  const data = (await response.json()) as SampleStop[];
  return data;
}

export async function fetchRoute(origin: string, destination: string) {
  const params = new URLSearchParams({ origin, destination });

  console.log("Fetching route:", `${BASE_URL}/stations/route?${params.toString()}`);

  const response = await fetch(`${BASE_URL}/stations/route?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch route");
  }

  return await response.json();
}

export async function fetchSelectedStops(): Promise<SelectedStopRecord[]> {
  const response = await fetch(`${BASE_URL}/stations/selected`);

  if (!response.ok) {
    throw new Error("Failed to load selected stops");
  }

  return (await response.json()) as SelectedStopRecord[];
}

export async function addStopToPlan(stopId: string, routeId?: string): Promise<SelectedStopRecord> {
  const response = await fetch(`${BASE_URL}/stations/selected`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stopId, routeId }),
  });

  if (!response.ok) {
    throw new Error("Failed to add stop");
  }

  return (await response.json()) as SelectedStopRecord;
}

export async function removeStopFromPlan(selectionId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/stations/selected/${selectionId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to remove stop");
  }
}
