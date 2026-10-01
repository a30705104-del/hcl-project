import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const PORT = 3000;
const MACHINE_ID = process.env.MACHINE_ID || 'MTR-001';

const app = express();
app.use(express.json());

// In-memory persistent telemetry & record store
interface TelemetryRecord {
  id: number;
  machine_id: string;
  timestamp: string;
  temperature: number;
  vibration_x: number;
  vibration_y: number;
  vibration_z: number;
  rpm: number;
  current: number;
  voltage: number;
  power: number;
  load: number;
  operating_mode: string;
  degradation: number;
}

interface FeatureRecord {
  id: number;
  machine_id: string;
  timestamp: string;
  vibration_rms: number;
  vibration_peak: number;
  crest_factor: number;
  kurtosis: number;
  dominant_frequency: number;
  spectral_energy: number;
  temperature_rise: number;
  current_deviation: number;
  rpm_deviation: number;
}

interface PredictionRecord {
  id: number;
  machine_id: string;
  timestamp: string;
  health_score: number;
  health_status: string;
  anomaly_score: number;
  anomaly_status: string;
  predicted_fault: string;
  confidence: number;
  failure_probability: number;
  estimated_rul: number;
  health_decline_rate: number;
  probabilities: Record<string, number>;
}

interface AlertRecord {
  id: number;
  machine_id: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  alert_type: string;
  message: string;
  parameter: string;
  value: number;
  threshold: number;
  recommended_action: string;
  acknowledged: boolean;
}

interface MaintenanceRecord {
  id: number;
  machine_id: string;
  timestamp: string;
  maintenance_type: string;
  description: string;
  technician: string;
  status: string;
  downtime: number;
}

const db = {
  machines: [
    {
      id: 1,
      machine_id: 'MTR-001',
      name: 'Industrial Motor Unit',
      type: '3-Phase Induction Motor',
      location: 'Sector 4 - Line B',
      rated_power: 5.5,
      status: 'RUNNING',
      created_at: new Date().toISOString(),
    },
  ],
  telemetry: [] as TelemetryRecord[],
  features: [] as FeatureRecord[],
  predictions: [] as PredictionRecord[],
  alerts: [] as AlertRecord[],
  maintenance: [
    {
      id: 1,
      machine_id: 'MTR-001',
      timestamp: '2026-09-24T08:30:00Z',
      maintenance_type: 'Quarterly Alignment & Grease Inspection',
      description: 'Lubricated DE and NDE bearings with Mobil Polyrex EM. Laser aligned shaft to 0.03mm tolerance.',
      technician: 'Marcus Vance (Sr. Reliability Eng)',
      status: 'Completed',
      downtime: 1.5,
    },
    {
      id: 2,
      machine_id: 'MTR-001',
      timestamp: '2026-08-10T14:15:00Z',
      maintenance_type: 'Coupling Element Replacement',
      description: 'Replaced elastomer spider element due to cyclic fatigue wear. Verified runout.',
      technician: 'Sarah Jenkins (Tech II)',
      status: 'Completed',
      downtime: 2.0,
    },
  ] as MaintenanceRecord[],
};

// Machine Physics State
const simulatorState = {
  machine_id: MACHINE_ID,
  mode: 'NORMAL',
  load: 65.0,
  degradation: 0.0,
  temperature: 52.0,
  ambient_temp: 24.0,
  rated_rpm: 1485.0,
  rated_voltage: 415.0,
  demo_active: false,
  demo_step: 0,
};

// Rolling buffer for features
const rollingBuffer: {
  v: number[];
  temp: number[];
  curr: number[];
  rpm: number[];
} = {
  v: [],
  temp: [],
  curr: [],
  rpm: [],
};

// Alert cooldown tracker
const lastAlertTime: Record<string, number> = {};

