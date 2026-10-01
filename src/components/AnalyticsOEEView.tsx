import React from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  PieChart, 
  Clock, 
  Zap, 
  DollarSign, 
  ShieldCheck, 
  Activity,
  Layers
} from 'lucide-react';
import { Statistics } from '../types';

interface AnalyticsOEEViewProps {
  stats: Statistics | null;
}

export const AnalyticsOEEView: React.FC<AnalyticsOEEViewProps> = ({ stats }) => {
  const oee = stats?.oee || {
    overall: 89.2,
    availability: 98.4,
    performance: 96.2,
    quality: 94.1,
    mtbf_hours: 720.0,
    mttr_hours: 3.5,
    estimated_maintenance_cost_usd: 1250.0,
  };

  const handleDownload = (format: 'csv' | 'json') => {
    window.location.href = `/api/export/${format}`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Export Actions (Section 45 requirements) */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wide">
            Industrial Performance & OEE Reliability Reporting
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Key operational metrics, energy balance, MTBF/MTTR analytics, and historical telemetry export
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload('csv')}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleDownload('json')}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileCode className="h-3.5 w-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Industrial OEE Metrics (Section 43 requirements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Overall OEE */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <div className="flex justify-between items-center text-xs text-zinc-400 mb-2">
            <span>Overall OEE</span>
            <span className="text-[10px] text-zinc-500 font-sans">World-Class &gt;85%</span>
          </div>
          <div className="text-3xl font-bold text-cyan-400">
            {oee.overall}%
          </div>
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-cyan-500 h-full" style={{ width: `${oee.overall}%` }} />
          </div>
          <span className="text-[10px] text-zinc-500 mt-2 block font-sans">
            Availability × Performance × Quality
          </span>
        </div>

        {/* Availability */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <div className="flex justify-between items-center text-xs text-zinc-400 mb-2">
            <span>Availability Factor</span>
            <span className="text-emerald-400 font-bold">A</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            {oee.availability}%
          </div>
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-emerald-500 h-full" style={{ width: `${oee.availability}%` }} />
          </div>
          <span className="text-[10px] text-zinc-500 mt-2 block font-sans">
            Operating Time / Planned Production
          </span>
        </div>

        {/* Performance */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <div className="flex justify-between items-center text-xs text-zinc-400 mb-2">
            <span>Performance Rate</span>
            <span className="text-indigo-400 font-bold">P</span>
          </div>
          <div className="text-3xl font-bold text-indigo-400">
            {oee.performance}%
          </div>
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-indigo-500 h-full" style={{ width: `${oee.performance}%` }} />
          </div>
          <span className="text-[10px] text-zinc-500 mt-2 block font-sans">
            Operating Speed vs Rated 1485 RPM
          </span>
        </div>

        {/* Quality */}
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <div className="flex justify-between items-center text-xs text-zinc-400 mb-2">
            <span>Machine Quality Index</span>
            <span className="text-purple-400 font-bold">Q</span>
          </div>
          <div className="text-3xl font-bold text-purple-400">
            {oee.quality}%
          </div>
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-purple-500 h-full" style={{ width: `${oee.quality}%` }} />
          </div>
          <span className="text-[10px] text-zinc-500 mt-2 block font-sans">
            Composite Machine Integrity Rating
          </span>
        </div>
      </div>

      {/* Reliability & Maintenance Metrics Table (Section 42 & 43) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Operational Statistics */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-lg space-y-4">
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wide border-b border-zinc-800 pb-2">
            Multi-Sensor Operational Statistics (Averages & Extremes)
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-zinc-900/70 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Temperature Min / Max</span>
              <div className="text-sm font-bold text-zinc-200 mt-1">
                {stats?.temperature?.min ?? 44}°C / {stats?.temperature?.max ?? 78}°C
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Avg: {stats?.temperature?.avg ?? 55}°C</span>
            </div>

            <div className="bg-zinc-900/70 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Vibration Peak Max</span>
              <div className="text-sm font-bold text-zinc-200 mt-1">
                {stats?.vibration?.max ?? 1.45} g
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Avg: {stats?.vibration?.avg ?? 0.48} g</span>
            </div>

            <div className="bg-zinc-900/70 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Current Min / Max</span>
              <div className="text-sm font-bold text-zinc-200 mt-1">
                {stats?.current?.min ?? 6.2}A / {stats?.current?.max ?? 11.4}A
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Avg: {stats?.current?.avg ?? 7.8}A</span>
            </div>

            <div className="bg-zinc-900/70 p-3 rounded border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Energy Consumption</span>
              <div className="text-sm font-bold text-cyan-400 mt-1">
                {stats?.power?.total_kwh_est ?? 0.85} kWh
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Avg Power: {stats?.power?.avg ?? 4.8} kW</span>
            </div>
          </div>
        </div>

        {/* Reliability KPIs */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-lg space-y-4">
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wide border-b border-zinc-800 pb-2">
            Plant Reliability & Financial Projections
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center bg-zinc-900/70 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-400 flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" /> MTBF (Mean Time Between Failures)
              </span>
              <span className="font-bold text-white">{oee.mtbf_hours} Hours</span>
            </div>

            <div className="flex justify-between items-center bg-zinc-900/70 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-400 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" /> MTTR (Mean Time To Repair)
              </span>
              <span className="font-bold text-white">{oee.mttr_hours} Hours</span>
            </div>

            <div className="flex justify-between items-center bg-zinc-900/70 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-400 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" /> Estimated Avoided Downtime Savings
              </span>
              <span className="font-bold text-emerald-400">${oee.estimated_maintenance_cost_usd} USD</span>
            </div>

            <div className="flex justify-between items-center bg-zinc-900/70 p-2.5 rounded border border-zinc-800">
              <span className="text-zinc-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-400" /> Total Active Alarm Events
              </span>
              <span className="font-bold text-white">{stats?.alerts_count ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
