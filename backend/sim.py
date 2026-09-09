"""RoutY simulation engine: moves buses along predefined GeoJSON routes,
computes stop-level ETAs from learned segment speeds, detects bunching."""
import asyncio
import logging
import math
import random
import uuid
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Dict, List, Optional

try:
    from faker import Faker
    fake = Faker("en_IN")
except ImportError:
    class _SimpleFaker:
        _names = ["Ramesh Kumar", "Rajesh Verma", "Suresh Yadav", "Manoj Singh", "Dharmendra Sharma", "Anil Maurya", "Pawan Tiwari", "Sunil Gupta"]
        def name(self):
            return random.choice(self._names)
        def random_uppercase_letter(self):
            return random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ")
        def random_int(self, a, b):
            return random.randint(a, b)
    fake = _SimpleFaker()

logger = logging.getLogger("routy.sim")

# Load precomputed high-density OSRM real-road geometry (100% road-accurate, zero river/house clipping)
OSRM_CACHE_FILE = Path(__file__).parent / "osrm_routes.json"
OSRM_CACHE = {}
if OSRM_CACHE_FILE.exists():
    try:
        with open(OSRM_CACHE_FILE, "r") as _f:
            OSRM_CACHE = json.load(_f)
        logger.info("Loaded precomputed OSRM road geometries for %s", list(OSRM_CACHE.keys()))
    except Exception as _e:
        logger.warning("Could not read osrm_routes.json: %s", _e)

EARTH_R = 6371000.0
DWELL_SECONDS = 20.0
DEFAULT_SPEED_MPS = 30 / 3.6  # 30 km/h rural roads


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))


