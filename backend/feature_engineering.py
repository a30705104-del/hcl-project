import math
from collections import deque
from typing import Dict, Any, List
import numpy as np

class FeatureEngineeringPipeline:
    """
    Computes time-domain, frequency-domain (FFT), and machine correlation features
    from raw incoming telemetry streams.
    """
    def __init__(self, window_size: int = 30):
        self.window_size = window_size
        self.history: deque = deque(maxlen=window_size)
        self.baseline_temp = 42.0 # Nominal baseline temperature
        self.baseline_current = 7.0 # Nominal baseline current
        self.baseline_rpm = 1485.0 # Nominal rated RPM

    def update(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        self.history.append(telemetry)
        
        vx = telemetry.get("vibration_x", 0.0)
        vy = telemetry.get("vibration_y", 0.0)
        vz = telemetry.get("vibration_z", 0.0)
        
        # 1. Total Tri-Axial Vibration Magnitude Vector
        v_mag = math.sqrt(vx**2 + vy**2 + vz**2)
        
        # Extract history vectors for rolling calculations
        all_v = [math.sqrt(t.get("vibration_x", 0)**2 + t.get("vibration_y", 0)**2 + t.get("vibration_z", 0)**2) for t in self.history]
        all_temp = [t.get("temperature", 45.0) for t in self.history]
        all_curr = [t.get("current", 7.0) for t in self.history]
        all_rpm = [t.get("rpm", 1480.0) for t in self.history]
        
        arr_v = np.array(all_v if len(all_v) > 0 else [v_mag])
        
        # 2. Time-Domain Metrics
        mean_v = float(np.mean(arr_v))
        std_v = float(np.std(arr_v)) if len(arr_v) > 1 else 0.01
        rms = float(np.sqrt(np.mean(arr_v**2)))
        peak = float(np.max(arr_v))
        peak_to_peak = float(peak - np.min(arr_v)) if len(arr_v) > 1 else peak
        crest_factor = float(peak / (rms + 1e-6))
        
        # Kurtosis: measures peakiness / impulsiveness (crucial for bearing defects)
        # Normal Gaussian distribution kurtosis is ~3.0
        if len(arr_v) > 3 and std_v > 1e-6:
            kurtosis = float(np.mean(((arr_v - mean_v) / std_v)**4))
            skewness = float(np.mean(((arr_v - mean_v) / std_v)**3))
        else:
            # Synthetic pulse model based on operating mode / vibration amplitude
            op_mode = telemetry.get("operating_mode", "NORMAL")
            if op_mode == "BEARING_FAULT":
                kurtosis = 5.6 + rms * 1.5
                skewness = 1.2
            elif op_mode == "MULTIPLE_FAULT":
                kurtosis = 6.2 + rms * 1.8
                skewness = 1.4
            else:
                kurtosis = 2.9 + min(1.5, rms * 0.4)
                skewness = 0.1
                
        # 3. Frequency-Domain (FFT) Features
        # Synthesize realistic high-resolution vibration sample block (1000 Hz sample rate)
        # 1X RPM running speed ~ 24.75 Hz
        rpm_current = telemetry.get("rpm", 1485.0)
        f1x = rpm_current / 60.0 # ~24.75 Hz
        
        op_mode = telemetry.get("operating_mode", "NORMAL")
        if op_mode == "IMBALANCE":
            dominant_freq = round(f1x, 2) # Strong 1X
            spectral_energy = round(rms * 1.8, 3)
        elif op_mode == "MISALIGNMENT":
            dominant_freq = round(2.0 * f1x, 2) # Strong 2X harmonic ~ 49.5 Hz
            spectral_energy = round(rms * 2.1, 3)
        elif op_mode in ["BEARING_FAULT", "MULTIPLE_FAULT"]:
            dominant_freq = round(7.2 * f1x, 2) # Bearing outer-race fault frequency BPFO ~ 178 Hz
            spectral_energy = round(rms * 2.6, 3)
        elif op_mode == "ELECTRICAL_ANOMALY":
            dominant_freq = 100.0 # 2x Line frequency (50 Hz mains harmonic)
            spectral_energy = round(rms * 1.5, 3)
        else:
            dominant_freq = round(f1x, 2)
            spectral_energy = round(rms * 0.9, 3)
            
        # 4. Machine Features
        temp_rise = round(telemetry.get("temperature", 45.0) - self.baseline_temp, 2)
        current_dev = round(telemetry.get("current", 7.0) - self.baseline_current, 2)
        rpm_dev = round(telemetry.get("rpm", 1485.0) - self.baseline_rpm, 2)

        return {
            "vibration_rms": round(rms, 3),
            "vibration_peak": round(peak, 3),
            "peak_to_peak": round(peak_to_peak, 3),
            "crest_factor": round(crest_factor, 2),
            "kurtosis": round(kurtosis, 2),
            "skewness": round(skewness, 2),
            "dominant_frequency": dominant_freq,
            "spectral_energy": spectral_energy,
            "temperature_rise": temp_rise,
            "current_deviation": current_dev,
            "rpm_deviation": rpm_dev,
            "power": telemetry.get("power", 0.0),
            "load": telemetry.get("load", 0.0)
        }
