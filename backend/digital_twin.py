import datetime
from typing import Dict, Any

class DigitalTwinEngine:
    """
    Virtual digital twin representation of 'Industrial Motor Unit MTR-001'.
    Maintains component-level operational states:
      - Electric Motor
      - Coupling
      - Shaft
      - Bearing DE (Drive End)
      - Bearing NDE (Non-Drive End)
      - Mechanical Load
    """
    def __init__(self, machine_id: str = "MTR-001"):
        self.machine_id = machine_id
        self.machine_name = "Industrial Motor Unit"
        self.last_update = datetime.datetime.utcnow().isoformat() + "Z"
        self.status = "RUNNING" # RUNNING, WARNING, CRITICAL, MAINTENANCE, OFFLINE
        self.operating_state = "Normal" # Normal, Starting, Loaded, Overloaded, Fault Developing, Fault, Shutdown
        self.health = 100.0
        self.temperature = 52.0
        self.vibration = 0.45
        self.rpm = 1485.0
        self.current = 7.5
        self.voltage = 415.0
        self.power = 4.8
        self.load = 65.0
        self.fault = "None"
        self.anomaly_score = 0.08
        self.failure_probability = 0.05
        self.estimated_rul_hours = 500.0

        # Component breakdown
        self.components = {
            "motor": {
                "name": "3-Phase Electric Motor (5.5 kW)",
                "status": "HEALTHY",
                "temperature": 52.0,
                "current": 7.5,
                "voltage": 415.0,
                "power": 4.8,
                "condition": "Normal",
                "health": 100.0
            },
            "coupling": {
                "name": "Flexible Jaw Coupling",
                "status": "HEALTHY",
                "axial_vibration": 0.25,
                "radial_vibration": 0.35,
                "alignment_offset_mm": 0.02,
                "condition": "Normal",
                "health": 100.0
            },
            "shaft": {
                "name": "High-Tensile Steel Rotor Shaft",
                "status": "HEALTHY",
                "rpm": 1485.0,
                "eccentricity_um": 5.0,
                "condition": "Normal",
                "health": 100.0
            },
            "bearing_de": {
                "name": "Drive End (DE) Bearing - 6308-2Z",
                "status": "HEALTHY",
                "temperature": 54.0,
                "vibration_g": 0.42,
                "kurtosis": 2.9,
                "crest_factor": 2.5,
                "condition": "Normal",
                "health": 100.0
            },
            "bearing_nde": {
                "name": "Non-Drive End (NDE) Bearing - 6207-2Z",
                "status": "HEALTHY",
                "temperature": 48.0,
                "vibration_g": 0.32,
                "kurtosis": 2.8,
                "crest_factor": 2.4,
                "condition": "Normal",
                "health": 100.0
            },
            "load": {
                "name": "Centrifugal Industrial Pump Impeller",
                "status": "HEALTHY",
                "load_percent": 65.0,
                "flow_resistance": "Normal",
                "condition": "Normal",
                "health": 100.0
            }
        }

    def update(self, telemetry: Dict[str, Any], features: Dict[str, Any], predictions: Dict[str, Any]) -> Dict[str, Any]:
        self.last_update = telemetry.get("timestamp", datetime.datetime.utcnow().isoformat() + "Z")
        self.temperature = telemetry.get("temperature", self.temperature)
        self.vibration = features.get("vibration_rms", self.vibration)
        self.rpm = telemetry.get("rpm", self.rpm)
        self.current = telemetry.get("current", self.current)
        self.voltage = telemetry.get("voltage", self.voltage)
        self.power = telemetry.get("power", self.power)
        self.load = telemetry.get("load", self.load)
        
        self.health = predictions.get("health_score", 100.0)
        self.fault = predictions.get("predicted_fault", "None")
        self.anomaly_score = predictions.get("anomaly_score", 0.05)
        self.failure_probability = predictions.get("failure_probability", 0.05)
        self.estimated_rul_hours = predictions.get("estimated_rul", 500.0)

        # Operating state classification
        op_mode = telemetry.get("operating_mode", "NORMAL")
        if op_mode == "SHUTDOWN" or self.rpm < 100.0:
            self.status = "OFFLINE"
            self.operating_state = "Shutdown"
        elif self.health < 40.0 or self.failure_probability > 0.70:
            self.status = "CRITICAL"
            self.operating_state = "Fault"
        elif self.health < 75.0 or self.anomaly_score > 0.60:
            self.status = "WARNING"
            self.operating_state = "Fault Developing"
        elif self.load > 90.0:
            self.status = "RUNNING"
            self.operating_state = "Overloaded"
        else:
            self.status = "RUNNING"
            self.operating_state = "Normal"

        # Update Component States dynamically
        kurt = features.get("kurtosis", 3.0)
        cf = features.get("crest_factor", 2.5)
        v_rms = features.get("vibration_rms", 0.45)
        vz = telemetry.get("vibration_z", 0.3)

        # Bearing DE (Most sensitive to radial vibration and spalling)
        b_de_cond = "Normal"
        b_de_status = "HEALTHY"
        b_de_health = max(10.0, 100.0 - (kurt - 3.0) * 15.0 - (v_rms - 0.5) * 20.0)
        if "Bearing" in self.fault or kurt > 4.5:
            b_de_cond = "Degrading / Defect"
            b_de_status = "CRITICAL" if kurt > 5.5 or self.health < 50 else "WARNING"
        self.components["bearing_de"] = {
            "name": "Drive End (DE) Bearing - 6308-2Z",
            "status": b_de_status,
            "temperature": round(self.temperature + 4.2, 1),
            "vibration_g": round(v_rms * 1.15, 3),
            "kurtosis": round(kurt, 2),
            "crest_factor": round(cf, 2),
            "condition": b_de_cond,
            "health": max(5.0, min(100.0, round(b_de_health, 1)))
        }

        # Coupling (Sensitive to misalignment and axial Z vibration)
        c_status = "HEALTHY"
        c_cond = "Normal"
        if "Misalignment" in self.fault or vz > 1.2:
            c_status = "WARNING" if vz < 2.0 else "CRITICAL"
            c_cond = "Angular Misalignment"
        self.components["coupling"] = {
            "name": "Flexible Jaw Coupling",
            "status": c_status,
            "axial_vibration": round(vz, 3),
            "radial_vibration": round(self.vibration, 3),
            "alignment_offset_mm": round(0.02 + (vz * 0.1), 3),
            "condition": c_cond,
            "health": max(10.0, min(100.0, round(100.0 - vz * 30.0, 1)))
        }

        # Shaft (Sensitive to imbalance & eccentricity)
        s_status = "HEALTHY"
        s_cond = "Normal"
        if "Imbalance" in self.fault:
            s_status = "WARNING"
            s_cond = "Rotor Dynamic Unbalance"
        self.components["shaft"] = {
            "name": "High-Tensile Steel Rotor Shaft",
            "status": s_status,
            "rpm": round(self.rpm, 1),
            "eccentricity_um": round(5.0 + self.vibration * 12.0, 1),
            "condition": s_cond,
            "health": max(15.0, min(100.0, round(100.0 - self.vibration * 25.0, 1)))
        }

        # Motor Housing & Winding
        m_status = "HEALTHY"
        m_cond = "Normal"
        if self.temperature > 85.0 or "Overheating" in self.fault:
            m_status = "CRITICAL" if self.temperature > 90.0 else "WARNING"
            m_cond = "Thermal Overheat"
        elif "Electrical" in self.fault:
            m_status = "WARNING"
            m_cond = "Phase Ripple / Current Distortion"
        self.components["motor"] = {
            "name": "3-Phase Electric Motor (5.5 kW)",
            "status": m_status,
            "temperature": round(self.temperature, 1),
            "current": round(self.current, 2),
            "voltage": round(self.voltage, 1),
            "power": round(self.power, 2),
            "condition": m_cond,
            "health": max(10.0, min(100.0, round(100.0 - max(0.0, self.temperature - 60.0) * 1.8, 1)))
        }

        return self.get_state()

    def get_state(self) -> Dict[str, Any]:
        return {
            "machine_id": self.machine_id,
            "machine_name": self.machine_name,
            "last_update": self.last_update,
            "status": self.status,
            "operating_state": self.operating_state,
            "health": round(self.health, 1),
            "temperature": round(self.temperature, 1),
            "vibration": round(self.vibration, 3),
            "rpm": round(self.rpm, 1),
            "current": round(self.current, 2),
            "voltage": round(self.voltage, 1),
            "power": round(self.power, 2),
            "load": round(self.load, 1),
            "fault": self.fault,
            "anomaly_score": round(self.anomaly_score, 3),
            "failure_probability": round(self.failure_probability, 2),
            "estimated_rul_hours": round(self.estimated_rul_hours, 1),
            "components": self.components
        }