def bearing(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dl) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Seed data: Barabanki district (Uttar Pradesh) - tier-2 town + villages
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Seed data: Pan-India State Transit Corridors (Covering all States & UTs)
# ---------------------------------------------------------------------------
SEED_ROUTES = [
    # 1. Delhi (NCT) - DTC
    {
        "number": "534",
        "name": "Mehrauli – Anand Vihar ISBT",
        "name_hi": "महरौली – आनंद विहार आईएसबीटी",
        "state": "Delhi",
        "city": "New Delhi",
        "color": "#C04A00",
        "stops": [
            {"name": "Mehrauli Terminal", "name_hi": "महरौली टर्मिनल", "lat": 28.5170, "lng": 77.1850},
            {"name": "Saket Metro Station", "name_hi": "साकेत मेट्रो स्टेशन", "lat": 28.5204, "lng": 77.2014},
            {"name": "Nehru Place Terminal", "name_hi": "नेहरू प्लेस टर्मिनल", "lat": 28.5492, "lng": 77.2528},
            {"name": "Ashram Chowk", "name_hi": "आश्रम चौक", "lat": 28.5714, "lng": 77.2604},
            {"name": "Laxmi Nagar", "name_hi": "लक्ष्मी नगर", "lat": 28.6308, "lng": 77.2773},
            {"name": "Anand Vihar ISBT", "name_hi": "आनंद विहार आईएसबीटी", "lat": 28.6475, "lng": 77.3160},
        ],
    },
    # 2. Maharashtra (Mumbai) - BEST
    {
        "number": "A-115",
        "name": "CSMT – Churchgate – NCPA",
        "name_hi": "सीएसएमटी – चर्चगेट – एनसीपीए",
        "state": "Maharashtra",
        "city": "Mumbai",
        "color": "#D32F2F",
        "stops": [
            {"name": "Chhatrapati Shivaji Maharaj Terminus", "name_hi": "सीएसएमटी", "lat": 18.9400, "lng": 72.8353},
            {"name": "Hutatma Chowk", "name_hi": "हुतात्मा चौक", "lat": 18.9322, "lng": 72.8315},
            {"name": "Churchgate Station", "name_hi": "चर्चगेट स्टेशन", "lat": 18.9352, "lng": 72.8272},
            {"name": "Nariman Point", "name_hi": "नरीमन पॉइंट", "lat": 18.9260, "lng": 72.8230},
            {"name": "NCPA Theatre", "name_hi": "एनसीपीए थिएटर", "lat": 18.9224, "lng": 72.8205},
        ],
    },
    # 3. Karnataka (Bengaluru) - BMTC
    {
        "number": "335E",
        "name": "Majestic – ITPL Whitefield",
        "name_hi": "मजेस्टिक – आईटीपीएल व्हाइटफील्ड",
        "state": "Karnataka",
        "city": "Bengaluru",
        "color": "#1B7F31",
        "stops": [
            {"name": "Kempegowda Bus Station Majestic", "name_hi": "केम्पेगौड़ा बस स्टेशन मजेस्टिक", "lat": 12.9784, "lng": 77.5726},
            {"name": "MG Road Metro", "name_hi": "एमजी रोड मेट्रो", "lat": 12.9756, "lng": 77.6066},
            {"name": "Domlur Flyover", "name_hi": "डोमलूर फ्लाईओवर", "lat": 12.9609, "lng": 77.6387},
            {"name": "Marathahalli Bridge", "name_hi": "मराठाहल्ली ब्रिज", "lat": 12.9591, "lng": 77.6974},
            {"name": "Kundalahalli Gate", "name_hi": "कुंडलहल्ली गेट", "lat": 12.9698, "lng": 77.7126},
            {"name": "ITPL Whitefield", "name_hi": "आईटीपीएल व्हाइटफील्ड", "lat": 12.9863, "lng": 77.7381},
        ],
    },
    # 4. Tamil Nadu (Chennai) - MTC
    {
        "number": "29C",
        "name": "Besant Nagar – Perambur",
        "name_hi": "बेशंत नगर – पेरम्बूर",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "color": "#7A2F00",
        "stops": [
            {"name": "Besant Nagar Bus Stand", "name_hi": "बेशंत नगर बस स्टैंड", "lat": 13.0002, "lng": 80.2668},
            {"name": "Mandaveli Depot", "name_hi": "मंदवेली डिपो", "lat": 13.0270, "lng": 80.2610},
            {"name": "Gemini Flyover Anna Salai", "name_hi": "जेमिनी फ्लाईओवर अन्ना सलाई", "lat": 13.0520, "lng": 80.2505},
            {"name": "Chetpet Signal", "name_hi": "चेतपेट सिग्नल", "lat": 13.0710, "lng": 80.2420},
            {"name": "Kilpauk Medical College", "name_hi": "किल्पौक मेडिकल कॉलेज", "lat": 13.0800, "lng": 80.2430},
            {"name": "Perambur Railway Station", "name_hi": "पेरम्बूर रेलवे स्टेशन", "lat": 13.1110, "lng": 80.2335},
        ],
    },
    # 5. West Bengal (Kolkata) - WBTC
    {
        "number": "S-12",
        "name": "Howrah Station – New Town Eco Park",
        "name_hi": "हावड़ा स्टेशन – न्यू टाउन इको पार्क",
        "state": "West Bengal",
        "city": "Kolkata",
        "color": "#4A4A4A",
        "stops": [
            {"name": "Howrah Railway Station", "name_hi": "हावड़ा रेलवे स्टेशन", "lat": 22.5850, "lng": 88.3426},
            {"name": "BBD Bagh", "name_hi": "बीबीडी बाग", "lat": 22.5726, "lng": 88.3496},
            {"name": "Esplanade Bus Terminus", "name_hi": "एस्प्लेनेड बस टर्मिनस", "lat": 22.5645, "lng": 88.3524},
            {"name": "Science City", "name_hi": "साइंस सिटी", "lat": 22.5400, "lng": 88.3960},
            {"name": "Salt Lake Sector V", "name_hi": "सॉल्ट लेक सेक्टर ५", "lat": 22.5735, "lng": 88.4331},
            {"name": "New Town Eco Park", "name_hi": "न्यू टाउन इको पार्क", "lat": 22.6070, "lng": 88.4680},
        ],
    },
    # 6. Gujarat (Ahmedabad) - AMTS
    {
        "number": "151",
        "name": "Kalupur Station – ISKCON Cross Road",
        "name_hi": "कालूपुर स्टेशन – इस्कॉन क्रॉस रोड",
        "state": "Gujarat",
        "city": "Ahmedabad",
        "color": "#B87503",
        "stops": [
            {"name": "Kalupur Railway Station", "name_hi": "कालूपुर रेलवे स्टेशन", "lat": 23.0230, "lng": 72.6000},
            {"name": "Lal Darwaja Bus Stand", "name_hi": "लाल दरवाजा बस स्टैंड", "lat": 23.0250, "lng": 72.5800},
            {"name": "Paldi Cross Road", "name_hi": "पालदी क्रॉस रोड", "lat": 23.0130, "lng": 72.5630},
            {"name": "Shivranjani Crossroads", "name_hi": "शिवरंजनी क्रॉसरोड्स", "lat": 23.0240, "lng": 72.5290},
            {"name": "ISKCON Cross Road", "name_hi": "इस्कॉन क्रॉस रोड", "lat": 23.0280, "lng": 72.5070},
        ],
    },
    # 7. Telangana (Hyderabad) - TSRTC
    {
        "number": "218",
        "name": "Koti – Patancheru",
        "name_hi": "कोटी – पाटनचेरू",
        "state": "Telangana",
        "city": "Hyderabad",
        "color": "#C04A00",
        "stops": [
            {"name": "Koti Women's College", "name_hi": "कोटी विमेंस कॉलेज", "lat": 17.3850, "lng": 78.4860},
            {"name": "Secunderabad Station", "name_hi": "सिकंदराबाद स्टेशन", "lat": 17.4340, "lng": 78.5010},
            {"name": "Begumpet Airport Road", "name_hi": "बेगमपेट हवाई अड्डा रोड", "lat": 17.4440, "lng": 78.4670},
            {"name": "Kukatpally Y Junction", "name_hi": "कुकटपल्ली वाई जंक्शन", "lat": 17.4930, "lng": 78.4010},
            {"name": "Miyapur Metro", "name_hi": "मियापुर मेट्रो", "lat": 17.4960, "lng": 78.3610},
            {"name": "Patancheru Bus Stand", "name_hi": "पाटनचेरू बस स्टैंड", "lat": 17.5280, "lng": 78.2640},
        ],
    },
    # 8. Kerala (Kochi) - KSRTC
    {
        "number": "K-1",
        "name": "Aluva Metro – Fort Kochi",
        "name_hi": "अलुवा मेट्रो – फोर्ट कोच्चि",
        "state": "Kerala",
        "city": "Kochi",
        "color": "#1B7F31",
        "stops": [
            {"name": "Aluva Metro Station", "name_hi": "अलुवा मेट्रो स्टेशन", "lat": 10.1090, "lng": 76.3530},
            {"name": "Edappally Toll Junction", "name_hi": "एडापल्ली टोल जंक्शन", "lat": 10.0240, "lng": 76.3080},
            {"name": "Palarivattom Bypass", "name_hi": "पलारीवट्टोम बाईपास", "lat": 10.0050, "lng": 76.3120},
            {"name": "MG Road Ernakulam", "name_hi": "एमजी रोड एर्नाकुलम", "lat": 9.9720, "lng": 76.2840},
            {"name": "Thoppumpady Junction", "name_hi": "थोपमपडी जंक्शन", "lat": 9.9320, "lng": 76.2620},
            {"name": "Fort Kochi Bus Stand", "name_hi": "फोर्ट कोच्चि बस स्टैंड", "lat": 9.9650, "lng": 76.2420},
        ],
    },
    # 9. Rajasthan (Jaipur) - JCTSL
    {
        "number": "1A",
        "name": "Sanganer Airport – Amber Fort",
        "name_hi": "सांगानेर हवाई अड्डा – आमेर किला",
        "state": "Rajasthan",
        "city": "Jaipur",
        "color": "#D32F2F",
        "stops": [
            {"name": "Sanganer Airport Circle", "name_hi": "सांगानेर हवाई अड्डा सर्किल", "lat": 26.8280, "lng": 75.8050},
            {"name": "Tonk Phatak", "name_hi": "टोंक फाटक", "lat": 26.8850, "lng": 75.8000},
            {"name": "Ajmeri Gate", "name_hi": "अजमेरी गेट", "lat": 26.9180, "lng": 75.8190},
            {"name": "Badi Chaupar", "name_hi": "बड़ी चौपड़", "lat": 26.9240, "lng": 75.8270},
            {"name": "Jal Mahal", "name_hi": "जल महल", "lat": 26.9530, "lng": 75.8460},
            {"name": "Amber Fort Bus Stand", "name_hi": "आमेर किला बस स्टैंड", "lat": 26.9850, "lng": 75.8510},
        ],
    },
    # 10. Punjab (Amritsar) - PRTC
    {
        "number": "A1",
        "name": "ISBT Amritsar – GNDU Campus",
        "name_hi": "आईएसबीटी अमृतसर – जीएनडीयू कैंपस",
        "state": "Punjab",
        "city": "Amritsar",
        "color": "#B87503",
        "stops": [
            {"name": "Amritsar Inter-State Bus Stand", "name_hi": "अमृतसर बस स्टैंड", "lat": 31.6220, "lng": 74.8870},
            {"name": "Golden Temple Hall Gate", "name_hi": "स्वर्ण मंदिर हॉल गेट", "lat": 31.6320, "lng": 74.8760},
            {"name": "Amritsar Junction Railway Station", "name_hi": "अमृतसर रेलवे स्टेशन", "lat": 31.6340, "lng": 74.8650},
            {"name": "Putligarh Chowk", "name_hi": "पुतलीघर चौक", "lat": 31.6370, "lng": 74.8430},
            {"name": "Guru Nanak Dev University GNDU", "name_hi": "जीएनडीयू यूनिवर्सिटी", "lat": 31.6380, "lng": 74.8250},
        ],
    },
    # 11. Haryana (Gurugram) - Gurugaman
    {
        "number": "111",
        "name": "Gurugram Bus Stand – Badshahpur",
        "name_hi": "गुरुग्राम बस स्टैंड – बादशाहपुर",
        "state": "Haryana",
        "city": "Gurugram",
        "color": "#4A4A4A",
        "stops": [
            {"name": "Gurugram Bus Stand", "name_hi": "गुरुग्राम बस स्टैंड", "lat": 28.4680, "lng": 77.0320},
            {"name": "IFFCO Chowk", "name_hi": "इफको चौक", "lat": 28.4720, "lng": 77.0720},
            {"name": "Millennium City Centre Huda", "name_hi": "मिलेनियम सिटी सेंटर हुडा", "lat": 28.4590, "lng": 77.0730},
            {"name": "Subhash Chowk", "name_hi": "सुभाष चौक", "lat": 28.4310, "lng": 77.0420},
            {"name": "Badshahpur Vatika Chowk", "name_hi": "बादशाहपुर वाटिका चौक", "lat": 28.3970, "lng": 77.0540},
        ],
    },
    # 12. Uttar Pradesh (Lucknow & Barabanki) - UPSRTC
    {
        "number": "11",
        "name": "Charbagh Station – Munshipulia",
        "name_hi": "चारबाग स्टेशन – मुंशीपुलिया",
        "state": "Uttar Pradesh",
        "city": "Lucknow",
        "color": "#7A2F00",
        "stops": [
            {"name": "Charbagh Railway Station", "name_hi": "चारबाग रेलवे स्टेशन", "lat": 26.8320, "lng": 80.9230},
            {"name": "Hazratganj Chauraha", "name_hi": "हजरतगंज चौराहा", "lat": 26.8530, "lng": 80.9460},
            {"name": "Nishatganj Bridge", "name_hi": "निशातगंज ब्रिज", "lat": 26.8710, "lng": 80.9570},
            {"name": "Polytechnic Chauraha", "name_hi": "पॉलीटेक्निक चौराहा", "lat": 26.8780, "lng": 80.9980},
            {"name": "Munshipulia Metro", "name_hi": "मुंशीपुलिया मेट्रो", "lat": 26.8920, "lng": 81.0110},
        ],
    },
    {
        "number": "R1",
        "name": "Barabanki – Dewa Sharif",
        "name_hi": "बाराबंकी – देवा शरीफ",
        "state": "Uttar Pradesh",
        "city": "Barabanki",
        "color": "#C04A00",
        "stops": [
            {"name": "Barabanki Bus Stand", "name_hi": "बाराबंकी बस स्टैंड", "lat": 26.9260, "lng": 81.1900},
            {"name": "Peerbatawan Chauraha", "name_hi": "पीरबटावन चौराहा", "lat": 26.9500, "lng": 81.1850},
            {"name": "Bhitauli Village", "name_hi": "भितौली गाँव", "lat": 26.9850, "lng": 81.1800},
            {"name": "Dewa Sharif Dargah", "name_hi": "देवा शरीफ दरगाह", "lat": 27.0400, "lng": 81.1700},
        ],
    },
    {
        "number": "R2",
        "name": "Barabanki – Haidergarh",
        "name_hi": "बाराबंकी – हैदरगढ़",
        "state": "Uttar Pradesh",
        "city": "Barabanki",
        "color": "#1B7F31",
        "stops": [
            {"name": "Barabanki Bus Stand", "name_hi": "बाराबंकी बस स्टैंड", "lat": 26.9260, "lng": 81.1900},
            {"name": "Banki Chauraha", "name_hi": "बंकी चौराहा", "lat": 26.8950, "lng": 81.2450},
            {"name": "Zaidpur Market", "name_hi": "जैदपुर बाज़ार", "lat": 26.8300, "lng": 81.3200},
            {"name": "Siddhaur", "name_hi": "सिद्धौर", "lat": 26.7500, "lng": 81.3000},
            {"name": "Trivediganj", "name_hi": "त्रिवेदीगंज", "lat": 26.6600, "lng": 81.3200},
            {"name": "Haidergarh Tehsil", "name_hi": "हैदरगढ़ तहसील", "lat": 26.6000, "lng": 81.3600},
        ],
    },
    # 13. Bihar (Patna) - BSRTC
    {
        "number": "111-BR",
        "name": "Patna Junction – Danapur",
        "name_hi": "पटना जंक्शन – दानापुर",
        "state": "Bihar",
        "city": "Patna",
        "color": "#1B7F31",
        "stops": [
            {"name": "Patna Junction", "name_hi": "पटना जंक्शन", "lat": 25.6020, "lng": 85.1370},
            {"name": "Gandhi Maidan", "name_hi": "गांधी मैदान", "lat": 25.6170, "lng": 85.1430},
            {"name": "Boring Road Crossing", "name_hi": "बोरिंग रोड क्रॉसिंग", "lat": 25.6170, "lng": 85.1180},
            {"name": "Saguna More", "name_hi": "सगुना मोड़", "lat": 25.6190, "lng": 85.0540},
            {"name": "Danapur Station", "name_hi": "दानापुर स्टेशन", "lat": 25.6020, "lng": 85.0420},
        ],
    },
    # 14. Madhya Pradesh (Bhopal) - BCLL
    {
        "number": "SR-1",
        "name": "Bairagarh – Misrod",
        "name_hi": "बैरागढ़ – मिसरोद",
        "state": "Madhya Pradesh",
        "city": "Bhopal",
        "color": "#C04A00",
        "stops": [
            {"name": "Bairagarh Sant Hirdaram Station", "name_hi": "बैरागढ़ संत हिरदाराम स्टेशन", "lat": 23.2720, "lng": 77.3370},
            {"name": "Polytechnic Square", "name_hi": "पॉलीटेक्निक चौराहा", "lat": 23.2390, "lng": 77.3990},
            {"name": "MP Nagar Zone 1", "name_hi": "एमपी नगर ज़ोन १", "lat": 23.2330, "lng": 77.4320},
            {"name": "Rani Kamlapati Station", "name_hi": "रानी कमलापति स्टेशन", "lat": 23.2180, "lng": 77.4390},
            {"name": "Misrod Suburb", "name_hi": "मिसरोद उपनगर", "lat": 23.1610, "lng": 77.4690},
        ],
    },
    # 15. Odisha (Bhubaneswar) - Mo Bus
    {
        "number": "10-OD",
        "name": "Airport – Nandankanan Zoo",
        "name_hi": "हवाई अड्डा – नंदनकानन चिड़ियाघर",
        "state": "Odisha",
        "city": "Bhubaneswar",
        "color": "#1B7F31",
        "stops": [
            {"name": "Biju Patnaik International Airport", "name_hi": "बीजू पटनायक अंतरराष्ट्रीय हवाई अड्डा", "lat": 20.2520, "lng": 85.8180},
            {"name": "Master Canteen Station Square", "name_hi": "मास्टर कैंटीन स्टेशन चौक", "lat": 20.2670, "lng": 85.8430},
            {"name": "Vani Vihar Square", "name_hi": "वाणी विहार चौक", "lat": 20.3010, "lng": 85.8560},
            {"name": "KIIT Square Patia", "name_hi": "केआईआईटी चौक पटिया", "lat": 20.3540, "lng": 85.8180},
            {"name": "Nandankanan Zoological Park", "name_hi": "नंदनकानन चिड़ियाघर", "lat": 20.3950, "lng": 85.8230},
        ],
    },
    # 16. Assam (Guwahati) - ASTC
    {
        "number": "1-AS",
        "name": "Guwahati Station – Jalukbari",
        "name_hi": "गुवाहाटी स्टेशन – जालुकबारी",
        "state": "Assam",
        "city": "Guwahati",
        "color": "#D32F2F",
        "stops": [
            {"name": "Guwahati Railway Station", "name_hi": "गुवाहाटी रेलवे स्टेशन", "lat": 26.1830, "lng": 91.7510},
            {"name": "Pan Bazar Cotton College", "name_hi": "पान बाज़ार कॉटन कॉलेज", "lat": 26.1880, "lng": 91.7450},
            {"name": "Bharalumukh", "name_hi": "भरालूमुख", "lat": 26.1770, "lng": 91.7250},
            {"name": "Maligaon Kamakhya Gate", "name_hi": "मालीगांव कामाख्या गेट", "lat": 26.1550, "lng": 91.7010},
            {"name": "Jalukbari Gauhati University", "name_hi": "जालुकबारी गुवाहाटी विश्वविद्यालय", "lat": 26.1480, "lng": 91.6620},
        ],
    },
    # 17. Andhra Pradesh (Visakhapatnam) - APSRTC
    {
        "number": "10K",
        "name": "RTC Complex – Simhachalam",
        "name_hi": "आरटीसी कॉम्प्लेक्स – सिंहाचलम",
        "state": "Andhra Pradesh",
        "city": "Visakhapatnam",
        "color": "#4A4A4A",
        "stops": [
            {"name": "Dwaraka RTC Bus Complex", "name_hi": "द्वारका आरटीसी बस कॉम्प्लेक्स", "lat": 17.7280, "lng": 83.3080},
            {"name": "Jagadamba Junction", "name_hi": "जगदंबा जंक्शन", "lat": 17.7120, "lng": 83.3030},
            {"name": "Kancharapalem", "name_hi": "कंचरापालेम", "lat": 17.7420, "lng": 83.2780},
            {"name": "Gopalapatnam", "name_hi": "गोपालपटनम", "lat": 17.7720, "lng": 83.2280},
            {"name": "Simhachalam Hill Base", "name_hi": "सिंहाचलम पहाड़ी तलहटी", "lat": 17.7800, "lng": 83.2420},
        ],
    },
    # 18. Goa - KTC
    {
        "number": "G1",
        "name": "Panaji KTC – Margao KTC",
        "name_hi": "पणजी केटीसी – मडगांव केटीसी",
        "state": "Goa",
        "city": "Panaji / Margao",
        "color": "#B87503",
        "stops": [
            {"name": "Panaji KTC Bus Terminus", "name_hi": "पणजी केटीसी बस टर्मिनस", "lat": 15.4980, "lng": 73.8320},
            {"name": "Bambolim GMC Hospital", "name_hi": "बांबोलिम जीएमसी अस्पताल", "lat": 15.4570, "lng": 73.8560},
            {"name": "Cortalim Zuari Junction", "name_hi": "कोरटालिम जुआरी जंक्शन", "lat": 15.4090, "lng": 73.9050},
            {"name": "Verna Industrial Estate", "name_hi": "वेरना औद्योगिक क्षेत्र", "lat": 15.3520, "lng": 73.9350},
            {"name": "Margao KTC Bus Stand", "name_hi": "मडगांव केटीसी बस स्टैंड", "lat": 15.2830, "lng": 73.9680},
        ],
    },
    # 19. Himachal Pradesh (Shimla) - HRTC
    {
        "number": "S1",
        "name": "Old Bus Stand – Dhalli",
        "name_hi": "ओल्ड बस स्टैंड – ढल्ली",
        "state": "Himachal Pradesh",
        "city": "Shimla",
        "color": "#1B7F31",
        "stops": [
            {"name": "Shimla Old Bus Stand", "name_hi": "शिमला ओल्ड बस स्टैंड", "lat": 31.1040, "lng": 77.1680},
            {"name": "Victory Tunnel", "name_hi": "विक्ट्री टनल", "lat": 31.1070, "lng": 77.1720},
            {"name": "Lakkar Bazar", "name_hi": "लक्कड़ बाज़ार", "lat": 31.1080, "lng": 77.1780},
            {"name": "Sanjauli Chowk", "name_hi": "संजौली चौक", "lat": 31.1010, "lng": 77.1990},
            {"name": "Dhalli Tunnel Suburb", "name_hi": "ढल्ली टनल उपनगर", "lat": 31.1150, "lng": 77.2180},
        ],
    },
    # 20. Jammu & Kashmir (Srinagar) - JKSRTC
    {
        "number": "J1",
        "name": "Lal Chowk – Hazratbal",
        "name_hi": "लाल चौक – हज़रतबल",
        "state": "Jammu & Kashmir",
        "city": "Srinagar",
        "color": "#C04A00",
        "stops": [
            {"name": "Lal Chowk Ghanta Ghar", "name_hi": "लाल चौक घंटा घर", "lat": 34.0720, "lng": 74.8110},
            {"name": "Dalgate Dal Lake", "name_hi": "डलगेट डल झील", "lat": 34.0850, "lng": 74.8320},
            {"name": "Nishat Garden", "name_hi": "निशात बाग", "lat": 34.1240, "lng": 74.8820},
            {"name": "University of Kashmir", "name_hi": "कश्मीर विश्वविद्यालय", "lat": 34.1280, "lng": 74.8390},
            {"name": "Hazratbal Dargah", "name_hi": "हज़रतबल दरगाह", "lat": 34.1290, "lng": 74.8420},
        ],
    },
    # 21. Uttarakhand (Dehradun) - UTC
    {
        "number": "D1",
        "name": "ISBT Dehradun – Rajpur",
        "name_hi": "आईएसबीटी देहरादून – राजपुर",
        "state": "Uttarakhand",
        "city": "Dehradun",
        "color": "#7A2F00",
        "stops": [
            {"name": "ISBT Dehradun", "name_hi": "आईएसबीटी देहरादून", "lat": 30.2870, "lng": 77.9980},
            {"name": "Clock Tower Paltan Bazar", "name_hi": "क्लॉक टॉवर पलटन बाज़ार", "lat": 30.3250, "lng": 78.0410},
            {"name": "Survey Chowk", "name_hi": "सर्वे चौक", "lat": 30.3290, "lng": 78.0520},
            {"name": "Jakhan", "name_hi": "जाखन", "lat": 30.3640, "lng": 78.0770},
            {"name": "Rajpur Old Toll", "name_hi": "राजपुर ओल्ड टोल", "lat": 30.3880, "lng": 78.0960},
        ],
    },
    # 22. Jharkhand (Ranchi)
    {
        "number": "JH1",
        "name": "Kantatoli – Dhurwa",
        "name_hi": "कांटाटोली – धुर्वा",
        "state": "Jharkhand",
        "city": "Ranchi",
        "color": "#4A4A4A",
        "stops": [
            {"name": "Birsa Munda Bus Stand Kantatoli", "name_hi": "बिरसा मुंडा बस स्टैंड", "lat": 23.3640, "lng": 85.3450},
            {"name": "Albert Ekka Chowk", "name_hi": "अल्बर्ट एक्का चौक", "lat": 23.3680, "lng": 85.3250},
            {"name": "Doranda High Court", "name_hi": "डोरंडा उच्च न्यायालय", "lat": 23.3380, "lng": 85.3210},
            {"name": "HEC Sector 2", "name_hi": "एचईसी सेक्टर २", "lat": 23.3150, "lng": 85.2950},
            {"name": "Dhurwa Roundabout", "name_hi": "धुर्वा गोलचक्कर", "lat": 23.2970, "lng": 85.2790},
        ],
    },
    # 23. Chhattisgarh (Raipur)
    {
        "number": "CG1",
        "name": "Raipur Station – Naya Raipur Mantralaya",
        "name_hi": "रायपुर स्टेशन – नया रायपुर मंत्रालय",
        "state": "Chhattisgarh",
        "city": "Raipur",
        "color": "#B87503",
        "stops": [
            {"name": "Raipur Junction", "name_hi": "रायपुर जंक्शन", "lat": 21.2580, "lng": 81.6310},
            {"name": "Telibandha Anand Nagar", "name_hi": "तेलीबांधा आनंद नगर", "lat": 21.2380, "lng": 81.6700},
            {"name": "Magneto Mall", "name_hi": "मैग्नेटो मॉल", "lat": 21.2290, "lng": 81.7010},
            {"name": "Naya Raipur Mantralaya", "name_hi": "नया रायपुर मंत्रालय", "lat": 21.1630, "lng": 81.7820},
        ],
    },
    # 24. Chandigarh (UT) - CTU
    {
        "number": "3-CH",
        "name": "ISBT Sector 17 – PGI Hospital",
        "name_hi": "आईएसबीटी सेक्टर १७ – पीजीआई अस्पताल",
        "state": "Chandigarh",
        "city": "Chandigarh",
        "color": "#1B7F31",
        "stops": [
            {"name": "ISBT Sector 17", "name_hi": "आईएसबीटी सेक्टर १७", "lat": 30.7410, "lng": 76.7790},
            {"name": "Sector 22 Market", "name_hi": "सेक्टर २२ मार्केट", "lat": 30.7320, "lng": 76.7710},
            {"name": "Sector 15 Panjab University", "name_hi": "सेक्टर १५ पंजाब विश्वविद्यालय", "lat": 30.7570, "lng": 76.7680},
            {"name": "PGI Hospital Complex", "name_hi": "पीजीआई अस्पताल परिसर", "lat": 30.7660, "lng": 76.7760},
        ],
    },
    # 25. Meghalaya (Shillong)
    {
        "number": "ML1",
        "name": "Police Bazar – NEHU Campus",
        "name_hi": "पुलिस बाज़ार – नेहू कैंपस",
        "state": "Meghalaya",
        "city": "Shillong",
        "color": "#C04A00",
        "stops": [
            {"name": "Police Bazar Center", "name_hi": "पुलिस बाज़ार केंद्र", "lat": 25.5780, "lng": 91.8840},
            {"name": "Polo Grounds", "name_hi": "पोलो ग्राउंड्स", "lat": 25.5890, "lng": 91.8960},
            {"name": "Mawlai Mawdatbaki", "name_hi": "मावलई मावदत्बाकी", "lat": 25.6020, "lng": 91.8810},
            {"name": "NEHU Main Gate", "name_hi": "नेहू मुख्य द्वार", "lat": 25.6120, "lng": 91.8990},
        ],
    },
    # 26. Tripura (Agartala)
    {
        "number": "TR1",
        "name": "Motor Stand – MBB Airport",
        "name_hi": "मोटर स्टैंड – एमबीबी हवाई अड्डा",
        "state": "Tripura",
        "city": "Agartala",
        "color": "#D32F2F",
        "stops": [
            {"name": "Agartala Motor Stand", "name_hi": "अगरतला मोटर स्टैंड", "lat": 23.8340, "lng": 91.2820},
            {"name": "Radhanagar Bus Stand", "name_hi": "राधानगर बस स्टैंड", "lat": 23.8440, "lng": 91.2780},
            {"name": "Kunjaban Circuit House", "name_hi": "कुंजबन सर्किट हाउस", "lat": 23.8580, "lng": 91.2910},
            {"name": "MBB Airport Terminal", "name_hi": "एमबीबी हवाई अड्डा टर्मिनल", "lat": 23.8860, "lng": 91.2400},
        ],
    },
    # 27. Manipur (Imphal)
    {
        "number": "MN1",
        "name": "Kangla Fort – Manipur University",
        "name_hi": "कांग्ला फोर्ट – मणिपुर विश्वविद्यालय",
        "state": "Manipur",
        "city": "Imphal",
        "color": "#4A4A4A",
        "stops": [
            {"name": "Kangla Western Gate", "name_hi": "कांग्ला पश्चिमी द्वार", "lat": 24.8080, "lng": 93.9400},
            {"name": "Keishampat Junction", "name_hi": "कीशमपाट जंक्शन", "lat": 24.7950, "lng": 93.9310},
            {"name": "Singjamei Supermarket", "name_hi": "सिंगजामेई सुपरमार्केट", "lat": 24.7760, "lng": 93.9360},
            {"name": "Manipur University Canchipur", "name_hi": "मणिपुर विश्वविद्यालय", "lat": 24.7520, "lng": 93.9320},
        ],
    },
    # 28. Nagaland (Kohima)
    {
        "number": "NL1",
        "name": "NST Kohima – High School Junction",
        "name_hi": "एनएसटी कोहिमा – हाई स्कूल जंक्शन",
        "state": "Nagaland",
        "city": "Kohima",
        "color": "#1B7F31",
        "stops": [
            {"name": "NST Central Bus Station", "name_hi": "एनएसटी केंद्रीय बस स्टेशन", "lat": 25.6710, "lng": 94.1080},
            {"name": "Phoolbari PR Hill", "name_hi": "फूलबारी पीआर हिल", "lat": 25.6620, "lng": 94.1030},
            {"name": "High School Junction", "name_hi": "हाई स्कूल जंक्शन", "lat": 25.6940, "lng": 94.1120},
        ],
    },
    # 29. Sikkim (Gangtok)
    {
        "number": "SK1",
        "name": "Deorali Stand – Vajra Cinema",
        "name_hi": "देवराली स्टैंड – वज्र सिनेमा",
        "state": "Sikkim",
        "city": "Gangtok",
        "color": "#B87503",
        "stops": [
            {"name": "Deorali Taxi & Bus Stand", "name_hi": "देवराली टैक्सी एवं बस स्टैंड", "lat": 27.3190, "lng": 88.6080},
            {"name": "MG Marg Tourism Office", "name_hi": "एमजी मार्ग पर्यटन कार्यालय", "lat": 27.3290, "lng": 88.6130},
            {"name": "Paljor Stadium", "name_hi": "पाल्जोर स्टेडियम", "lat": 27.3340, "lng": 88.6140},
            {"name": "Vajra Cinema Hall", "name_hi": "वज्र सिनेमा हॉल", "lat": 27.3390, "lng": 88.6190},
        ],
    },
    # 30. Mizoram (Aizawl)
    {
        "number": "MZ1",
        "name": "Bawngkawn – Kulikawn",
        "name_hi": "बावंगकॉन – कुलिकॉन",
        "state": "Mizoram",
        "city": "Aizawl",
        "color": "#C04A00",
        "stops": [
            {"name": "Bawngkawn Junction", "name_hi": "बावंगकॉन जंक्शन", "lat": 23.7540, "lng": 92.7350},
            {"name": "Chanmari Point", "name_hi": "चनमारी पॉइंट", "lat": 23.7430, "lng": 92.7210},
            {"name": "Treasury Square", "name_hi": "ट्रेजरी स्क्वायर", "lat": 23.7310, "lng": 92.7170},
            {"name": "Kulikawn Suburb", "name_hi": "कुलिकॉन उपनगर", "lat": 23.7110, "lng": 92.7210},
        ],
    },
    # 31. Arunachal Pradesh (Itanagar)
    {
        "number": "AR1",
        "name": "Naharlagun Station – Ganga Market",
        "name_hi": "नाहरलगुन स्टेशन – गंगा मार्केट",
        "state": "Arunachal Pradesh",
        "city": "Itanagar",
        "color": "#7A2F00",
        "stops": [
            {"name": "Naharlagun Railway Station", "name_hi": "नाहरलगुन रेलवे स्टेशन", "lat": 27.1060, "lng": 93.6890},
            {"name": "Model Village", "name_hi": "मॉडल विलेज", "lat": 27.1020, "lng": 93.6480},
            {"name": "Bank Tinali", "name_hi": "बैंक तिनाली", "lat": 27.0980, "lng": 93.6210},
            {"name": "Ganga Market Itanagar", "name_hi": "गंगा मार्केट ईटानगर", "lat": 27.0910, "lng": 93.6060},
        ],
    },
    # 32. Puducherry (UT)
    {
        "number": "PY1",
        "name": "New Bus Stand – JIPMER Hospital",
        "name_hi": "न्यू बस स्टैंड – जिपमेर अस्पताल",
        "state": "Puducherry",
        "city": "Puducherry",
        "color": "#1B7F31",
        "stops": [
            {"name": "New Bus Stand Maraimalai", "name_hi": "न्यू बस स्टैंड", "lat": 11.9360, "lng": 79.8140},
            {"name": "Anna Salai Signal", "name_hi": "अन्ना सलाई सिग्नल", "lat": 11.9390, "lng": 79.8270},
            {"name": "Promenade Beach Goubert", "name_hi": "प्रोमेनेड बीच", "lat": 11.9330, "lng": 79.8350},
            {"name": "JIPMER Hospital Campus", "name_hi": "जिपमेर अस्पताल परिसर", "lat": 11.9540, "lng": 79.7990},
        ],
    },
    # 33. Ladakh (UT)
    {
        "number": "LD1",
        "name": "Leh Bus Stand – Spituk Monastery",
        "name_hi": "लेह बस स्टैंड – स्पितुक मठ",
        "state": "Ladakh",
        "city": "Leh",
        "color": "#4A4A4A",
        "stops": [
            {"name": "Leh Main Bus Stand", "name_hi": "लेह मेन बस स्टैंड", "lat": 34.1590, "lng": 77.5810},
            {"name": "Skara Chowk", "name_hi": "स्करा चौक", "lat": 34.1480, "lng": 77.5720},
            {"name": "Kushok Bakula Airport", "name_hi": "कुशोक बकुला हवाई अड्डा", "lat": 34.1350, "lng": 77.5460},
            {"name": "Spituk Monastery Gate", "name_hi": "स्पितुक मठ द्वार", "lat": 34.1290, "lng": 77.5310},
        ],
    },
    # 34. Andaman & Nicobar (UT)
    {
        "number": "AN1",
        "name": "Mohanpura – Cellular Jail – Corbyn's Cove",
        "name_hi": "मोहनपुरा – सेल्यूलर जेल – कॉर्बिन्स कोव",
        "state": "Andaman & Nicobar",
        "city": "Port Blair",
        "color": "#D32F2F",
        "stops": [
            {"name": "Mohanpura Central Bus Terminus", "name_hi": "मोहनपुरा सेंट्रल बस टर्मिनस", "lat": 11.6660, "lng": 92.7420},
            {"name": "Aberdeen Bazar Clock Tower", "name_hi": "एबरडीन बाज़ार क्लॉक टॉवर", "lat": 11.6640, "lng": 92.7440},
            {"name": "Cellular Jail National Memorial", "name_hi": "सेल्यूलर जेल राष्ट्रीय स्मारक", "lat": 11.6730, "lng": 92.7470},
            {"name": "Corbyn's Cove Beach", "name_hi": "कॉर्बिन्स कोव बीच", "lat": 11.6420, "lng": 92.7480},
        ],
    },
]

