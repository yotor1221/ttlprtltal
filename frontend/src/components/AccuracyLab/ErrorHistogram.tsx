import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { ErrorProfileResponse } from '../../api/types';
import { BarChart3 } from 'lucide-react';

export interface ErrorHistogramProps {
  data: ErrorProfileResponse | null;
}

interface HistogramDataPoint {
  bucket: string;
  count: number;
  percentage: number;
}

function getBucketColor(bucket: string): string {
  const b = bucket.trim();
  switch (b) {
    case '< -1000':
      return '#e11d48'; // deep rose
    case '-1000 to -500':
      return '#fb7185'; // rose-400
    case '-500 to 0':
      return '#7dd3fc'; // sky-300
    case '0 to 500':
      return '#fcd34d'; // amber-300
    case '500 to 1000':
      return '#f59e0b'; // amber-500
    case '> 1000':
      return '#f43f5e'; // rose-500
    default:
      if (b.includes('<-1000') || b.includes('< -1000')) return '#e11d48';
      if (b.includes('-1000')) return '#fb7185';
      if (b.includes('-500')) return '#7dd3fc';
      if (b.includes('0 to 500')) return '#fcd34d';
      if (b.includes('500 to 1000')) return '#f59e0b';
      if (b.includes('> 1000') || b.includes('>1000')) return '#f43f5e';
      return '#94a3b8';
  }
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: HistogramDataPoint;
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload;
  const isOverforecast =
    dataPoint.bucket.startsWith('0') ||
    dataPoint.bucket.startsWith('500') ||
    dataPoint.bucket.startsWith('>');
  const color = getBucketColor(dataPoint.bucket);

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 shadow-xl backdrop-blur-md text-xs min-w-44">
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800 text-slate-300 font-medium">
        <span
          className="w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: color }}
        ></span>
        <span className="font-mono text-white">{dataPoint.bucket} MW</span>
      </div>

      <div className="space-y-1.5 font-mono">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Frequency:</span>
          <span className="font-semibold text-slate-100">
            {dataPoint.count} periods
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Monthly Share:</span>
          <span className="font-semibold text-amber-300">
            {dataPoint.percentage.toFixed(1)}%
          </span>
        </div>
        <div className="pt-1.5 mt-1 border-t border-slate-800 text-[11px] text-slate-400">
          {isOverforecast ? (
            <span className="text-rose-400">Over-forecast (Generation Shortfall)</span>
          ) : (
            <span className="text-sky-400">Under-forecast (Generation Surplus)</span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ErrorHistogram: React.FC<ErrorHistogramProps> = ({ data }) => {
  if (!data || !data.error_distribution || data.error_distribution.length === 0) {
    return (
      <div className="glass rounded-xl p-5 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-5 w-64 bg-slate-800 rounded animate-pulse mb-1"></div>
            <div className="h-3 w-40 bg-slate-800/60 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="h-[320px] w-full flex items-center justify-center bg-slate-900/40 rounded-lg border border-slate-800/50">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-amber-400 rounded-full animate-spin"></div>
            <span className="text-xs uppercase tracking-wider font-mono">
              Loading Error Distribution...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const chartData: HistogramDataPoint[] = data.error_distribution.map((b) => ({
    bucket: b.range_label,
    count: b.count,
    percentage: b.percentage,
  }));

  return (
    <div className="glass rounded-xl p-5 border border-slate-800/80 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-2 gap-2 border-b border-slate-800/60">
        <div>
          <h3 className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            Error Distribution — Forecast vs Actual
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Half-hourly delta frequency (Forecast MW − Actual MW)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-400"></span>
            <span className="text-slate-400">Under (&lt; 0 MW)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
            <span className="text-slate-400">Over (&gt; 0 MW)</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 24, right: 12, left: -4, bottom: 28 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(51, 65, 85, 0.4)"
              vertical={false}
            />

            <XAxis
              dataKey="bucket"
              stroke="#64748b"
              fontSize={11}
              angle={-20}
              textAnchor="end"
              height={45}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              label={{
                value: 'Periods Count',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 11,
                dy: 45,
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="percentage"
                position="top"
                formatter={(val: unknown) =>
                  typeof val === 'number' && val > 0 ? `${val.toFixed(1)}%` : ''
                }
                fill="#94a3b8"
                fontSize={10}
                offset={6}
              />
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBucketColor(entry.bucket)}
                  fillOpacity={0.9}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ErrorHistogram;