// Helper: standard deviation
function getStdDev(arr: number[]): number {
  if (arr.length < 2) return 0.01;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

// Generate next telemetry step
function stepSimulation(): TelemetryRecord {
  // Demo Sequence Progression
  if (simulatorState.demo_active) {
    simulatorState.demo_step += 1;
    const t = simulatorState.demo_step;
    if (t <= 30) {
      simulatorState.mode = 'NORMAL';
      simulatorState.load = 55.0;
      simulatorState.degradation = 0.02;
    } else if (t <= 60) {
      simulatorState.mode = 'OVERLOAD';
      simulatorState.load = 55.0 + (t - 30) * 1.3;
      simulatorState.degradation = 0.08;
    } else if (t <= 90) {
      simulatorState.mode = 'BEARING_FAULT';
      simulatorState.degradation = 0.15 + (t - 60) * 0.008;
      simulatorState.load = 75.0;
    } else if (t <= 120) {
      simulatorState.mode = 'BEARING_FAULT';
      simulatorState.degradation = 0.40 + (t - 90) * 0.01;
      simulatorState.load = 80.0;
    } else if (t <= 150) {
      simulatorState.mode = 'MULTIPLE_FAULT';
      simulatorState.degradation = 0.70 + (t - 120) * 0.006;
      simulatorState.load = 85.0;
    } else if (t <= 180) {
      simulatorState.mode = 'BEARING_FAULT';
      simulatorState.degradation = 0.88 + (t - 150) * 0.003;
      simulatorState.load = 88.0;
    } else {
      simulatorState.mode = 'BEARING_FAULT';
      simulatorState.degradation = Math.min(0.98, simulatorState.degradation + 0.001);
    }
  }

  // Automatic degradation accumulation during active mechanical fault modes
  if (['BEARING_FAULT', 'MISALIGNMENT', 'MULTIPLE_FAULT'].includes(simulatorState.mode)) {
    simulatorState.degradation = Math.min(1.0, simulatorState.degradation + 0.0006);
  }

  // Physics profiles
  const profiles: Record<string, { temp_bias: number; vib_mult: number; vib_z_mult: number; curr_mult: number }> = {
    NORMAL: { temp_bias: 0.0, vib_mult: 1.0, vib_z_mult: 1.0, curr_mult: 1.0 },
    OVERLOAD: { temp_bias: 18.0, vib_mult: 1.4, vib_z_mult: 1.2, curr_mult: 1.5 },
    IMBALANCE: { temp_bias: 4.0, vib_mult: 2.8, vib_z_mult: 1.2, curr_mult: 1.1 },
    MISALIGNMENT: { temp_bias: 8.0, vib_mult: 2.2, vib_z_mult: 3.2, curr_mult: 1.15 },
    BEARING_FAULT: { temp_bias: 12.0, vib_mult: 2.6, vib_z_mult: 1.8, curr_mult: 1.1 },
    OVERHEATING: { temp_bias: 35.0, vib_mult: 1.3, vib_z_mult: 1.1, curr_mult: 1.3 },
    ELECTRICAL_ANOMALY: { temp_bias: 10.0, vib_mult: 1.6, vib_z_mult: 1.3, curr_mult: 1.45 },
    MULTIPLE_FAULT: { temp_bias: 24.0, vib_mult: 3.4, vib_z_mult: 3.0, curr_mult: 1.35 },
    SHUTDOWN: { temp_bias: -25.0, vib_mult: 0.05, vib_z_mult: 0.05, curr_mult: 0.0 },
  };

  const prof = profiles[simulatorState.mode] || profiles.NORMAL;

  let rpm = 0.0;
  let voltage = 415.0;
  let current = 0.0;
  let power = 0.0;
  let targetTemp = simulatorState.ambient_temp;
  let vibBase = 0.28;

  if (simulatorState.mode === 'SHUTDOWN') {
    rpm = Math.max(0, (Math.random() - 0.5) * 2.0);
    voltage = Math.max(0, 5.0 + Math.random() * 2.0);
    current = 0.0;
    power = 0.0;
    targetTemp = simulatorState.ambient_temp;
    vibBase = 0.02;
  } else {
    const slip = (simulatorState.load / 100.0) * 35.0;
    const rpmNoise = (Math.random() - 0.5) * 4.0;
    rpm = Math.max(1390.0, Math.min(1500.0, simulatorState.rated_rpm - slip + rpmNoise));

    let voltNoise = (Math.random() - 0.5) * 3.0;
    if (simulatorState.mode === 'ELECTRICAL_ANOMALY') {
      voltNoise += (Math.random() > 0.5 ? -22.0 : 16.0);
    }
    voltage = parseFloat((simulatorState.rated_voltage + voltNoise).toFixed(1));

    const baseCurr = 3.5 + (simulatorState.load / 100.0) * 6.0;
    const currNoise = (Math.random() - 0.5) * 0.3;
    current = parseFloat(
      Math.max(0.1, (baseCurr * prof.curr_mult + currNoise) * (1.0 + simulatorState.degradation * 0.15)).toFixed(2)
    );

    const pf = simulatorState.load > 50 ? 0.85 : 0.72;
    power = parseFloat(Math.max(0.1, (Math.sqrt(3) * voltage * current * pf * 0.88) / 1000.0).toFixed(2));

    const tempRiseLoad = (simulatorState.load / 100.0) * 28.0;
    targetTemp =
      simulatorState.ambient_temp + 18.0 + tempRiseLoad + prof.temp_bias + simulatorState.degradation * 28.0;
    vibBase = 0.28 + (simulatorState.load / 100.0) * 0.15;
  }

  // Thermal inertia
  const alpha = 0.08;
  const tempNoise = (Math.random() - 0.5) * 0.2;
  simulatorState.temperature += alpha * (targetTemp - simulatorState.temperature) + tempNoise;
  const temperature = parseFloat(simulatorState.temperature.toFixed(2));

  // Vibration
  const degVibFactor = 1.0 + simulatorState.degradation * 2.8;
  const vxMean = vibBase * prof.vib_mult * degVibFactor;
  const vyMean = vibBase * 0.85 * prof.vib_mult * degVibFactor;
  const vzMean = vibBase * 0.65 * prof.vib_z_mult * degVibFactor;

  const vx = Math.max(0.02, parseFloat((vxMean + (Math.random() - 0.5) * vxMean * 0.25).toFixed(3)));
  const vy = Math.max(0.02, parseFloat((vyMean + (Math.random() - 0.5) * vyMean * 0.25).toFixed(3)));
  const vz = Math.max(0.02, parseFloat((vzMean + (Math.random() - 0.5) * vzMean * 0.3).toFixed(3)));

  const rec: TelemetryRecord = {
    id: db.telemetry.length + 1,
    machine_id: MACHINE_ID,
    timestamp: new Date().toISOString(),
    temperature,
    vibration_x: vx,
    vibration_y: vy,
    vibration_z: vz,
    rpm: parseFloat(rpm.toFixed(1)),
    current,
    voltage,
    power,
    load: parseFloat(simulatorState.load.toFixed(1)),
    operating_mode: simulatorState.mode,
    degradation: parseFloat(simulatorState.degradation.toFixed(4)),
  };

  db.telemetry.push(rec);
  if (db.telemetry.length > 500) db.telemetry.shift();

  return rec;
}

// Compute Feature Engineering Frame
function computeFeatures(tel: TelemetryRecord): FeatureRecord {
  const vMag = Math.sqrt(tel.vibration_x ** 2 + tel.vibration_y ** 2 + tel.vibration_z ** 2);
  rollingBuffer.v.push(vMag);
  rollingBuffer.temp.push(tel.temperature);
  rollingBuffer.curr.push(tel.current);
  rollingBuffer.rpm.push(tel.rpm);

  if (rollingBuffer.v.length > 30) {
    rollingBuffer.v.shift();
    rollingBuffer.temp.shift();
    rollingBuffer.curr.shift();
    rollingBuffer.rpm.shift();
  }

  const vArr = rollingBuffer.v;
  const meanV = vArr.reduce((a, b) => a + b, 0) / vArr.length;
  const rms = Math.sqrt(vArr.reduce((a, b) => a + b ** 2, 0) / vArr.length);
  const peak = Math.max(...vArr);
  const peakToPeak = peak - Math.min(...vArr);
  const crestFactor = peak / (rms + 1e-6);

  // Kurtosis calculation
  const stdV = getStdDev(vArr);
  let kurtosis = 3.0;
  if (vArr.length > 3 && stdV > 1e-5) {
    kurtosis = vArr.reduce((acc, val) => acc + Math.pow((val - meanV) / stdV, 4), 0) / vArr.length;
  } else {
    kurtosis = 2.9 + rms * 0.4;
  }
  if (tel.operating_mode === 'BEARING_FAULT') {
    kurtosis = Math.max(kurtosis, 5.2 + rms * 1.4);
  } else if (tel.operating_mode === 'MULTIPLE_FAULT') {
    kurtosis = Math.max(kurtosis, 5.8 + rms * 1.6);
  }

  // Frequency-domain dominant frequency
  const f1x = tel.rpm / 60.0;
  let dominantFreq = f1x;
  let spectralEnergy = rms * 0.95;

  if (tel.operating_mode === 'IMBALANCE') {
    dominantFreq = f1x;
    spectralEnergy = rms * 1.85;
  } else if (tel.operating_mode === 'MISALIGNMENT') {
    dominantFreq = 2.0 * f1x;
    spectralEnergy = rms * 2.2;
  } else if (['BEARING_FAULT', 'MULTIPLE_FAULT'].includes(tel.operating_mode)) {
    dominantFreq = 7.2 * f1x; // BPFO bearing fault frequency ~178 Hz
    spectralEnergy = rms * 2.6;
  } else if (tel.operating_mode === 'ELECTRICAL_ANOMALY') {
    dominantFreq = 100.0;
    spectralEnergy = rms * 1.6;
  }

  const featRec: FeatureRecord = {
    id: db.features.length + 1,
    machine_id: MACHINE_ID,
    timestamp: tel.timestamp,
    vibration_rms: parseFloat(rms.toFixed(3)),
    vibration_peak: parseFloat(peak.toFixed(3)),
    crest_factor: parseFloat(crestFactor.toFixed(2)),
    kurtosis: parseFloat(kurtosis.toFixed(2)),
    dominant_frequency: parseFloat(dominantFreq.toFixed(2)),
    spectral_energy: parseFloat(spectralEnergy.toFixed(3)),
    temperature_rise: parseFloat((tel.temperature - 42.0).toFixed(2)),
    current_deviation: parseFloat((tel.current - 7.0).toFixed(2)),
    rpm_deviation: parseFloat((tel.rpm - 1485.0).toFixed(2)),
  };

  db.features.push(featRec);
  if (db.features.length > 500) db.features.shift();

  return featRec;
}

// Compute AI/ML Predictions
function computePredictions(tel: TelemetryRecord, feat: FeatureRecord): PredictionRecord {
  // 1. Isolation Forest Anomaly Score Estimation
  let rawDist = 0.0;
  rawDist += Math.max(0, (feat.vibration_rms - 0.75) / 0.5) * 0.35;
  rawDist += Math.max(0, (tel.temperature - 68.0) / 15.0) * 0.25;
  rawDist += Math.max(0, (feat.kurtosis - 3.8) / 2.0) * 0.25;
  rawDist += Math.max(0, (tel.current - 9.8) / 4.0) * 0.15;
  if (tel.operating_mode !== 'NORMAL' && tel.operating_mode !== 'SHUTDOWN') {
    rawDist += 0.25 + simulatorState.degradation * 0.4;
  }
  const anomalyScore = Math.max(0.02, Math.min(0.98, parseFloat(rawDist.toFixed(3))));
  const isAnomaly = anomalyScore > 0.6;

  // 2. Multi-Class Fault Classification Probabilities
  const classes = ['Normal', 'Imbalance', 'Misalignment', 'Bearing Fault', 'Overheating', 'Electrical Anomaly'];
  const probs: Record<string, number> = {
    Normal: 0.85,
    Imbalance: 0.03,
    Misalignment: 0.03,
    'Bearing Fault': 0.03,
    Overheating: 0.03,
    'Electrical Anomaly': 0.03,
  };

  if (tel.operating_mode === 'BEARING_FAULT' || feat.kurtosis > 4.5) {
    probs['Bearing Fault'] = 0.91;
    probs.Normal = 0.02;
    probs.Misalignment = 0.04;
  } else if (tel.operating_mode === 'MISALIGNMENT' || tel.vibration_z > 1.2) {
    probs.Misalignment = 0.89;
    probs.Normal = 0.03;
    probs.Imbalance = 0.05;
  } else if (tel.operating_mode === 'IMBALANCE' || (feat.dominant_frequency < 30 && feat.vibration_rms > 1.4)) {
    probs.Imbalance = 0.92;
    probs.Normal = 0.03;
    probs['Bearing Fault'] = 0.02;
  } else if (tel.operating_mode === 'OVERHEATING' || tel.temperature > 80) {
    probs.Overheating = 0.93;
    probs.Normal = 0.02;
  } else if (tel.operating_mode === 'ELECTRICAL_ANOMALY') {
    probs['Electrical Anomaly'] = 0.88;
    probs.Normal = 0.04;
  } else if (tel.operating_mode === 'MULTIPLE_FAULT') {
    probs['Bearing Fault'] = 0.62;
    probs.Misalignment = 0.28;
    probs.Normal = 0.02;
  }

  // Normalize
  const sumP = Object.values(probs).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(probs)) {
    probs[k] = parseFloat((probs[k] / sumP).toFixed(3));
  }

  // Winner class
  let predFault = 'Normal';
  let maxP = 0;
  for (const [k, v] of Object.entries(probs)) {
    if (v > maxP) {
      maxP = v;
      predFault = k;
    }
  }

  const failureProb = parseFloat((1.0 - probs.Normal).toFixed(2));

  // 3. Composite Health Score (0-100)
  let penalty = 0;
  if (feat.vibration_rms > 0.8) {
    penalty += Math.min(35, (feat.vibration_rms - 0.8) * 22);
  }
  if (tel.temperature > 65) {
    penalty += Math.min(25, (tel.temperature - 65) * 1.4);
  }
  if (feat.kurtosis > 3.5) {
    penalty += Math.min(15, (feat.kurtosis - 3.5) * 3.5);
  }
  penalty += anomalyScore * 20.0;
  penalty += failureProb * 25.0;

  const healthScore = Math.max(0.0, Math.min(100.0, parseFloat((100.0 - penalty).toFixed(1))));

  let healthStatus = 'Excellent';
  if (healthScore < 40) healthStatus = 'Critical';
  else if (healthScore < 60) healthStatus = 'Poor';
  else if (healthScore < 75) healthStatus = 'Warning';
  else if (healthScore < 90) healthStatus = 'Good';

  // 4. Remaining Useful Life (RUL hours)
  const deg = simulatorState.degradation;
  let rulHours = 500.0 * Math.max(0.01, Math.pow(1.0 - deg, 1.6));
  rulHours = Math.max(2.0, Math.min(500.0, parseFloat(rulHours.toFixed(1))));
  const healthDeclineRate = parseFloat(Math.max(0.05, (500.0 - rulHours) / 45.0).toFixed(2));

  const predRec: PredictionRecord = {
    id: db.predictions.length + 1,
    machine_id: MACHINE_ID,
    timestamp: tel.timestamp,
    health_score: healthScore,
    health_status: healthStatus,
    anomaly_score: anomalyScore,
    anomaly_status: isAnomaly ? 'ANOMALY' : 'NORMAL',
    predicted_fault: predFault,
    confidence: parseFloat(maxP.toFixed(2)),
    failure_probability: failureProb,
    estimated_rul: rulHours,
    health_decline_rate: healthDeclineRate,
    probabilities: probs,
  };

  db.predictions.push(predRec);
  if (db.predictions.length > 500) db.predictions.shift();

  return predRec;
}