from nationwide_routes import NATIONWIDE_ROUTES
SEED_ROUTES = NATIONWIDE_ROUTES


def build_route_doc(number: str, name: str, name_hi: str, color: str, stops_in: List[dict], state: Optional[str] = None, city: Optional[str] = None) -> dict:
    """Builds a route document with stops (ids, dist_along) and a 100% road-snapped GeoJSON LineString path."""
    stops: List[dict] = []
    
    # Check if precomputed high-density OSRM real road coordinates exist
    if number in OSRM_CACHE:
        cached = OSRM_CACHE[number]
        coords = cached["coordinates"]
        snapped = cached.get("snapped", [])
        for i, s in enumerate(stops_in):
            snap_coord = snapped[i] if i < len(snapped) else [s["lng"], s["lat"]]
            stops.append({
                "id": str(uuid.uuid4()),
                "name": s["name"],
                "name_hi": s.get("name_hi") or "",
                "lat": snap_coord[1],
                "lng": snap_coord[0],
                "path_index": 0,
                "dist_along": 0.0
            })
        base_route = {
            "id": str(uuid.uuid4()),
            "number": number,
            "name": name,
            "name_hi": name_hi,
            "color": color,
            "state": state or "National / Inter-City",
            "city": city or "",
            "origin": stops_in[0]["name"] if stops_in else "",
            "destination": stops_in[-1]["name"] if stops_in else "",
            "stops": stops,
            "active": True,
            "created_at": now_iso()
        }
        return apply_road_path(base_route, coords, snapped)

    # Clean road-interpolated fallback (ZERO random jitter, stays along direct bearing)
    coords: List[List[float]] = []
    for i, s in enumerate(stops_in):
        if i > 0:
            prev = stops_in[i - 1]
            for k in range(1, 4):
                t = k / 4
                lat = prev["lat"] + (s["lat"] - prev["lat"]) * t
                lng = prev["lng"] + (s["lng"] - prev["lng"]) * t
                coords.append([round(lng, 6), round(lat, 6)])
        coords.append([s["lng"], s["lat"]])
        stops.append({
            "id": str(uuid.uuid4()),
            "name": s["name"],
            "name_hi": s.get("name_hi") or "",
            "lat": s["lat"],
            "lng": s["lng"],
            "path_index": len(coords) - 1,
        })
    cum = [0.0]
    for i in range(1, len(coords)):
        cum.append(cum[-1] + haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]))
    for s in stops:
        s["dist_along"] = round(cum[s["path_index"]], 1)
    return {
        "id": str(uuid.uuid4()),
        "number": number,
        "name": name,
        "name_hi": name_hi,
        "color": color,
        "state": state or "National / Inter-City",
        "city": city or "",
        "origin": stops_in[0]["name"] if stops_in else "",
        "destination": stops_in[-1]["name"] if stops_in else "",
        "stops": stops,
        "path": {"type": "LineString", "coordinates": coords},
        "length_m": round(cum[-1], 1),
        "path_source": "straight",
        "active": True,
        "created_at": now_iso(),
    }


