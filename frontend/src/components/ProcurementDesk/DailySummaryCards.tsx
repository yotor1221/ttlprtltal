import React from 'react';
import { Wind, AlertTriangle, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import type { DailyResponse } from '../../api/types';
import { MetricCard } from '../MetricCard';

export interface DailySummaryCardsProps {
  data: DailyResponse | null;
}

export const DailySummaryCards: React.FC<DailySummaryCardsProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex h-32 animate-pulse flex-col justify-between rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 shadow-xl backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 rounded bg-slate-700/60"></div>
              <div className="h-10 w-10 rounded-lg bg-slate-700/50"></div>
            </div>
            <div className="h-7 w-36 rounded bg-slate-700/80"></div>
            <div className="h-3 w-44 rounded bg-slate-700/40"></div>
          </div>
        ))}
      </div>
    );
  }

  const periods = data.periods || [];

  // Card 1: Peak Wind Output & Total MWh
  const actualValues = periods
    .map((p) => p.actual_mw)
    .filter((v): v is number => v !== null && !isNaN(v));
  const peakWind = actualValues.length > 0 ? Math.max(...actualValues) : 0;
  const totalWindMWh = actualValues.reduce((sum, v) => sum + v * 0.5, 0);

  // Card 2: Daily MAE
  const dailyMae = data.daily_mae !== null && data.daily_mae !== undefined
    ? data.daily_mae.toFixed(1)
    : '—';

  // Card 3: Forecast Bias
  const bias = data.daily_bias;
  const hasBias = bias !== null && bias !== undefined;
  const formattedBias = hasBias
    ? `${bias > 0 ? '+' : ''}${bias.toFixed(1)}`
    : '—';
  const isOverForecast = hasBias && bias > 0;
  const isUnderForecast = hasBias && bias < 0;
  const biasTrend: 'up' | 'down' | 'neutral' = isOverForecast
    ? 'up'
    : isUnderForecast
    ? 'down'
    : 'neutral';
  const biasColor = isOverForecast
    ? 'text-rose-400'
    : isUnderForecast
    ? 'text-sky-400'
    : 'text-slate-200';
  const biasSubtitle = isOverForecast
    ? 'Over-forecast (Deficit risk)'
    : isUnderForecast
    ? 'Under-forecast (Surplus)'
    : 'Balanced forecast';
  const BiasIcon = isOverForecast ? TrendingUp : TrendingDown;

  // Card 4: Net Thermal Required
  const totalThermalMWh = periods.reduce(
    (sum, p) => sum + (p.implied_thermal_procurement_mw ?? 0) * 0.5,
    0
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Peak Wind Output */}
      <MetricCard
        title="Peak Wind Output"
        value={Math.round(peakWind).toLocaleString()}
        unit="MW"
        subtitle={`Total: ${Math.round(totalWindMWh).toLocaleString()} MWh`}
        icon={<Wind className="h-5 w-5 text-emerald-400" />}
        colorClass="text-emerald-400"
      />

      {/* Card 2: Daily MAE */}
      <MetricCard
        title="Daily MAE"
        value={dailyMae}
        unit="MW"
        subtitle="Mean Absolute Error across 48 settlement periods"
        icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
        colorClass="text-amber-400"
      />

      {/* Card 3: Forecast Bias */}
      <MetricCard
        title="Forecast Bias"
        value={formattedBias}
        unit="MW"
        subtitle={biasSubtitle}
        trend={biasTrend}
        icon={<BiasIcon className={`h-5 w-5 ${biasColor}`} />}
        colorClass={biasColor}
      />

      {/* Card 4: Net Thermal Required */}
      <MetricCard
        title="Net Thermal Required"
        value={Math.round(totalThermalMWh).toLocaleString()}
        unit="MWh"
        subtitle="Total 24h backup dispatch volume"
        icon={<Flame className="h-5 w-5 text-amber-400" />}
        colorClass="text-amber-400"
      />
    </div>
  );
};

export default DailySummaryCards;
