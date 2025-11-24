import type { SampleStop } from "@/constants/sample-stops";

// Android emulator talks to your Mac with 10.0.2.2, not localhost
const BASE_URL = "http://10.0.2.2:4000";

export async function fetchStopsForRoute(
  origin: string,
  destination: string
): Promise<SampleStop[]> {
  const params = new URLSearchParams({ origin, destination });

  const response = await fetch(`${BASE_URL}/api/stops?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch stops");
  }

  const data = (await response.json()) as SampleStop[];
  return data;
}