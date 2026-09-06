"""
Automated unit tests for RoutY GPS Simulator & Adapters
"""
import unittest
import sys
import os

# Add simulator directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from adapters.simulated_adapter import haversine, calculate_bearing, SimulatedGPSAdapter
from adapters.hardware_adapter import HardwareGPSAdapter

class TestSimulatorMath(unittest.TestCase):
    def test_haversine_distance(self):
        # Distance between Bhopal Junction and Bharat Talkies (~750m)
        dist = haversine(23.2687, 77.4116, 23.2625, 77.4145)
        self.assertTrue(600 < dist < 900, f"Distance {dist} should be between 600m and 900m")

    def test_calculate_bearing(self):
        # South-east heading should be roughly 150-160 degrees
        brng = calculate_bearing(23.2687, 77.4116, 23.2625, 77.4145)
        self.assertTrue(120 < brng < 180, f"Bearing {brng} should be in SE quadrant")

    def test_simulated_adapter_movement(self):
        coords = [
            [77.4116, 23.2687],
            [77.4145, 23.2625],
            [77.4168, 23.2562]
        ]
        adapter = SimulatedGPSAdapter(
            bus_id="bus_test_1",
            bus_number="MP04-HE-TEST",
            route_id="route_test_1",
            coordinates=coords,
            base_speed_kmh=30.0
        )
        adapter.start()
        
        t1 = adapter.get_telemetry()
        self.assertEqual(t1["bus_number"], "MP04-HE-TEST")
        self.assertIn("latitude", t1)
        self.assertIn("longitude", t1)
        self.assertIn("speed_kmh", t1)

        # Advance simulator
        adapter.last_update_time -= 2.0  # Simulate 2 seconds passing
        t2 = adapter.get_telemetry()
        
        # Verify coordinates are numeric and valid
        self.assertTrue(23.0 < t2["latitude"] < 24.0)
        self.assertTrue(77.0 < t2["longitude"] < 78.0)

    def test_hardware_adapter_nmea(self):
        adapter = HardwareGPSAdapter(
            bus_id="bus_hw_1",
            bus_number="MP04-HE-HW1",
            route_id="route_test_1"
        )
        # Sample NMEA GPRMC for ~23.2687 N, 77.4126 E, 32 km/h
        sample_sentence = "$GPRMC,123519,A,2316.1220,N,07724.7560,E,17.2,155.0,070926,,,A*68"
        result = adapter.parse_nmea_gprmc(sample_sentence)
        self.assertIsNotNone(result)
        self.assertTrue(23.26 < result["latitude"] < 23.27)
        self.assertTrue(77.40 < result["longitude"] < 77.42)
        self.assertTrue(result["speed_kmh"] > 0)
        self.assertEqual(result["bus_number"], "MP04-HE-HW1")

    def test_hardware_adapter_ais140(self):
        adapter = HardwareGPSAdapter(
            bus_id="bus_hw_2",
            bus_number="MP04-HE-HW2",
            route_id="route_test_1"
        )
        # Sample AIS-140 packet: $START,VENDOR,FW,IMEI,ALERT,LAT,LAT_DIR,LON,LON_DIR,SPEED,HEADING...
        sample_ais = "$START,V1,1.0,865432098765432,0,23.2687,N,77.4116,E,28.5,145.0,07092026,120000*5A"
        result = adapter.parse_ais140_packet(sample_ais)
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result["latitude"], 23.2687, places=3)
        self.assertAlmostEqual(result["longitude"], 77.4116, places=3)
        self.assertEqual(result["speed_kmh"], 28.5)

if __name__ == '__main__':
    unittest.main()