def apply_road_path(route: dict, coords: List[List[float]], snapped: Optional[List[List[float]]] = None) -> dict:
    """Replace a route's path with real road geometry (e.g. from OSRM). Keeps ids.
    `snapped` = per-stop [lng, lat] road-snapped locations (optional)."""
    cum = [0.0]
    for i in range(1, len(coords)):
        cum.append(cum[-1] + haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]))
    last_idx = 0
    for n, s in enumerate(route["stops"]):
        if snapped and n < len(snapped):
            s["lng"], s["lat"] = snapped[n][0], snapped[n][1]
        # nearest vertex after the previous stop's vertex (keeps order monotonic)
        best_i, best_d = last_idx, float("inf")
        for i in range(last_idx, len(coords)):
            d = haversine(s["lat"], s["lng"], coords[i][1], coords[i][0])
            if d < best_d:
                best_d, best_i = d, i
        if n == len(route["stops"]) - 1:
            best_i = len(coords) - 1
        s["path_index"] = best_i
        s["dist_along"] = round(cum[best_i], 1)
        last_idx = best_i
    route["path"] = {"type": "LineString", "coordinates": coords}
    route["length_m"] = round(cum[-1], 1)
    route["path_source"] = "osrm"
    return route


# ---------------------------------------------------------------------------
# Fares & timetable helpers
# ---------------------------------------------------------------------------
FARE_MIN_INR = 10
FARE_PER_KM_INR = 1.15


