import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "fault_classifier.pkl")

FAULT_CLASSES = [
    "Normal",
    "Imbalance",
    "Misalignment",
    "Bearing Fault",
    "Overheating",
    "Electrical Anomaly"
]

class FaultClassifier:
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
        
        # Self-initialize with pre-trained multi-class training data
        self.model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
        X_train, y_train = self._generate_synthetic_training_data()
        self.model.fit(X_train, y_train)

    def _generate_synthetic_training_data(self):
        np.random.seed(42)
        samples_per_class = 300
        X_list = []
        y_list = []

        # Features: [vibration_rms, vibration_peak, crest_factor, kurtosis, dominant_freq, temp, current, rpm]
        for class_idx in range(6):
            for _ in range(samples_per_class):
                if class_idx == 0: # Normal
                    v_rms = np.random.normal(0.45, 0.08)
                    v_peak = v_rms * np.random.normal(1.8, 0.1)
                    cf = v_peak / v_rms
                    kurt = np.random.normal(2.9, 0.2)
                    dom_f = np.random.normal(24.8, 0.2)
                    temp = np.random.normal(55.0, 4.0)
                    curr = np.random.normal(7.5, 0.8)
                    rpm = np.random.normal(1485.0, 5.0)
                elif class_idx == 1: # Imbalance (High 1X vibration, normal kurtosis)
                    v_rms = np.random.normal(1.8, 0.3)
                    v_peak = v_rms * np.random.normal(2.0, 0.1)
                    cf = v_peak / v_rms
                    kurt = np.random.normal(3.2, 0.3)
                    dom_f = np.random.normal(24.8, 0.3)
                    temp = np.random.normal(58.0, 3.0)
                    curr = np.random.normal(8.0, 0.7)
                    rpm = np.random.normal(1480.0, 6.0)
                elif class_idx == 2: # Misalignment (High 2X harmonic ~49.6Hz, elevated axial)
                    v_rms = np.random.normal(1.6, 0.25)
                    v_peak = v_rms * np.random.normal(2.2, 0.15)
                    cf = v_peak / v_rms
                    kurt = np.random.normal(3.5, 0.4)
                    dom_f = np.random.normal(49.6, 0.4)
                    temp = np.random.normal(63.0, 4.0)
                    curr = np.random.normal(8.4, 0.8)
                    rpm = np.random.normal(1475.0, 6.0)
                elif class_idx == 3: # Bearing Fault (High kurtosis > 4.5, high crest factor, BPFO ~178Hz)
                    v_rms = np.random.normal(1.9, 0.4)
                    v_peak = v_rms * np.random.normal(3.2, 0.3)
                    cf = v_peak / v_rms
                    kurt = np.random.normal(5.8, 0.8)
                    dom_f = np.random.normal(178.0, 5.0)
                    temp = np.random.normal(68.0, 5.0)
                    curr = np.random.normal(8.2, 0.9)
                    rpm = np.random.normal(1480.0, 5.0)
                elif class_idx == 4: # Overheating (High temp > 80°C, normal/moderate vibration)
                    v_rms = np.random.normal(0.65, 0.12)
                    v_peak = v_rms * np.random.normal(1.9, 0.15)
                    cf = v_peak / v_rms
                    kurt = np.random.normal(3.1, 0.25)
                    dom_f = np.random.normal(24.8, 0.3)
                    temp = np.random.normal(88.0, 6.0)
                    curr = np.random.normal(9.6, 1.1)
                    rpm = np.random.normal(1470.0, 7.0)
                else: # Electrical Anomaly (Current distortion, 100Hz ripple, voltage unbalance)
                    v_rms = np.random.normal(0.85, 0.15)
                    v_peak = v_rms * np.random.normal(2.3, 0.2)
                    cf = v_peak / v_rms
                    kurt = np.random.normal(3.4, 0.3)
                    dom_f = np.random.normal(100.0, 2.0)
                    temp = np.random.normal(64.0, 4.0)
                    curr = np.random.normal(11.2, 1.5)
                    rpm = np.random.normal(1465.0, 8.0)

                X_list.append([v_rms, v_peak, cf, kurt, dom_f, temp, curr, rpm])
                y_list.append(class_idx)

        return np.array(X_list), np.array(y_list)

    def predict(self, features: dict, telemetry: dict) -> dict:
        v_rms = features.get("vibration_rms", 0.45)
        v_peak = features.get("vibration_peak", v_rms * 1.8)
        cf = features.get("crest_factor", 2.5)
        kurt = features.get("kurtosis", 3.0)
        dom_f = features.get("dominant_frequency", 24.8)
        temp = telemetry.get("temperature", 55.0)
        curr = telemetry.get("current", 7.5)
        rpm = telemetry.get("rpm", 1485.0)

        X = np.array([[v_rms, v_peak, cf, kurt, dom_f, temp, curr, rpm]])
        
        pred_idx = int(self.model.predict(X)[0])
        probabilities = self.model.predict_proba(X)[0]
        confidence = float(probabilities[pred_idx])

        # Failure probability is probability of ANY fault class (1 through 5)
        failure_prob = float(1.0 - probabilities[0]) if len(probabilities) > 0 else 0.0

        return {
            "predicted_fault": FAULT_CLASSES[pred_idx],
            "confidence": round(confidence, 2),
            "failure_probability": round(failure_prob, 2),
            "probabilities": {
                FAULT_CLASSES[i]: round(float(probabilities[i]), 3)
                for i in range(len(FAULT_CLASSES))
            }
        }
