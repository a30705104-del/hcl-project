from enum import Enum

class OperatingMode(str, Enum):
    NORMAL = "NORMAL"
    OVERLOAD = "OVERLOAD"
    IMBALANCE = "IMBALANCE"
    MISALIGNMENT = "MISALIGNMENT"
    BEARING_FAULT = "BEARING_FAULT"
    OVERHEATING = "OVERHEATING"
    ELECTRICAL_ANOMALY = "ELECTRICAL_ANOMALY"
    MULTIPLE_FAULT = "MULTIPLE_FAULT"
    SHUTDOWN = "SHUTDOWN"

FAULT_PROFILES = {
    OperatingMode.NORMAL: {
        "description": "Baseline nominal operation with typical industrial tolerances.",
        "temp_bias": 0.0,
        "vib_mult": 1.0,
        "vib_z_mult": 1.0,
        "kurtosis_bias": 3.0,
        "crest_factor_bias": 2.5,
        "current_mult": 1.0,
        "dominant_freq_harmonic": 1.0, # 1X running frequency
    },
    OperatingMode.OVERLOAD: {
        "description": "Heavy mechanical load exceeding rated motor capacity.",
        "temp_bias": 18.0,
        "vib_mult": 1.4,
        "vib_z_mult": 1.2,
        "kurtosis_bias": 3.2,
        "crest_factor_bias": 2.8,
        "current_mult": 1.5,
        "dominant_freq_harmonic": 1.0,
    },
    OperatingMode.IMBALANCE: {
        "description": "Mass center eccentricity on rotor causing high 1X radial vibration.",
        "temp_bias": 4.0,
        "vib_mult": 2.8,
        "vib_z_mult": 1.2,
        "kurtosis_bias": 3.4,
        "crest_factor_bias": 3.2,
        "current_mult": 1.1,
        "dominant_freq_harmonic": 1.0, # Strong 1X peak
    },
    OperatingMode.MISALIGNMENT: {
        "description": "Angular or parallel coupling offset causing 2X harmonics and axial vibration.",
        "temp_bias": 8.0,
        "vib_mult": 2.2,
        "vib_z_mult": 3.2, # High axial (Z) vibration
        "kurtosis_bias": 3.6,
        "crest_factor_bias": 3.4,
        "current_mult": 1.15,
        "dominant_freq_harmonic": 2.0, # 2X running frequency
    },
    OperatingMode.BEARING_FAULT: {
        "description": "Outer/Inner race spalling generating repetitive micro-impacts and high kurtosis.",
        "temp_bias": 12.0,
        "vib_mult": 2.6,
        "vib_z_mult": 1.8,
        "kurtosis_bias": 5.8, # Significant spike in impulsiveness
        "crest_factor_bias": 4.5,
        "current_mult": 1.1,
        "dominant_freq_harmonic": 7.2, # BPFO / bearing defect frequency
    },
    OperatingMode.OVERHEATING: {
        "description": "Ventilation blockage or winding degradation causing thermal runaway.",
        "temp_bias": 35.0,
        "vib_mult": 1.3,
        "vib_z_mult": 1.1,
        "kurtosis_bias": 3.1,
        "crest_factor_bias": 2.6,
        "current_mult": 1.3,
        "dominant_freq_harmonic": 1.0,
    },
    OperatingMode.ELECTRICAL_ANOMALY: {
        "description": "Phase unbalance or voltage sag causing current spikes and torque ripple.",
        "temp_bias": 10.0,
        "vib_mult": 1.6,
        "vib_z_mult": 1.3,
        "kurtosis_bias": 3.5,
        "crest_factor_bias": 3.0,
        "current_mult": 1.45,
        "dominant_freq_harmonic": 2.0, # 100/120 Hz electrical ripple
    },
    OperatingMode.MULTIPLE_FAULT: {
        "description": "Combined bearing spalling and shaft misalignment compound failure.",
        "temp_bias": 24.0,
        "vib_mult": 3.4,
        "vib_z_mult": 3.0,
        "kurtosis_bias": 6.2,
        "crest_factor_bias": 4.8,
        "current_mult": 1.35,
        "dominant_freq_harmonic": 7.2,
    },
    OperatingMode.SHUTDOWN: {
        "description": "Machine offline / de-energized.",
        "temp_bias": -20.0,
        "vib_mult": 0.05,
        "vib_z_mult": 0.05,
        "kurtosis_bias": 3.0,
        "crest_factor_bias": 1.5,
        "current_mult": 0.0,
        "dominant_freq_harmonic": 0.0,
    },
}