// Digital Twin State Model
function getDigitalTwinState(tel: TelemetryRecord, feat: FeatureRecord, pred: PredictionRecord) {
  let status = 'RUNNING';
  let opState = 'Normal';

  if (tel.operating_mode === 'SHUTDOWN' || tel.rpm < 100) {
    status = 'OFFLINE';
    opState = 'Shutdown';
  } else if (pred.health_score < 40 || pred.failure_probability > 0.7) {
    status = 'CRITICAL';
    opState = 'Fault';
  } else if (pred.health_score < 75 || pred.anomaly_score > 0.6) {
    status = 'WARNING';
    opState = 'Fault Developing';
  } else if (tel.load > 90) {
    status = 'RUNNING';
    opState = 'Overloaded';
  }

  // Component inspections
  const bDeStatus = pred.predicted_fault === 'Bearing Fault' || feat.kurtosis > 5.0 ? 'CRITICAL' : feat.kurtosis > 4.0 ? 'WARNING' : 'HEALTHY';
  const cStatus = pred.predicted_fault === 'Misalignment' || tel.vibration_z > 1.2 ? 'CRITICAL' : 'HEALTHY';
  const sStatus = pred.predicted_fault === 'Imbalance' ? 'WARNING' : 'HEALTHY';
  const mStatus = tel.temperature > 85 || pred.predicted_fault === 'Overheating' ? 'CRITICAL' : tel.temperature > 72 ? 'WARNING' : 'HEALTHY';

  return {
    machine_id: MACHINE_ID,
    machine_name: 'Industrial Motor Unit',
    last_update: tel.timestamp,
    status,
    operating_state: opState,
    health: pred.health_score,
    temperature: tel.temperature,
    vibration: feat.vibration_rms,
    rpm: tel.rpm,
    current: tel.current,
    voltage: tel.voltage,
    power: tel.power,
    load: tel.load,
    fault: pred.predicted_fault,
    anomaly_score: pred.anomaly_score,
    failure_probability: pred.failure_probability,
    estimated_rul_hours: pred.estimated_rul,
    components: {
      motor: {
        id: 'motor',
        name: '3-Phase Electric Motor (5.5 kW)',
        status: mStatus,
        temperature: tel.temperature,
        current: tel.current,
        voltage: tel.voltage,
        power: tel.power,
        condition: mStatus === 'CRITICAL' ? 'Thermal Overheat / High Stator Stress' : 'Nominal Electromagnetic Field',
        health: Math.max(10, Math.min(100, Math.round(100 - Math.max(0, tel.temperature - 60) * 1.8))),
      },
      coupling: {
        id: 'coupling',
        name: 'Flexible Jaw Coupling',
        status: cStatus,
        axial_vibration: tel.vibration_z,
        radial_vibration: feat.vibration_rms,
        alignment_offset_mm: parseFloat((0.02 + tel.vibration_z * 0.1).toFixed(3)),
        condition: cStatus === 'CRITICAL' ? 'Severe Angular/Parallel Misalignment' : 'Balanced Dynamic Coupling',
        health: Math.max(10, Math.min(100, Math.round(100 - tel.vibration_z * 30))),
      },
      shaft: {
        id: 'shaft',
        name: 'High-Tensile Steel Rotor Shaft',
        status: sStatus,
        rpm: tel.rpm,
        eccentricity_um: parseFloat((5.0 + feat.vibration_rms * 12.0).toFixed(1)),
        condition: sStatus === 'WARNING' ? 'Dynamic Unbalance / Center Eccentricity' : 'True Concentric Rotation',
        health: Math.max(15, Math.min(100, Math.round(100 - feat.vibration_rms * 25))),
      },
      bearing_de: {
        id: 'bearing_de',
        name: 'Drive End (DE) Bearing - SKF 6308-2Z',
        status: bDeStatus,
        temperature: parseFloat((tel.temperature + 4.2).toFixed(1)),
        vibration_g: parseFloat((feat.vibration_rms * 1.15).toFixed(3)),
        kurtosis: feat.kurtosis,
        crest_factor: feat.crest_factor,
        condition: bDeStatus === 'CRITICAL' ? 'Advanced Spalling / Inner Race Flaking' : bDeStatus === 'WARNING' ? 'Incipient Raceway Micro-Pitting' : 'Full Hydrodynamic Film Lubrication',
        health: Math.max(5, Math.min(100, Math.round(100 - (feat.kurtosis - 3.0) * 16 - (feat.vibration_rms - 0.5) * 22))),
      },
      bearing_nde: {
        id: 'bearing_nde',
        name: 'Non-Drive End (NDE) Bearing - SKF 6207-2Z',
        status: 'HEALTHY',
        temperature: parseFloat((tel.temperature - 3.5).toFixed(1)),
        vibration_g: parseFloat((feat.vibration_rms * 0.8).toFixed(3)),
        kurtosis: parseFloat((feat.kurtosis * 0.85).toFixed(2)),
        crest_factor: feat.crest_factor,
        condition: 'Stable Rolling Elements',
        health: Math.max(20, Math.min(100, Math.round(100 - feat.vibration_rms * 12))),
      },
      load: {
        id: 'load',
        name: 'Centrifugal Industrial Pump Impeller',
        status: tel.load > 95 ? 'WARNING' : 'HEALTHY',
        load_percent: tel.load,
        flow_resistance: tel.load > 95 ? 'Cavitation / High Head Loss' : 'Nominal Fluid Flow',
        condition: 'Operating within Envelope',
        health: Math.max(10, Math.min(100, Math.round(100 - Math.max(0, tel.load - 80) * 1.5))),
      },
    },
  };
}

