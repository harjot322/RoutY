/**
 * Seed data for RoutY
 * City: Bhopal, Madhya Pradesh (Configurable Indian Tier-2 City Context)
 * 3 Routes, 19 Stops, 6 Buses, and Daily Schedules
 */
const { haversineDistance } = require('../utils/geoUtils');

const SEED_STOPS = [
  // Route 1 Stops (Bhopal Junction -> AIIMS)
  { name: "Bhopal Junction Railway Station", name_hi: "भोपाल जंक्शन रेलवे स्टेशन", latitude: 23.2687, longitude: 77.4116, landmark: "Platform 1 Gate", zone: "North" },
  { name: "Bharat Talkies Chauraha", name_hi: "भारत टॉकीज चौराहा", latitude: 23.2625, longitude: 77.4145, landmark: "Hamidia Road Junction", zone: "Central" },
  { name: "Nadra Bus Stand", name_hi: "नादरा बस स्टैंड", latitude: 23.2562, longitude: 77.4168, landmark: "Inter-city Terminal", zone: "Central" },
  { name: "Board Office Chauraha", name_hi: "बोर्ड ऑफिस चौराहा", latitude: 23.2335, longitude: 77.4320, landmark: "MPSEB Circle", zone: "East" },
  { name: "MP Nagar Zone 1", name_hi: "एम.पी. नगर ज़ोन 1", latitude: 23.2280, longitude: 77.4365, landmark: "Commercial Complex", zone: "East" },
  { name: "DB City Mall Square", name_hi: "डीबी सिटी मॉल स्क्वायर", latitude: 23.2320, longitude: 77.4395, landmark: "Hoshangabad Road Entry", zone: "East" },
  { name: "AIIMS Bhopal Hospital", name_hi: "एम्स भोपाल अस्पताल", latitude: 23.2085, longitude: 77.4580, landmark: "Main Trauma Center Gate", zone: "South-East" },

  // Route 2 Stops (Bairagarh -> New Market)
  { name: "Bairagarh City Bus Terminal", name_hi: "बैरागढ़ सिटी बस टर्मिनल", latitude: 23.2810, longitude: 77.3410, landmark: "Sant Hirdaram Nagar", zone: "West" },
  { name: "Lalghati Square", name_hi: "लालघाटी चौराहा", latitude: 23.2790, longitude: 77.3710, landmark: "Airport Road Junction", zone: "West" },
  { name: "VIP Road Lake View", name_hi: "वीआईपी रोड लेक व्यू", latitude: 23.2620, longitude: 77.3880, landmark: "Upper Lake Promenade", zone: "Central" },
  { name: "Kamla Park Stop", name_hi: "कमला पार्क स्टॉप", latitude: 23.2490, longitude: 77.3990, landmark: "Heritage Garden", zone: "Central" },
  { name: "Polytechnic Square", name_hi: "पॉलिटेक्निक चौराहा", latitude: 23.2420, longitude: 77.4040, landmark: "Govt Engineering College", zone: "Central" },
  { name: "New Market Roshanpura", name_hi: "न्यू मार्केट रोशनपुरा", latitude: 23.2355, longitude: 77.4010, landmark: "Top 'n Town Square", zone: "Central" },

  // Route 3 Stops (Airport -> Central Library)
  { name: "Raja Bhoj Airport Terminal", name_hi: "राजा भोज एयरपोर्ट टर्मिनल", latitude: 23.2925, longitude: 77.3620, landmark: "Arrivals Concourse", zone: "North-West" },
  { name: "Gandhi Nagar Circle", name_hi: "गांधी नगर सर्कल", latitude: 23.2870, longitude: 77.3740, landmark: "Post Office", zone: "North-West" },
  { name: "Karond Mandi Square", name_hi: "करौंद मंडी चौराहा", latitude: 23.2980, longitude: 77.4050, landmark: "Agricultural Market Gate", zone: "North" },
  { name: "DIG Bungalow Chauraha", name_hi: "डीआईजी बंगला चौराहा", latitude: 23.2830, longitude: 77.4120, landmark: "Police Commissionerate", zone: "North" },
  { name: "Alpana Tiraha", name_hi: "अल्पना तिराहा", latitude: 23.2640, longitude: 77.4110, landmark: "Near Overbridge", zone: "Central" },
  { name: "Central Library Heritage Square", name_hi: "सेंट्रल लाइब्रेरी हेरिटेज स्क्वायर", latitude: 23.2530, longitude: 77.4080, landmark: "Moti Masjid Area", zone: "Central" }
];

