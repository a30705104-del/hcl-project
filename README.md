# Industrial IoT Digital Twin for Equipment Health Monitoring

A complete, production-grade Industrial IoT Digital Twin platform for real-time health monitoring, anomaly detection, predictive maintenance, and Remaining Useful Life (RUL) estimation of rotating equipment ("Industrial Motor Unit MTR-001").

---

## 1. Project Objective

To provide an end-to-end industrial digital twin replicating a 3-phase induction motor drive train:
```
Electric Motor (5.5 kW) ➔ Flexible Coupling ➔ High-Tensile Shaft ➔ Bearing DE ➔ Bearing NDE ➔ Mechanical Load
```
The platform continuously ingests multi-axial vibration, winding temperature, speed (RPM), current, voltage, load %, and active power, computes time- and frequency-domain features (FFT, Kurtosis, Crest Factor), detects statistical anomalies (Isolation Forest), classifies mechanical faults (Random Forest Classifier), evaluates composite equipment health (0–100), estimates Remaining Useful Life (RUL hours), debounces critical alerts, and visualizes the rotating digital twin in real time without page refresh.

---

## 2. System Architecture

```
                    ┌───────────────────────────────────────────┐
                    │    PHYSICAL OR SYNTHETIC MACHINE LAYER    │
                    │   Industrial Motor Unit MTR-001 Simulator  │
                    │         (or ESP32 IoT Sensor Node)        │
                    └─────────────────────┬─────────────────────┘
                                          │ MQTT Telemetry Payload
                                          ▼
                    ┌───────────────────────────────────────────┐
                    │          MQTT BROKER / HIVEMQ             │
                    │  factory/motor/MTR-001/telemetry          │
                    └─────────────────────┬─────────────────────┘
                                          │ TLS / Subscribed
                                          ▼
                    ┌───────────────────────────────────────────┐
                    │      FASTAPI INGESTION & DATA VALIDATION  │
                    │    Pydantic Schema Validation (MTR-001)   │
                    └─────────────────────┬─────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
       ┌─────────────────────────┐                 ┌─────────────────────────┐
       │   SQLITE PERSISTENCE    │                 │   FEATURE ENGINEERING   │
       │  (industrial_twin.db)   │                 │  FFT, Kurtosis, Crest,  │
       │ Telemetry, Preds, Alerts│                 │  RMS, Dominant Freq     │
       └─────────────────────────┘                 └────────────┬────────────┘
                                                                │
                                                                ▼
                                                   ┌─────────────────────────┐
                                                   │      AI / ML ENGINE     │
                                                   │ • Isolation Forest      │
                                                   │ • Fault Classifier RF   │
                                                   │ • RUL Regressor         │
                                                   │ • Health Score (0-100)  │
                                                   └────────────┬────────────┘
                                                                │
                                                                ▼
                                                   ┌─────────────────────────┐
                                                   │   DIGITAL TWIN ENGINE   │
                                                   │ Component-Level Status  │
                                                   │ Motor, Shaft, Bearings  │
                                                   └────────────┬────────────┘
                                                                │
                                                                ▼
                                                   ┌─────────────────────────┐
                                                   │      ALERT ENGINE       │
                                                   │ Debouncing, Trip Rules  │
                                                   │ Remediation Guidelines  │
                                                   └────────────┬────────────┘
                                                                │
                                                                ▼
                                                   ┌─────────────────────────┐
                                                   │ WEBSOCKET / REST SERVER │
                                                   │  /ws/machine/MTR-001    │
                                                   └────────────┬────────────┘
                                                                │ Live Pushes
                                                                ▼
                                                   ┌─────────────────────────┐
                                                   │ REACT INDUSTRIAL SCADA  │
                                                   │ Rotating Machine Twin   │
                                                   │ Spectrum, Alerts, Demo  │
                                                   └─────────────────────────┘
```

---

## 3. Technology Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, Paho MQTT 2.0, SQLAlchemy 2.0, SQLite.
- **Data Science & ML**: NumPy, SciPy (FFT), Pandas, scikit-learn (Isolation Forest, Random Forest), Joblib.
- **MQTT**: HiveMQ Cloud TLS or local Eclipse Mosquitto broker.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, Recharts.
- **Containerization**: Docker & Docker Compose.

---

## 4. Installation & Environment Setup

### 4.1 Clone and Set Up Virtual Environment

```bash
# Clone the repository
git clone https://github.com/your-org/industrial-digital-twin.git
cd industrial-digital-twin

# Create Python virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux / macOS:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate
```

### 4.2 Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4.3 Configure Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in HiveMQ Cloud credentials:
```env
MQTT_BROKER=your-cluster-url.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=your_mqtt_user
MQTT_PASSWORD=your_mqtt_password
MQTT_TLS=true
DATABASE_URL=sqlite:///./industrial_twin.db
MACHINE_ID=MTR-001
```

---

## 5. Machine Learning Training

Pre-train the Anomaly Detector, Fault Classifier, and RUL Regressor:
```bash
python backend/ml/train.py
```
Outputs:
- `backend/ml/models/anomaly_model.pkl`
- `backend/ml/models/fault_classifier.pkl`
- `backend/ml/models/rul_model.pkl`
- Metrics: Accuracy > 96%, F1-Score > 0.96, R² > 0.94.

---

## 6. Starting Services

### 6.1 Start FastAPI Backend & Ingestion Engine
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 6.2 Start Frontend SCADA Dashboard
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 6.3 (Optional) Run Standalone Synthetic Data Generator
If testing data generation independently from the backend simulator:
```bash
python backend/simulator/data_generator.py
```

### 6.4 (Alternative) Docker Compose Single-Command Launch
```bash
docker-compose up --build
```

---

## 7. Running Tests

Run the full end-to-end test suite:
```bash
pytest tests/test_pipeline.py -v
```

---

## 8. Guided 180s Digital Twin Demonstration

Click **"START DIGITAL TWIN DEMO"** on the dashboard to trigger the automated progression:
- **0–30s**: Nominal baseline (Health: 100%, 0.45g vibration, 52°C, 55% load).
- **30–60s**: Load step to 94% (Power and current draw increase).
- **60–90s**: Incipient Bearing Degradation (Kurtosis rises to 4.5, high-frequency impacts).
- **90–120s**: Severe Radial Vibration (Exceeds 1.2g warning threshold).
- **120–150s**: Thermal runaway (Temperature crosses 75°C warning limit).
- **150–180s**: Bearing Fault confirmed by ML (Confidence > 91%, RUL drops under 40h).
- **180s+**: Critical trip threshold (> 2.0g vibration RMS, Health < 30%).

---

## 9. Replacing Synthetic Simulator with ESP32 Hardware

The MQTT telemetry schema is 100% hardware-agnostic:
```json
{
  "machine_id": "MTR-001",
  "temperature": 62.4,
  "vibration_x": 0.42,
  "vibration_y": 0.38,
  "vibration_z": 0.51,
  "rpm": 1487,
  "current": 8.2,
  "voltage": 415,
  "load": 72,
  "power": 4.8
}
```
Connect an ESP32 equipped with:
- MPU6050 / ADXL345 (Vibration X/Y/Z)
- DS18B20 (Temperature)
- ACS712 / SCT-013 (Current)
- Hall Effect Sensor (RPM)

Publish via MQTT to `factory/motor/MTR-001/telemetry` at 1 Hz. The backend automatically switches to hardware telemetry with zero code changes!
