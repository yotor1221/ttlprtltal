import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { DailyResponse } from '../../api/types';
import { Activity } from 'lucide-react';

export interface DispatchChartProps {
  data: DailyResponse | null;
  demandBaseline: number;
}

function formatPeriodTime(startTime: string): string {
  if (!startTime) return '';
  if (startTime.includes('T')) {
    return startTime.split('T')[1].substring(0, 5);
  }
  if (startTime.includes(' ')) {
    return startTime.split(' ')[1].substring(0, 5);
  }
  return startTime.substring(0, 5);
}

function formatPublishTime(timeStr: string | null): string {
  if (!timeStr) return '—';
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1];
    return `${timePart.substring(0, 8)} UTC`;
  }
  return `${timeStr} UTC`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      period: number;
      time: string;
      forecast: number | null;
      actual: number | null;
      error: number | null;
      thermal: number | null;
      publish_time: string | null;
      baseline: number;
    };
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload;
  const error = dataPoint.error;

  return (
    <div className="min-w-[220px] rounded-lg border border-slate-700/80 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-mono text-xs font-semibold text-slate-300">
          Period {dataPoint.period}
        </span>
        <span className="font-mono text-xs text-slate-400">
          {dataPoint.time} UTC
        </span>
      </div>

      <div className="mt-2.5 space-y-1.5 text-xs">
        {/* Forecast */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            Forecast Wind:
          </span>
          <span className="font-mono font-medium text-emerald-400">
            {dataPoint.forecast !== null
              ? `${Math.round(dataPoint.forecast).toLocaleString()} MW`
              : '—'}
          </span>
        </div>

        {/* Actual */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
            Actual Wind:
          </span>
          <span className="font-mono font-medium text-cyan-400">
            {dataPoint.actual !== null
              ? `${Math.round(dataPoint.actual).toLocaleString()} MW`
              : '—'}
          </span>
        </div>

        {/* Error */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${
                error !== null && error > 0 ? 'bg-rose-400' : 'bg-sky-400'
              }`}
            ></span>
            Forecast Error:
          </span>
          <span
            className={`font-mono font-medium ${
              error !== null && error > 0
                ? 'text-rose-400'
                : error !== null && error < 0
                ? 'text-sky-400'
                : 'text-slate-300'
            }`}
          >
            {error !== null
              ? `${error > 0 ? '+' : ''}${Math.round(error).toLocaleString()} MW`
              : '—'}
          </span>
        </div>

        {/* Implied Thermal */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            Thermal Needed:
          </span>
          <span className="font-mono font-medium text-amber-400">
            {dataPoint.thermal !== null
              ? `${Math.round(dataPoint.thermal).toLocaleString()} MW`
              : '—'}
          </span>
        </div>

        {/* Publish Time */}
        <div className="border-t border-slate-800/80 pt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Publish Time:</span>
          <span className="font-mono text-slate-400">
            {formatPublishTime(dataPoint.publish_time)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const DispatchChart: React.FC<DispatchChartProps> = ({
  data,
  demandBaseline,
}) => {
  const chartData = React.useMemo(() => {
    if (!data?.periods) return [];
    return data.periods.map((p) => ({
      period: p.settlement_period,
      time: formatPeriodTime(p.start_time),
      forecast: p.forecast_mw,
      actual: p.actual_mw,
      error: p.error_mw,
      thermal: p.implied_thermal_procurement_mw,
      publish_time: p.publish_time,
      baseline: demandBaseline,
    }));
  }, [data, demandBaseline]);

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
          <h3 className="text-base font-semibold text-slate-100">
            Day-Ahead Dispatch & Generation Curve
          </h3>
        </div>
        <div className="flex h-[420px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Activity className="h-8 w-8 animate-pulse text-emerald-400" />
            <p className="text-sm font-medium text-slate-400">
              Loading 48-period dispatch data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-700/50 pb-4 gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Day-Ahead Dispatch & Generation Curve
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            48 Settlement Periods (30-min resolution) • Day-Ahead Wind vs Actuals & Implied Thermal Backup
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            48 SP Active
          </span>
        </div>
      </div>

      <div className="mt-5 h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 25, left: 0, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="time"
              interval={3} // Every 4th tick = 2 hours
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#475569' }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#475569' }}
              tickFormatter={(val: number) =>
                val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
              }
              label={{
                value: 'MW',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 12,
                offset: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            <ReferenceLine
              y={demandBaseline}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeDasharray="8 4"
              label={{
                value: 'Demand Baseline',
                position: 'insideTopRight',
                fill: 'rgba(255, 255, 255, 0.65)',
                fontSize: 11,
              }}
            />

            {/* Thermal Required Area */}
            <Area
              type="monotone"
              dataKey="thermal"
              name="Implied Thermal"
              fill="#f59e0b33"
              stroke="#fbbf24"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fillOpacity={0.2}
            />

            {/* Forecast Wind Area */}
            <Area
              type="monotone"
              dataKey="forecast"
              name="Forecast Wind"
              fill="#10b98133"
              stroke="#34d399"
              strokeWidth={2}
              fillOpacity={0.3}
            />

            {/* Actual Wind Line */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Wind"
              stroke="#22d3ee"
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#22d3ee',
                stroke: '#0f172a',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Styled Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 border-t border-slate-700/40 pt-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-3 w-5 rounded border border-emerald-400 bg-emerald-500/30"></span>
          <span>Day-Ahead Wind Forecast</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-cyan-400 rounded-full"></span>
          <span>Actual Wind Output</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-5 rounded border border-dashed border-amber-400 bg-amber-500/20"></span>
          <span>Implied Thermal Procurement</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-5 border-t border-dashed border-white/40"></span>
          <span>Consumer Demand Baseline ({demandBaseline.toLocaleString()} MW)</span>
        </div>
      </div>
    </div>
  );
};

export default DispatchChart;
