import type {
  DailyResponse,
  ErrorProfileResponse,
  HealthResponse,
  OverviewMetrics,
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/v1/health');
}

export async function fetchOverview(): Promise<OverviewMetrics> {
  return apiFetch<OverviewMetrics>('/api/v1/metrics/overview');
}

export async function fetchDaily(
  date: string,
  demandBaselineMw: number = 25000
): Promise<DailyResponse> {
  return apiFetch<DailyResponse>(
    `/api/v1/daily/${date}?demand_baseline_mw=${demandBaselineMw}`
  );
}

export async function fetchErrorProfile(): Promise<ErrorProfileResponse> {
  return apiFetch<ErrorProfileResponse>('/api/v1/analytics/error-profile');
}
