import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "rul_model.pkl")

class RULPredictor:
    """
    Predicts Remaining Useful Life (RUL) in operational hours based on
    multi-sensor degradation, vibration severity, and thermal stress.
    Nominal brand new equipment RUL baseline: 500.0 hours.
    """
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
        
        # Train regression baseline model
        self.model = RandomForestRegressor(n_estimators=80, max_depth=6, random_state=42)
        X_train, y_train = self._generate_synthetic_rul_data()
        self.model.fit(X_train, y_train)

    def _generate_synthetic_rul_data(self):
        np.random.seed(42)
        n_samples = 1200
        # Degradation range: 0.0 (pristine) to 1.0 (imminent catastrophic failure)
        degradations = np.random.uniform(0.0, 1.0, n_samples)
        
        X_list = []
        y_list = []
        for d in degradations:
            # Physics-based features corresponding to degradation
            v_rms = 0.40 + (d**1.8) * 3.2 + np.random.normal(0, 0.05)
            temp = 50.0 + (d**1.4) * 45.0 + np.random.normal(0, 1.5)
            kurt = 2.9 + (d**2.2) * 5.0 + np.random.normal(0, 0.2)
            curr = 7.0 + (d**1.5) * 4.0 + np.random.normal(0, 0.3)
            
            # Non-linear exponential wear curve
            # RUL(d) = 500 * (1 - d)^1.6
            rul_hours = 500.0 * max(0.01, (1.0 - d)**1.5) + np.random.normal(0, 8.0)
            rul_hours = max(2.0, min(500.0, rul_hours))

            X_list.append([v_rms, temp, kurt, curr])
            y_list.append(rul_hours)

        return np.array(X_list), np.array(y_list)

    def predict(self, features: dict, telemetry: dict) -> dict:
        v_rms = features.get("vibration_rms", 0.45)
        temp = telemetry.get("temperature", 55.0)
        kurt = features.get("kurtosis", 3.0)
        curr = telemetry.get("current", 7.5)

        X = np.array([[v_rms, temp, kurt, curr]])
        pred_rul = float(self.model.predict(X)[0])
        
        # If simulated machine degradation is explicitly provided, factor it in
        sim_deg = telemetry.get("degradation", None)
        if sim_deg is not None:
            sim_rul = 500.0 * max(0.01, (1.0 - float(sim_deg))**1.5)
            # Weighted average between ML regression and degradation curve
            pred_rul = 0.6 * pred_rul + 0.4 * sim_rul

        pred_rul = max(1.0, min(500.0, round(pred_rul, 1)))

        # Degradation rate calculation (pts/hr)
        health_decline_rate = round(max(0.05, (500.0 - pred_rul) / 45.0), 2)

        return {
            "estimated_rul_hours": pred_rul,
            "health_decline_rate": health_decline_rate
        }