def fare_for_km(km: float) -> int:
    raw = km * FARE_PER_KM_INR + 3
    return int(max(FARE_MIN_INR, math.ceil(raw / 5) * 5))


def fmt_hhmm(minutes: float) -> str:
    m = int(round(minutes)) % (24 * 60)
    return f"{m // 60:02d}:{m % 60:02d}"


STATE_PLATE_PREFIX = {
    "Delhi": "DL01",
    "Maharashtra": "MH01",
    "Karnataka": "KA01",
    "Tamil Nadu": "TN01",
    "West Bengal": "WB01",
    "Gujarat": "GJ01",
    "Telangana": "TS09",
    "Kerala": "KL01",
    "Rajasthan": "RJ14",
    "Uttar Pradesh": "UP32",
    "Chandigarh": "CH01",
    "Punjab": "PB65",
    "Bihar": "BR01",
    "Madhya Pradesh": "MP04",
    "Odisha": "OD02",
    "Assam": "AS01",
    "Andhra Pradesh": "AP39",
    "Goa": "GA07",
    "Himachal Pradesh": "HP01",
    "Jammu & Kashmir": "JK01",
    "Uttarakhand": "UK07",
    "Jharkhand": "JH01",
    "Haryana": "HR26",
    "Chhattisgarh": "CG04",
    "Tripura": "TR01",
    "Meghalaya": "ML05",
    "Manipur": "MN01",
    "Nagaland": "NL01",
    "Sikkim": "SK01",
    "Mizoram": "MZ01",
    "Arunachal Pradesh": "AR01",
    "Puducherry": "PY01",
    "Ladakh": "LA01",
    "Andaman & Nicobar": "AN01",
}

INDIAN_DRIVERS = [
    {"name": "Rajesh Kumar", "phone": "+91 98112 45891", "depot": "Mayapuri Bus Depot, Delhi"},
    {"name": "Suresh Patil", "phone": "+91 98203 76124", "depot": "Wadala Depot, Mumbai"},
    {"name": "Manoj Gowda", "phone": "+91 94480 32189", "depot": "Majestic Depot 1, Bengaluru"},
    {"name": "Deepak Sharma", "phone": "+91 97170 88231", "depot": "Sarai Kale Khan Terminal, Delhi"},
    {"name": "Vikram Rathore", "phone": "+91 94140 65320", "depot": "Vidyadhar Nagar Depot, Jaipur"},
    {"name": "Anil Mukherjee", "phone": "+91 98301 44902", "depot": "Belghoria Central Depot, Kolkata"},
    {"name": "Sunil Yadav", "phone": "+91 98290 11983", "depot": "Alambagh Depot, Lucknow"},
    {"name": "Praveen Menon", "phone": "+91 94470 55812", "depot": "East Fort Central Station, Thiruvananthapuram"},
    {"name": "Ashok Reddy", "phone": "+91 98490 22345", "depot": "Ranigunj Depot 1, Hyderabad"},
    {"name": "Gopalakrishnan S.", "phone": "+91 94440 88123", "depot": "Broadway Bus Depot, Chennai"},
    {"name": "Mukesh Solanki", "phone": "+91 98250 99401", "depot": "Vasna Terminus, Ahmedabad"},
    {"name": "Jagdish Singh", "phone": "+91 98720 33412", "depot": "Sector 43 ISBT, Chandigarh"},
    {"name": "Dharmendra Mishra", "phone": "+91 94310 77621", "depot": "Bankipore Bus Stand, Patna"},
    {"name": "Sanjay Verma", "phone": "+91 98260 44510", "depot": "Bairagarh Sub-Depot, Bhopal"},
    {"name": "Ramesh Mahapatra", "phone": "+91 94370 12890", "depot": "Master Canteen Depot, Bhubaneswar"},
    {"name": "Bipul Kalita", "phone": "+91 98640 76231", "depot": "Paltan Bazar ASTC Yard, Guwahati"},
    {"name": "Satish Naidu", "phone": "+91 98480 43210", "depot": "Dwaraka Complex Depot, Visakhapatnam"},
    {"name": "Joaquim Fernandes", "phone": "+91 98221 67890", "depot": "Panaji KTC Terminus, Goa"},
    {"name": "Lalit Thakur", "phone": "+91 94180 54321", "depot": "Old Bus Stand Yard, Shimla"},
    {"name": "Ghulam Nabi Mir", "phone": "+91 94190 89012", "depot": "Batamaloo Central Stand, Srinagar"},
    {"name": "Devendra Rawat", "phone": "+91 94120 34567", "depot": "ISBT Dehradun Depot, Dehradun"},
    {"name": "Kishore Tirkey", "phone": "+91 94311 98765", "depot": "Kantatoli Central Depot, Ranchi"},
    {"name": "Tenzing Namgyal", "phone": "+91 94340 12345", "depot": "Deorali Transport Yard, Gangtok"},
    {"name": "Lalrinawma Ralte", "phone": "+91 94361 23456", "depot": "Chanmari Stand, Aizawl"},
    {"name": "Tage Lobsang", "phone": "+91 94360 34567", "depot": "Naharlagun Yard, Itanagar"},
    {"name": "V. Subramanian", "phone": "+91 94430 45678", "depot": "Maraimalai Adigal Stand, Puducherry"},
    {"name": "Rigzin Dorje", "phone": "+91 94191 56789", "depot": "Leh Bus Stand Depot, Ladakh"},
    {"name": "M. Selvam", "phone": "+91 94342 67890", "depot": "Mohanpura Central Yard, Port Blair"},
]

INDIAN_CONDUCTORS = [
    {"name": "Amit Deshmukh", "phone": "+91 97654 32190"},
    {"name": "Rohit Bhatt", "phone": "+91 98987 65432"},
    {"name": "Vinod Pillai", "phone": "+91 94461 23987"},
    {"name": "Pankaj Tiwari", "phone": "+91 94501 87654"},
    {"name": "Santosh Nayak", "phone": "+91 94371 45678"},
    {"name": "Ajay Chhetri", "phone": "+91 98320 67891"},
    {"name": "Mohan Lal", "phone": "+91 94181 98765"},
    {"name": "Kishore Kumar", "phone": "+91 98271 23456"},
    {"name": "Hemant Bora", "phone": "+91 98641 54321"},
    {"name": "Arun Swaminathan", "phone": "+91 94441 78901"},
]


class BusState:
    def __init__(self, route: dict, dist: float, direction: int, plate: Optional[str] = None,
                 driver: Optional[str] = None, driver_phone: Optional[str] = None,
                 conductor: Optional[str] = None, conductor_phone: Optional[str] = None,
                 depot_address: Optional[str] = None, status: str = "in_service",
                 schedule: Optional[str] = None, capacity: int = 42,
                 passengers_opted_in: Optional[int] = None):
        self.id = str(uuid.uuid4())
        self.route_id = route["id"]
        state_name = route.get("state", "Delhi")
        prefix = STATE_PLATE_PREFIX.get(state_name, "DL01")
        self.plate = plate or f"{prefix} {random.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')}{random.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')} {random.randint(1000, 9999)}"
        
        drv_template = random.choice(INDIAN_DRIVERS)
        cnd_template = random.choice(INDIAN_CONDUCTORS)
        self.driver = driver or drv_template["name"]
        self.driver_phone = driver_phone or drv_template["phone"]
        self.conductor = conductor or cnd_template["name"]
        self.conductor_phone = conductor_phone or cnd_template["phone"]
        self.depot_address = depot_address or drv_template["depot"]
        
        self.status = status  # in_service, on_time, delayed, maintenance
        self.capacity = capacity
        self.passengers_opted_in = passengers_opted_in if passengers_opted_in is not None else random.randint(14, 28)
        self.schedule = schedule or "Regular Service (15-20 min)"
        self.updated_at = now_iso()
        self.dist = dist  # metres along path
        self.direction = direction  # +1 forward, -1 backward
        self.speed = DEFAULT_SPEED_MPS * random.uniform(0.85, 1.15)
        self.dwell_until = 0.0
        self.lat = 0.0
        self.lng = 0.0
        self.heading = 0.0
        self.sos: Optional[dict] = None
        self.last_stop_idx: Optional[int] = None
        self.driver_id: Optional[str] = None
        self._recompute_occupancy()

    def _recompute_occupancy(self):
        ratio = self.passengers_opted_in / max(1, self.capacity)
        if ratio < 0.35:
            self.occupancy = "seats_available"
        elif ratio < 0.70:
            self.occupancy = "low"
        elif ratio < 0.95:
            self.occupancy = "medium"
        else:
            self.occupancy = "standing_only"

    def opt_in(self) -> int:
        if self.passengers_opted_in < self.capacity + 15:
            self.passengers_opted_in += 1
        self._recompute_occupancy()
        self.updated_at = now_iso()
        return self.passengers_opted_in

    def opt_out(self) -> int:
        if self.passengers_opted_in > 0:
            self.passengers_opted_in -= 1
        self._recompute_occupancy()
        self.updated_at = now_iso()
        return self.passengers_opted_in


