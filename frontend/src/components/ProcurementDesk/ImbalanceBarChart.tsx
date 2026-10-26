import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { DailyResponse } from '../../api/types';
import { BarChart3 } from 'lucide-react';

export interface ImbalanceBarChartProps {
  data: DailyResponse | null;
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      period: number;
      time: string;
      error: number | null;
    };
  }>;
}

const CustomBarTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;
  const error = item.error;
  const isPositive = error !== null && error > 0;
  const isNegative = error !== null && error < 0;

  return (
    <div className="min-w-[210px] rounded-lg border border-slate-700/80 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-mono text-xs font-semibold text-slate-300">
          SP {item.period}
        </span>
        <span className="font-mono text-xs text-slate-400">
          {item.time} UTC
        </span>
      </div>

      <div className="mt-2.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Imbalance Error:</span>
          <span
            className={`font-mono font-bold ${
              isPositive
                ? 'text-rose-400'
                : isNegative
                ? 'text-sky-400'
                : 'text-slate-200'
            }`}
          >
            {error !== null
              ? `${error > 0 ? '+' : ''}${error.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })} MW`
              : '—'}
          </span>
        </div>

        <div className="pt-1 border-t border-slate-800/80">
          {isPositive && (
            <span className="inline-flex items-center gap-1.5 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400 border border-rose-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
              Over-forecast • Deficit Risk
            </span>
          )}
          {isNegative && (
            <span className="inline-flex items-center gap-1.5 rounded bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400 border border-sky-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
              Under-forecast • Surplus Wind
            </span>
          )}
          {!isPositive && !isNegative && (
            <span className="inline-flex items-center gap-1.5 rounded bg-slate-700/20 px-2 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-700/30">
              Balanced Schedule
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ImbalanceBarChart: React.FC<ImbalanceBarChartProps> = ({ data }) => {
  const chartData = React.useMemo(() => {
    if (!data?.periods) return [];
    return data.periods.map((p) => ({
      period: p.settlement_period,
      time: formatPeriodTime(p.start_time),
      error: p.error_mw,
    }));
  }, [data]);

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
          <h3 className="text-base font-semibold text-slate-100">
            Procurement Imbalance by Settlement Period
          </h3>
        </div>
        <div className="flex h-[280px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <BarChart3 className="h-8 w-8 animate-pulse text-rose-400" />
            <p className="text-sm font-medium text-slate-400">
              Loading imbalance profile...
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
            Procurement Imbalance by Settlement Period
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Forecast error (Forecast MW - Actual MW) per 30-min settlement window
          </p>
        </div>

        {/* Status Legend Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-rose-400"></span>
            <span className="text-slate-300">Over-forecast (Deficit Risk)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-sky-400"></span>
            <span className="text-slate-300">Under-forecast (Surplus)</span>
          </div>
        </div>
      </div>

      <div className="mt-5 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 25, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              strokeOpacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="period"
              interval={3} // Every 4th tick = every 4 settlement periods
              tickFormatter={(period) => `SP ${period}`}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#475569' }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#475569' }}
              tickFormatter={(val: number) =>
                Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
              }
              label={{
                value: 'Error (MW)',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 12,
                offset: 12,
              }}
            />
            <Tooltip content={<CustomBarTooltip />} />
            
            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />

            <Bar dataKey="error" maxBarSize={18} radius={[2, 2, 2, 2]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`imbalance-cell-${index}`}
                  fill={
                    entry.error !== null && entry.error >= 0
                      ? '#fb7185' // rose-400 for positive (over-forecast)
                      : '#38bdf8' // sky-400 for negative (under-forecast)
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ImbalanceBarChart;
