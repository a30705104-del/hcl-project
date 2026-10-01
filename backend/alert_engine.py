import time
import datetime
from typing import List, Dict, Any, Optional

class AlertEngine:
    """
    Evaluates real-time threshold breaches, ML risk criteria,
    and dispatches debounced industrial alerts with actionable remediation advice.
    """
    def __init__(self, cooldown_seconds: int = 45):
        self.cooldown_seconds = cooldown_seconds
        # Keep track of last triggered timestamp per alert_type
        self.last_triggered: Dict[str, float] = {}
        self.active_alerts: List[Dict[str, Any]] = []

    def evaluate(self, telemetry: Dict[str, Any], features: Dict[str, Any], predictions: Dict[str, Any]) -> List[Dict[str, Any]]:
        current_time = time.time()
        new_alerts = []
        machine_id = telemetry.get("machine_id", "MTR-001")
        now_iso = datetime.datetime.utcnow().isoformat() + "Z"

        temp = telemetry.get("temperature", 50.0)
        v_rms = features.get("vibration_rms", 0.45)
        health = predictions.get("health_score", 100.0)
        anomaly = predictions.get("anomaly_score", 0.05)
        failure_prob = predictions.get("failure_probability", 0.05)
        rul = predictions.get("estimated_rul", 500.0)
        fault = predictions.get("predicted_fault", "Normal")

        def can_trigger(alert_key: str) -> bool:
            last = self.last_triggered.get(alert_key, 0)
            if (current_time - last) > self.cooldown_seconds:
                self.last_triggered[alert_key] = current_time
                return True
            return False

        # 1. Temperature Rules
        if temp > 90.0:
            if can_trigger("TEMP_CRITICAL"):
                new_alerts.append({
                    "machine_id": machine_id,
                    "timestamp": now_iso,
                    "severity": "CRITICAL",
                    "alert_type": "MOTOR_OVERHEAT_CRITICAL",
                    "message": f"Critical motor winding temperature: {temp}°C exceeds safety ceiling 90.0°C.",
                    "parameter": "Temperature",
                    "value": round(temp, 1),
                    "threshold": 90.0,
                    "recommended_action": "Emergency shutdown imminent. Verify coolant/cooling fan and reduce load immediately.",
                    "acknowledged": False
                })
        elif temp > 75.0:
            if can_trigger("TEMP_WARNING"):
                new_alerts.append({
                    "machine_id": machine_id,
                    "timestamp": now_iso,
                    "severity": "WARNING",
                    "alert_type": "MOTOR_TEMP_HIGH",
                    "message": f"Elevated temperature detected: {temp}°C (Warning threshold: 75.0°C).",
                    "parameter": "Temperature",
                    "value": round(temp, 1),
                    "threshold": 75.0,
                    "recommended_action": "Inspect ventilation ducting and verify ambient thermal dissipation.",
                    "acknowledged": False
                })

        # 2. Vibration RMS Rules
        if v_rms > 2.0:
            if can_trigger("VIB_CRITICAL"):
                new_alerts.append({
                    "machine_id": machine_id,
                    "timestamp": now_iso,
                    "severity": "CRITICAL",
                    "alert_type": "VIBRATION_CRITICAL",
                    "message": f"Excessive vibration severity: {v_rms} g exceeds ISO 10816 Zone D critical trip level (2.0 g).",
                    "parameter": "Vibration RMS",
                    "value": round(v_rms, 3),
                    "threshold": 2.0,
                    "recommended_action": "Halt machine. Inspect bearing races, shaft alignment, and mechanical anchor bolts.",
                    "acknowledged": False
                })
        elif v_rms > 1.2:
            if can_trigger("VIB_WARNING"):
                new_alerts.append({
                    "machine_id": machine_id,
                    "timestamp": now_iso,
                    "severity": "WARNING",
                    "alert_type": "VIBRATION_HIGH",
                    "message": f"Vibration RMS of {v_rms} g exceeds normal baseline (1.2 g). Potential {fault}.",
                    "parameter": "Vibration RMS",
                    "value": round(v_rms, 3),
                    "threshold": 1.2,
                    "recommended_action": f"Schedule vibration spectral diagnosis for {fault}. Check lubrication.",
                    "acknowledged": False
                })

        # 3. Health Score Rules
        if health < 40.0:
            if can_trigger("HEALTH_CRITICAL"):
                new_alerts.append({
                    "machine_id": machine_id,
                    "timestamp": now_iso,
                    "severity": "CRITICAL",
                    "alert_type": "EQUIPMENT_HEALTH_CRITICAL",
                    "message": f"Composite Health Score collapsed to {health}% (Critical threshold: 40%). High failure risk.",
                    "parameter": "Health Score",
                    "value": round(health, 1),
                    "threshold": 40.0,
                    "recommended_action": "Immediate maintenance dispatch required. Switch to standby auxiliary unit.",
                    "acknowledged": False
                })
        elif health < 70.0:
            if can_trigger("HEALTH_WARNING"):
                new_alerts.append({
                    "machine_id": machine_id,
                    "timestamp": now_iso,
                    "severity": "WARNING",
                    "alert_type": "EQUIPMENT_HEALTH_DEGRADED",
                    "message": f"Equipment Health dropped to {health}%. Degradation trend accelerating.",
                    "parameter": "Health Score",
                    "value": round(health, 1),
                    "threshold": 70.0,
                    "recommended_action": "Plan preventive overhaul during upcoming scheduled maintenance window.",
                    "acknowledged": False
                })

        # 4. Anomaly & Failure Probability Rules
        if failure_prob > 0.70:
            if can_trigger("FAILURE_PROB_CRITICAL"):
                new_alerts.append({
                    "machine_id": machine_id,
                    "timestamp": now_iso,
                    "severity": "CRITICAL",
                    "alert_type": "FAILURE_PROBABILITY_HIGH",
                    "message": f"ML Model predicts {fault} with failure probability of {int(failure_prob * 100)}%.",
                    "parameter": "Failure Probability",
                    "value": round(failure_prob, 2),
                    "threshold": 0.70,
                    "recommended_action": f"Initiate work order for {fault} remediation.",
                    "acknowledged": False
                })
        elif anomaly > 0.70:
            if can_trigger("ANOMALY_WARNING"):
                new_alerts.append({
                    "machine_id": machine_id,
                    "timestamp": now_iso,
                    "severity": "WARNING",
                    "alert_type": "ANOMALY_DETECTED",
                    "message": f"Statistical multi-sensor anomaly detected by Isolation Forest (Anomaly Score: {anomaly}).",
                    "parameter": "Anomaly Score",
                    "value": round(anomaly, 3),
                    "threshold": 0.70,
                    "recommended_action": "Cross-reference recent process speed and load fluctuations.",
                    "acknowledged": False
                })

        # 5. Remaining Useful Life (RUL) Rules
        if rul < 24.0:
            if can_trigger("RUL_CRITICAL"):
                new_alerts.append({
                    "machine_id": machine_id,
                    "timestamp": now_iso,
                    "severity": "CRITICAL",
                    "alert_type": "RUL_DEPLETED_CRITICAL",
                    "message": f"Remaining Useful Life under 24 hours ({rul} h remaining). Catastrophic wear imminent.",
                    "parameter": "Estimated RUL",
                    "value": round(rul, 1),
                    "threshold": 24.0,
                    "recommended_action": "Order replacement parts and prepare immediate teardown window.",
                    "acknowledged": False
                })
        elif rul < 100.0:
            if can_trigger("RUL_WARNING"):
                new_alerts.append({
                    "machine_id": machine_id,
                    "timestamp": now_iso,
                    "severity": "WARNING",
                    "alert_type": "RUL_LOW",
                    "message": f"Estimated Remaining Useful Life below 100 hours ({rul} h).",
                    "parameter": "Estimated RUL",
                    "value": round(rul, 1),
                    "threshold": 100.0,
                    "recommended_action": "Stage spares in inventory and notify mechanical maintenance lead.",
                    "acknowledged": False
                })

        return new_alerts
