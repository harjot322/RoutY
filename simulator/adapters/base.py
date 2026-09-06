"""
Base GPS Adapter Interface for RoutY
Enables seamless replacement of simulated telemetry with physical GPS hardware
(e.g., AIS-140 devices, OBD-II trackers, or MQTT feeds) without modifying
core business logic or the commuter frontend.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseGPSAdapter(ABC):
    def __init__(self, bus_id: str, bus_number: str, route_id: Optional[str] = None):
        self.bus_id = bus_id
        self.bus_number = bus_number
        self.route_id = route_id
        self.is_running = False

    @abstractmethod
    def start(self) -> None:
        """Start receiving or generating GPS telemetry."""
        pass

    @abstractmethod
    def stop(self) -> None:
        """Stop telemetry generation/reception."""
        pass

    @abstractmethod
    def get_telemetry(self) -> Dict[str, Any]:
        """
        Produce a standardized RoutY telemetry payload.
        Expected schema:
        {
            "bus_id": str,
            "bus_number": str,
            "route_id": str,
            "latitude": float,
            "longitude": float,
            "bearing": float,
            "speed_kmh": float,
            "timestamp": str (ISO 8601)
        }
        """
        pass
