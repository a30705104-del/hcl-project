export interface Telemetry {
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

export interface Features {
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

export interface Predictions {
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

export interface ComponentState {
  id: string;
  name: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  health: number;
  condition: string;
  temperature?: number;
  vibration_g?: number;
  current?: number;
  voltage?: number;
  power?: number;
  axial_vibration?: number;
  radial_vibration?: number;
  alignment_offset_mm?: number;
  rpm?: number;
  eccentricity_um?: number;
  kurtosis?: number;
  crest_factor?: number;
  load_percent?: number;
  flow_resistance?: string;
}

export interface DigitalTwinState {
  machine_id: string;
  machine_name: string;
  last_update: string;
  status: 'RUNNING' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE' | 'OFFLINE';
  operating_state: string;
  health: number;
  temperature: number;
  vibration: number;
  rpm: number;
  current: number;
  voltage: number;
  power: number;
  load: number;
  fault: string;
  anomaly_score: number;
  failure_probability: number;
  estimated_rul_hours: number;
  components: Record<string, ComponentState>;
}

export interface Alert {
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

export interface MaintenanceRecord {
  id: number;
  machine_id: string;
  timestamp: string;
  maintenance_type: string;
  description: string;
  technician: string;
  status: string;
  downtime: number;
}

export interface Statistics {
  machine_id: string;
  sample_count: number;
  temperature: { avg: number; max: number; min: number };
  vibration: { avg: number; max: number; min: number };
  current: { avg: number; max: number; min: number };
  rpm: { avg: number; max: number; min: number };
  power: { avg: number; total_kwh_est: number };
  alerts_count: number;
  critical_alerts_count: number;
  maintenance_events: number;
  oee: {
    overall: number;
    availability: number;
    performance: number;
    quality: number;
    mtbf_hours: number;
    mttr_hours: number;
    estimated_maintenance_cost_usd: number;
  };
}
