import { useState, useEffect, useCallback } from 'react';
import {
  fetchHealth,
  fetchDaily,
  fetchOverview,
  fetchErrorProfile,
} from './api/client';
import type {
  HealthResponse,
  DailyResponse,
  OverviewMetrics,
  ErrorProfileResponse,
} from './api/types';
import Header from './components/Header';
import DateControls from './components/ProcurementDesk/DateControls';
import DailySummaryCards from './components/ProcurementDesk/DailySummaryCards';
import DispatchChart from './components/ProcurementDesk/DispatchChart';
import ImbalanceBarChart from './components/ProcurementDesk/ImbalanceBarChart';
import SettlementTable from './components/ProcurementDesk/SettlementTable';
import MonthlyKPIs from './components/AccuracyLab/MonthlyKPIs';
import DiurnalProfileChart from './components/AccuracyLab/DiurnalProfileChart';
import ErrorHistogram from './components/AccuracyLab/ErrorHistogram';
import CommercialInsight from './components/AccuracyLab/CommercialInsight';
import {
  Loader2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  FlaskConical,
  RefreshCw,
} from 'lucide-react';

interface TabButtonProps {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon, active, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-center gap-2.5 px-5 py-3.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
        active
          ? 'text-emerald-400'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon && (
        <span
          className={`transition-colors duration-200 ${
            active ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'
          }`}
        >
          {icon}
        </span>
      )}
      <span>{label}</span>
      {/* Active underline indicator */}
      {active ? (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-sm shadow-emerald-500/50" />
      ) : (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent group-hover:bg-slate-700/50 transition-colors" />
      )}
    </button>
  );
};

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry, onDismiss }) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/20 p-2">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-rose-200">System Alert</h4>
          <p className="text-xs text-rose-300/90">{message}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/30 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-2 py-1 text-xs text-rose-300 transition-colors hover:bg-rose-500/20 hover:text-white"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

export function App() {
  const [activeTab, setActiveTab] = useState<'procurement' | 'accuracy'>('procurement');
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [demandBaseline, setDemandBaseline] = useState<number>(25000);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dailyData, setDailyData] = useState<DailyResponse | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewMetrics | null>(null);
  const [errorProfile, setErrorProfile] = useState<ErrorProfileResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Health on mount + every 30s interval
  const fetchHealthData = useCallback(() => {
    fetchHealth()
      .then((healthRes) => {
        setHealth(healthRes);
      })
      .catch((err: unknown) => {
        console.warn('Backend health check unreachable:', err);
        setHealth(null);
      });
  }, []);

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, [fetchHealthData]);

  // 2. Fetch Daily Settlement Data on date or baseline change
  const fetchDailyData = useCallback(() => {
    setLoading(true);
    fetchDaily(selectedDate, demandBaseline)
      .then((data) => {
        setDailyData(data);
        setError(null);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to fetch settlement data';
        setError(msg);
        console.error('fetchDaily failed:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedDate, demandBaseline]);

  useEffect(() => {
    let ignore = false;
    fetchDaily(selectedDate, demandBaseline)
      .then((data) => {
        if (!ignore) {
          setDailyData(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch settlement data';
          setError(msg);
          setLoading(false);
          console.error('fetchDaily failed:', err);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedDate, demandBaseline]);

  // 3. Fetch Overview + Error Profile when Accuracy Lab tab is activated
  const fetchAccuracyData = useCallback(() => {
    setLoading(true);
    Promise.all([fetchOverview(), fetchErrorProfile()])
      .then(([overview, profile]) => {
        setOverviewData(overview);
        setErrorProfile(profile);
        setError(null);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to fetch forecast analytics';
        setError(msg);
        console.error('fetchAccuracyData failed:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (activeTab === 'accuracy' && (!overviewData || !errorProfile)) {
      let ignore = false;
      Promise.all([fetchOverview(), fetchErrorProfile()])
        .then(([overview, profile]) => {
          if (!ignore) {
            setOverviewData(overview);
            setErrorProfile(profile);
            setError(null);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            const msg = err instanceof Error ? err.message : 'Failed to fetch forecast analytics';
            setError(msg);
            setLoading(false);
            console.error('fetchAccuracyData failed:', err);
          }
        });

      return () => {
        ignore = true;
      };
    }
  }, [activeTab, overviewData, errorProfile]);

  const handleRetry = () => {
    if (activeTab === 'procurement') {
      fetchDailyData();
    } else {
      fetchAccuracyData();
    }
    fetchHealthData();
  };

  const isBackendOffline = !health && !dailyData && !loading;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header health={health} />

      {/* Main Content Shell */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 pb-12 flex-1">
        {/* Tab Navigation and Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 mb-6 gap-3">
          <nav className="flex gap-1" aria-label="Dashboard Tabs">
            <TabButton
              label="📈 Day-Ahead Procurement Desk"
              icon={<TrendingUp className="h-4 w-4" />}
              active={activeTab === 'procurement'}
              onClick={() => setActiveTab('procurement')}
            />
            <TabButton
              label="🔬 Forecast Accuracy Lab"
              icon={<FlaskConical className="h-4 w-4" />}
              active={activeTab === 'accuracy'}
              onClick={() => setActiveTab('accuracy')}
            />
          </nav>

          {/* Loading indicator */}
          <div className="flex items-center gap-3 pb-3 sm:pb-0 px-2 sm:px-0">
            {loading && (
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                <span>Refreshing telemetry...</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <ErrorBanner
            message={error}
            onRetry={handleRetry}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Friendly Backend Offline State */}
        {isBackendOffline && (
          <div className="mb-6 rounded-xl border border-slate-700/60 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 mb-4">
              <BarChart3 className="h-7 w-7 text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Backend Service Offline</h3>
            <p className="mt-1.5 text-sm text-slate-400 max-w-md mx-auto">
              Unable to establish a connection with the National Grid ESO / Elexon BMRS ingestion service. Ensure the FastAPI backend is running on port 8000.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reconnect Telemetry</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'procurement' ? (
          <div className="space-y-6">
            {/* 1. Date Controls */}
            <DateControls
              selectedDate={selectedDate}
              demandBaseline={demandBaseline}
              onDateChange={setSelectedDate}
              onDemandChange={setDemandBaseline}
            />

            {/* 2. Daily Summary Cards */}
            <DailySummaryCards data={dailyData} />

            {/* 3. Dispatch Chart */}
            <DispatchChart
              data={dailyData}
              demandBaseline={demandBaseline}
            />

            {/* 4. Imbalance Bar Chart */}
            <ImbalanceBarChart data={dailyData} />

            {/* 5. Settlement Table */}
            <SettlementTable data={dailyData} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Monthly KPIs */}
            <MonthlyKPIs data={overviewData} />

            {/* 2. Two charts in a grid: DiurnalProfileChart + ErrorHistogram */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DiurnalProfileChart data={errorProfile} />
              <ErrorHistogram data={errorProfile} />
            </div>

            {/* 3. Commercial Insight */}
            <CommercialInsight data={overviewData} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
