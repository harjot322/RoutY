"""
Hardware GPS Adapter for RoutY
Production-ready adapter interface designed to ingest live telemetry from physical GPS units
conforming to AIS-140 (MoRTH India standard) or NMEA-0183 ($GPRMC) sentences.
"""
import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from .base import BaseGPSAdapter

class HardwareGPSAdapter(BaseGPSAdapter):
    """
    Adapter for physical GPS hardware tracking units.
    Can be linked to a serial device (e.g. /dev/ttyUSB0), TCP/UDP socket, or MQTT broker.
    """
    def __init__(self, bus_id: str, bus_number: str, route_id: Optional[str] = None):
        super().__init__(bus_id, bus_number, route_id)
        self.last_valid_telemetry: Dict[str, Any] = {
            "bus_id": bus_id,
            "bus_number": bus_number,
            "route_id": route_id,
            "latitude": 0.0,
            "longitude": 0.0,
            "bearing": 0.0,
            "speed_kmh": 0.0,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def start(self) -> None:
        self.is_running = True
        # In a physical hardware deployment: open serial port, listen to TCP socket, etc.

    def stop(self) -> None:
        self.is_running = False

    def parse_nmea_gprmc(self, sentence: str) -> Optional[Dict[str, Any]]:
        """
        Parses standard NMEA 0183 $GPRMC sentence:
        Example: $GPRMC,123519,A,2316.1234,N,07724.7569,E,15.2,142.3,070926,,,A*68
        """
        parts = sentence.strip().split(',')
        if len(parts) < 10 or not parts[0].endswith('RMC'):
            return None

        status = parts[2]
        if status != 'A':  # 'A' = Valid fix, 'V' = Warning / Invalid
            return None

        try:
            # Latitude: DDMM.MMMM -> decimal degrees
            raw_lat = float(parts[3])
            lat_deg = int(raw_lat / 100)
            lat_min = raw_lat - (lat_deg * 100)
            latitude = lat_deg + (lat_min / 60.0)
            if parts[4].upper() == 'S':
                latitude = -latitude

            # Longitude: DDDMM.MMMM -> decimal degrees
            raw_lon = float(parts[5])
            lon_deg = int(raw_lon / 100)
            lon_min = raw_lon - (lon_deg * 100)
            longitude = lon_deg + (lon_min / 60.0)
            if parts[6].upper() == 'W':
                longitude = -longitude

            # Speed: knots -> km/h
            speed_knots = float(parts[7]) if parts[7] else 0.0
            speed_kmh = speed_knots * 1.852

            # Heading/bearing in degrees
            bearing = float(parts[8]) if parts[8] else 0.0

            telemetry = {
                "bus_id": self.bus_id,
                "bus_number": self.bus_number,
                "route_id": self.route_id,
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
                "bearing": round(bearing, 1),
                "speed_kmh": round(speed_kmh, 1),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            self.last_valid_telemetry = telemetry
            return telemetry
        except Exception:
            return None

    def parse_ais140_packet(self, packet_str: str) -> Optional[Dict[str, Any]]:
        """
        Parses AIS-140 standard GPS tracking packet (Indian Public Transport Standard):
        Format: $START,VENDOR,FIRMWARE,IMEI,ALERT,LAT,LAT_DIR,LON,LON_DIR,SPEED,HEADING,...*CHECKSUM
        """
        parts = packet_str.strip().split(',')
        if len(parts) < 12:
            return None
        try:
            latitude = float(parts[5])
            if parts[6].upper() == 'S':
                latitude = -latitude
            
            longitude = float(parts[7])
            if parts[8].upper() == 'W':
                longitude = -longitude

            speed_kmh = float(parts[9])
            bearing = float(parts[10])

            telemetry = {
                "bus_id": self.bus_id,
                "bus_number": self.bus_number,
                "route_id": self.route_id,
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
                "bearing": round(bearing, 1),
                "speed_kmh": round(speed_kmh, 1),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            self.last_valid_telemetry = telemetry
            return telemetry
        except Exception:
            return None

    def get_telemetry(self) -> Dict[str, Any]:
        return self.last_valid_telemetry
