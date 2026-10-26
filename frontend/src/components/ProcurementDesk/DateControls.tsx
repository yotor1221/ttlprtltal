import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, Gauge } from 'lucide-react';
import { formatUKDate, formatSelectOption } from './dateUtils';

export interface DateControlsProps {
  selectedDate: string;
  demandBaseline: number;
  onDateChange: (date: string) => void;
  onDemandChange: (mw: number) => void;
}

export const DateControls: React.FC<DateControlsProps> = ({
  selectedDate,
  demandBaseline,
  onDateChange,
  onDemandChange,
}) => {
  // Generate all 31 days of January 2026
  const januaryDays = React.useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return `2026-01-${day}`;
    });
  }, []);

  const currentDayNum = React.useMemo(() => {
    const parts = selectedDate.split('-');
    return parts.length === 3 ? parseInt(parts[2], 10) : 1;
  }, [selectedDate]);

  const isFirstDay = currentDayNum <= 1 || selectedDate === '2026-01-01';
  const isLastDay = currentDayNum >= 31 || selectedDate === '2026-01-31';

  const handlePrevDay = () => {
    if (!isFirstDay) {
      const prev = String(currentDayNum - 1).padStart(2, '0');
      onDateChange(`2026-01-${prev}`);
    }
  };

  const handleNextDay = () => {
    if (!isLastDay) {
      const next = String(currentDayNum + 1).padStart(2, '0');
      onDateChange(`2026-01-${next}`);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Date Selector Section */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-slate-100">
              {formatUKDate(selectedDate) || selectedDate}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevDay}
              disabled={isFirstDay}
              aria-label="Previous Day"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800 text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              disabled={isLastDay}
              aria-label="Next Day"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800 text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <select
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              aria-label="Select date"
              className="h-9 rounded-lg border border-slate-700/70 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-inner transition-colors hover:border-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {januaryDays.map((d) => (
                <option key={d} value={d} className="bg-slate-900 text-slate-200">
                  {formatSelectOption(d)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Demand Baseline Slider Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-slate-700/40 pt-4 lg:border-t-0 lg:pt-0">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Consumer Demand Baseline
              </span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {demandBaseline.toLocaleString()} MW
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-500">10k</span>
            <input
              type="range"
              min={10000}
              max={45000}
              step={500}
              value={demandBaseline}
              onChange={(e) => onDemandChange(Number(e.target.value))}
              className="h-2 w-40 sm:w-52 md:w-64 cursor-pointer appearance-none rounded-lg bg-slate-700/80 accent-emerald-500 transition-colors hover:accent-emerald-400 focus:outline-none"
            />
            <span className="text-[10px] font-mono text-slate-500">45k</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateControls;
