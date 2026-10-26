import React from 'react';
import { Lightbulb, ShieldAlert, Sparkles } from 'lucide-react';
import type { OverviewMetrics } from '../../api/types';

export interface CommercialInsightProps {
  data: OverviewMetrics | null;
}

export const CommercialInsight: React.FC<CommercialInsightProps> = ({ data }) => {
  if (!data) {
    return null;
  }

  const formattedBias = `${data.mean_bias >= 0 ? '+' : ''}${data.mean_bias.toFixed(1)} MW`;
  const isPositiveBias = data.mean_bias >= 0;
  const rmseMaeRatio = data.mae > 0 ? (data.rmse / data.mae).toFixed(2) : '1.00';
  const peakOverforecast = data.max_overforecast_mw.toFixed(0);

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 border-l-4 border-l-amber-400 rounded-xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 gap-2 border-b border-slate-700/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400">
            <Lightbulb className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2">
              Commercial Risk Assessment
            </h3>
            <p className="text-xs text-slate-400">
              Analyst Briefing • Elexon BSC Settlement & Imbalance Exposure
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <Sparkles className="w-3 h-3" />
            Trading Desk Advisory
          </span>
        </div>
      </div>

      {/* Body Paragraphs */}
      <div className="space-y-3.5 text-sm leading-relaxed text-slate-300">
        {/* Paragraph 1: SBP Exposure & Asymmetric Buffer */}
        <p>
          The portfolio registered a net mean bias of{' '}
          <span className={`font-mono font-semibold ${isPositiveBias ? 'text-rose-400' : 'text-sky-300'}`}>
            {formattedBias}
          </span>
          , with over-forecasting observed across{' '}
          <span className="font-mono font-semibold text-rose-400">
            {data.overforecast_pct.toFixed(1)}%
          </span>{' '}
          of January settlement periods. In the UK Balancing Mechanism, systemic over-forecasting
          leaves trading positions structurally short against Final Physical Notifications (FPNs),
          compelling settlement at the punitive{' '}
          <span className="font-medium text-slate-100">System Buy Price (SBP)</span>. When unforecast
          wind lulls coincide with evening peak demand, cashout prices frequently spike past £200/MWh.
          To mitigate asymmetric short-cashout risk, the commercial desk recommends enacting an{' '}
          <span className="font-semibold text-amber-300">
            asymmetric discount buffer of 3.5%–5.0%
          </span>{' '}
          on day-ahead nomination bids during high-volatility weather regimes.
        </p>

        {/* Paragraph 2: MAE vs RMSE Dispersion Context */}
        <p>
          Monthly forecast accuracy exhibited an aggregate MAE of{' '}
          <span className="font-mono font-semibold text-amber-300">
            {data.mae.toFixed(1)} MW
          </span>{' '}
          against an RMSE of{' '}
          <span className="font-mono font-semibold text-rose-400">
            {data.rmse.toFixed(1)} MW
          </span>
          . The pronounced RMSE-to-MAE ratio of{' '}
          <span className="font-mono font-semibold text-slate-100">
            {rmseMaeRatio}x
          </span>{' '}
          demonstrates that error distribution is heavily heavy-tailed rather than Gaussian,
          punctuated by extreme tail-risk bust events reaching up to{' '}
          <span className="font-mono font-semibold text-rose-400">
            +{peakOverforecast} MW
          </span>
          . Commercial schedulers should not rely on static reserve margins; instead, fast-ramping
          ancillary hedging and thermal/battery tolerance bands must scale dynamically with wind
          forecast confidence intervals.
        </p>
      </div>

      {/* Footer Notes */}
      <div className="mt-4 pt-3 border-t border-slate-700/30 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Model Imbalance Risk Index:{' '}
            <strong className="text-slate-200 font-mono">
              {data.overforecast_pct > 50 ? 'ELEVATED SHORT BIAS' : 'BALANCED / MILD SHORT'}
            </strong>
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          VortexPower Market Analytics • GB Balancing Settlement Code (BSC) Rules
        </span>
      </div>
    </div>
  );
};

export default CommercialInsight;
