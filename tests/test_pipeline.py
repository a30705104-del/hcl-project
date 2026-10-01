import pytest
from pydantic import ValidationError
from backend.main import TelemetryIn
from backend.feature_engineering import FeatureEngineeringPipeline
from backend.prediction import PredictionEngine
from backend.digital_twin import DigitalTwinEngine
from backend.alert_engine import AlertEngine
from backend.simulator.machine import IndustrialMotorMTR001
from backend.simulator.faults import OperatingMode

def test_telemetry_validation():
    # Valid payload
    valid_data = {
        "machine_id": "MTR-001",
        "temperature": 62.4,
        "vibration_x": 0.42,
        "vibration_y": 0.38,
        "vibration_z": 0.51,
        "rpm": 1487.0,
        "current": 8.2,
        "voltage": 415.0,
        "load": 72.0,
        "power": 4.8
    }
    item = TelemetryIn(**valid_data)
    assert item.machine_id == "MTR-001"
    assert item.rpm == 1487.0

    # Negative RPM rejected
    invalid_data = valid_data.copy()
    invalid_data["rpm"] = -50.0
    with pytest.raises(ValidationError):
        TelemetryIn(**invalid_data)

    # Impossible temperature rejected
    invalid_temp = valid_data.copy()
    invalid_temp["temperature"] = 500.0
    with pytest.raises(ValidationError):
        TelemetryIn(**invalid_temp)

def test_feature_engineering_calculation():
    pipeline = FeatureEngineeringPipeline(window_size=10)
    telemetry = {
        "machine_id": "MTR-001",
        "vibration_x": 0.5,
        "vibration_y": 0.4,
        "vibration_z": 0.3,
        "temperature": 55.0,
        "current": 7.5,
        "rpm": 1485.0,
        "power": 4.8,
        "load": 65.0,
        "operating_mode": "NORMAL"
    }
    feats = pipeline.update(telemetry)
    assert "vibration_rms" in feats
    assert "kurtosis" in feats
    assert "dominant_frequency" in feats
    assert feats["vibration_rms"] > 0

def test_prediction_and_health_scoring():
    pred_engine = PredictionEngine()
    telemetry = {
        "machine_id": "MTR-001",
        "temperature": 55.0,
        "current": 7.5,
        "rpm": 1485.0,
        "power": 4.8,
        "load": 65.0
    }
    features = {
        "vibration_rms": 0.45,
        "vibration_peak": 0.8,
        "crest_factor": 2.5,
        "kurtosis": 3.0,
        "dominant_frequency": 24.8,
        "rpm_deviation": 0.0
    }
    res = pred_engine.predict(telemetry, features)
    assert 0 <= res["health_score"] <= 100
    assert 0 <= res["anomaly_score"] <= 1.0
    assert "predicted_fault" in res
    assert res["estimated_rul"] > 0

def test_bearing_fault_detection():
    pred_engine = PredictionEngine()
    # High vibration and high kurtosis typical of bearing spalling
    telemetry = {
        "machine_id": "MTR-001",
        "temperature": 72.0,
        "current": 8.5,
        "rpm": 1480.0,
        "power": 5.2,
        "load": 80.0
    }
    features = {
        "vibration_rms": 2.2,
        "vibration_peak": 7.5,
        "crest_factor": 4.6,
        "kurtosis": 6.8,
        "dominant_frequency": 178.0,
        "rpm_deviation": -5.0
    }
    res = pred_engine.predict(telemetry, features)
    assert res["health_score"] < 60.0
    assert res["failure_probability"] > 0.50

def test_alert_engine_generation_and_debouncing():
    engine = AlertEngine(cooldown_seconds=10)
    telemetry = {"machine_id": "MTR-001", "temperature": 95.0} # Critical temp
    features = {"vibration_rms": 2.5} # Critical vibration
    predictions = {
        "health_score": 35.0, # Critical health
        "anomaly_score": 0.85,
        "failure_probability": 0.85,
        "estimated_rul": 15.0,
        "predicted_fault": "Bearing Fault"
    }
    alerts = engine.evaluate(telemetry, features, predictions)
    assert len(alerts) > 0
    severities = [a["severity"] for a in alerts]
    assert "CRITICAL" in severities

    # Immediate second check should debounce and return 0 new alerts
    second_alerts = engine.evaluate(telemetry, features, predictions)
    assert len(second_alerts) == 0

def test_digital_twin_updates():
    dt = DigitalTwinEngine(machine_id="MTR-001")
    telemetry = {
        "machine_id": "MTR-001",
        "timestamp": "2026-10-01T12:00:00Z",
        "temperature": 65.0,
        "rpm": 1485.0,
        "current": 8.0,
        "voltage": 415.0,
        "power": 5.0,
        "load": 70.0,
        "vibration_z": 0.4
    }
    features = {
        "vibration_rms": 0.65,
        "kurtosis": 3.1,
        "crest_factor": 2.6
    }
    predictions = {
        "health_score": 85.0,
        "predicted_fault": "Normal",
        "anomaly_score": 0.1,
        "failure_probability": 0.1,
        "estimated_rul": 420.0
    }
    state = dt.update(telemetry, features, predictions)
    assert state["status"] == "RUNNING"
    assert "bearing_de" in state["components"]
    assert state["components"]["bearing_de"]["health"] > 70
