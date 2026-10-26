import React, { useState } from 'react';
import { Table2, ChevronDown, ChevronUp } from 'lucide-react';
import type { DailyResponse, SettlementPeriod } from '../../api/types';

export interface SettlementTableProps {
  data: DailyResponse | null;
}

function formatPeriodTime(startTime: string): string {
  if (!startTime) return '—';
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
    return timePart.substring(0, 8);
  }
  return timeStr;
}

function formatDecimal(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export const SettlementTable: React.FC<SettlementTableProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const periods: SettlementPeriod[] = data?.periods || [];

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 shadow-xl backdrop-blur-sm">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/60 p-2 text-emerald-400">
            <Table2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Detailed Settlement Periods Data
            </h3>
            <p className="text-xs text-slate-400">
              Complete 48-period breakdown of day-ahead forecasts, actual generation, and balancing thermal calls
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700/80 bg-slate-800/90 px-4 py-2 text-xs font-semibold text-slate-200 shadow transition-colors hover:border-slate-600 hover:bg-slate-700/80 hover:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {isExpanded ? (
            <>
              <span>Hide Settlement Data</span>
              <ChevronUp className="h-4 w-4 text-slate-400" />
            </>
          ) : (
            <>
              <span>Show Settlement Data</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </>
          )}
        </button>
      </div>

      {/* Expanded Table */}
      {isExpanded && (
        <div className="mt-5 border-t border-slate-700/50 pt-5">
          {!data ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-slate-700/40 bg-slate-900/40">
              <p className="text-sm text-slate-400">No settlement data available</p>
            </div>
          ) : (
            <div className="relative max-h-[520px] overflow-x-auto overflow-y-auto rounded-lg border border-slate-700/70 shadow-inner">
              <table className="w-full border-collapse text-left text-xs text-slate-300">
                <thead className="sticky top-0 z-10 border-b border-slate-700/80 bg-slate-900/95 font-semibold text-slate-200 backdrop-blur-md uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Period
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Time (UTC)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Forecast (MW)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Actual (MW)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Error (MW)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Thermal (MW)
                    </th>
                    <th scope="col" className="px-4 py-3 text-center">
                      Publish Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {periods.map((p, idx) => {
                    const error = p.error_mw;
                    const isOver = error !== null && error > 0;
                    const isUnder = error !== null && error < 0;

                    return (
                      <tr
                        key={p.settlement_period}
                        className={`transition-colors hover:bg-slate-700/30 ${
                          idx % 2 === 0 ? 'bg-slate-800/40' : 'bg-slate-800/20'
                        }`}
                      >
                        {/* Period */}
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-200">
                          <span className="inline-flex items-center rounded bg-slate-700/40 px-2 py-0.5 text-xs text-slate-300">
                            SP {p.settlement_period}
                          </span>
                        </td>

                        {/* Time (UTC) */}
                        <td className="px-4 py-2.5 text-slate-300">
                          {formatPeriodTime(p.start_time)}
                        </td>

                        {/* Forecast (MW) */}
                        <td className="px-4 py-2.5 text-right font-medium text-emerald-400">
                          {formatDecimal(p.forecast_mw)}
                        </td>

                        {/* Actual (MW) */}
                        <td className="px-4 py-2.5 text-right font-medium text-cyan-400">
                          {formatDecimal(p.actual_mw)}
                        </td>

                        {/* Error (MW) */}
                        <td
                          className={`px-4 py-2.5 text-right font-semibold ${
                            isOver
                              ? 'text-rose-400'
                              : isUnder
                              ? 'text-sky-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {error !== null
                            ? `${isOver ? '+' : ''}${formatDecimal(error)}`
                            : '—'}
                        </td>

                        {/* Thermal (MW) */}
                        <td className="px-4 py-2.5 text-right font-medium text-amber-400">
                          {formatDecimal(p.implied_thermal_procurement_mw)}
                        </td>

                        {/* Publish Time */}
                        <td className="px-4 py-2.5 text-center text-[11px] text-slate-400">
                          {formatPublishTime(p.publish_time)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettlementTable;