/**
 * Generate smooth interpolated road-following coordinates between stops
 */
function generateRoadPath(stops) {
  const coords = [];
  for (let i = 0; i < stops.length; i++) {
    const curr = stops[i];
    if (i === 0) {
      coords.push([curr.longitude, curr.latitude]);
    } else {
      const prev = stops[i - 1];
      // Generate 4 intermediate road points with subtle natural bends
      const steps = 4;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        // Add tiny lateral curved offset for road-like curvature
        const curveOffset = Math.sin(t * Math.PI) * 0.0015 * (i % 2 === 0 ? 1 : -1);
        const lat = prev.latitude + (curr.latitude - prev.latitude) * t + curveOffset;
        const lng = prev.longitude + (curr.longitude - prev.longitude) * t + curveOffset;
        coords.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
      }
    }
  }
  return coords;
}

const SEED_ROUTES_CONFIG = [
  {
    route_number: "R-101",
    name: "Bhopal Junction – MP Nagar – AIIMS",
    name_hi: "भोपाल जंक्शन – एम.पी. नगर – एम्स",
    description: "Main central trunk line connecting railway terminal with commercial hub and AIIMS",
    color: "#2563eb", // Civic Blue
    stop_indices: [0, 1, 2, 3, 4, 5, 6]
  },
  {
    route_number: "R-204",
    name: "Bairagarh – VIP Road – New Market",
    name_hi: "बैरागढ़ – वीआईपी रोड – न्यू मार्केट",
    description: "Western scenic corridor linking Sant Hirdaram Nagar across the Upper Lake to New Market",
    color: "#059669", // Emerald Green
    stop_indices: [7, 8, 9, 10, 11, 12]
  },
  {
    route_number: "R-305",
    name: "Raja Bhoj Airport – Karond – Central Library",
    name_hi: "राजा भोज एयरपोर्ट – करौंद – सेंट्रल लाइब्रेरी",
    description: "Airport link passing through northern residential sectors and historic walled city",
    color: "#d97706", // Amber / Civic Orange
    stop_indices: [13, 14, 15, 16, 17, 18]
  }
];

const SEED_BUSES_CONFIG = [
  { bus_number: "MP04-HE-1001", model: "Tata Ultra 9/9m AC Electric", capacity: 34, route_idx: 0, status: "active" },
  { bus_number: "MP04-HE-1002", model: "Tata Ultra 9/9m AC Electric", capacity: 34, route_idx: 0, status: "active" },
  { bus_number: "MP04-HE-1003", model: "Ashok Leyland Oyster Midi", capacity: 30, route_idx: 1, status: "active" },
  { bus_number: "MP04-HE-1004", model: "Ashok Leyland Oyster Midi", capacity: 30, route_idx: 1, status: "active" },
  { bus_number: "MP04-HE-1005", model: "Eicher Skyline Pro EV", capacity: 32, route_idx: 2, status: "active" },
  { bus_number: "MP04-HE-1006", model: "Eicher Skyline Pro EV", capacity: 32, route_idx: 2, status: "active" }
];

module.exports = {
  SEED_STOPS,
  SEED_ROUTES_CONFIG,
  SEED_BUSES_CONFIG,
  generateRoadPath
};
