import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { Clock, Sliders, Filter } from 'lucide-react';
import { Telemetry } from '../types';

interface SensorTrendsViewProps {
  history: Telemetry[];
}

export const SensorTrendsView: React.FC<SensorTrendsViewProps> = ({ history }) => {
  const [timeRange, setTimeRange] = useState<string>('5m');
  const [selectedSensor, setSelectedSensor] = useState<'all' | 'vib' | 'thermal' | 'electrical'>('all');

  const ranges = [
    { label: '5 min', value: '5m' },
    { label: '15 min', value: '15m' },
    { label: '30 min', value: '30m' },
    { label: '1 hour', value: '1h' },
    { label: '6 hours', value: '6h' },
    { label: '24 hours', value: '24h' },
  ];

  // Format data for Recharts
  const chartData = history.slice(-40).map((t, idx) => {
    const d = new Date(t.timestamp);
    const timeStr = `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    const vRms = Math.sqrt(t.vibration_x ** 2 + t.vibration_y ** 2 + t.vibration_z ** 2);

    return {
      index: idx,
      time: timeStr,
      temp: t.temperature,
      vibX: t.vibration_x,
      vibY: t.vibration_y,
      vibZ: t.vibration_z,
      vibRms: parseFloat(vRms.toFixed(3)),
      rpm: t.rpm,
      current: t.current,
      voltage: t.voltage,
      power: t.power,
      load: t.load,
    };
  });

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            High-Speed Telemetry Trend Analysis
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time multi-channel sensor feeds streaming at 1000ms acquisition interval
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sensor Category Filter */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            {(['all', 'vib', 'thermal', 'electrical'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedSensor(cat)}
                className={`px-2.5 py-1 text-xs rounded capitalize font-medium transition-all ${
                  selectedSensor === cat
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Time Range Selector (Section 24 requirements) */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            <Clock className="h-3.5 w-3.5 text-zinc-500 ml-1.5 mr-0.5" />
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={`px-2 py-0.5 text-xs font-mono rounded transition-all ${
                  timeRange === r.value
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of 6 Synchronized Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Vibration vs Time */}
        {(selectedSensor === 'all' || selectedSensor === 'vib') && (
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wide">
                  Vibration (Tri-Axial & RMS) vs Time
                </h3>
                <span className="text-[10px] text-zinc-400">Unit: Acceleration (g-pk)</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded">
                Threshold: 1.2g / 2.0g
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} domain={[0, 'auto']} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="vibRms" name="Vibration RMS" stroke="#f43f5e" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="vibX" name="Radial X" stroke="#38bdf8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="vibY" name="Radial Y" stroke="#a855f7" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="vibZ" name="Axial Z" stroke="#eab308" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 2. Temperature vs Time */}
        {(selectedSensor === 'all' || selectedSensor === 'thermal') && (
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wide">
                  Motor Winding Temperature vs Time
                </h3>
                <span className="text-[10px] text-zinc-400">Unit: Degrees Celsius (°C)</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2 py-0.5 rounded">
                Trip: 90.0°C
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} domain={[30, 110]} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f97316" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. RPM vs Time */}
        {(selectedSensor === 'all' || selectedSensor === 'electrical') && (
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wide">
                  Rotational Speed (RPM) vs Time
                </h3>
                <span className="text-[10px] text-zinc-400">Rated: 1485 RPM (50 Hz Synchronous 1500)</span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded">
                Optical Tachometer
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} domain={[1350, 1520]} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="rpm" name="Shaft Speed (RPM)" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 4. Current vs Time */}
        {(selectedSensor === 'all' || selectedSensor === 'electrical') && (
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wide">
                  Motor Current (Amperes) vs Time
                </h3>
                <span className="text-[10px] text-zinc-400">3-Phase Line Current (RMS)</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                FLA: 9.8 A
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} domain={[0, 16]} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="current" name="Stator Current (A)" stroke="#eab308" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 5. Power vs Time */}
        {(selectedSensor === 'all' || selectedSensor === 'electrical') && (
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wide">
                  Active Electric Power vs Time
                </h3>
                <span className="text-[10px] text-zinc-400">P = √3 · V · I · cos φ</span>
              </div>
              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-800/50 px-2 py-0.5 rounded">
                Rated: 5.5 kW
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} domain={[0, 8]} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="power" name="Power (kW)" stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 6. Load Percentage vs Time */}
        {(selectedSensor === 'all' || selectedSensor === 'electrical') && (
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wide">
                  Pump Mechanical Load vs Time
                </h3>
                <span className="text-[10px] text-zinc-400">Centrifugal Load % Profile</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
                Nominal 40-80%
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} domain={[0, 110]} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="load" name="Load (%)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