class Engine:
    def __init__(self, speed_factor: float = 3.0):
        self.routes: Dict[str, dict] = {}
        self.cum: Dict[str, List[float]] = {}
        self.buses: Dict[str, BusState] = {}
        self.drivers: Dict[str, dict] = {}
        self.seg_speed: Dict[str, List[float]] = {}  # learned avg speed per segment (between stops)
        self.speed_factor = speed_factor
        self.db = None
        self.tick_count = 0
        self.listeners: List[asyncio.Queue] = []
        self.sim_time = 0.0

    # ---- setup -----------------------------------------------------------
    def _register_route(self, route: dict):
        coords = route["path"]["coordinates"]
        cum = [0.0]
        for i in range(1, len(coords)):
            cum.append(cum[-1] + haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]))
        self.routes[route["id"]] = route
        self.cum[route["id"]] = cum
        self.seg_speed[route["id"]] = [DEFAULT_SPEED_MPS] * max(1, len(route["stops"]) - 1)

    def _register_driver_for_bus(self, bus: BusState):
        route = self.routes.get(bus.route_id, {})
        driver_id = str(uuid.uuid4())
        bus.driver_id = driver_id
        self.drivers[driver_id] = {
            "id": driver_id,
            "name": bus.driver,
            "phone": bus.driver_phone,
            "conductor_name": bus.conductor,
            "conductor_phone": bus.conductor_phone,
            "depot_address": bus.depot_address,
            "route_id": bus.route_id,
            "route_number": route.get("number", ""),
            "route_name": route.get("name", ""),
            "bus_id": bus.id,
            "bus_plate": bus.plate,
            "state": route.get("state", "Delhi"),
            "city": route.get("city", "Delhi"),
            "badge_id": f"DRV-{random.randint(1000, 9999)}",
            "status": "on_duty" if bus.status != "maintenance" else "off_duty",
            "lat": bus.lat,
            "lng": bus.lng,
            "updated_at": now_iso(),
        }

    def add_route(self, route: dict, bus_count: int = 2):
        self._register_route(route)
        length = self.cum[route["id"]][-1]
        for i in range(bus_count):
            bus = BusState(route, dist=length * (i / bus_count), direction=1 if i % 2 == 0 else -1)
            self._place(bus)
            self.buses[bus.id] = bus
            self._register_driver_for_bus(bus)

    def add_bus(self, route_id: str, plate: Optional[str] = None, driver: Optional[str] = None,
                driver_phone: Optional[str] = None, conductor: Optional[str] = None,
                conductor_phone: Optional[str] = None, depot_address: Optional[str] = None,
                status: str = "in_service", schedule: Optional[str] = None, capacity: int = 42) -> Optional[BusState]:
        route = self.routes.get(route_id)
        if not route:
            return None
        bus = BusState(route, dist=random.uniform(0, self.cum[route_id][-1]), direction=random.choice([1, -1]),
                       plate=plate, driver=driver, driver_phone=driver_phone, conductor=conductor,
                       conductor_phone=conductor_phone, depot_address=depot_address, status=status,
                       schedule=schedule, capacity=capacity)
        self._place(bus)
        self.buses[bus.id] = bus
        self._register_driver_for_bus(bus)
        return bus

    def update_bus(self, bus_id: str, patch: dict) -> Optional[BusState]:
        bus = self.buses.get(bus_id)
        if not bus:
            return None
        if "plate" in patch and patch["plate"]:
            bus.plate = patch["plate"]
        if "driver" in patch and patch["driver"]:
            bus.driver = patch["driver"]
        if "driver_phone" in patch and patch["driver_phone"]:
            bus.driver_phone = patch["driver_phone"]
        if "conductor" in patch and patch["conductor"]:
            bus.conductor = patch["conductor"]
        if "conductor_phone" in patch and patch["conductor_phone"]:
            bus.conductor_phone = patch["conductor_phone"]
        if "status" in patch and patch["status"]:
            bus.status = patch["status"]
        if "schedule" in patch and patch["schedule"]:
            bus.schedule = patch["schedule"]
        if "occupancy" in patch and patch["occupancy"]:
            bus.occupancy = patch["occupancy"]
        if "capacity" in patch and patch["capacity"] is not None:
            bus.capacity = int(patch["capacity"])
            bus._recompute_occupancy()
        if "passengers_opted_in" in patch and patch["passengers_opted_in"] is not None:
            bus.passengers_opted_in = int(patch["passengers_opted_in"])
            bus._recompute_occupancy()
        if "route_id" in patch and patch["route_id"] and patch["route_id"] in self.routes and patch["route_id"] != bus.route_id:
            bus.route_id = patch["route_id"]
            bus.dist = 0.0
            bus.direction = 1
            self._place(bus)
        bus.updated_at = now_iso()
        
        # update driver record if linked
        if bus.driver_id and bus.driver_id in self.drivers:
            drv = self.drivers[bus.driver_id]
            drv["name"] = bus.driver
            drv["phone"] = bus.driver_phone
            drv["conductor_name"] = bus.conductor
            drv["conductor_phone"] = bus.conductor_phone
            drv["bus_plate"] = bus.plate
            drv["status"] = "on_duty" if bus.status != "maintenance" else "off_duty"
            drv["updated_at"] = bus.updated_at
        return bus

    def remove_bus(self, bus_id: str) -> bool:
        if bus_id in self.buses:
            bus = self.buses.pop(bus_id)
            if bus.driver_id and bus.driver_id in self.drivers:
                self.drivers.pop(bus.driver_id, None)
            return True
        return False

    def remove_route(self, route_id: str):
        self.routes.pop(route_id, None)
        self.cum.pop(route_id, None)
        self.seg_speed.pop(route_id, None)
        for bid in [b for b, s in self.buses.items() if s.route_id == route_id]:
            self.remove_bus(bid)

    # ---- drivers directory management ------------------------------------
    def get_drivers(self) -> List[dict]:
        return list(self.drivers.values())

    def create_driver(self, data: dict) -> dict:
        driver_id = str(uuid.uuid4())
        drv = {
            "id": driver_id,
            "name": data.get("name", "Driver"),
            "phone": data.get("phone", "+91 98000 00000"),
            "conductor_name": data.get("conductor_name", ""),
            "conductor_phone": data.get("conductor_phone", ""),
            "depot_address": data.get("depot_address", "Central Transport Depot"),
            "route_id": data.get("route_id"),
            "route_number": data.get("route_number", ""),
            "route_name": data.get("route_name", ""),
            "bus_id": data.get("bus_id"),
            "bus_plate": data.get("bus_plate", ""),
            "state": data.get("state", "Delhi"),
            "city": data.get("city", "Delhi"),
            "badge_id": data.get("badge_id") or f"DRV-{random.randint(1000, 9999)}",
            "status": data.get("status", "on_duty"),
            "lat": float(data.get("lat") or 28.6139),
            "lng": float(data.get("lng") or 77.2090),
            "updated_at": now_iso(),
        }
        self.drivers[driver_id] = drv
        return drv

    def update_driver(self, driver_id: str, patch: dict) -> Optional[dict]:
        drv = self.drivers.get(driver_id)
        if not drv:
            return None
        for k, v in patch.items():
            if v is not None and k != "id":
                drv[k] = v
        drv["updated_at"] = now_iso()

        # If location changed and driver is assigned to an active bus, update the bus location
        bus_id = drv.get("bus_id")
        if bus_id and bus_id in self.buses:
            bus = self.buses[bus_id]
            if "name" in patch:
                bus.driver = patch["name"]
            if "phone" in patch:
                bus.driver_phone = patch["phone"]
            if "conductor_name" in patch:
                bus.conductor = patch["conductor_name"]
            if "conductor_phone" in patch:
                bus.conductor_phone = patch["conductor_phone"]
            if "lat" in patch and "lng" in patch and patch["lat"] is not None and patch["lng"] is not None:
                bus.lat = float(patch["lat"])
                bus.lng = float(patch["lng"])
                # Snap distance along route to closest coordinate
                if bus.route_id in self.routes:
                    coords = self.routes[bus.route_id]["path"]["coordinates"]
                    cum = self.cum[bus.route_id]
                    best_d, best_i = float("inf"), 0
                    for i, c in enumerate(coords):
                        d = haversine(bus.lat, bus.lng, c[1], c[0])
                        if d < best_d:
                            best_d, best_i = d, i
                    bus.dist = cum[best_i]
                bus.updated_at = now_iso()
        return drv

    def delete_driver(self, driver_id: str) -> bool:
        if driver_id in self.drivers:
            del self.drivers[driver_id]
            return True
        return False

    # ---- commuter opt-in / opt-out ---------------------------------------
    def opt_in_passenger(self, bus_id: str) -> Optional[dict]:
        bus = self.buses.get(bus_id)
        if not bus:
            return None
        bus.opt_in()
        return self.bus_dict(bus)

    def opt_out_passenger(self, bus_id: str) -> Optional[dict]:
        bus = self.buses.get(bus_id)
        if not bus:
            return None
        bus.opt_out()
        return self.bus_dict(bus)

    async def load(self, db, snap_fn=None):
        self.db = db
        routes = await db.routes.find({"active": True}, {"_id": 0}).to_list(1000)
        existing_numbers = {r.get("number") for r in routes}
        for r in SEED_ROUTES:
            if r["number"] not in existing_numbers:
                doc = build_route_doc(r["number"], r["name"], r["name_hi"], r["color"], r["stops"], state=r.get("state"), city=r.get("city"))
                await db.routes.insert_one(dict(doc))
                routes.append(doc)
            else:
                existing_doc = next(x for x in routes if x.get("number") == r["number"])
                if not existing_doc.get("state") or not existing_doc.get("city"):
                    existing_doc["state"] = r.get("state", "")
                    existing_doc["city"] = r.get("city", "")
                    await db.routes.update_one({"number": r["number"]}, {"$set": {"state": r.get("state", ""), "city": r.get("city", "")}})
        logger.info("Seeded %d routes", len(routes))
        if snap_fn:
            sem = asyncio.Semaphore(10)

            async def _snap(r):
                if r.get("path_source") != "osrm":
                    async with sem:
                        try:
                            coords, snapped = await snap_fn([[s["lng"], s["lat"]] for s in r["stops"]])
                            apply_road_path(r, coords, snapped)
                            await db.routes.update_one({"id": r["id"]}, {"$set": {"path": r["path"], "stops": r["stops"], "length_m": r["length_m"], "path_source": "osrm"}})
                            logger.info("Snapped route %s to roads (%d pts)", r["number"], len(coords))
                        except Exception as exc:
                            logger.warning("OSRM snap failed for %s: %s", r["number"], exc)

            await asyncio.gather(*[_snap(r) for r in routes])

        for r in routes:
            stops_count = len(r.get("stops", []))
            if stops_count <= 4:
                b_count = 3
            elif stops_count <= 5:
                b_count = 4
            elif stops_count <= 7:
                b_count = 5
            elif stops_count <= 9:
                b_count = 6
            else:
                b_count = 8
            self.add_route(r, bus_count=b_count)
        logger.info("Engine loaded %d routes, %d buses", len(self.routes), len(self.buses))

    # ---- geometry ---------------------------------------------------------
    def _place(self, bus: BusState):
        coords = self.routes[bus.route_id]["path"]["coordinates"]
        cum = self.cum[bus.route_id]
        d = max(0.0, min(bus.dist, cum[-1]))
        i = 0
        while i < len(cum) - 2 and cum[i + 1] < d:
            i += 1
        seg = cum[i + 1] - cum[i]
        t = 0.0 if seg == 0 else (d - cum[i]) / seg
        (lng1, lat1), (lng2, lat2) = coords[i], coords[i + 1]
        bus.lat = lat1 + (lat2 - lat1) * t
        bus.lng = lng1 + (lng2 - lng1) * t
        hb = bearing(lat1, lng1, lat2, lng2)
        bus.heading = hb if bus.direction == 1 else (hb + 180) % 360
        if bus.driver_id and bus.driver_id in self.drivers:
            drv = self.drivers[bus.driver_id]
            drv["lat"] = round(bus.lat, 6)
            drv["lng"] = round(bus.lng, 6)
            drv["updated_at"] = bus.updated_at

    def _segment_index(self, route_id: str, dist: float) -> int:
        stops = self.routes[route_id]["stops"]
        for i in range(len(stops) - 1):
            if stops[i]["dist_along"] <= dist <= stops[i + 1]["dist_along"]:
                return i
        return max(0, len(stops) - 2)

    # ---- simulation -------------------------------------------------------
    def tick(self, dt: float):
        self.tick_count += 1
        self.sim_time += dt * self.speed_factor
        for bus in self.buses.values():
            route = self.routes.get(bus.route_id)
            if not route:
                continue
            if getattr(bus, "status", "in_service") == "maintenance":
                bus.speed = 0.0
                continue
            if self.sim_time < bus.dwell_until:
                continue
            length = self.cum[bus.route_id][-1]
            # small speed variation to feel realistic
            bus.speed = max(4.0, min(16.0, bus.speed + random.uniform(-0.4, 0.4)))
            step = bus.speed * dt * self.speed_factor
            prev = bus.dist
            bus.dist += step * bus.direction
            # learn segment speed (EMA)
            seg = self._segment_index(bus.route_id, prev)
            ss = self.seg_speed[bus.route_id]
            ss[seg] = ss[seg] * 0.95 + bus.speed * 0.05
            # arrived at a stop? -> dwell
            for idx, s in enumerate(route["stops"]):
                crossed = (prev < s["dist_along"] <= bus.dist) if bus.direction == 1 else (bus.dist <= s["dist_along"] < prev)
                if crossed and bus.last_stop_idx != idx:
                    bus.dist = s["dist_along"]
                    bus.last_stop_idx = idx
                    bus.dwell_until = self.sim_time + DWELL_SECONDS
                    break
            if bus.dist >= length:
                bus.dist = length
                bus.direction = -1
                bus.dwell_until = self.sim_time + DWELL_SECONDS * 2
            elif bus.dist <= 0:
                bus.dist = 0
                bus.direction = 1
                bus.dwell_until = self.sim_time + DWELL_SECONDS * 2
            self._place(bus)
            bus.updated_at = now_iso()

    # ---- ETA -------------------------------------------------------------
    def stops_ahead(self, bus: BusState) -> List[dict]:
        """Stops ahead of the bus in travel direction with eta_s (uses learned segment speeds)."""
        route = self.routes[bus.route_id]
        stops = route["stops"]
        ss = self.seg_speed[bus.route_id]
        ahead = [s for s in stops if (s["dist_along"] > bus.dist + 1 if bus.direction == 1 else s["dist_along"] < bus.dist - 1)]
        if bus.direction == -1:
            ahead = list(reversed(ahead))
        out = []
        pos = bus.dist
        eta = max(0.0, bus.dwell_until - self.sim_time)
        for n, s in enumerate(ahead):
            seg_i = self._segment_index(bus.route_id, (pos + s["dist_along"]) / 2)
            spd = max(2.0, ss[seg_i])
            eta += abs(s["dist_along"] - pos) / spd
            if n > 0:
                eta += DWELL_SECONDS
            pos = s["dist_along"]
            out.append({"stop_id": s["id"], "name": s["name"], "name_hi": s["name_hi"], "eta_s": int(eta / self.speed_factor * self.speed_factor)})
        return out

    def next_stop_only(self, bus: BusState) -> Optional[dict]:
        route = self.routes.get(bus.route_id)
        if not route or not route.get("stops"):
            return None
        stops = route["stops"]
        ahead = [s for s in stops if (s["dist_along"] > bus.dist + 1 if bus.direction == 1 else s["dist_along"] < bus.dist - 1)]
        if not ahead:
            return None
        s = ahead[0] if bus.direction == 1 else ahead[-1]
        spd = max(2.0, self.seg_speed[bus.route_id][0]) if bus.route_id in self.seg_speed and len(self.seg_speed[bus.route_id]) > 0 else 8.0
        eta = max(0.0, bus.dwell_until - self.sim_time) + abs(s["dist_along"] - bus.dist) / spd
        return {"stop_id": s["id"], "name": s["name"], "name_hi": s.get("name_hi", ""), "eta_s": int(eta)}

    def bus_dict(self, bus: BusState, with_etas: bool = False) -> dict:
        route = self.routes[bus.route_id]
        if with_etas:
            ahead = self.stops_ahead(bus)
            next_stop = ahead[0] if ahead else None
        else:
            ahead = None
            next_stop = self.next_stop_only(bus)
        d = {
            "id": bus.id,
            "route_id": bus.route_id,
            "route_number": route["number"],
            "route_name": route["name"],
            "route_name_hi": route["name_hi"],
            "color": route["color"],
            "state": route.get("state", ""),
            "city": route.get("city", ""),
            "plate": bus.plate,
            "driver": bus.driver,
            "driver_phone": getattr(bus, "driver_phone", "+91 98112 45891"),
            "conductor": getattr(bus, "conductor", "Amit Deshmukh"),
            "conductor_phone": getattr(bus, "conductor_phone", "+91 97654 32190"),
            "depot_address": getattr(bus, "depot_address", "Central Transport Depot"),
            "driver_id": getattr(bus, "driver_id", None),
            "status": getattr(bus, "status", "in_service"),
            "occupancy": getattr(bus, "occupancy", "seats_available"),
            "capacity": getattr(bus, "capacity", 42),
            "passengers_opted_in": getattr(bus, "passengers_opted_in", 18),
            "schedule": getattr(bus, "schedule", "Regular Service"),
            "updated_at": getattr(bus, "updated_at", now_iso()),
            "lat": round(bus.lat, 6),
            "lng": round(bus.lng, 6),
            "heading": round(bus.heading),
            "speed_kmph": round(bus.speed * 3.6) if getattr(bus, "status", "in_service") != "maintenance" else 0,
            "direction": bus.direction,
            "dist_along": round(bus.dist),
            "dwelling": self.sim_time < bus.dwell_until,
            "next_stop": next_stop,
            "terminus": (route["stops"][-1] if bus.direction == 1 else route["stops"][0])["name"],
            "terminus_hi": (route["stops"][-1] if bus.direction == 1 else route["stops"][0])["name_hi"],
            "sos": bus.sos,
        }
        if with_etas:
            d["etas"] = ahead
        return d

    def snapshot(self, state: Optional[str] = None, lat: Optional[float] = None, lng: Optional[float] = None, radius_km: Optional[float] = None) -> dict:
        buses = []
        radius_m = (radius_km * 1000.0) if radius_km else None
        for b in self.buses.values():
            if b.route_id not in self.routes:
                continue
            r = self.routes[b.route_id]
            if state and state.lower() != "all" and (r.get("state") or "").lower() != state.lower():
                continue
            if lat is not None and lng is not None and radius_m is not None:
                if haversine(lat, lng, b.lat, b.lng) > radius_m:
                    continue
            buses.append(self.bus_dict(b, with_etas=False))
        return {
            "ts": now_iso(),
            "buses": buses,
            "bunching": self.bunching() if not state else [],
        }

    def nearby_buses(self, lat: float, lng: float, radius_km: float = 50.0, limit: int = 10) -> List[dict]:
        radius_m = radius_km * 1000.0
        results = []
        for b in self.buses.values():
            if b.route_id not in self.routes:
                continue
            dist_m = haversine(lat, lng, b.lat, b.lng)
            if dist_m <= radius_m:
                b_data = self.bus_dict(b, with_etas=False)
                b_data["distance_m"] = round(dist_m)
                results.append(b_data)
        results.sort(key=lambda x: x["distance_m"])
        return results[:limit]

    def route_etas(self, route_id: str) -> dict:
        """Per-stop best ETA and per-bus ETAs for a route."""
        route = self.routes.get(route_id)
        if not route:
            return {"stops": [], "buses": []}
        buses = [self.bus_dict(b, with_etas=True) for b in self.buses.values() if b.route_id == route_id]
        stops_out = []
        for s in route["stops"]:
            best = None
            for b in buses:
                for e in b["etas"]:
                    if e["stop_id"] == s["id"] and (best is None or e["eta_s"] < best["eta_s"]):
                        best = {"eta_s": e["eta_s"], "bus_id": b["id"], "plate": b["plate"], "terminus": b["terminus"], "terminus_hi": b["terminus_hi"]}
            stops_out.append({**s, "best": best})
        return {"stops": stops_out, "buses": buses}

    # ---- analytics -------------------------------------------------------
    def bunching(self, threshold_s: float = 60.0) -> List[dict]:
        warnings = []
        by_route: Dict[str, List[BusState]] = {}
        for b in self.buses.values():
            if b.route_id in self.routes:
                by_route.setdefault(b.route_id, []).append(b)
        for rid, blist in by_route.items():
            avg_speed = max(2.0, sum(self.seg_speed[rid]) / len(self.seg_speed[rid]))
            for i in range(len(blist)):
                for j in range(i + 1, len(blist)):
                    a, b = blist[i], blist[j]
                    if a.direction != b.direction:
                        continue
                    gap_s = abs(a.dist - b.dist) / avg_speed
                    if gap_s <= threshold_s:
                        r = self.routes[rid]
                        warnings.append({
                            "route_id": rid,
                            "route_number": r["number"],
                            "route_name": r["name"],
                            "bus_a": a.plate,
                            "bus_b": b.plate,
                            "bus_a_id": a.id,
                            "bus_b_id": b.id,
                            "gap_s": int(gap_s),
                            "lat": round((a.lat + b.lat) / 2, 6),
                            "lng": round((a.lng + b.lng) / 2, 6),
                        })
        return warnings

    def nearest_stop(self, lat: float, lng: float) -> Optional[dict]:
        best = None
        for r in self.routes.values():
            for s in r["stops"]:
                d = haversine(lat, lng, s["lat"], s["lng"])
                if best is None or d < best["distance_m"]:
                    best = {**s, "route_id": r["id"], "route_number": r["number"], "route_name": r["name"], "route_name_hi": r["name_hi"], "distance_m": round(d)}
        return best

    def find_stop(self, stop_id: str):
        for r in self.routes.values():
            for s in r["stops"]:
                if s["id"] == stop_id:
                    return r, s
        return None, None

    def stop_arrivals(self, stop_id: str) -> Optional[dict]:
        """A stop plus the best ETA of every route serving a stop with the same name."""
        route, stop = self.find_stop(stop_id)
        if not stop:
            return None
        arrivals = []
        for r in self.routes.values():
            for s in r["stops"]:
                if s["name"].lower() == stop["name"].lower():
                    etas = self.route_etas(r["id"])
                    best = next((x["best"] for x in etas["stops"] if x["id"] == s["id"]), None)
                    arrivals.append({"route_id": r["id"], "route_number": r["number"], "route_name": r["name"], "route_name_hi": r["name_hi"], "color": r["color"], "stop_id": s["id"], "best": best})
        arrivals.sort(key=lambda a: a["best"]["eta_s"] if a["best"] else 10**9)
        return {**stop, "route_id": route["id"], "route_number": route["number"], "arrivals": arrivals}

    def segment_travel_s(self, route_id: str, d_from: float, d_to: float) -> float:
        """Travel time between two distances along a route using learned segment speeds."""
        ss = self.seg_speed[route_id]
        stops = self.routes[route_id]["stops"]
        lo, hi = min(d_from, d_to), max(d_from, d_to)
        total = 0.0
        for i in range(len(stops) - 1):
            a, b = stops[i]["dist_along"], stops[i + 1]["dist_along"]
            overlap = max(0.0, min(hi, b) - max(lo, a))
            if overlap > 0:
                total += overlap / max(2.0, ss[i])
        return total

    def fare_between(self, route_id: str, from_id: str, to_id: str) -> Optional[dict]:
        route = self.routes.get(route_id)
        if not route:
            return None
        stops = route["stops"]
        fi = next((i for i, s in enumerate(stops) if s["id"] == from_id), None)
        ti = next((i for i, s in enumerate(stops) if s["id"] == to_id), None)
        if fi is None or ti is None or fi == ti:
            return None
        lo, hi = min(fi, ti), max(fi, ti)
        via = stops[lo + 1:hi]
        dist_m = abs(stops[ti]["dist_along"] - stops[fi]["dist_along"])
        travel = self.segment_travel_s(route_id, stops[fi]["dist_along"], stops[ti]["dist_along"]) + DWELL_SECONDS * len(via)
        # per-stop cumulative times from origin of this trip
        order = stops[fi:ti + 1] if fi < ti else list(reversed(stops[ti:fi + 1]))
        legs = []
        acc = 0.0
        for k in range(1, len(order)):
            leg = self.segment_travel_s(route_id, order[k - 1]["dist_along"], order[k]["dist_along"]) + (DWELL_SECONDS if k > 1 else 0)
            acc += leg
            legs.append({"stop_id": order[k]["id"], "name": order[k]["name"], "name_hi": order[k]["name_hi"], "eta_from_start_s": int(acc),
                         "distance_km": round(abs(order[k]["dist_along"] - order[0]["dist_along"]) / 1000, 1),
                         "fare_inr": fare_for_km(abs(order[k]["dist_along"] - order[0]["dist_along"]) / 1000)})
        return {
            "route_id": route_id, "route_number": route["number"], "from": stops[fi], "to": stops[ti],
            "distance_km": round(dist_m / 1000, 1), "fare_inr": fare_for_km(dist_m / 1000), "travel_s": int(travel),
            "via": [{"id": s["id"], "name": s["name"], "name_hi": s["name_hi"]} for s in via], "legs": legs,
            "direction": 1 if fi < ti else -1,
        }

    def timetable(self, route_id: str, first_min: int = 6 * 60, last_min: int = 20 * 60) -> Optional[dict]:
        """Printed-style schedule: fixed headway derived from fleet size and route length."""
        route = self.routes.get(route_id)
        if not route:
            return None
        stops = route["stops"]
        n_buses = max(1, sum(1 for b in self.buses.values() if b.route_id == route_id))
        one_way_s = route["length_m"] / DEFAULT_SPEED_MPS + DWELL_SECONDS * max(0, len(stops) - 2)
        headway = round((2 * one_way_s + 2 * DWELL_SECONDS) / n_buses / 60 / 5) * 5
        headway = int(min(120, max(20, headway)))
        # cumulative minutes from origin to each stop (forward)
        offsets = [0.0]
        for i in range(1, len(stops)):
            leg = (stops[i]["dist_along"] - stops[i - 1]["dist_along"]) / DEFAULT_SPEED_MPS + (DWELL_SECONDS if i > 1 else 0)
            offsets.append(offsets[-1] + leg / 60)
        back_offsets = [0.0]
        for i in range(len(stops) - 2, -1, -1):
            leg = (stops[i + 1]["dist_along"] - stops[i]["dist_along"]) / DEFAULT_SPEED_MPS + (DWELL_SECONDS if i < len(stops) - 2 else 0)
            back_offsets.append(back_offsets[-1] + leg / 60)

        def trips(offs, start_shift):
            out, dep, n = [], first_min + start_shift, 1
            while dep <= last_min:
                out.append({"trip": n, "times": [fmt_hhmm(dep + o) for o in offs]})
                dep += headway
                n += 1
            return out

        return {
            "route_id": route_id, "headway_min": headway, "first": fmt_hhmm(first_min), "last": fmt_hhmm(last_min),
            "one_way_min": int(round(offsets[-1])),
            "forward": {"from": stops[0]["name"], "from_hi": stops[0]["name_hi"], "to": stops[-1]["name"], "to_hi": stops[-1]["name_hi"],
                        "stops": [{"id": s["id"], "name": s["name"], "name_hi": s["name_hi"]} for s in stops], "trips": trips(offsets, 0)},
            "backward": {"from": stops[-1]["name"], "from_hi": stops[-1]["name_hi"], "to": stops[0]["name"], "to_hi": stops[0]["name_hi"],
                         "stops": [{"id": s["id"], "name": s["name"], "name_hi": s["name_hi"]} for s in reversed(stops)], "trips": trips(back_offsets, headway // 2)},
            "fares_from_origin": [{"id": s["id"], "name": s["name"], "fare_inr": fare_for_km(s["dist_along"] / 1000) if i else 0} for i, s in enumerate(stops)],
        }

    def stops_between(self, a: dict, b: dict, corridor_km: float = 3.0) -> List[dict]:
        """Existing stops lying in the corridor between two points, ordered along the way."""
        ax, ay, bx, by = a["lng"], a["lat"], b["lng"], b["lat"]
        dx, dy = bx - ax, by - ay
        seen = {}
        for r in self.routes.values():
            for s in r["stops"]:
                if s["name"].lower() in seen:
                    continue
                t = ((s["lng"] - ax) * dx + (s["lat"] - ay) * dy) / max(1e-9, dx * dx + dy * dy)
                if not 0.05 < t < 0.95:
                    continue
                px, py = ax + t * dx, ay + t * dy
                d = haversine(s["lat"], s["lng"], py, px)
                if d <= corridor_km * 1000:
                    seen[s["name"].lower()] = {"name": s["name"], "name_hi": s["name_hi"], "lat": s["lat"], "lng": s["lng"], "t": t, "offset_m": round(d)}
        return sorted(seen.values(), key=lambda x: x["t"])

    # ---- realtime loop ---------------------------------------------------
    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=5)
        self.listeners.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.listeners:
            self.listeners.remove(q)

    async def run(self, interval: float = 2.0):
        logger.info("Simulation loop started (factor x%s)", self.speed_factor)
        while True:
            try:
                self.tick(interval)
                snap = self.snapshot()
                for q in list(self.listeners):
                    if q.full():
                        try:
                            q.get_nowait()
                        except asyncio.QueueEmpty:
                            pass
                    q.put_nowait(snap)
                if self.db is not None and self.tick_count % 2 == 0 and snap["buses"]:
                    ts = datetime.now(timezone.utc)
                    docs = [{
                        "bus_id": b["id"], "route_id": b["route_id"], "plate": b["plate"],
                        "lat": b["lat"], "lng": b["lng"], "heading": b["heading"],
                        "speed_kmph": b["speed_kmph"], "sos": bool(b["sos"]), "ts": ts,
                    } for b in snap["buses"]]
                    await self.db.positions.insert_many(docs)
            except Exception as exc:  # keep the loop alive
                logger.exception("sim tick failed: %s", exc)
            await asyncio.sleep(interval)