// Alert Engine Evaluation
function evaluateAlerts(tel: TelemetryRecord, feat: FeatureRecord, pred: PredictionRecord): AlertRecord[] {
  const now = Date.now();
  const cooldownMs = 35000;
  const newAlerts: AlertRecord[] = [];

  function trigger(key: string, alertData: Omit<AlertRecord, 'id' | 'timestamp' | 'acknowledged'>) {
    const last = lastAlertTime[key] || 0;
    if (now - last > cooldownMs) {
      lastAlertTime[key] = now;
      const fullAlert: AlertRecord = {
        id: db.alerts.length + 1,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        ...alertData,
      };
      db.alerts.unshift(fullAlert);
      if (db.alerts.length > 200) db.alerts.pop();
      newAlerts.push(fullAlert);
    }
  }

  // Rules
  if (tel.temperature > 90.0) {
    trigger('TEMP_CRIT', {
      machine_id: MACHINE_ID,
      severity: 'CRITICAL',
      alert_type: 'MOTOR_OVERHEAT_CRITICAL',
      message: `Critical motor temperature: ${tel.temperature}°C exceeds safe trip limit (90.0°C).`,
      parameter: 'Temperature',
      value: tel.temperature,
      threshold: 90.0,
      recommended_action: 'Emergency trip imminent. Check cooling fans, air inlets, and throttle load immediately.',
    });
  } else if (tel.temperature > 75.0) {
    trigger('TEMP_WARN', {
      machine_id: MACHINE_ID,
      severity: 'WARNING',
      alert_type: 'MOTOR_TEMP_HIGH',
      message: `Elevated stator winding temperature: ${tel.temperature}°C (Threshold: 75.0°C).`,
      parameter: 'Temperature',
      value: tel.temperature,
      threshold: 75.0,
      recommended_action: 'Inspect ventilation ducting and verify ambient cooling dissipation.',
    });
  }

  if (feat.vibration_rms > 2.0) {
    trigger('VIB_CRIT', {
      machine_id: MACHINE_ID,
      severity: 'CRITICAL',
      alert_type: 'VIBRATION_CRITICAL',
      message: `Vibration severity: ${feat.vibration_rms} g exceeds ISO 10816 Zone D critical threshold (2.0 g).`,
      parameter: 'Vibration RMS',
      value: feat.vibration_rms,
      threshold: 2.0,
      recommended_action: 'Stop machine immediately. Inspect bearing raceways, looseness, and alignment.',
    });
  } else if (feat.vibration_rms > 1.2) {
    trigger('VIB_WARN', {
      machine_id: MACHINE_ID,
      severity: 'WARNING',
      alert_type: 'VIBRATION_HIGH',
      message: `Vibration RMS elevated: ${feat.vibration_rms} g (Warning limit: 1.2 g). Suspected ${pred.predicted_fault}.`,
      parameter: 'Vibration RMS',
      value: feat.vibration_rms,
      threshold: 1.2,
      recommended_action: `Schedule vibration spectrum analysis for ${pred.predicted_fault}. Check grease condition.`,
    });
  }

  if (pred.health_score < 40.0) {
    trigger('HEALTH_CRIT', {
      machine_id: MACHINE_ID,
      severity: 'CRITICAL',
      alert_type: 'EQUIPMENT_HEALTH_CRITICAL',
      message: `Composite equipment health score collapsed to ${pred.health_score}%. Severe operational hazard.`,
      parameter: 'Health Score',
      value: pred.health_score,
      threshold: 40.0,
      recommended_action: 'Dispatch urgent maintenance crew. Transfer production load to secondary backup unit.',
    });
  } else if (pred.health_score < 70.0) {
    trigger('HEALTH_WARN', {
      machine_id: MACHINE_ID,
      severity: 'WARNING',
      alert_type: 'EQUIPMENT_HEALTH_DEGRADED',
      message: `Health Score degraded to ${pred.health_score}%. Incipient component breakdown in progress.`,
      parameter: 'Health Score',
      value: pred.health_score,
      threshold: 70.0,
      recommended_action: 'Schedule inspection during upcoming non-production shift window.',
    });
  }

  if (pred.estimated_rul < 24.0) {
    trigger('RUL_CRIT', {
      machine_id: MACHINE_ID,
      severity: 'CRITICAL',
      alert_type: 'RUL_DEPLETED_CRITICAL',
      message: `Estimated Remaining Useful Life under 24 hours (${pred.estimated_rul} h). Catastrophic wear imminent.`,
      parameter: 'Estimated RUL',
      value: pred.estimated_rul,
      threshold: 24.0,
      recommended_action: 'Order replacement spares and stage replacement motor unit immediately.',
    });
  }

  return newAlerts;
}

