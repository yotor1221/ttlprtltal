import React from 'react';
import { Wind, Clock, Database } from 'lucide-react';

export interface HeaderProps {
  health: {
    status: string;
    total_records: number;
    data_completeness_pct: number;
  } | null;
}

export const Header: React.FC<HeaderProps> = ({ health }) => {
  const isHealthy = Boolean(
    health && (health.status === 'healthy' || health.status === 'ok')
  );

  const completenessText =
    health && typeof health.data_completeness_pct === 'number'
      ? `${health.data_completeness_pct.toFixed(1)}% Data Completeness`
      : 'Completeness: --';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-black/20 mb-6">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left branding section */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-inner">
            <Wind className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent">
              VortexPower UK
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-400">
              National Grid ESO / Elexon BMRS Market Operations (January 2026)
            </p>
          </div>
        </div>

        {/* Right badges row */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* a) Backend Status indicator */}
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors ${
              isHealthy
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isHealthy ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </>
              ) : (
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"></span>
              )}
            </span>
            <span>{isHealthy ? 'Connected' : 'Offline'}</span>
          </div>

          {/* b) Data Completeness badge */}
          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400 backdrop-blur-sm">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span>{completenessText}</span>
          </div>

          {/* c) Gate Closure badge */}
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 backdrop-blur-sm">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Gate Closure: D-1 @ 11:00 UTC</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
