import json
import logging
import ssl
from typing import Callable, Optional
import paho.mqtt.client as mqtt
from backend.config import settings

logger = logging.getLogger("IndustrialMQTT")

class MQTTManager:
    """
    Industrial MQTT Publisher and Subscriber for HiveMQ Cloud or local broker.
    Supports TLS, authentication, automated reconnects, and message dispatch.
    """
    def __init__(self, on_telemetry_received: Optional[Callable[[dict], None]] = None):
        self.on_telemetry_received = on_telemetry_received
        self.client = mqtt.Client(
            client_id=settings.MQTT_CLIENT_ID,
            protocol=mqtt.MQTTv311
        )
        self.connected = False
        self._setup_client()

    def _setup_client(self):
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
            
        if settings.MQTT_TLS:
            self.client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2)

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.connected = True
            logger.info(f"Successfully connected to MQTT Broker: {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
            # Subscribe to machine telemetry and commands
            self.client.subscribe([(settings.TELEMETRY_TOPIC, 1), (settings.COMMANDS_TOPIC, 1)])
            logger.info(f"Subscribed to topics: {settings.TELEMETRY_TOPIC}, {settings.COMMANDS_TOPIC}")
        else:
            self.connected = False
            logger.error(f"Failed to connect to MQTT broker, return code: {rc}")

    def _on_disconnect(self, client, userdata, rc):
        self.connected = False
        if rc != 0:
            logger.warning(f"Unexpected MQTT disconnect (code: {rc}). Retrying connection...")

    def _on_message(self, client, userdata, msg):
        try:
            payload_str = msg.payload.decode("utf-8")
            data = json.loads(payload_str)
            if msg.topic == settings.TELEMETRY_TOPIC and self.on_telemetry_received:
                self.on_telemetry_received(data)
        except Exception as e:
            logger.error(f"Error processing MQTT message on {msg.topic}: {e}")

    def start(self):
        try:
            logger.info(f"Connecting to MQTT Broker at {settings.MQTT_BROKER}:{settings.MQTT_PORT}...")
            self.client.connect_async(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=60)
            self.client.loop_start()
        except Exception as e:
            logger.warning(f"MQTT Broker connection failed: {e}. Running in standalone simulated loop mode.")

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()

    def publish_telemetry(self, payload: dict):
        try:
            self.client.publish(settings.TELEMETRY_TOPIC, json.dumps(payload), qos=1)
        except Exception as e:
            logger.debug(f"Telemetry publish fallback: {e}")

    def publish_health(self, payload: dict):
        try:
            self.client.publish(settings.HEALTH_TOPIC, json.dumps(payload), qos=1)
        except Exception as e:
            logger.debug(f"Health publish fallback: {e}")

    def publish_alert(self, payload: dict):
        try:
            self.client.publish(settings.ALERTS_TOPIC, json.dumps(payload), qos=1)
        except Exception as e:
            logger.debug(f"Alert publish fallback: {e}")
