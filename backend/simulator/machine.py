import math
import random
import datetime
from typing import Dict, Any, Optional
from backend.simulator.faults import OperatingMode, FAULT_PROFILES

class IndustrialMotorMTR001:
    """
    Virtual rotating machine: "Industrial Motor Unit MTR-001"
    Machine Architecture:
      Electric Motor -> Coupling -> Shaft -> Bearing DE -> Bearing NDE -> Mechanical Load
    """
    def __init__(self, machine_id: str = "MTR-001"):
        self.machine_id = machine_id
        self.mode: OperatingMode = OperatingMode.NORMAL
        
        # State variables
        self.load: float = 65.0          # %
        self.degradation: float = 0.0     # 0.0 (pristine) to 1.0 (failed)
        self.degradation_rate: float = 0.0005 # per step
        
        # Thermal inertia tracker
        self.temperature: float = 52.0   # °C
        self.ambient_temp: float = 24.0  # °C
        
        # Base machine ratings
        self.rated_rpm: float = 1485.0
        self.rated_power_kw: float = 5.5
        self.rated_voltage: float = 415.0
        
        # Demonstration mode state
        self.demo_active: bool = False
        self.demo_start_time: Optional[float] = None
        self.step_count: int = 0

    def set_mode(self, mode: OperatingMode):
        self.mode = mode
        if mode == OperatingMode.NORMAL:
            self.degradation = max(0.0, self.degradation - 0.2)

    def set_load(self, load_percent: float):
        self.load = max(0.0, min(120.0, float(load_percent)))

    def set_degradation(self, degradation_percent: float):
        self.degradation = max(0.0, min(1.0, float(degradation_percent) / 100.0))

    def start_demo(self):
        self.demo_active = True
        self.step_count = 0
        self.mode = OperatingMode.NORMAL
        self.load = 50.0
        self.degradation = 0.0

    def stop_demo(self):
        self.demo_active = False

    def update_demo_sequence(self):
        if not self.demo_active:
            return
        
        self.step_count += 1
        t = self.step_count
        
        # 0–30s: Normal
        if t <= 30:
            self.mode = OperatingMode.NORMAL
            self.load = 55.0
            self.degradation = 0.02
        # 30–60s: Load increases
        elif t <= 60:
            self.mode = OperatingMode.OVERLOAD
            self.load = 55.0 + (t - 30) * 1.3 # goes to ~94%
            self.degradation = 0.08
        # 60–90s: Early bearing degradation
        elif t <= 90:
            self.mode = OperatingMode.BEARING_FAULT
            self.degradation = 0.15 + (t - 60) * 0.008 # goes to ~0.39
            self.load = 75.0
        # 90–120s: Vibration increases
        elif t <= 120:
            self.mode = OperatingMode.BEARING_FAULT
            self.degradation = 0.40 + (t - 90) * 0.01 # goes to ~0.70
            self.load = 80.0
        # 120–150s: Temperature increases
        elif t <= 150:
            self.mode = OperatingMode.MULTIPLE_FAULT
            self.degradation = 0.70 + (t - 120) * 0.006 # goes to ~0.88
            self.load = 85.0
        # 150–180s: Bearing fault confirmed & critical
        elif t <= 180:
            self.mode = OperatingMode.BEARING_FAULT
            self.degradation = 0.88 + (t - 150) * 0.003
            self.load = 88.0
        else:
            # 180s+: Critical condition
            self.mode = OperatingMode.BEARING_FAULT
            self.degradation = min(0.98, self.degradation + 0.001)

    def generate_telemetry(self) -> Dict[str, Any]:
        """
        Generates realistic, physically-correlated industrial telemetry frame.
        """
        self.update_demo_sequence()
        profile = FAULT_PROFILES[self.mode]

        # Natural degradation accumulation if in active fault mode
        if self.mode in [OperatingMode.BEARING_FAULT, OperatingMode.MISALIGNMENT, OperatingMode.MULTIPLE_FAULT]:
            self.degradation = min(1.0, self.degradation + self.degradation_rate)

        # 1. RPM calculation (Speed droop under load: 1-3% slip)
        if self.mode == OperatingMode.SHUTDOWN:
            rpm = max(0.0, random.gauss(0.0, 1.0))
            voltage = random.gauss(2.0, 1.0)
            current = 0.0
            power = 0.0
            target_temp = self.ambient_temp
            vib_base = 0.02
        else:
            slip = (self.load / 100.0) * 35.0 # RPM drop under full load
            rpm_noise = random.gauss(0.0, 2.5)
            rpm = max(1400.0, min(1500.0, self.rated_rpm - slip + rpm_noise))
            
            # 2. Voltage (industrial 3-phase 400-430V with slight electrical ripple)
            volt_noise = random.gauss(0.0, 2.0)
            if self.mode == OperatingMode.ELECTRICAL_ANOMALY:
                volt_noise += random.choice([-25.0, 15.0, -18.0]) + random.gauss(0.0, 4.0)
            voltage = round(self.rated_voltage + volt_noise, 1)

            # 3. Current (A) - correlated to load & power factor
            # P = sqrt(3) * V * I * pf * efficiency
            # Normal no-load current is ~3.5A, full-load is ~9.5A
            base_current = 3.5 + (self.load / 100.0) * 6.0
            current_noise = random.gauss(0.0, 0.15)
            fault_current_mult = profile["current_mult"]
            current = max(0.1, round((base_current * fault_current_mult + current_noise) * (1.0 + self.degradation * 0.15), 2))

            # 4. Power (kW)
            pf = 0.85 if self.load > 50 else 0.72
            power = round(max(0.1, (math.sqrt(3) * voltage * current * pf * 0.88) / 1000.0), 2)

            # 5. Temperature physics (°C) - gradual thermal rise
            # Target steady-state temperature depends on load, ambient, faults and degradation
            temp_load_rise = (self.load / 100.0) * 30.0 # up to 30°C rise at 100% load
            target_temp = (
                self.ambient_temp 
                + 18.0 
                + temp_load_rise 
                + profile["temp_bias"] 
                + (self.degradation * 28.0)
            )
            vib_base = 0.28 + (self.load / 100.0) * 0.15

        # Thermal inertia: exponential smoothing towards target_temp
        alpha = 0.08 # Thermal time constant
        temp_noise = random.gauss(0.0, 0.12)
        self.temperature += alpha * (target_temp - self.temperature) + temp_noise
        temperature = round(self.temperature, 2)

        # 6. Vibration (g) - X (Radial Horizontal), Y (Radial Vertical), Z (Axial)
        deg_vib_factor = 1.0 + (self.degradation * 2.8)
        vx_mean = vib_base * profile["vib_mult"] * deg_vib_factor
        vy_mean = vib_base * 0.85 * profile["vib_mult"] * deg_vib_factor
        vz_mean = vib_base * 0.65 * profile["vib_z_mult"] * deg_vib_factor

        vibration_x = max(0.02, round(abs(random.gauss(vx_mean, vx_mean * 0.12)), 3))
        vibration_y = max(0.02, round(abs(random.gauss(vy_mean, vy_mean * 0.12)), 3))
        vibration_z = max(0.02, round(abs(random.gauss(vz_mean, vz_mean * 0.15)), 3))

        payload = {
            "machine_id": self.machine_id,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "temperature": temperature,
            "vibration_x": vibration_x,
            "vibration_y": vibration_y,
            "vibration_z": vibration_z,
            "rpm": round(rpm, 1),
            "current": current,
            "voltage": voltage,
            "load": round(self.load, 1),
            "power": power,
            "operating_mode": self.mode.value,
            "degradation": round(self.degradation, 4)
        }
        return payload
