import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ErrorProfileResponse } from '../../api/types';
import { Clock } from 'lucide-react';

export interface DiurnalProfileChartProps {
  data: ErrorProfileResponse | null;
}

interface ChartDataPoint {
  period: number;
  time: string;
  avgActual: number | null;
  avgForecast: number | null;
  avgMAE: number | null;
}

function formatPeriodToTime(period: number): string {
  const index = period - 1;
  const hours = Math.floor(index / 2);
  const minutes = (index % 2) * 30;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const actualItem = payload.find((p) => p.dataKey === 'avgActual');
  const forecastItem = payload.find((p) => p.dataKey === 'avgForecast');
  const maeItem = payload.find((p) => p.dataKey === 'avgMAE');

  const actualVal = actualItem?.value ?? null;
  const forecastVal = forecastItem?.value ?? null;
  const delta =
    forecastVal !== null && actualVal !== null ? forecastVal - actualVal : null;

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 shadow-xl backdrop-blur-md text-xs">
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800 text-slate-300 font-medium">
        <Clock className="w-3.5 h-3.5 text-cyan-400" />
        <span>Time: <strong className="text-white font-mono">{label}</strong></span>
      </div>

      <div className="space-y-1.5 font-mono">
        {actualVal !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Avg Actual:
            </span>
            <span className="font-semibold text-cyan-400">
              {actualVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW
            </span>
          </div>
        )}

        {forecastVal !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Avg Forecast:
            </span>
            <span className="font-semibold text-emerald-400">
              {forecastVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW
            </span>
          </div>
        )}

        {maeItem && maeItem.value !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-sm bg-amber-400/80"></span>
              Avg MAE:
            </span>
            <span className="font-semibold text-amber-300">
              {maeItem.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW
            </span>
          </div>
        )}

        {delta !== null && (
          <div className="pt-1.5 mt-1 border-t border-slate-800/80 flex items-center justify-between gap-4 text-[11px]">
            <span className="text-slate-400">Net Bias:</span>
            <span
              className={`font-semibold ${delta >= 0 ? 'text-rose-400' : 'text-sky-400'}`}
            >
              {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} MW
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const DiurnalProfileChart: React.FC<DiurnalProfileChartProps> = ({ data }) => {
  if (!data || !data.by_settlement_period || data.by_settlement_period.length === 0) {
    return (
      <div className="glass rounded-xl p-5 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-5 w-72 bg-slate-800 rounded animate-pulse mb-1"></div>
            <div className="h-3 w-48 bg-slate-800/60 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="h-[380px] w-full flex items-center justify-center bg-slate-900/40 rounded-lg border border-slate-800/50">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
            <span className="text-xs uppercase tracking-wider font-mono">
              Loading Diurnal Profile...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const chartData: ChartDataPoint[] = data.by_settlement_period.map((p) => ({
    period: p.settlement_period,
    time: formatPeriodToTime(p.settlement_period),
    avgActual: p.avg_actual_mw,
    avgForecast: p.avg_forecast_mw,
    avgMAE: p.avg_mae,
  }));

  return (
    <div className="glass rounded-xl p-5 border border-slate-800/80 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-2 gap-2 border-b border-slate-800/60">
        <div>
          <h3 className="text-base font-semibold text-slate-100 tracking-tight">
            Diurnal Wind Profile — January 2026 Average
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            48 Half-Hourly Settlement Periods • National Wind Generation vs Day-Ahead Forecast
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Actual</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Forecast</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <span className="w-2 h-2 rounded-sm bg-amber-400"></span>
            <span>MAE</span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="w-full h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -4, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(51, 65, 85, 0.4)"
              vertical={false}
            />

            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
              interval={3}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            {/* Left YAxis: Generation MW */}
            <YAxis
              yAxisId="left"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(val: number) =>
                val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
              }
              label={{
                value: 'Generation (MW)',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 11,
                dy: 45,
              }}
            />

            {/* Right YAxis: MAE MW */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#fbbf24"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(val: number) => `${val}`}
              label={{
                value: 'MAE (MW)',
                angle: 90,
                position: 'insideRight',
                fill: '#fbbf24',
                fontSize: 11,
                dy: 25,
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              wrapperStyle={{
                paddingTop: '12px',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            />

            {/* Avg MAE Bar */}
            <Bar
              yAxisId="right"
              dataKey="avgMAE"
              name="Avg MAE"
              fill="#fbbf2499"
              barSize={8}
              radius={[2, 2, 0, 0]}
            />

            {/* Avg Actual Line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgActual"
              name="Avg Actual"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 2 }}
            />

            {/* Avg Forecast Line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgForecast"
              name="Avg Forecast"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#34d399', stroke: '#0f172a', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DiurnalProfileChart;
