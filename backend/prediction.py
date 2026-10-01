import math
from backend.ml.anomaly import AnomalyDetector
from backend.ml.classifier import FaultClassifier
from backend.ml.rul import RULPredictor

class PredictionEngine:
    """
    Unified AI/ML Pipeline:
    - Anomaly Detection (Isolation Forest)
    - Fault Classification (Random Forest Multi-Class)
    - Remaining Useful Life (RUL Regressor)
    - Machine Health Score (0-100 Multi-Criteria Index)
    """
    def __init__(self):
        self.anomaly_detector = AnomalyDetector()
        self.fault_classifier = FaultClassifier()
        self.rul_predictor = RULPredictor()

    def calculate_health_score(self, telemetry: dict, features: dict, anomaly_score: float, failure_prob: float) -> float:
        """
        Combines sensor severity, operational deviations, anomaly score,
        and ML fault probability into a comprehensive 0-100 industrial health score.
        """
        v_rms = features.get("vibration_rms", 0.45)
        temp = telemetry.get("temperature", 52.0)
        curr = telemetry.get("current", 7.5)
        rpm_dev = abs(features.get("rpm_deviation", 0.0))
        kurt = features.get("kurtosis", 3.0)

        # 1. Vibration Penalty (Base threshold 0.8g warning, 2.0g critical)
        if v_rms <= 0.8:
            vib_penalty = (v_rms / 0.8) * 5.0
        elif v_rms <= 2.0:
            vib_penalty = 5.0 + ((v_rms - 0.8) / 1.2) * 25.0
        else:
            vib_penalty = 30.0 + min(30.0, (v_rms - 2.0) * 20.0)

        # 2. Temperature Penalty (Threshold 70°C warning, 90°C critical)
        if temp <= 65.0:
            temp_penalty = 0.0
        elif temp <= 80.0:
            temp_penalty = ((temp - 65.0) / 15.0) * 15.0
        else:
            temp_penalty = 15.0 + min(25.0, (temp - 80.0) * 1.5)

        # 3. Current & RPM Deviation Penalty
        curr_penalty = min(10.0, max(0.0, (curr - 10.0) * 2.5))
        rpm_penalty = min(10.0, (rpm_dev / 50.0) * 10.0)

        # 4. Kurtosis & Impulsiveness Penalty
        kurt_penalty = min(15.0, max(0.0, (kurt - 3.5) * 3.5))

        # 5. ML Model Penalties (Anomaly Score & Fault Classification Probability)
        ml_anomaly_penalty = anomaly_score * 20.0
        ml_fault_penalty = failure_prob * 25.0

        total_penalty = vib_penalty + temp_penalty + curr_penalty + rpm_penalty + kurt_penalty + ml_anomaly_penalty + ml_fault_penalty
        health = 100.0 - total_penalty

        return max(0.0, min(100.0, round(health, 1)))

    def predict(self, telemetry: dict, features: dict) -> dict:
        # 1. Anomaly Detection
        anomaly_res = self.anomaly_detector.predict(features, telemetry)
        anomaly_score = anomaly_res["anomaly_score"]

        # 2. Fault Classification
        fault_res = self.fault_classifier.predict(features, telemetry)
        failure_prob = fault_res["failure_probability"]

        # 3. Health Score (0 - 100)
        health_score = self.calculate_health_score(telemetry, features, anomaly_score, failure_prob)

        # 4. RUL Prediction
        rul_res = self.rul_predictor.predict(features, telemetry)

        # Derive overall operating health category
        if health_score >= 90.0:
            health_status = "Excellent"
        elif health_score >= 75.0:
            health_status = "Good"
        elif health_score >= 60.0:
            health_status = "Warning"
        elif health_score >= 40.0:
            health_status = "Poor"
        else:
            health_status = "Critical"

        return {
            "health_score": health_score,
            "health_status": health_status,
            "anomaly_score": anomaly_score,
            "anomaly_status": anomaly_res["status"],
            "predicted_fault": fault_res["predicted_fault"],
            "confidence": fault_res["confidence"],
            "failure_probability": failure_prob,
            "probabilities": fault_res["probabilities"],
            "estimated_rul": rul_res["estimated_rul_hours"],
            "health_decline_rate": rul_res["health_decline_rate"]
        }