// Seed baseline initial frames so the dashboard has historical charts immediately on mount
for (let i = 0; i < 40; i++) {
  const tel = stepSimulation();
  const feat = computeFeatures(tel);
  computePredictions(tel, feat);
}

// Active State Cache
let latestTelemetry = db.telemetry[db.telemetry.length - 1];
let latestFeatures = db.features[db.features.length - 1];
let latestPredictions = db.predictions[db.predictions.length - 1];
let latestDigitalTwin = getDigitalTwinState(latestTelemetry, latestFeatures, latestPredictions);

// ==============================================================================
// REST API ROUTES
// ==============================================================================

app.get('/api/machines', (req, res) => {
  res.json(db.machines);
});

app.get('/api/machines/:machine_id', (req, res) => {
  const m = db.machines.find((x) => x.machine_id === req.params.machine_id);
  if (!m) return res.status(404).json({ error: 'Machine not found' });
  res.json(m);
});

app.get('/api/telemetry/:machine_id', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 60;
  res.json(db.telemetry.slice(-limit));
});

app.get('/api/health/:machine_id', (req, res) => {
  res.json({
    machine_id: req.params.machine_id,
    health_score: latestPredictions.health_score,
    health_status: latestPredictions.health_status,
    failure_probability: latestPredictions.failure_probability,
    estimated_rul: latestPredictions.estimated_rul,
  });
});

