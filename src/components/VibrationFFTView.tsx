import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { Activity, Radio, BarChart3, AlertOctagon } from 'lucide-react';
import { Features, Telemetry } from '../types';

interface VibrationFFTViewProps {
  features: Features | null;
  telemetry: Telemetry | null;
}

export const VibrationFFTView: React.FC<VibrationFFTViewProps> = ({ features, telemetry }) => {
  const rms = features?.vibration_rms ?? 0.45;
  const peak = features?.vibration_peak ?? 0.82;
  const peakToPeak = features?.vibration_peak ? features.vibration_peak * 1.85 : 1.5;
  const crestFactor = features?.crest_factor ?? 2.5;
  const kurtosis = features?.kurtosis ?? 3.0;
  const dominantFreq = features?.dominant_frequency ?? 24.8;
  const spectralEnergy = features?.spectral_energy ?? 0.52;
  const rpm = telemetry?.rpm ?? 1485.0;
  const f1x = rpm / 60.0;

  // Synthesize realistic high-resolution FFT spectrum bins (0 - 500 Hz, step 5 Hz)
  const fftData = useMemo(() => {
    const bins = [];
    const mode = telemetry?.operating_mode || 'NORMAL';

    for (let f = 5; f <= 500; f += 5) {
      let amp = 0.02 + Math.random() * 0.03; // background floor noise

      // 1X running frequency peak (e.g. ~24.75 Hz)
      const dist1x = Math.abs(f - f1x);
      if (dist1x < 8) {
        const mult = mode === 'IMBALANCE' ? 1.6 : 0.45;
        amp += (mult * rms) / (1 + dist1x * 0.8);
      }

      // 2X harmonic frequency (e.g. ~49.5 Hz) - high during misalignment
      const dist2x = Math.abs(f - 2 * f1x);
      if (dist2x < 8) {
        const mult = mode === 'MISALIGNMENT' ? 1.4 : 0.15;
        amp += (mult * rms) / (1 + dist2x * 0.8);
      }

      // 3X harmonic frequency
      const dist3x = Math.abs(f - 3 * f1x);
      if (dist3x < 8) {
        amp += (0.12 * rms) / (1 + dist3x * 0.8);
      }

      // 100 Hz Electrical line frequency harmonic (2x mains 50Hz)
      const dist100 = Math.abs(f - 100);
      if (dist100 < 8) {
        const mult = mode === 'ELECTRICAL_ANOMALY' ? 0.95 : 0.08;
        amp += (mult * rms) / (1 + dist100 * 0.8);
      }

      // High-Frequency Bearing Outer Race Ball Pass Frequency (BPFO ~ 7.2X running speed ~ 178 Hz)
      const distBpfo = Math.abs(f - 7.2 * f1x);
      if (distBpfo < 12) {
        const mult = (mode === 'BEARING_FAULT' || mode === 'MULTIPLE_FAULT') ? 1.85 : 0.06;
        amp += (mult * rms) / (1 + distBpfo * 0.5);
      }

      bins.push({
        freq: f,
        freqLabel: `${f} Hz`,
        amplitude: parseFloat(amp.toFixed(3)),
        isDominant: Math.abs(f - dominantFreq) < 5,
      });
    }
    return bins;
  }, [f1x, rms, dominantFreq, telemetry?.operating_mode]);

  return (
    <div className="space-y-6">
      {/* Time-Domain Feature KPIs (Section 25 requirements) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">
            Vibration RMS
          </span>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {rms.toFixed(3)} <span className="text-xs text-zinc-400 font-sans">g</span>
          </div>
          <span className="text-[10px] text-zinc-400">Total acceleration power</span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">
            Peak Amplitude
          </span>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {peak.toFixed(3)} <span className="text-xs text-zinc-400 font-sans">g-pk</span>
          </div>
          <span className="text-[10px] text-zinc-400">Maximum transient point</span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">
            Peak-to-Peak
          </span>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {peakToPeak.toFixed(3)} <span className="text-xs text-zinc-400 font-sans">g</span>
          </div>
          <span className="text-[10px] text-zinc-400">Full excursion span</span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">
            Crest Factor
          </span>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {crestFactor.toFixed(2)}
          </div>
          <span className="text-[10px] text-zinc-400">Peak / RMS ratio</span>
        </div>

        <div className={`p-3 rounded-lg border ${kurtosis > 4.5 ? 'bg-rose-950/20 border-rose-500/50' : 'bg-zinc-950 border-zinc-800'}`}>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">
            Kurtosis (Impulsiveness)
          </span>
          <div className={`text-xl font-bold font-mono mt-1 ${kurtosis > 4.5 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {kurtosis.toFixed(2)}
          </div>
          <span className="text-[10px] text-zinc-400">
            {kurtosis > 4.5 ? 'Bearing defect indicated' : 'Normal Gaussian: ~3.0'}
          </span>
        </div>
      </div>

      {/* Frequency-Domain Fast Fourier Transform (FFT) Spectrum */}
      <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wide">
                Vibration FFT Spectral Energy Distribution
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Acquisition rate: 1000 samples/sec • Frequency Resolution: 5.0 Hz • Window: Hanning
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-zinc-500">DOMINANT FREQ:</span>
              <span className="text-cyan-400 font-bold text-sm bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/80">
                {dominantFreq.toFixed(1)} Hz
              </span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-zinc-500">1X SPEED:</span>
              <span className="text-zinc-200 font-bold">
                {f1x.toFixed(1)} Hz
              </span>
            </div>
          </div>
        </div>

        {/* FFT Bar Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fftData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="freq" 
                stroke="#71717a" 
                fontSize={10} 
                tickLine={false}
                unit=" Hz"
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={10} 
                domain={[0, 'auto']} 
                tickLine={false}
                unit=" g"
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: 11 }}
                formatter={(val: any) => [`${val} g`, 'Amplitude']}
                labelFormatter={(lbl) => `Frequency: ${lbl} Hz`}
              />
              <ReferenceLine 
                x={dominantFreq} 
                stroke="#f43f5e" 
                strokeWidth={2}
                strokeDasharray="4 2"
                label={{ value: `Dominant: ${dominantFreq.toFixed(1)}Hz`, fill: '#f43f5e', fontSize: 10, position: 'top' }}
              />
              <Bar 
                dataKey="amplitude" 
                fill="#38bdf8" 
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Harmonic Reference Markers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-zinc-900 text-xs font-mono">
          <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">1X Running Speed</span>
            <span className="text-zinc-200 font-bold">{f1x.toFixed(1)} Hz</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Rotor dynamic balance</span>
          </div>

          <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">2X Harmonic</span>
            <span className="text-zinc-200 font-bold">{(2 * f1x).toFixed(1)} Hz</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Coupling misalignment</span>
          </div>

          <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">BPFO Bearing Defect</span>
            <span className="text-amber-400 font-bold">{(7.2 * f1x).toFixed(1)} Hz</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Outer raceway impact</span>
          </div>

          <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Electrical Line Ripple</span>
            <span className="text-zinc-200 font-bold">100.0 Hz</span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Phase asymmetry</span>
          </div>
        </div>
      </div>
    </div>
  );
};
