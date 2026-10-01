import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  BellRing, 
  Filter, 
  Check, 
  Clock, 
  Info,
  Flame,
  Activity
} from 'lucide-react';
import { Alert } from '../types';

interface AlertsViewProps {
  alerts: Alert[];
  onAcknowledge: (id: number) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onAcknowledge }) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [ackFilter, setAckFilter] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (ackFilter === 'ACTIVE' && a.acknowledged) return false;
    if (ackFilter === 'ACKNOWLEDGED' && !a.acknowledged) return false;
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  const getIcon = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Bar (Section 29 requirements) */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wide">
              Industrial Condition Alert Notification Engine
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time threshold trips and ML risk indicators with automated 35s debouncing
          </p>
        </div>

        {/* Severity Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-all ${
                  severityFilter === sev
                    ? 'bg-zinc-800 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            {(['ALL', 'ACTIVE', 'ACKNOWLEDGED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setAckFilter(st)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-all ${
                  ackFilter === st
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Table / Cards (Section 20 & 29 requirements) */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase font-mono">
              All Monitoring Parameters Nominal
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              No active alarm conditions detected matching your filter criteria.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all ${
                alert.acknowledged
                  ? 'bg-zinc-950/60 border-zinc-900 opacity-60'
                  : alert.severity === 'CRITICAL'
                  ? 'bg-rose-950/20 border-rose-500/50 shadow-lg'
                  : alert.severity === 'WARNING'
                  ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                  : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(alert.severity)}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold tracking-wide ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {alert.machine_id}
                      </span>
                      <span className="text-xs font-mono text-zinc-500">•</span>
                      <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-xs font-mono font-bold text-zinc-200">
                        [{alert.alert_type}]
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1.5 font-sans leading-snug">
                      {alert.message}
                    </h4>

                    {/* Parameter, Value, Threshold */}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-mono text-zinc-400">
                      <span>
                        Parameter: <b className="text-zinc-200">{alert.parameter}</b>
                      </span>
                      <span>
                        Observed: <b className={alert.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}>{alert.value}</b>
                      </span>
                      <span>
                        Trip Threshold: <b className="text-zinc-300">{alert.threshold}</b>
                      </span>
                    </div>

                    {/* Recommended Action (Section 20 requirements) */}
                    <div className="mt-2.5 bg-zinc-900/90 border border-zinc-800 px-3 py-2 rounded-lg text-xs">
                      <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold tracking-wider block">
                        Recommended Maintenance Action:
                      </span>
                      <span className="text-zinc-200 font-sans mt-0.5 block">
                        {alert.recommended_action}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acknowledge Button */}
                <div>
                  {!alert.acknowledged ? (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Acknowledge</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Acknowledged
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