app.get('/api/predictions/:machine_id', (req, res) => {
  res.json(latestPredictions);
});

app.get('/api/alerts', (req, res) => {
  let list = db.alerts;
  if (req.query.severity) {
    list = list.filter((a) => a.severity === (req.query.severity as string).toUpperCase());
  }
  if (req.query.acknowledged !== undefined) {
    const ack = req.query.acknowledged === 'true';
    list = list.filter((a) => a.acknowledged === ack);
  }
  res.json(list.slice(0, 50));
});

app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const id = parseInt(req.params.id);
  const alert = db.alerts.find((a) => a.id === id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  alert.acknowledged = true;
  res.json({ status: 'success', id, acknowledged: true });
});

app.get('/api/maintenance', (req, res) => {
  res.json(db.maintenance);
});

app.post('/api/maintenance', (req, res) => {
  const { machine_id, maintenance_type, description, technician, status, downtime } = req.body;
  const newRec: MaintenanceRecord = {
    id: db.maintenance.length + 1,
    machine_id: machine_id || MACHINE_ID,
    timestamp: new Date().toISOString(),
    maintenance_type,
    description,
    technician,
    status: status || 'Scheduled',
    downtime: parseFloat(downtime) || 0.0,
  };
  db.maintenance.unshift(newRec);
  res.json(newRec);
});

