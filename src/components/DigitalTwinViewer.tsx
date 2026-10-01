import React, { useState } from 'react';
import { 
  Zap, 
  RotateCw, 
  Thermometer, 
  Activity, 
  Layers, 
  Info, 
  ShieldCheck, 
  AlertCircle, 
  X,
  Crosshair,
  Sliders
} from 'lucide-react';
import { DigitalTwinState, ComponentState } from '../types';

interface DigitalTwinViewerProps {
  twin: DigitalTwinState | null;
}

export const DigitalTwinViewer: React.FC<DigitalTwinViewerProps> = ({ twin }) => {
  const [selectedCompKey, setSelectedCompKey] = useState<string>('bearing_de');

  const components = twin?.components || {};
  const selectedComp: ComponentState | undefined = components[selectedCompKey];

  const rpm = twin?.rpm ?? 1485.0;
  const isRotating = rpm > 50;
  // Rotation animation speed in seconds per rotation based on RPM
  // e.g. 1485 RPM = 24.75 rev/sec -> 0.04s per rev, clamped for smooth visual CSS rendering:
  const animDuration = isRotating ? Math.max(0.4, 25.0 / (rpm / 60)) : 0;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'CRITICAL':
        return {
          stroke: '#f43f5e',
          fill: '#881337',
          glow: 'rgba(244, 63, 94, 0.45)',
          badge: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
          dot: 'bg-rose-500',
        };
      case 'WARNING':
        return {
          stroke: '#f59e0b',
          fill: '#78350f',
          glow: 'rgba(245, 158, 11, 0.4)',
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
          dot: 'bg-amber-500',
        };
      default:
        return {
          stroke: '#10b981',
          fill: '#064e3b',
          glow: 'rgba(16, 185, 129, 0.25)',
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          dot: 'bg-emerald-400',
        };
    }
  };

  const compKeys = [
    { key: 'motor', label: 'Electric Motor' },
    { key: 'bearing_nde', label: 'Bearing NDE' },
    { key: 'bearing_de', label: 'Bearing DE' },
    { key: 'coupling', label: 'Flexible Coupling' },
    { key: 'shaft', label: 'Rotor Shaft' },
    { key: 'load', label: 'Mechanical Load' },
  ];

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
              Virtual Rotating Machine Train
              <span className="text-[10px] font-sans font-normal text-zinc-400 normal-case">
                (Click any component to inspect telemetry)
              </span>
            </h2>
          </div>
        </div>

        {/* Component Selector Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {compKeys.map(({ key, label }) => {
            const comp = components[key];
            const active = selectedCompKey === key;
            const colors = getStatusColor(comp?.status);
            return (
              <button
                key={key}
                onClick={() => setSelectedCompKey(key)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 border whitespace-nowrap ${
                  active 
                    ? 'bg-zinc-800 text-white border-cyan-500/80 shadow-sm ring-1 ring-cyan-500/50'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Central Machine Schematic Diagram (Section 23 requirements) */}
        <div className="lg:col-span-8 p-4 sm:p-6 flex flex-col items-center justify-center relative bg-gradient-to-b from-zinc-950 via-zinc-900/40 to-zinc-950 min-h-[380px]">
          {/* Subtle Grid Background */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Machine Train Schematic SVG */}
          <svg
            viewBox="0 0 880 340"
            className="w-full max-w-3xl h-auto drop-shadow-2xl select-none"
          >
            <defs>
              {/* Glow Filters */}
              <filter id="glow-motor" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-bearing" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              
              {/* Linear Gradients for 3D metallic industrial look */}
              <linearGradient id="metal-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3f3f46" />
                <stop offset="50%" stopColor="#71717a" />
                <stop offset="100%" stopColor="#27272a" />
              </linearGradient>

              <linearGradient id="shaft-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="30%" stopColor="#f1f5f9" />
                <stop offset="70%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              <linearGradient id="coupling-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>

              {/* Shaft Rotating Pattern */}
              <pattern id="shaft-stripes" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="20" stroke="#475569" strokeWidth="6" />
              </pattern>
            </defs>

            {/* Baseplate / Concrete Machine Pedestal */}
            <rect x="40" y="270" width="800" height="30" rx="4" fill="#18181b" stroke="#27272a" strokeWidth="2" />
            <line x1="60" y1="285" x2="820" y2="285" stroke="#3f3f46" strokeDasharray="8 6" strokeWidth="1.5" />
            {/* Foundation bolts */}
            <circle cx="80" cy="285" r="4" fill="#71717a" />
            <circle cx="280" cy="285" r="4" fill="#71717a" />
            <circle cx="480" cy="285" r="4" fill="#71717a" />
            <circle cx="680" cy="285" r="4" fill="#71717a" />
            <circle cx="800" cy="285" r="4" fill="#71717a" />

            {/* ROTOR SHAFT (passes through motor, bearings, coupling to pump load) */}
            <g 
              className="cursor-pointer transition-all duration-300"
              onClick={() => setSelectedCompKey('shaft')}
            >
              {/* Underlying Shaft Cylinder */}
              <rect x="60" y="152" width="670" height="28" rx="2" fill="url(#shaft-grad)" stroke="#1e293b" strokeWidth="1" />
              {/* Rotating Animation Overlay */}
              {isRotating && (
                <rect 
                  x="60" 
                  y="152" 
                  width="670" 
                  height="28" 
                  fill="url(#shaft-stripes)" 
                  opacity="0.25"
                  className="animate-pulse"
                />
              )}
            </g>

            {/* 1. BEARING NDE (Non-Drive End, Left Side of Motor) */}
            {(() => {
              const bNde = components.bearing_nde;
              const col = getStatusColor(bNde?.status);
              const isSelected = selectedCompKey === 'bearing_nde';
              return (
                <g 
                  className="cursor-pointer group"
                  onClick={() => setSelectedCompKey('bearing_nde')}
                >
                  {/* Warning/Critical Glow Aura */}
                  {bNde?.status !== 'HEALTHY' && (
                    <circle cx="95" cy="166" r="38" fill="none" stroke={col.stroke} strokeWidth="3" opacity="0.6" className="animate-ping" />
                  )}
                  {/* Bearing Housing Block */}
                  <rect 
                    x="75" y="125" width="40" height="82" rx="4"
                    fill={isSelected ? '#1e293b' : '#27272a'}
                    stroke={isSelected ? '#38bdf8' : col.stroke}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {/* Rolling Elements Representation */}
                  <circle cx="95" cy="142" r="6" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
                  <circle cx="95" cy="190" r="6" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
                  <text x="95" y="108" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    BEARING NDE
                  </text>
                  <text x="95" y="222" textAnchor="middle" fill={col.stroke} fontSize="9" fontFamily="monospace">
                    {bNde?.temperature ?? 48}°C
                  </text>
                </g>
              );
            })()}

            {/* 2. ELECTRIC MOTOR (5.5 kW Stator with Cooling Ribs) */}
            {(() => {
              const motor = components.motor;
              const col = getStatusColor(motor?.status);
              const isSelected = selectedCompKey === 'motor';
              return (
                <g 
                  className="cursor-pointer group"
                  onClick={() => setSelectedCompKey('motor')}
                >
                  {/* Stator Glow Aura */}
                  {motor?.status !== 'HEALTHY' && (
                    <rect x="130" y="80" width="220" height="172" rx="10" fill="none" stroke={col.stroke} strokeWidth="3" opacity="0.5" className="animate-pulse" />
                  )}
                  {/* Motor Main Housing */}
                  <rect 
                    x="135" y="85" width="210" height="162" rx="8"
                    fill={isSelected ? '#18273b' : '#1e293b'}
                    stroke={isSelected ? '#38bdf8' : col.stroke}
                    strokeWidth={isSelected ? 3.5 : 2}
                  />
                  {/* Stator Cooling Ribs / Fins */}
                  {[150, 170, 190, 210, 230, 250, 270, 290, 310, 330].map((x) => (
                    <line key={x} x1={x} y1="88" x2={x} y2="244" stroke="#0f172a" strokeWidth="3" />
                  ))}
                  {/* Terminal Box atop Motor */}
                  <rect x="200" y="60" width="80" height="26" rx="3" fill="#334155" stroke="#475569" strokeWidth="1.5" />
                  <text x="240" y="77" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    415V 3Ø
                  </text>
                  {/* Center Label */}
                  <rect x="165" y="148" width="150" height="36" rx="4" fill="#0f172a" fillOpacity="0.85" stroke="#334155" strokeWidth="1" />
                  <text x="240" y="166" textAnchor="middle" fill="#f8fafc" fontSize="12" fontFamily="monospace" fontWeight="bold">
                    MOTOR 5.5 kW
                  </text>
                  <text x="240" y="178" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace">
                    {twin?.rpm.toFixed(0) ?? 1485} RPM
                  </text>
                  <text x="240" y="263" textAnchor="middle" fill={col.stroke} fontSize="10" fontFamily="monospace" fontWeight="bold">
                    {motor?.temperature ?? 52}°C • {motor?.current ?? 7.5}A
                  </text>
                </g>
              );
            })()}

            {/* 3. BEARING DE (Drive End, Right Side of Motor) */}
            {(() => {
              const bDe = components.bearing_de;
              const col = getStatusColor(bDe?.status);
              const isSelected = selectedCompKey === 'bearing_de';
              return (
                <g 
                  className="cursor-pointer group"
                  onClick={() => setSelectedCompKey('bearing_de')}
                >
                  {/* Glow Aura if in warning/critical (e.g. bearing fault) */}
                  {bDe?.status !== 'HEALTHY' && (
                    <circle cx="365" cy="166" r="42" fill="none" stroke={col.stroke} strokeWidth="3.5" opacity="0.8" className="animate-ping" />
                  )}
                  {/* Bearing Housing Block */}
                  <rect 
                    x="345" y="120" width="40" height="92" rx="4"
                    fill={isSelected ? '#1e293b' : '#27272a'}
                    stroke={isSelected ? '#38bdf8' : col.stroke}
                    strokeWidth={isSelected ? 3.5 : 2.5}
                  />
                  {/* Bearing Elements */}
                  <circle cx="365" cy="138" r="7" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
                  <circle cx="365" cy="194" r="7" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
                  <text x="365" y="104" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    BEARING DE
                  </text>
                  <text x="365" y="226" textAnchor="middle" fill={col.stroke} fontSize="10" fontFamily="monospace" fontWeight="bold">
                    {bDe?.vibration_g ?? 0.45}g
                  </text>
                  <text x="365" y="238" textAnchor="middle" fill={col.stroke} fontSize="9" fontFamily="monospace">
                    Kurt: {bDe?.kurtosis ?? 3.0}
                  </text>
                </g>
              );
            })()}

            {/* 4. FLEXIBLE COUPLING */}
            {(() => {
              const c = components.coupling;
              const col = getStatusColor(c?.status);
              const isSelected = selectedCompKey === 'coupling';
              return (
                <g 
                  className="cursor-pointer group"
                  onClick={() => setSelectedCompKey('coupling')}
                >
                  {c?.status !== 'HEALTHY' && (
                    <rect x="405" y="130" width="50" height="72" rx="4" fill="none" stroke={col.stroke} strokeWidth="2.5" opacity="0.7" className="animate-pulse" />
                  )}
                  {/* Coupling Flanges */}
                  <rect 
                    x="410" y="135" width="18" height="62" rx="3"
                    fill={isSelected ? '#0369a1' : '#334155'}
                    stroke={col.stroke}
                    strokeWidth="1.5"
                  />
                  {/* Elastomer Spider insert */}
                  <rect x="428" y="142" width="6" height="48" rx="2" fill="#ef4444" opacity="0.85" />
                  <rect 
                    x="434" y="135" width="18" height="62" rx="3"
                    fill={isSelected ? '#0369a1' : '#334155'}
                    stroke={col.stroke}
                    strokeWidth="1.5"
                  />
                  <text x="431" y="112" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    COUPLING
                  </text>
                  <text x="431" y="222" textAnchor="middle" fill={col.stroke} fontSize="9" fontFamily="monospace">
                    Z: {c?.axial_vibration ?? 0.25}g
                  </text>
                </g>
              );
            })()}

            {/* 5. MECHANICAL LOAD (Centrifugal Industrial Pump Impeller) */}
            {(() => {
              const load = components.load;
              const col = getStatusColor(load?.status);
              const isSelected = selectedCompKey === 'load';
              return (
                <g 
                  className="cursor-pointer group"
                  onClick={() => setSelectedCompKey('load')}
                >
                  {/* Pump Volute Casing */}
                  <path 
                    d="M 500,166 C 500,100 550,75 620,75 C 690,75 740,110 740,166 C 740,230 680,260 610,260 L 580,260 C 530,260 500,225 500,166 Z" 
                    fill={isSelected ? '#1e293b' : '#1f2937'}
                    stroke={isSelected ? '#38bdf8' : col.stroke}
                    strokeWidth={isSelected ? 3.5 : 2}
                  />
                  {/* Pump Discharge Nozzle (Flange Top) */}
                  <rect x="590" y="45" width="60" height="32" rx="3" fill="#374151" stroke="#4b5563" strokeWidth="1.5" />
                  <ellipse cx="620" cy="45" rx="30" ry="8" fill="#1f2937" stroke="#9ca3af" strokeWidth="1" />
                  {/* Pump Impeller Center & Vanes */}
                  <circle cx="620" cy="166" r="38" fill="#111827" stroke="#4b5563" strokeWidth="2" />
                  {/* Rotating Impeller Vanes */}
                  <g 
                    style={{
                      transformOrigin: '620px 166px',
                      transform: isRotating ? `rotate(${rpm * 0.5}deg)` : 'none',
                      transition: isRotating ? 'none' : 'transform 0.5s ease-out'
                    }}
                  >
                    <line x1="620" y1="134" x2="620" y2="198" stroke="#38bdf8" strokeWidth="3" />
                    <line x1="588" y1="166" x2="652" y2="166" stroke="#38bdf8" strokeWidth="3" />
                    <line x1="597" y1="143" x2="643" y2="189" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="597" y1="189" x2="643" y2="143" stroke="#38bdf8" strokeWidth="2.5" />
                  </g>
                  <circle cx="620" cy="166" r="10" fill="#f8fafc" />
                  
                  <text x="620" y="278" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    PUMP LOAD
                  </text>
                  <text x="620" y="292" textAnchor="middle" fill={col.stroke} fontSize="10" fontFamily="monospace">
                    {twin?.load.toFixed(0) ?? 65}% Load
                  </text>
                </g>
              );
            })()}

            {/* Shaft Rotation Direction Indicator */}
            {isRotating && (
              <g transform="translate(470, 166)">
                <path d="M 0,-25 A 25 25 0 0 1 25,0" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="4 2" />
                <polygon points="25,0 20,-6 30,-6" fill="#38bdf8" />
                <text x="0" y="-30" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                  CW ROTATION
                </text>
              </g>
            )}
          </svg>

          {/* Machine Legend Bottom */}
          <div className="flex items-center gap-6 mt-4 text-[11px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Healthy (Zone A/B)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span> Warning (Zone C)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span> Critical Trip (Zone D)
            </span>
          </div>
        </div>

        {/* Component Inspector Panel (Section 23 requirements) */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Component Inspector
                </h3>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${getStatusColor(selectedComp?.status).badge}`}>
                ● {selectedComp?.status ?? 'HEALTHY'}
              </span>
            </div>

            {selectedComp ? (
              <div className="space-y-4 font-mono text-xs">
                {/* Component Name */}
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
                    Part Description
                  </span>
                  <div className="text-sm font-bold text-white mt-0.5 font-sans">
                    {selectedComp.name}
                  </div>
                </div>

                {/* Health Gauge */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">Component Integrity</span>
                    <span className="font-bold text-white">{selectedComp.health}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        selectedComp.health >= 80 ? 'bg-emerald-400' : selectedComp.health >= 60 ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${selectedComp.health}%` }}
                    />
                  </div>
                </div>

                {/* Operating Condition */}
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                    Diagnostic Condition
                  </span>
                  <span className="text-xs font-semibold text-cyan-300">
                    {selectedComp.condition}
                  </span>
                </div>

                {/* Specific Parameter Metrics Table */}
                <div className="bg-zinc-950 rounded border border-zinc-800 p-3 space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block border-b border-zinc-800/80 pb-1">
                    Real-time Sensor Telemetry
                  </span>

                  {selectedComp.temperature !== undefined && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Thermometer className="h-3.5 w-3.5 text-zinc-500" /> Temperature
                      </span>
                      <span className="font-bold text-zinc-100">{selectedComp.temperature} °C</span>
                    </div>
                  )}

                  {selectedComp.vibration_g !== undefined && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-zinc-500" /> Vibration Severity
                      </span>
                      <span className="font-bold text-zinc-100">{selectedComp.vibration_g} g</span>
                    </div>
                  )}

                  {selectedComp.kurtosis !== undefined && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-zinc-500" /> Impulsiveness (Kurtosis)
                      </span>
                      <span className="font-bold text-zinc-100">{selectedComp.kurtosis}</span>
                    </div>
                  )}

                  {selectedComp.current !== undefined && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-zinc-500" /> Stator Current
                      </span>
                      <span className="font-bold text-zinc-100">{selectedComp.current} A</span>
                    </div>
                  )}

                  {selectedComp.axial_vibration !== undefined && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Axial (Z) Vibration</span>
                      <span className="font-bold text-zinc-100">{selectedComp.axial_vibration} g</span>
                    </div>
                  )}

                  {selectedComp.rpm !== undefined && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <RotateCw className="h-3.5 w-3.5 text-zinc-500" /> Shaft Velocity
                      </span>
                      <span className="font-bold text-cyan-400">{selectedComp.rpm} RPM</span>
                    </div>
                  )}

                  {selectedComp.load_percent !== undefined && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Pump Load</span>
                      <span className="font-bold text-zinc-100">{selectedComp.load_percent}%</span>
                    </div>
                  )}
                </div>

                {/* Recommended Action */}
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                    Maintenance Guidance
                  </span>
                  <span className="text-xs text-zinc-300 font-sans mt-0.5 block leading-relaxed">
                    {selectedComp.status === 'CRITICAL'
                      ? 'Immediate work order required. Disassemble and replace damaged assembly.'
                      : selectedComp.status === 'WARNING'
                      ? 'Recheck lubrication grease, clean cooling fins, and verify optical runout.'
                      : 'Component functioning within standard operational tolerances.'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-zinc-500 text-xs">
                Select a machine part from the diagram or buttons above.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between items-center font-mono">
            <span>Machine ID: MTR-001</span>
            <span>Refreshed: Real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
};
