import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Flame, 
  AlertTriangle, 
  Activity, 
  Zap, 
  PowerOff, 
  Sliders, 
  CheckCircle2,
  Workflow,
  ArrowRight
} from 'lucide-react';
import { Telemetry } from '../types';

interface SimulatorControlsViewProps {
  currentMode: string;
  currentLoad: number;
  currentDegradation: number;
  demoActive: boolean;
  demoStep: number;
  onSetMode: (mode: string, load?: number, degradation?: number) => void;
  onToggleDemo: () => void;
  telemetry: Telemetry | null;
}

export const SimulatorControlsView: React.FC<SimulatorControlsViewProps> = ({
  currentMode,
  currentLoad,
  currentDegradation,
  demoActive,
  demoStep,
  onSetMode,
  onToggleDemo,
  telemetry,
}) => {
  const [loadSlider, setLoadSlider] = useState<number>(currentLoad || 65);
  const [degSlider, setDegSlider] = useState<number>(Math.round(currentDegradation * 100) || 0);

  const faultButtons = [
    { mode: 'NORMAL', label: 'NORMAL', icon: CheckCircle2, desc: 'Nominal balanced rotation' },
    { mode: 'IMBALANCE', label: 'IMBALANCE', icon: Activity, desc: 'Rotor mass offset (high 1X radial vib)' },
    { mode: 'MISALIGNMENT', label: 'MISALIGNMENT', icon: Workflow, desc: 'Coupling offset (high 2X harmonic & axial Z)' },
    { mode: 'BEARING_FAULT', label: 'BEARING FAULT', icon: AlertTriangle, desc: 'Outer race spall (BPFO impacts & high kurtosis)' },
    { mode: 'OVERHEATING', label: 'OVERHEATING', icon: Flame, desc: 'Blocked ventilation / thermal runaway' },
    { mode: 'OVERLOAD', label: 'OVERLOAD', icon: Activity, desc: 'Heavy shaft drag (high current & slip)' },
    { mode: 'ELECTRICAL_ANOMALY', label: 'ELECTRICAL ANOMALY', icon: Zap, desc: 'Voltage ripple & phase current unbalance' },
    { mode: 'MULTIPLE_FAULT', label: 'MULTIPLE FAULT', icon: AlertTriangle, desc: 'Combined bearing spall + misalignment' },
    { mode: 'SHUTDOWN', label: 'SHUTDOWN', icon: PowerOff, desc: 'Motor de-energized / stationary' },
  ];

  const handleApplySliders = () => {
    onSetMode(currentMode, loadSlider, degSlider);
  };

  const getTimelineStage = () => {
    if (demoStep <= 30) return { title: 'Stage 1: Nominal Baseline', desc: 'Equipment runs in healthy state (Health 100%, 0.45g vibration).' };
    if (demoStep <= 60) return { title: 'Stage 2: Load Step-Up', desc: 'Load escalates from 55% to 94%, increasing current and thermal draw.' };
    if (demoStep <= 90) return { title: 'Stage 3: Incipient Bearing Degradation', desc: 'Micro-pitting initiates on Drive End bearing; Kurtosis rises to 4.5.' };
    if (demoStep <= 120) return { title: 'Stage 4: Vibration Surge', desc: 'Vibration RMS breaches 1.2g warning threshold; spectral peaks amplify.' };
    if (demoStep <= 150) return { title: 'Stage 5: Thermal Escalation', desc: 'Stator temperature rises past 75°C warning ceiling.' };
    if (demoStep <= 180) return { title: 'Stage 6: ML Bearing Fault Trip', desc: 'Random Forest model triggers 91% confidence fault classification.' };
    return { title: 'Stage 7: Critical Trip Condition', desc: 'Health < 30%, RUL < 24h, vibration exceeds ISO Zone D 2.0g.' };
  };

  return (
    <div className="space-y-6">
      {/* 180s Digital Twin Guided Demonstration Showcase (Section 41) */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-cyan-800/60 p-5 rounded-xl shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                1-Click Industrial Demo
              </span>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                180-Second Guided Predictive Degradation Sequence
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed font-sans">
              Watch equipment health progress through the complete physical breakdown lifecycle:
              <b> 100% ➔ 95% ➔ 87% ➔ 72% ➔ 51% ➔ 28%</b> with automatic MQTT telemetry, ML classification, and alert triggers.
            </p>
          </div>

          <button
            onClick={onToggleDemo}
            className={`px-5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all shadow-md ${
              demoActive 
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {demoActive ? (
              <>
                <Square className="h-4 w-4 fill-current" />
                <span>Halt Demo ({demoStep}s / 180s)</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Start Digital Twin Demo</span>
              </>
            )}
          </button>
        </div>

        {/* Real-time Demo Timeline Visualizer */}
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs font-mono mb-2">
            <span className="text-cyan-400 font-bold">{getTimelineStage().title}</span>
            <span className="text-zinc-400">{demoActive ? `${demoStep}s / 180s` : 'Standby'}</span>
          </div>

          <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-zinc-800 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min(100, (demoStep / 180) * 100)}%` }}
            />
          </div>

          <p className="text-xs text-zinc-400 mt-2 font-mono">
            {getTimelineStage().desc}
          </p>
        </div>
      </div>

      {/* Fault Injection Matrix (Section 30 requirements) */}
      <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wide">
              Mechanical Fault Injection Matrix
            </h3>
            <p className="text-xs text-zinc-400">
              Inject realistic electro-mechanical failure modes. Changes stream directly through the MQTT broker pipeline.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-cyan-400 font-bold">
            ACTIVE MODE: {currentMode}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {faultButtons.map((btn) => {
            const Icon = btn.icon;
            const active = currentMode === btn.mode;
            return (
              <button
                key={btn.mode}
                onClick={() => onSetMode(btn.mode)}
                className={`p-3.5 rounded-lg border text-left transition-all font-mono flex flex-col justify-between ${
                  active
                    ? 'bg-cyan-950/60 border-cyan-500/80 ring-1 ring-cyan-500 text-white shadow-md'
                    : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider">{btn.label}</span>
                  <Icon className={`h-4 w-4 ${active ? 'text-cyan-400' : 'text-zinc-500'}`} />
                </div>
                <span className="text-[11px] text-zinc-400 font-sans leading-tight">
                  {btn.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Physics Sliders (Section 30) */}
      <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl shadow-lg">
        <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wide border-b border-zinc-800 pb-3 mb-4">
          Direct Physical Parameter Sliders
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Load % Slider */}
          <div className="space-y-2 font-mono">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-semibold">Motor Load Demand (%)</span>
              <span className="text-cyan-400 font-bold text-sm bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {loadSlider}%
              </span>
            </div>
            <input 
              type="range"
              min="0"
              max="120"
              step="5"
              value={loadSlider}
              onChange={(e) => setLoadSlider(Number(e.target.value))}
              className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>0% (Idle No-Load)</span>
              <span>65% (Nominal)</span>
              <span>100% (Full Rated)</span>
              <span>120% (Overload)</span>
            </div>
          </div>

          {/* Degradation % Slider */}
          <div className="space-y-2 font-mono">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-semibold">Accumulated Physical Wear / Degradation (%)</span>
              <span className="text-amber-400 font-bold text-sm bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {degSlider}%
              </span>
            </div>
            <input 
              type="range"
              min="0"
              max="100"
              step="2"
              value={degSlider}
              onChange={(e) => setDegSlider(Number(e.target.value))}
              className="w-full accent-amber-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>0% (Pristine New)</span>
              <span>30% (Early Wear)</span>
              <span>70% (Significant Spalling)</span>
              <span>100% (Failure)</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleApplySliders}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-semibold rounded-md border border-zinc-700 transition-all flex items-center gap-2"
          >
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            Apply Slider Overrides to MQTT Pipeline
          </button>
        </div>
      </div>

      {/* Engineering Requirement Verification: End-to-End Pipeline Visualization (Section 49 & 51) */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl font-mono text-xs text-zinc-400">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-2 font-sans font-bold">
          Section 51 • End-to-End Architecture Data Chain Verification
        </span>
        <div className="flex flex-wrap items-center gap-2 text-zinc-300">
          <span className="bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-cyan-400">
            Simulator MTR-001
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
          <span className="bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-emerald-400">
            MQTT Ingest (QoS 1)
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
          <span className="bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-indigo-400">
            SQLite Database
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
          <span className="bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-purple-400">
            FFT & Features
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
          <span className="bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-pink-400">
            ML Health & RUL
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
          <span className="bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-amber-400">
            Alert Engine
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
          <span className="bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 text-white font-bold">
            Live Web SCADA
          </span>
        </div>
      </div>
    </div>
  );
};
