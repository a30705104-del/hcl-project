import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "anomaly_model.pkl")

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.load_or_init()

    def load_or_init(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                return
            except Exception:
                pass
        
        # Self-initialize Isolation Forest with realistic baseline prior
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.08,
            random_state=42
        )
        # Train on synthetic nominal operational distribution
        np.random.seed(42)
        # Features: [vibration_rms, temperature, current, rpm, power, kurtosis, crest_factor]
        n_samples = 1500
        normal_data = np.column_stack([
            np.random.normal(0.45, 0.08, n_samples),  # vib rms
            np.random.normal(55.0, 4.0, n_samples),   # temp
            np.random.normal(7.5, 0.8, n_samples),    # current
            np.random.normal(1485.0, 5.0, n_samples), # rpm
            np.random.normal(4.8, 0.6, n_samples),    # power
            np.random.normal(3.0, 0.2, n_samples),    # kurtosis
            np.random.normal(2.5, 0.2, n_samples),    # crest factor
        ])
        self.model.fit(normal_data)

    def predict(self, features: dict, telemetry: dict) -> dict:
        v_rms = features.get("vibration_rms", 0.45)
        temp = telemetry.get("temperature", 55.0)
        curr = telemetry.get("current", 7.5)
        rpm = telemetry.get("rpm", 1485.0)
        pwr = telemetry.get("power", 4.8)
        kurt = features.get("kurtosis", 3.0)
        cf = features.get("crest_factor", 2.5)

        X = np.array([[v_rms, temp, curr, rpm, pwr, kurt, cf]])
        
        # Decision function: lower values mean more anomalous
        # Normalize into a clean 0.0 - 1.0 anomaly score
        raw_score = self.model.decision_function(X)[0]
        # raw_score typically spans -0.3 to +0.2; transform via sigmoid/logistic
        anomaly_score = float(1.0 / (1.0 + np.exp(raw_score * 8.0)))
        anomaly_score = max(0.01, min(0.99, anomaly_score))

        is_anomaly = anomaly_score > 0.60
        return {
            "anomaly_score": round(anomaly_score, 3),
            "status": "ANOMALY" if is_anomaly else "NORMAL"
        }
