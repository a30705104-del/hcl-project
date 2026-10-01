import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "localhost")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_USERNAME: Optional[str] = os.getenv("MQTT_USERNAME", None)
    MQTT_PASSWORD: Optional[str] = os.getenv("MQTT_PASSWORD", None)
    MQTT_TLS: bool = os.getenv("MQTT_TLS", "false").lower() in ("true", "1", "yes")
    MQTT_CLIENT_ID: str = os.getenv("MQTT_CLIENT_ID", "digital-twin-backend-MTR-001")
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./industrial_twin.db")
    MACHINE_ID: str = os.getenv("MACHINE_ID", "MTR-001")
    
    BASE_TOPIC: str = f"factory/motor/{MACHINE_ID}"
    TELEMETRY_TOPIC: str = f"factory/motor/{MACHINE_ID}/telemetry"
    STATUS_TOPIC: str = f"factory/motor/{MACHINE_ID}/status"
    HEALTH_TOPIC: str = f"factory/motor/{MACHINE_ID}/health"
    ALERTS_TOPIC: str = f"factory/motor/{MACHINE_ID}/alerts"
    MAINTENANCE_TOPIC: str = f"factory/motor/{MACHINE_ID}/maintenance"
    COMMANDS_TOPIC: str = f"factory/motor/{MACHINE_ID}/commands"
    
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
