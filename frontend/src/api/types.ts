// ─── Health ─────────────────────────────────────────────
export interface HealthResponse {
  status: string;
  total_records: number;
  period_covered: string;
  data_completeness_pct: number;
}

// ─── Overview Metrics ───────────────────────────────────
export interface OverviewMetrics {
  mae: number;
  rmse: number;
  mean_bias: number;
  total_actual_mwh: number;
  total_forecast_mwh: number;
  overforecast_pct: number;
  underforecast_pct: number;
  max_overforecast_mw: number;
  max_underforecast_mw: number;
  data_completeness_pct: number;
}

// ─── Daily Settlement ───────────────────────────────────
export interface SettlementPeriod {
  settlement_period: number;
  start_time: string;
  actual_mw: number | null;
  forecast_mw: number | null;
  error_mw: number | null;
  publish_time: string | null;
  implied_thermal_procurement_mw: number | null;
  actual_thermal_needed_mw: number | null;
}

export interface DailyResponse {
  date: string;
  periods: SettlementPeriod[];
  daily_mae: number | null;
  daily_rmse: number | null;
  daily_bias: number | null;
  data_completeness_pct: number;
}

// ─── Error Profile ──────────────────────────────────────
export interface PeriodErrorProfile {
  settlement_period: number;
  avg_actual_mw: number | null;
  avg_forecast_mw: number | null;
  avg_mae: number | null;
}

export interface ErrorBucket {
  range_label: string;
  count: number;
  percentage: number;
}

export interface ErrorProfileResponse {
  by_settlement_period: PeriodErrorProfile[];
  error_distribution: ErrorBucket[];
  data_completeness_pct: number;
}
