import type { SampleStop } from "@/constants/sample-stops";
import { apiRequest, getApiBaseUrl } from "@/services/apiClient";

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
  console.log("Fetching from backend:", `${getApiBaseUrl()}/stations`);
  return apiRequest<SampleStop[]>({
    path: "/stations",
    query: { origin, destination },
  });
}

export async function fetchRoute(origin: string, destination: string) {
  console.log("Fetching route:", `${getApiBaseUrl()}/stations/route`);
  return apiRequest({
    path: "/stations/route",
    query: { origin, destination },
  });
}

export async function fetchSelectedStops(): Promise<SelectedStopRecord[]> {
  return apiRequest<SelectedStopRecord[]>({
    path: "/stations/selected",
  });
}

export async function addStopToPlan(stopId: string, routeId?: string): Promise<SelectedStopRecord> {
  return apiRequest<SelectedStopRecord>({
    path: "/stations/selected",
    method: "POST",
    body: { stopId, routeId },
  });
}

export async function removeStopFromPlan(selectionId: number): Promise<void> {
  await apiRequest<void>({
    path: `/stations/selected/${selectionId}`,
    method: "DELETE",
  });
}