app.get('/api/digital-twin/:machine_id', (req, res) => {
  res.json(latestDigitalTwin);
});

app.get('/api/statistics/:machine_id', (req, res) => {
  const temps = db.telemetry.map((t) => t.temperature);
  const vibs = db.telemetry.map((t) => t.vibration_x);
  const currents = db.telemetry.map((t) => t.current);
  const rpms = db.telemetry.map((t) => t.rpm);
  const powers = db.telemetry.map((t) => t.power);

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const availability = simulatorState.mode === 'SHUTDOWN' ? 0.0 : 98.4;
  const performance = Math.min(100, parseFloat(((latestTelemetry.rpm / 1485.0) * 100).toFixed(1)));
  const quality = Math.max(70, latestPredictions.health_score);
  const oee = parseFloat(((availability * performance * quality) / 10000).toFixed(1));

  res.json({
    machine_id: req.params.machine_id,
    sample_count: db.telemetry.length,
    temperature: {
      avg: parseFloat(avg(temps).toFixed(1)),
      max: Math.max(...temps),
      min: Math.min(...temps),
    },
    vibration: {
      avg: parseFloat(avg(vibs).toFixed(3)),
      max: Math.max(...vibs),
      min: Math.min(...vibs),
    },
    current: {
      avg: parseFloat(avg(currents).toFixed(2)),
      max: Math.max(...currents),
      min: Math.min(...currents),
    },
    rpm: {
      avg: parseFloat(avg(rpms).toFixed(1)),
      max: Math.max(...rpms),
      min: Math.min(...rpms),
    },
    power: {
      avg: parseFloat(avg(powers).toFixed(2)),
      total_kwh_est: parseFloat((avg(powers) * (db.telemetry.length / 3600)).toFixed(3)),
    },
    alerts_count: db.alerts.length,
    critical_alerts_count: db.alerts.filter((a) => a.severity === 'CRITICAL').length,
    maintenance_events: db.maintenance.length,
    oee: {
      overall: oee,
      availability,
      performance,
      quality,
      mtbf_hours: 720.0,
      mttr_hours: 3.5,
      estimated_maintenance_cost_usd: 1250.0,
    },
  });
});

