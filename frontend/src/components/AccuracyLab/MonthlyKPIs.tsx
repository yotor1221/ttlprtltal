import React from 'react';
import {
  Target,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import type { OverviewMetrics } from '../../api/types';
import { MetricCard } from '../MetricCard';

export interface MonthlyKPIsProps {
  data: OverviewMetrics | null;
}

export const MonthlyKPIs: React.FC<MonthlyKPIsProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="space-y-4">
        {/* Skeleton Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="glass rounded-xl p-4 border border-slate-800/80 animate-pulse h-28 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-slate-800 rounded"></div>
                <div className="h-7 w-7 bg-slate-800 rounded-lg"></div>
              </div>
              <div className="h-7 w-28 bg-slate-800 rounded mt-2"></div>
              <div className="h-3 w-36 bg-slate-800/60 rounded mt-1"></div>
            </div>
          ))}
        </div>

        {/* Skeleton Directional Skew */}
        <div className="glass rounded-xl p-4 border border-slate-800/80 animate-pulse">
          <div className="flex justify-between mb-2">
            <div className="h-3 w-32 bg-slate-800 rounded"></div>
            <div className="h-3 w-32 bg-slate-800 rounded"></div>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Energy Delta calculation
  const totalActual = data.total_actual_mwh;
  const totalForecast = data.total_forecast_mwh;
  const energyDeltaPct =
    totalActual !== 0 ? ((totalForecast - totalActual) / totalActual) * 100 : 0;
  const formattedEnergyDelta = `${energyDeltaPct >= 0 ? '+' : ''}${energyDeltaPct.toFixed(1)}%`;
  const isClose = Math.abs(energyDeltaPct) <= 3.0;
  const energyDeltaColor = isClose ? 'text-emerald-400' : 'text-amber-400';

  // Bias formatting
  const formattedBias = `${data.mean_bias >= 0 ? '+' : ''}${data.mean_bias.toFixed(1)} MW`;
  const isPositiveBias = data.mean_bias >= 0;
  const biasColor = isPositiveBias ? 'text-rose-400' : 'text-sky-400';
  const biasSubtitle = isPositiveBias
    ? 'Over-forecast tendency'
    : 'Under-forecast tendency';

  // Over/under percentages normalized for bar if sum differs slightly from 100
  const totalPct = data.overforecast_pct + data.underforecast_pct;
  const normalizedOver =
    totalPct > 0 ? (data.overforecast_pct / totalPct) * 100 : 50;
  const normalizedUnder =
    totalPct > 0 ? (data.underforecast_pct / totalPct) * 100 : 50;

  return (
    <div className="space-y-4">
      {/* 8 Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* 1. MAE */}
        <MetricCard
          title="MAE"
          value={`${data.mae.toFixed(1)} MW`}
          icon={<Target className="w-4 h-4 text-amber-400" />}
          colorClass="text-amber-400"
          subtitle="Mean Absolute Error"
        />

        {/* 2. RMSE */}
        <MetricCard
          title="RMSE"
          value={`${data.rmse.toFixed(1)} MW`}
          icon={<Activity className="w-4 h-4 text-rose-400" />}
          colorClass="text-rose-400"
          subtitle="Root Mean Squared Error"
        />

        {/* 3. Mean Bias */}
        <MetricCard
          title="Mean Bias"
          value={formattedBias}
          icon={
            isPositiveBias ? (
              <TrendingUp className="w-4 h-4 text-rose-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-sky-400" />
            )
          }
          colorClass={biasColor}
          subtitle={biasSubtitle}
          trend={isPositiveBias ? 'up' : 'down'}
        />

        {/* 4. Over-forecast Rate */}
        <MetricCard
          title="Over-forecast Rate"
          value={`${data.overforecast_pct.toFixed(1)}%`}
          icon={<ArrowUp className="w-4 h-4 text-rose-400" />}
          colorClass="text-rose-400"
          subtitle="Periods where Forecast > Actual"
          trend="up"
        />

        {/* 5. Under-forecast Rate */}
        <MetricCard
          title="Under-forecast Rate"
          value={`${data.underforecast_pct.toFixed(1)}%`}
          icon={<ArrowDown className="w-4 h-4 text-sky-400" />}
          colorClass="text-sky-400"
          subtitle="Periods where Forecast < Actual"
          trend="down"
        />

        {/* 6. Max Over-forecast */}
        <MetricCard
          title="Max Over-forecast"
          value={`${data.max_overforecast_mw.toFixed(0)} MW`}
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          colorClass="text-rose-400"
          subtitle="Peak positive forecast error"
        />

        {/* 7. Max Under-forecast */}
        <MetricCard
          title="Max Under-forecast"
          value={`${Math.abs(data.max_underforecast_mw).toFixed(0)} MW`}
          icon={<AlertTriangle className="w-4 h-4 text-sky-400" />}
          colorClass="text-sky-400"
          subtitle="Peak under-prediction"
        />

        {/* 8. Energy Delta */}
        <MetricCard
          title="Energy Delta"
          value={formattedEnergyDelta}
          icon={<Zap className="w-4 h-4 text-amber-400" />}
          colorClass={energyDeltaColor}
          subtitle={`${((totalForecast - totalActual) / 1000).toFixed(0)} GWh net difference`}
          trend={isClose ? 'neutral' : energyDeltaPct > 0 ? 'up' : 'down'}
        />
      </div>

      {/* Directional Skew Visual Bar */}
      <div className="glass rounded-xl p-4 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-medium gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
            <span className="text-slate-300">
              Over-forecast Bias:{' '}
              <strong className="text-rose-400 font-mono text-sm">
                {data.overforecast_pct.toFixed(1)}%
              </strong>
            </span>
          </div>

          <span className="text-slate-500 uppercase tracking-wider text-[11px] font-semibold hidden md:inline">
            Directional Error Distribution
          </span>

          <div className="flex items-center gap-2">
            <span className="text-slate-300">
              Under-forecast Bias:{' '}
              <strong className="text-sky-400 font-mono text-sm">
                {data.underforecast_pct.toFixed(1)}%
              </strong>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50"></span>
          </div>
        </div>

        {/* Progress bar with gradient segments */}
        <div className="h-3.5 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-slate-800 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-l-full transition-all duration-500 relative group cursor-pointer"
            style={{ width: `${normalizedOver}%` }}
            title={`Over-forecast: ${data.overforecast_pct.toFixed(1)}%`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-full" />
          </div>
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-r-full transition-all duration-500 relative group cursor-pointer"
            style={{ width: `${normalizedUnder}%` }}
            title={`Under-forecast: ${data.underforecast_pct.toFixed(1)}%`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 font-mono">
          <span className="text-rose-400/80">
            Short Imbalance Risk (Cashout SBP Exposure)
          </span>
          <span className="text-sky-400/80">
            Long Imbalance Position (System Spill / SSP Discount)
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyKPIs;
