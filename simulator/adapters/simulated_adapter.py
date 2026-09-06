"""
Simulated GPS Adapter for RoutY
Generates realistic bus movement along GeoJSON route paths, including traffic variations,
stop dwell times, and accurate vehicle bearing angles.
"""
import math
import time
import random
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from .base import BaseGPSAdapter

EARTH_R = 6371000.0  # Earth radius in meters

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dl) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(x, y)) + 360) % 360

class SimulatedGPSAdapter(BaseGPSAdapter):
    def __init__(
        self,
        bus_id: str,
        bus_number: str,
        route_id: str,
        coordinates: List[List[float]],  # [[lng, lat], ...]
        stops: Optional[List[Dict[str, Any]]] = None,
        base_speed_kmh: float = 30.0,
        initial_progress_ratio: float = 0.0
    ):
        super().__init__(bus_id, bus_number, route_id)
        self.coordinates = coordinates if coordinates and len(coordinates) >= 2 else [
            [77.4116, 23.2687], [77.4145, 23.2625]
        ]
        self.stops = stops or []
        self.base_speed_kmh = base_speed_kmh
        
        # Build cumulative distance along coordinates
        self.cum_distances = [0.0]
        for i in range(1, len(self.coordinates)):
            prev = self.coordinates[i - 1]
            curr = self.coordinates[i]
            dist = haversine(prev[1], prev[0], curr[1], curr[0])
            self.cum_distances.append(self.cum_distances[-1] + dist)
        
        self.total_length_m = self.cum_distances[-1]
        
        # Initialize position along path
        self.current_distance_m = (initial_progress_ratio * self.total_length_m) % max(1.0, self.total_length_m)
        self.current_lat = self.coordinates[0][1]
        self.current_lng = self.coordinates[0][0]
        self.current_bearing = 0.0
        self.current_speed_kmh = base_speed_kmh
        self.dwelling_remaining_sec = 0.0
        self.last_update_time = time.time()
        self.direction = 1  # 1 = forward, -1 = reverse

    def start(self) -> None:
        self.is_running = True
        self.last_update_time = time.time()

    def stop(self) -> None:
        self.is_running = False

    def update_position(self) -> None:
        """Advance bus position based on elapsed time, speed, and stops."""
        now = time.time()
        dt = min(5.0, max(0.1, now - self.last_update_time))
        self.last_update_time = now

        # If currently dwelling at a stop
        if self.dwelling_remaining_sec > 0:
            self.dwelling_remaining_sec -= dt
            self.current_speed_kmh = 0.0
            return

        # Slight traffic speed variation: +/- 5 km/h
        jitter = random.uniform(-4.0, 4.0)
        self.current_speed_kmh = max(18.0, min(48.0, self.base_speed_kmh + jitter))
        speed_mps = self.current_speed_kmh / 3.6
        distance_step = speed_mps * dt

        prev_lat = self.current_lat
        prev_lng = self.current_lng

        # Advance distance along polyline
        self.current_distance_m += distance_step

        # If reached end of route, loop back to start
        if self.current_distance_m >= self.total_length_m:
            self.current_distance_m = 0.0

        # Find current segment along cumulative distances
        seg_idx = 0
        for i in range(len(self.cum_distances) - 1):
            if self.cum_distances[i] <= self.current_distance_m <= self.cum_distances[i + 1]:
                seg_idx = i
                break
        
        # Interpolate between coordinate points
        seg_start_dist = self.cum_distances[seg_idx]
        seg_end_dist = self.cum_distances[seg_idx + 1]
        seg_len = max(0.001, seg_end_dist - seg_start_dist)
        t = (self.current_distance_m - seg_start_dist) / seg_len
        t = max(0.0, min(1.0, t))

        p1 = self.coordinates[seg_idx]
        p2 = self.coordinates[seg_idx + 1]

        self.current_lng = p1[0] + (p2[0] - p1[0]) * t
        self.current_lat = p1[1] + (p2[1] - p1[1]) * t

        # Update bearing
        if haversine(prev_lat, prev_lng, self.current_lat, self.current_lng) > 1.0:
            self.current_bearing = calculate_bearing(prev_lat, prev_lng, self.current_lat, self.current_lng)

        # Check if approaching any stop within 35m to trigger dwell time (10% chance per check to avoid getting stuck)
        for stop in self.stops:
            stop_lat = stop.get("latitude")
            stop_lng = stop.get("longitude")
            if stop_lat and stop_lng:
                d = haversine(self.current_lat, self.current_lng, stop_lat, stop_lng)
                if d < 35.0 and random.random() < 0.25:
                    self.dwelling_remaining_sec = random.uniform(8.0, 15.0)
                    self.current_speed_kmh = 0.0
                    break

    def get_telemetry(self) -> Dict[str, Any]:
        self.update_position()
        return {
            "bus_id": self.bus_id,
            "bus_number": self.bus_number,
            "route_id": self.route_id,
            "latitude": round(self.current_lat, 6),
            "longitude": round(self.current_lng, 6),
            "bearing": round(self.current_bearing, 1),
            "speed_kmh": round(self.current_speed_kmh, 1),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