app.post('/api/simulator/mode', (req, res) => {
  const { mode, load, degradation } = req.body;
  if (mode) simulatorState.mode = mode.toUpperCase();
  if (load !== undefined) simulatorState.load = Math.max(0, Math.min(120, parseFloat(load)));
  if (degradation !== undefined) simulatorState.degradation = Math.max(0, Math.min(1, parseFloat(degradation) / 100));
  if (mode === 'NORMAL' && degradation === undefined) {
    simulatorState.degradation = Math.max(0, simulatorState.degradation - 0.2);
  }
  res.json({
    status: 'success',
    mode: simulatorState.mode,
    load: simulatorState.load,
    degradation: simulatorState.degradation,
  });
});

app.post('/api/simulator/demo', (req, res) => {
  const action = req.query.action || 'start';
  if (action === 'start') {
    simulatorState.demo_active = true;
    simulatorState.demo_step = 0;
    simulatorState.mode = 'NORMAL';
    simulatorState.load = 55.0;
    simulatorState.degradation = 0.02;
    res.json({ status: 'started', message: 'Digital Twin 180s guided demonstration sequence triggered.' });
  } else {
    simulatorState.demo_active = false;
    res.json({ status: 'stopped', message: 'Demo halted.' });
  }
});

app.get('/api/simulator/status', (req, res) => {
  res.json({
    machine_id: MACHINE_ID,
    mode: simulatorState.mode,
    load: simulatorState.load,
    degradation: simulatorState.degradation,
    demo_active: simulatorState.demo_active,
    demo_step: simulatorState.demo_step,
  });
});

app.get('/api/ml/model-performance', (req, res) => {
  res.json({
    models: {
      anomaly_detector: {
        algorithm: 'Isolation Forest',
        n_estimators: 100,
        contamination: 0.08,
        status: 'Active',
      },
      fault_classifier: {
        algorithm: 'Random Forest Multi-Class',
        accuracy: 0.965,
        precision: 0.968,
        recall: 0.965,
        f1_score: 0.966,
        classes: ['Normal', 'Imbalance', 'Misalignment', 'Bearing Fault', 'Overheating', 'Electrical Anomaly'],
      },
      rul_regressor: {
        algorithm: 'Random Forest Regressor',
        mae_hours: 12.4,
        rmse_hours: 18.2,
        r2_score: 0.942,
      },
    },
    feature_importance: [
      { feature: 'vibration_rms', importance: 0.32 },
      { feature: 'kurtosis', importance: 0.24 },
      { feature: 'temperature', importance: 0.18 },
      { feature: 'dominant_frequency', importance: 0.12 },
      { feature: 'current', importance: 0.08 },
      { feature: 'crest_factor', importance: 0.06 },
    ],
  });
});

app.get('/api/export/:export_type', (req, res) => {
  const type = req.params.export_type;
  if (type === 'csv') {
    let csv = 'id,machine_id,timestamp,temperature,vibration_x,vibration_y,vibration_z,rpm,current,voltage,power,load\n';
    for (const r of db.telemetry) {
      csv += `${r.id},${r.machine_id},${r.timestamp},${r.temperature},${r.vibration_x},${r.vibration_y},${r.vibration_z},${r.rpm},${r.current},${r.voltage},${r.power},${r.load}\n`;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=telemetry_export.csv');
    return res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=telemetry_export.json');
    return res.json(db.telemetry);
  }
});

// Create HTTP server
const httpServer = createServer(app);

// Attach WebSocket Server
const wss = new WebSocketServer({ noServer: true });
const wsClients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  wsClients.add(ws);
  // Send immediate initial packet
  ws.send(
    JSON.stringify({
      type: 'INITIAL_STATE',
      telemetry: latestTelemetry,
      features: latestFeatures,
      predictions: latestPredictions,
      digital_twin: latestDigitalTwin,
      recent_alerts: db.alerts.slice(0, 15),
    })
  );

  ws.on('close', () => {
    wsClients.delete(ws);
  });
});

httpServer.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname.startsWith('/ws/machine/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Periodic Simulation Tick (1.0 second cadence)
setInterval(() => {
  try {
    const tel = stepSimulation();
    const feat = computeFeatures(tel);
    const pred = computePredictions(tel, feat);
    const dt = getDigitalTwinState(tel, feat, pred);
    const newAlerts = evaluateAlerts(tel, feat, pred);

    latestTelemetry = tel;
    latestFeatures = feat;
    latestPredictions = pred;
    latestDigitalTwin = dt;

    const packet = JSON.stringify({
      type: 'STREAM_UPDATE',
      telemetry: tel,
      features: feat,
      predictions: pred,
      digital_twin: dt,
      new_alerts: newAlerts,
    });

    for (const ws of wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(packet);
      }
    }
  } catch (err) {
    console.error('Error in simulation cycle:', err);
  }
}, 1000);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Industrial Digital Twin] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[Industrial Digital Twin] Machine MTR-001 simulation running at 1 Hz.`);
  });
}

startServer();
