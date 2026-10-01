import time
import logging
from backend.simulator.machine import IndustrialMotorMTR001
from backend.simulator.faults import OperatingMode
from backend.mqtt_client import MQTTManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DataGenerator")

def run_generator(interval_sec: float = 1.0):
    logger.info("Starting Industrial Machine Synthetic Sensor Generator for MTR-001...")
    motor = IndustrialMotorMTR001(machine_id="MTR-001")
    mqtt_mgr = MQTTManager()
    mqtt_mgr.start()

    try:
        while True:
            telemetry = motor.generate_telemetry()
            mqtt_mgr.publish_telemetry(telemetry)
            logger.debug(f"Published telemetry: Mode={telemetry['operating_mode']}, Temp={telemetry['temperature']}°C, VibX={telemetry['vibration_x']}g")
            time.sleep(interval_sec)
    except KeyboardInterrupt:
        logger.info("Stopping Data Generator...")
    finally:
        mqtt_mgr.stop()

if __name__ == "__main__":
    run_generator()
