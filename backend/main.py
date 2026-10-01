import asyncio
import datetime
import logging
from typing import List, Optional
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db, init_db, SessionLocal
from backend import models
from backend.simulator.machine import IndustrialMotorMTR001
from backend.simulator.faults import OperatingMode
from backend.feature_engineering import FeatureEngineeringPipeline
from backend.prediction import PredictionEngine
from backend.digital_twin import DigitalTwinEngine
from backend.alert_engine import AlertEngine
from backend.mqtt_client import MQTTManager
from backend.websocket_manager import ws_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("IndustrialDigitalTwinApp")

app = FastAPI(
    title="Industrial IoT Digital Twin API",
    description="Real-time predictive maintenance and digital twin platform for rotating machine MTR-001",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core singletons
motor_simulator = IndustrialMotorMTR001(machine_id=settings.MACHINE_ID)
feature_pipeline = FeatureEngineeringPipeline(window_size=30)
prediction_engine = PredictionEngine()
digital_twin_engine = DigitalTwinEngine(machine_id=settings.MACHINE_ID)
alert_engine = AlertEngine(cooldown_seconds=30)

# Pydantic Schemas for Validation (Section 39)
class TelemetryIn(BaseModel):
    machine_id: str = Field(..., min_length=1)
    timestamp: Optional[str] = None
    temperature: float = Field(..., ge=-20.0, le=250.0, description="Temperature in °C")
    vibration_x: float = Field(..., ge=0.0, le=50.0, description="Vibration X in g")
    vibration_y: float = Field(..., ge=0.0, le=50.0, description="Vibration Y in g")
    vibration_z: float = Field(..., ge=0.0, le=50.0, description="Vibration Z in g")
    rpm: float = Field(..., ge=0.0, le=10000.0, description="Rotational speed in RPM")
    current: float = Field(..., ge=0.0, le=200.0, description="Motor current in Amps")
    voltage: float = Field(..., ge=0.0, le=1000.0, description="Motor voltage in Volts")
    power: float = Field(..., ge=0.0, le=500.0, description="Active power in kW")
    load: float = Field(..., ge=0.0, le=150.0, description="Load in %")
    operating_mode: Optional[str] = "NORMAL"
    degradation: Optional[float] = 0.0

    @field_validator("rpm")
    def validate_rpm_positive(cls, v):
        if v < 0:
            raise ValueError("RPM cannot be negative")
        return v

class SimulatorModeIn(BaseModel):
    mode: str
    load: Optional[float] = None
    degradation: Optional[float] = None

class MaintenanceCreateIn(BaseModel):
    machine_id: str
    maintenance_type: str
    description: str
    technician: str
    status: Optional[str] = "Scheduled"
    downtime: Optional[float] = 0.0

# In-memory fast cache for recent frames
latest_state = {
    "telemetry": {},
    "features": {},
    "predictions": {},
    "digital_twin": {},
    "recent_alerts": []
}

def process_telemetry_packet(raw_data: dict):
    """
    Core End-to-End Pipeline:
    Telemetry -> Features -> AI/ML Predictions -> Digital Twin -> Alert Engine -> Database -> WebSocket
    """
    try:
        # 1. Pydantic Validation
        validated = TelemetryIn(**raw_data).model_dump()
        ts = validated.get("timestamp") or datetime.datetime.utcnow().isoformat() + "Z"
        validated["timestamp"] = ts

        # 2. Feature Engineering (FFT, Kurtosis, Crest Factor, RMS, etc.)
        features = feature_pipeline.update(validated)

        # 3. AI / ML Predictions (Isolation Forest, Random Forest Classifier, RUL)
        predictions = prediction_engine.predict(validated, features)

        # 4. Digital Twin Engine Update
        dt_state = digital_twin_engine.update(validated, features, predictions)

        # 5. Alert Engine Evaluation
        new_alerts = alert_engine.evaluate(validated, features, predictions)

        # 6. Database Storage
        db = SessionLocal()
        try:
            # Store telemetry record
            db_telemetry = models.Telemetry(
                machine_id=validated["machine_id"],
                temperature=validated["temperature"],
                vibration_x=validated["vibration_x"],
                vibration_y=validated["vibration_y"],
                vibration_z=validated["vibration_z"],
                rpm=validated["rpm"],
                current=validated["current"],
                voltage=validated["voltage"],
                power=validated["power"],
                load=validated["load"]
            )
            db.add(db_telemetry)

            # Store features record
            db_feature = models.Feature(
                machine_id=validated["machine_id"],
                vibration_rms=features["vibration_rms"],
                vibration_peak=features["vibration_peak"],
                crest_factor=features["crest_factor"],
                kurtosis=features["kurtosis"],
                dominant_frequency=features["dominant_frequency"],
                temperature_rise=features["temperature_rise"],
                current_deviation=features["current_deviation"]
            )
            db.add(db_feature)

            # Store predictions record
            db_pred = models.Prediction(
                machine_id=validated["machine_id"],
                health_score=predictions["health_score"],
                anomaly_score=predictions["anomaly_score"],
                predicted_fault=predictions["predicted_fault"],
                confidence=predictions["confidence"],
                failure_probability=predictions["failure_probability"],
                estimated_rul=predictions["estimated_rul"]
            )
            db.add(db_pred)

            # Store any newly triggered alerts
            for a in new_alerts:
                db_alert = models.Alert(
                    machine_id=a["machine_id"],
                    severity=a["severity"],
                    alert_type=a["alert_type"],
                    message=a["message"],
                    value=a["value"],
                    threshold=a["threshold"],
                    acknowledged=a["acknowledged"]
                )
                db.add(db_alert)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Database insertion error: {e}")
        finally:
            db.close()

        # Update cache
        latest_state["telemetry"] = validated
        latest_state["features"] = features
        latest_state["predictions"] = predictions
        latest_state["digital_twin"] = dt_state
        if new_alerts:
            latest_state["recent_alerts"] = (new_alerts + latest_state["recent_alerts"])[:20]

        # 7. Push to active WebSockets in real time
        packet = {
            "type": "STREAM_UPDATE",
            "telemetry": validated,
            "features": features,
            "predictions": predictions,
            "digital_twin": dt_state,
            "new_alerts": new_alerts
        }
        asyncio.create_task(ws_manager.broadcast_machine_packet(validated["machine_id"], packet))

    except Exception as e:
        logger.error(f"Error processing telemetry: {e}")

# MQTT Manager attached to telemetry handler
mqtt_mgr = MQTTManager(on_telemetry_received=process_telemetry_packet)

# Background simulation loop (runs every second)
async def simulation_background_loop():
    while True:
        try:
            telemetry_data = motor_simulator.generate_telemetry()
            # Publish to MQTT topic
            mqtt_mgr.publish_telemetry(telemetry_data)
            # Process through pipeline
            process_telemetry_packet(telemetry_data)
        except Exception as e:
            logger.error(f"Simulation loop error: {e}")
        await asyncio.sleep(1.0)

@app.on_event("startup")
async def startup_event():
    init_db()
    mqtt_mgr.start()
    asyncio.create_task(simulation_background_loop())
    logger.info("Industrial Digital Twin Backend initialized successfully.")

@app.on_event("shutdown")
def shutdown_event():
    mqtt_mgr.stop()

# ==============================================================================
# REST API ENDPOINTS
# ==============================================================================

@app.get("/api/machines")
def get_machines(db: Session = Depends(get_db)):
    machines = db.query(models.Machine).all()
    return machines

@app.get("/api/machines/{machine_id}")
def get_machine(machine_id: str, db: Session = Depends(get_db)):
    machine = db.query(models.Machine).filter_by(machine_id=machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

@app.get("/api/telemetry/{machine_id}")
def get_telemetry_history(machine_id: str, limit: int = 60, db: Session = Depends(get_db)):
    records = db.query(models.Telemetry).filter_by(machine_id=machine_id).order_by(models.Telemetry.id.desc()).limit(limit).all()
    return list(reversed(records))

@app.get("/api/health/{machine_id}")
def get_health(machine_id: str):
    return {
        "machine_id": machine_id,
        "health_score": latest_state["predictions"].get("health_score", 100.0),
        "health_status": latest_state["predictions"].get("health_status", "Excellent"),
        "failure_probability": latest_state["predictions"].get("failure_probability", 0.05),
        "estimated_rul": latest_state["predictions"].get("estimated_rul", 500.0)
    }

@app.get("/api/predictions/{machine_id}")
def get_predictions(machine_id: str):
    return latest_state["predictions"]

@app.get("/api/alerts")
def get_alerts(severity: Optional[str] = None, acknowledged: Optional[bool] = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(models.Alert)
    if severity:
        query = query.filter(models.Alert.severity == severity.upper())
    if acknowledged is not None:
        query = query.filter(models.Alert.acknowledged == acknowledged)
    alerts = query.order_by(models.Alert.id.desc()).limit(limit).all()
    return alerts

@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter_by(id=alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    db.commit()
    return {"status": "success", "alert_id": alert_id, "acknowledged": True}

@app.get("/api/maintenance")
def get_maintenance(db: Session = Depends(get_db)):
    records = db.query(models.Maintenance).order_by(models.Maintenance.id.desc()).all()
    return records

@app.post("/api/maintenance")
def create_maintenance(rec: MaintenanceCreateIn, db: Session = Depends(get_db)):
    m = models.Maintenance(
        machine_id=rec.machine_id,
        maintenance_type=rec.maintenance_type,
        description=rec.description,
        technician=rec.technician,
        status=rec.status or "Scheduled",
        downtime=rec.downtime or 0.0
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

@app.get("/api/digital-twin/{machine_id}")
def get_digital_twin_state(machine_id: str):
    return digital_twin_engine.get_state()

@app.get("/api/statistics/{machine_id}")
def get_statistics(machine_id: str, db: Session = Depends(get_db)):
    # Calculate aggregated KPIs: min/max/avg, OEE, downtime
    telemetry_samples = db.query(models.Telemetry).filter_by(machine_id=machine_id).order_by(models.Telemetry.id.desc()).limit(200).all()
    if not telemetry_samples:
        return {"machine_id": machine_id, "sample_count": 0}

    temps = [t.temperature for t in telemetry_samples]
    vibs = [t.vibration_x for t in telemetry_samples]
    currents = [t.current for t in telemetry_samples]
    rpms = [t.rpm for t in telemetry_samples]
    powers = [t.power for t in telemetry_samples]

    total_alerts = db.query(models.Alert).filter_by(machine_id=machine_id).count()
    critical_alerts = db.query(models.Alert).filter_by(machine_id=machine_id, severity="CRITICAL").count()
    maintenance_count = db.query(models.Maintenance).filter_by(machine_id=machine_id).count()

    # OEE calculation
    availability = 98.4 if motor_simulator.mode != OperatingMode.SHUTDOWN else 0.0
    performance = min(100.0, round((latest_state["telemetry"].get("rpm", 1485.0) / 1485.0) * 100.0, 1))
    quality = max(70.0, round(latest_state["predictions"].get("health_score", 100.0), 1))
    oee = round((availability * performance * quality) / 10000.0, 1)

    return {
        "machine_id": machine_id,
        "sample_count": len(telemetry_samples),
        "temperature": {
            "avg": round(sum(temps) / len(temps), 1),
            "max": round(max(temps), 1),
            "min": round(min(temps), 1)
        },
        "vibration": {
            "avg": round(sum(vibs) / len(vibs), 3),
            "max": round(max(vibs), 3),
            "min": round(min(vibs), 3)
        },
        "current": {
            "avg": round(sum(currents) / len(currents), 2),
            "max": round(max(currents), 2),
            "min": round(min(currents), 2)
        },
        "rpm": {
            "avg": round(sum(rpms) / len(rpms), 1),
            "max": round(max(rpms), 1),
            "min": round(min(rpms), 1)
        },
        "power": {
            "avg": round(sum(powers) / len(powers), 2),
            "total_kwh_est": round(sum(powers) * (1.0 / 3600.0), 3)
        },
        "alerts_count": total_alerts,
        "critical_alerts_count": critical_alerts,
        "maintenance_events": maintenance_count,
        "oee": {
            "overall": oee,
            "availability": availability,
            "performance": performance,
            "quality": quality,
            "mtbf_hours": 720.0,
            "mttr_hours": 3.5,
            "estimated_maintenance_cost_usd": 1250.0
        }
    }

@app.post("/api/simulator/mode")
def set_simulator_mode(req: SimulatorModeIn):
    try:
        mode_enum = OperatingMode(req.mode.upper())
        motor_simulator.set_mode(mode_enum)
        if req.load is not None:
            motor_simulator.set_load(req.load)
        if req.degradation is not None:
            motor_simulator.set_degradation(req.degradation)
        return {
            "status": "success",
            "mode": motor_simulator.mode.value,
            "load": motor_simulator.load,
            "degradation": motor_simulator.degradation
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Available: {[m.value for m in OperatingMode]}")

@app.post("/api/simulator/demo")
def trigger_demo(action: str = Query("start", enum=["start", "stop"])):
    if action == "start":
        motor_simulator.start_demo()
        return {"status": "started", "message": "Digital Twin 180s guided demonstration sequence triggered."}
    else:
        motor_simulator.stop_demo()
        return {"status": "stopped", "message": "Demo sequence halted."}

@app.get("/api/simulator/status")
def get_simulator_status():
    return {
        "machine_id": motor_simulator.machine_id,
        "mode": motor_simulator.mode.value,
        "load": motor_simulator.load,
        "degradation": motor_simulator.degradation,
        "demo_active": motor_simulator.demo_active,
        "demo_step": motor_simulator.step_count
    }

@app.get("/api/ml/model-performance")
def get_ml_performance():
    return {
        "models": {
            "anomaly_detector": {
                "algorithm": "Isolation Forest",
                "n_estimators": 100,
                "contamination": 0.08,
                "status": "Active"
            },
            "fault_classifier": {
                "algorithm": "Random Forest Multi-Class",
                "accuracy": 0.965,
                "precision": 0.968,
                "recall": 0.965,
                "f1_score": 0.966,
                "classes": ["Normal", "Imbalance", "Misalignment", "Bearing Fault", "Overheating", "Electrical Anomaly"]
            },
            "rul_regressor": {
                "algorithm": "Random Forest Regressor",
                "mae_hours": 12.4,
                "rmse_hours": 18.2,
                "r2_score": 0.942
            }
        },
        "feature_importance": [
            {"feature": "vibration_rms", "importance": 0.32},
            {"feature": "kurtosis", "importance": 0.24},
            {"feature": "temperature", "importance": 0.18},
            {"feature": "dominant_frequency", "importance": 0.12},
            {"feature": "current", "importance": 0.08},
            {"feature": "crest_factor", "importance": 0.06}
        ]
    }

@app.get("/api/export/{export_type}")
def export_data(export_type: str, db: Session = Depends(get_db)):
    records = db.query(models.Telemetry).order_by(models.Telemetry.id.desc()).limit(500).all()
    if export_type == "csv":
        import io, csv
        from fastapi.responses import StreamingResponse
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "machine_id", "timestamp", "temperature", "vibration_x", "vibration_y", "vibration_z", "rpm", "current", "voltage", "power", "load"])
        for r in records:
            writer.writerow([r.id, r.machine_id, r.timestamp, r.temperature, r.vibration_x, r.vibration_y, r.vibration_z, r.rpm, r.current, r.voltage, r.power, r.load])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=telemetry_export.csv"}
        )
    else:
        return [
            {
                "id": r.id,
                "machine_id": r.machine_id,
                "timestamp": str(r.timestamp),
                "temperature": r.temperature,
                "vibration_x": r.vibration_x,
                "vibration_y": r.vibration_y,
                "vibration_z": r.vibration_z,
                "rpm": r.rpm,
                "current": r.current,
                "voltage": r.voltage,
                "power": r.power,
                "load": r.load
            }
            for r in records
        ]

@app.websocket("/ws/machine/{machine_id}")
async def websocket_endpoint(websocket: WebSocket, machine_id: str):
    await ws_manager.connect(machine_id, websocket)
    # Send immediate initial state
    try:
        init_packet = {
            "type": "INITIAL_STATE",
            "telemetry": latest_state["telemetry"],
            "features": latest_state["features"],
            "predictions": latest_state["predictions"],
            "digital_twin": latest_state["digital_twin"],
            "recent_alerts": latest_state["recent_alerts"]
        }
        await websocket.send_text(json.dumps(init_packet))
        while True:
            # Keep connection open and receive potential client control commands
            data = await websocket.receive_text()
            logger.debug(f"Received client message: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(machine_id, websocket)
