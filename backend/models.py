import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, Text
from backend.database import Base

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(String(100), nullable=False)
    location = Column(String(100), nullable=True)
    rated_power = Column(Float, nullable=True) # in kW
    status = Column(String(50), default="RUNNING") # RUNNING, WARNING, CRITICAL, MAINTENANCE, OFFLINE
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    temperature = Column(Float, nullable=False) # °C
    vibration_x = Column(Float, nullable=False) # g
    vibration_y = Column(Float, nullable=False) # g
    vibration_z = Column(Float, nullable=False) # g
    rpm = Column(Float, nullable=False)         # RPM
    current = Column(Float, nullable=False)     # Amperes
    voltage = Column(Float, nullable=False)     # Volts
    power = Column(Float, nullable=False)       # kW
    load = Column(Float, nullable=False)        # %

class Feature(Base):
    __tablename__ = "features"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    vibration_rms = Column(Float, nullable=False)
    vibration_peak = Column(Float, nullable=False)
    crest_factor = Column(Float, nullable=False)
    kurtosis = Column(Float, nullable=False)
    dominant_frequency = Column(Float, nullable=False) # Hz
    temperature_rise = Column(Float, nullable=False)
    current_deviation = Column(Float, nullable=False)

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    health_score = Column(Float, nullable=False) # 0-100
    anomaly_score = Column(Float, nullable=False) # 0-1
    predicted_fault = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False) # 0-1
    failure_probability = Column(Float, nullable=False) # 0-1
    estimated_rul = Column(Float, nullable=False) # hours

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    severity = Column(String(20), nullable=False) # INFO, WARNING, CRITICAL
    alert_type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    acknowledged = Column(Boolean, default=False)

class Maintenance(Base):
    __tablename__ = "maintenance"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    maintenance_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    technician = Column(String(100), nullable=False)
    status = Column(String(50), default="Scheduled") # Scheduled, In Progress, Completed
    downtime = Column(Float, default=0.0) # hours
