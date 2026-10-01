import React from 'react';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  Play, 
  Square,
  Cpu
} from 'lucide-react';
import { DigitalTwinState } from '../types';

interface HeaderProps {
  twin: DigitalTwinState | null;
  mqttConnected: boolean;
  demoActive: boolean;
  demoStep: number;
  onToggleDemo: () => void;
  criticalAlertsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  twin,
  mqttConnected,
  demoActive,
  demoStep,
  onToggleDemo,
  criticalAlertsCount,
}) => {
  const status = twin?.status || 'RUNNING';
  const health = twin?.health ?? 100;
  const fault = twin?.fault || 'None';
  const rul = twin?.estimated_rul_hours ?? 500;
  const anomaly = (twin?.anomaly_score ?? 0.05) > 0.6 ? 'HIGH' : 'LOW';

  const getStatusBadge = () => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'OFFLINE':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  const getHealthColor = () => {
    if (health >= 85) return 'text-emerald-400';
    if (health >= 65) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 text-zinc-100 select-none">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Machine Identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shadow-inner">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-white font-mono">
                MTR-001
              </h1>
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                Industrial Motor Unit
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded border font-mono font-bold tracking-wide uppercase ${getStatusBadge()}`}>
                ● {status}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Sector 4 - Drive Train B • 3-Phase Induction 5.5 kW • 415V / 50Hz
            </p>
          </div>
        </div>

        {/* Live Status Indicators (Section 22 requirements) */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
          {/* Health */}
          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md flex flex-col items-center min-w-[76px]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans font-medium">Health</span>
            <span className={`text-base font-bold ${getHealthColor()}`}>
              {health.toFixed(0)}%
            </span>
          </div>

          {/* Fault */}
          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md flex flex-col items-center min-w-[100px]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans font-medium">Active Fault</span>
            <span className={`text-xs font-semibold truncate max-w-[120px] ${fault !== 'None' && fault !== 'Normal' ? 'text-amber-400' : 'text-zinc-300'}`}>
              {fault}
            </span>
          </div>

          {/* RUL */}
          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md flex flex-col items-center min-w-[76px]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans font-medium">RUL</span>
            <span className={`text-sm font-bold ${rul < 50 ? 'text-rose-400' : rul < 120 ? 'text-amber-400' : 'text-cyan-400'}`}>
              {rul.toFixed(0)}h
            </span>
          </div>

          {/* Anomaly */}
          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md flex flex-col items-center min-w-[76px]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans font-medium">Anomaly</span>
            <span className={`text-xs font-bold ${anomaly === 'HIGH' ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
              {anomaly}
            </span>
          </div>

          {/* MQTT Status Indicator */}
          <div className="hidden md:flex bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md flex-col items-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans font-medium">MQTT Ingest</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {mqttConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">1 Hz Live</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span className="text-xs text-amber-400">Connecting</span>
                </>
              )}
            </div>
          </div>

          {/* 180s Digital Twin Demo Launcher Button */}
          <button
            onClick={onToggleDemo}
            className={`px-3.5 py-2 rounded-md font-sans text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
              demoActive 
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {demoActive ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop Demo ({demoStep}s / 180s)</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Start Digital Twin Demo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Demo progress bar if active */}
      {demoActive && (
        <div className="w-full bg-zinc-900 h-1 relative overflow-hidden">
          <div 
            className="bg-cyan-400 h-full transition-all duration-1000 ease-linear"
            style={{ width: `${Math.min(100, (demoStep / 180) * 100)}%` }}
          />
        </div>
      )}
    </header>
  );
};
