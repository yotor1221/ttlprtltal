import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  colorClass?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  colorClass = 'text-emerald-400',
  trend,
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 shadow-xl backdrop-blur-sm transition-all duration-200 hover:border-slate-500/60 hover:shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${colorClass}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && (
              <span className="text-xs font-medium text-slate-400">{unit}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/80 p-2 shadow-inner">
              {icon}
            </div>
          )}

          {trend && (
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                trend === 'up'
                  ? 'border border-rose-500/20 bg-rose-500/10 text-rose-400'
                  : trend === 'down'
                  ? 'border border-sky-500/20 bg-sky-500/10 text-sky-400'
                  : 'border border-slate-700/40 bg-slate-700/30 text-slate-400'
              }`}
            >
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend === 'neutral' && <Minus className="h-3 w-3" />}
              <span className="capitalize">{trend}</span>
            </div>
          )}
        </div>
      </div>

      {subtitle && (
        <p className="mt-3 truncate border-t border-slate-700/40 pt-2.5 text-xs text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default MetricCard;
