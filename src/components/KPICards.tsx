import React from 'react';
import { 
  Thermometer, 
  Activity, 
  RotateCw, 
  Zap, 
  Gauge, 
  Percent, 
  HeartPulse, 
  Hourglass,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Telemetry, Features, Predictions } from '../types';

interface KPICardsProps {
  telemetry: Telemetry | null;
  features: Features | null;
  predictions: Predictions | null;
}

export const KPICards: React.FC<KPICardsProps> = ({ telemetry, features, predictions }) => {
  const temp = telemetry?.temperature ?? 52.0;
  const vibRms = features?.vibration_rms ?? 0.45;
  const rpm = telemetry?.rpm ?? 1485.0;
  const current = telemetry?.current ?? 7.5;
  const power = telemetry?.power ?? 4.8;
  const load = telemetry?.load ?? 65.0;
  const health = predictions?.health_score ?? 100.0;
  const rul = predictions?.estimated_rul ?? 500.0;

  const cards = [
    {
      title: 'Temperature',
      value: `${temp.toFixed(1)} °C`,
      subtext: temp > 80 ? 'Critical high' : temp > 68 ? 'Elevated' : 'Nominal range',
      icon: Thermometer,
      alert: temp > 75,
      critical: temp > 90,
      color: temp > 80 ? 'text-rose-400' : temp > 68 ? 'text-amber-400' : 'text-emerald-400',
      badge: temp > 75 ? '> 75°C' : '40-65°C',
    },
    {
      title: 'Vibration RMS',
      value: `${vibRms.toFixed(3)} g`,
      subtext: `Kurtosis: ${features?.kurtosis?.toFixed(1) ?? '3.0'}`,
      icon: Activity,
      alert: vibRms > 1.2,
      critical: vibRms > 2.0,
      color: vibRms > 2.0 ? 'text-rose-400' : vibRms > 1.2 ? 'text-amber-400' : 'text-emerald-400',
      badge: vibRms > 1.2 ? 'ISO Zone C/D' : 'ISO Zone A',
    },
    {
      title: 'Rotational Speed',
      value: `${rpm.toFixed(0)} RPM`,
      subtext: `Slip: ${(1485 - rpm).toFixed(0)} RPM`,
      icon: RotateCw,
      alert: rpm < 1420 && telemetry?.operating_mode !== 'SHUTDOWN',
      critical: false,
      color: 'text-cyan-400',
      badge: 'Rated 1485',
    },
    {
      title: 'Motor Current',
      value: `${current.toFixed(2)} A`,
      subtext: `${telemetry?.voltage?.toFixed(0) ?? 415} V (3-Phase)`,
      icon: Zap,
      alert: current > 10.0,
      critical: current > 12.0,
      color: current > 10.0 ? 'text-amber-400' : 'text-zinc-100',
      badge: 'FLA 9.8A',
    },
    {
      title: 'Active Power',
      value: `${power.toFixed(2)} kW`,
      subtext: `PF ~0.85`,
      icon: Gauge,
      alert: power > 5.5,
      critical: false,
      color: 'text-indigo-400',
      badge: 'Rated 5.5kW',
    },
    {
      title: 'Shaft Load',
      value: `${load.toFixed(1)} %`,
      subtext: load > 90 ? 'Heavy loaded' : 'Continuous duty',
      icon: Percent,
      alert: load > 90,
      critical: load > 105,
      color: load > 90 ? 'text-amber-400' : 'text-zinc-100',
      badge: '0-100%',
    },
    {
      title: 'Health Index',
      value: `${health.toFixed(0)} / 100`,
      subtext: predictions?.health_status ?? 'Good',
      icon: HeartPulse,
      alert: health < 70,
      critical: health < 40,
      color: health < 40 ? 'text-rose-400' : health < 70 ? 'text-amber-400' : 'text-emerald-400',
      badge: health >= 90 ? 'Excellent' : health >= 70 ? 'Warning' : 'Critical',
    },
    {
      title: 'Remaining Life',
      value: `${rul.toFixed(0)} h`,
      subtext: `-${predictions?.health_decline_rate ?? 0.1} pts/hr`,
      icon: Hourglass,
      alert: rul < 100,
      critical: rul < 24,
      color: rul < 24 ? 'text-rose-400' : rul < 100 ? 'text-amber-400' : 'text-cyan-400',
      badge: rul < 24 ? 'Urgent' : 'Operating',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const borderColor = card.critical
          ? 'border-rose-500/50 bg-rose-950/20'
          : card.alert
          ? 'border-amber-500/40 bg-amber-950/15'
          : 'border-zinc-800 bg-zinc-900/80';

        return (
          <div
            key={idx}
            className={`p-3 rounded-lg border transition-all hover:border-zinc-700 shadow-sm ${borderColor}`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-[11px] font-medium tracking-wide uppercase truncate">
                {card.title}
              </span>
              <Icon className={`h-3.5 w-3.5 ${card.color}`} />
            </div>
            <div className={`text-base sm:text-lg font-bold font-mono tracking-tight ${card.color}`}>
              {card.value}
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400">
              <span className="truncate">{card.subtext}</span>
              <span className="font-mono text-[9px] px-1 py-0.2 bg-zinc-800/80 rounded border border-zinc-700/60 ml-1 shrink-0">
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
