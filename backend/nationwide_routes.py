"""
RoutY Nationwide Transit Routes Catalog
Covers all 28 States and 8 Union Territories with tens of authentic city & metropolitan corridors.
"""

NATIONWIDE_ROUTES = [
    # ---------------------------------------------------------------------------
    # 1. Delhi (NCT) - DTC Corridors (5 routes across North, South, East, West)
    # ---------------------------------------------------------------------------
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
    {
        "number": "419",
        "name": "Old Delhi Rly Stn – Ambedkar Nagar Terminal",
        "name_hi": "पुरानी दिल्ली रेलवे स्टेशन – आंबेडकर नगर",
        "state": "Delhi",
        "city": "New Delhi",
        "color": "#0284C7",
        "stops": [
            {"name": "Old Delhi Railway Station", "name_hi": "पुरानी दिल्ली रेलवे स्टेशन", "lat": 28.6619, "lng": 77.2280},
            {"name": "Red Fort Lal Qila", "name_hi": "लाल किला", "lat": 28.6562, "lng": 77.2410},
            {"name": "Delhi Gate", "name_hi": "दिल्ली गेट", "lat": 28.6405, "lng": 77.2408},
            {"name": "Pragati Maidan Gate", "name_hi": "प्रगति मैदान गेट", "lat": 28.6186, "lng": 77.2435},
            {"name": "Defence Colony Flyover", "name_hi": "डिफेंस कॉलोनी फ्लाईओवर", "lat": 28.5732, "lng": 77.2341},
            {"name": "AIIMS Ansari Nagar", "name_hi": "एम्स अंसारी नगर", "lat": 28.5672, "lng": 77.2100},
            {"name": "Saket District Centre", "name_hi": "साकेत डिस्ट्रिक्ट सेंटर", "lat": 28.5284, "lng": 77.2185},
            {"name": "Ambedkar Nagar Terminal", "name_hi": "आंबेडकर नगर टर्मिनल", "lat": 28.5140, "lng": 77.2390},
        ],
    },
    {
        "number": "764",
        "name": "Nehru Place – Najafgarh Terminal",
        "name_hi": "नेहरू प्लेस – नजफगढ़ टर्मिनल",
        "state": "Delhi",
        "city": "New Delhi",
        "color": "#16A34A",
        "stops": [
            {"name": "Nehru Place Bus Terminal", "name_hi": "नेहरू प्लेस बस टर्मिनल", "lat": 28.5492, "lng": 77.2528},
            {"name": "IIT Flyover Gate", "name_hi": "आईआईटी फ्लाईओवर गेट", "lat": 28.5450, "lng": 77.1925},
            {"name": "Munirka Crossing", "name_hi": "मुनीरका क्रॉसिंग", "lat": 28.5580, "lng": 77.1730},
            {"name": "Vasant Vihar Depot", "name_hi": "वसंत विहार डिपो", "lat": 28.5650, "lng": 77.1550},
            {"name": "Mahipalpur Bypass", "name_hi": "महिपालपुर बाईपास", "lat": 28.5460, "lng": 77.1260},
            {"name": "Dwarka Sector 10 Metro", "name_hi": "द्वारका सेक्टर १० मेट्रो", "lat": 28.5810, "lng": 77.0570},
            {"name": "Dwarka Mor Metro", "name_hi": "द्वारका मोड़ मेट्रो", "lat": 28.6190, "lng": 77.0320},
            {"name": "Najafgarh Terminal", "name_hi": "नजफगढ़ टर्मिनल", "lat": 28.6090, "lng": 76.9850},
        ],
    },
    {
        "number": "615",
        "name": "Moti Bagh – Safdarjung – Lodhi Colony",
        "name_hi": "मोती बाग – सफदरजंग – लोधी कॉलोनी",
        "state": "Delhi",
        "city": "New Delhi",
        "color": "#9333EA",
        "stops": [
            {"name": "Moti Bagh Ring Road", "name_hi": "मोती बाग रिंग रोड", "lat": 28.5780, "lng": 77.1680},
            {"name": "Chanakyapuri Embassy Area", "name_hi": "चाणक्यपुरी दूतावास क्षेत्र", "lat": 28.5910, "lng": 77.1850},
            {"name": "Safdarjung Hospital", "name_hi": "सफदरजंग अस्पताल", "lat": 28.5700, "lng": 77.2060},
            {"name": "AIIMS Ring Road", "name_hi": "एम्स रिंग रोड", "lat": 28.5670, "lng": 77.2110},
            {"name": "Lodhi Colony Terminal", "name_hi": "लोधी कॉलोनी टर्मिनल", "lat": 28.5830, "lng": 77.2240},
        ],
    },
    {
        "number": "261",
        "name": "Kashmere Gate ISBT – Sarai Kale Khan",
        "name_hi": "कश्मीरी गेट आईएसबीटी – सराय काले खां",
        "state": "Delhi",
        "city": "New Delhi",
        "color": "#E11D48",
        "stops": [
            {"name": "Kashmere Gate ISBT", "name_hi": "कश्मीरी गेट आईएसबीटी", "lat": 28.6675, "lng": 77.2330},
            {"name": "Tis Hazari Court", "name_hi": "तीस हजारी कोर्ट", "lat": 28.6680, "lng": 77.2180},
            {"name": "Chandni Chowk Metro", "name_hi": "चांदनी चौक मेट्रो", "lat": 28.6570, "lng": 77.2300},
            {"name": "Rajghat Memorial", "name_hi": "राजघाट स्मारक", "lat": 28.6410, "lng": 77.2490},
            {"name": "ITO Crossing", "name_hi": "आईटीओ क्रॉसिंग", "lat": 28.6290, "lng": 77.2410},
            {"name": "Sarai Kale Khan ISBT", "name_hi": "सराय काले खां आईएसबीटी", "lat": 28.5880, "lng": 77.2550},
        ],
    },

    # ---------------------------------------------------------------------------
    # 2. Maharashtra - BEST Mumbai & PMPML Pune (6 routes)
    # ---------------------------------------------------------------------------
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
    {
        "number": "83",
        "name": "Ghatkopar Station – Andheri West Bus Station",
        "name_hi": "घाटकोपर स्टेशन – अंधेरी पश्चिम बस स्टेशन",
        "state": "Maharashtra",
        "city": "Mumbai",
        "color": "#C04A00",
        "stops": [
            {"name": "Ghatkopar Railway Station West", "name_hi": "घाटकोपर रेलवे स्टेशन पश्चिम", "lat": 19.0860, "lng": 72.9080},
            {"name": "Asalpha Metro Station", "name_hi": "असल्फा मेट्रो स्टेशन", "lat": 19.0980, "lng": 72.8940},
            {"name": "Saki Naka Junction", "name_hi": "साकी नाका जंक्शन", "lat": 19.1020, "lng": 72.8870},
            {"name": "Marol Naka", "name_hi": "मरोल नाका", "lat": 19.1100, "lng": 72.8750},
            {"name": "Chakala JB Nagar", "name_hi": "चकला जेबी नगर", "lat": 19.1130, "lng": 72.8620},
            {"name": "WEH Metro Station", "name_hi": "वेस्टर्न एक्सप्रेस हाईवे मेट्रो", "lat": 19.1170, "lng": 72.8520},
            {"name": "Andheri West Bus Station", "name_hi": "अंधेरी पश्चिम बस स्टेशन", "lat": 19.1190, "lng": 72.8440},
        ],
    },
    {
        "number": "302",
        "name": "Sion Depot – Mulund – Borivali East",
        "name_hi": "सायन डिपो – मुलुंड – बोरिवली पूर्व",
        "state": "Maharashtra",
        "city": "Mumbai",
        "color": "#2563EB",
        "stops": [
            {"name": "Sion Bus Depot", "name_hi": "सायन बस डिपो", "lat": 19.0430, "lng": 72.8630},
            {"name": "Kurla Kamani", "name_hi": "कुर्ला कमानी", "lat": 19.0720, "lng": 72.8890},
            {"name": "Ghatkopar Highway Junction", "name_hi": "घाटकोपर हाईवे जंक्शन", "lat": 19.0910, "lng": 72.9150},
            {"name": "Vikhroli Godrej Complex", "name_hi": "विक्रोली गोदरेज कॉम्प्लेक्स", "lat": 19.1080, "lng": 72.9280},
            {"name": "Bhandup Railway Station", "name_hi": "भांडुप रेलवे स्टेशन", "lat": 19.1430, "lng": 72.9360},
            {"name": "Mulund Check Naka", "name_hi": "मुलुंड चेक नाका", "lat": 19.1780, "lng": 72.9550},
            {"name": "Thane Teen Hath Naka", "name_hi": "ठाणे तीन हाथ नाका", "lat": 19.1920, "lng": 72.9640},
            {"name": "Borivali East Railway Station", "name_hi": "बोरिवली पूर्व रेलवे स्टेशन", "lat": 19.2290, "lng": 72.8600},
        ],
    },
    {
        "number": "332",
        "name": "Kurla Station – SEEPZ Andheri",
        "name_hi": "कुर्ला स्टेशन – सीप्ज अंधेरी",
        "state": "Maharashtra",
        "city": "Mumbai",
        "color": "#059669",
        "stops": [
            {"name": "Kurla Station West", "name_hi": "कुर्ला स्टेशन पश्चिम", "lat": 19.0680, "lng": 72.8790},
            {"name": "Phoenix Marketcity Kurla", "name_hi": "फीनिक्स मार्केटसिटी कुर्ला", "lat": 19.0870, "lng": 72.8890},
            {"name": "Sakinaka Metro", "name_hi": "साकीनाका मेट्रो", "lat": 19.1020, "lng": 72.8870},
            {"name": "MIDC Central Road Andheri", "name_hi": "एमआईडीसी सेंट्रल रोड अंधेरी", "lat": 19.1210, "lng": 72.8710},
            {"name": "SEEPZ Bus Depot", "name_hi": "सीप्ज बस डिपो", "lat": 19.1280, "lng": 72.8790},
        ],
    },
    {
        "number": "102",
        "name": "Swargate – Pune Rly Station",
        "name_hi": "स्वारगेट – पुणे रेलवे स्टेशन",
        "state": "Maharashtra",
        "city": "Pune",
        "color": "#7C3AED",
        "stops": [
            {"name": "Swargate Bus Stand", "name_hi": "स्वारगेट बस स्टैंड", "lat": 18.5010, "lng": 73.8580},
            {"name": "Sarasbaug Ganpati", "name_hi": "सारसबाग गणपति", "lat": 18.5030, "lng": 73.8520},
            {"name": "Tilak Road SP College", "name_hi": "तिलक रोड एसपी कॉलेज", "lat": 18.5080, "lng": 73.8490},
            {"name": "Alka Talkies Deccan", "name_hi": "अलका टॉकीज डेक्कन", "lat": 18.5140, "lng": 73.8440},
            {"name": "Shivajinagar Bus Stand", "name_hi": "शिवाजीनगर बस स्टैंड", "lat": 18.5310, "lng": 73.8520},
            {"name": "Pune Railway Station", "name_hi": "पुणे रेलवे स्टेशन", "lat": 18.5280, "lng": 73.8740},
        ],
    },
    {
        "number": "315",
        "name": "Katraj Bus Stand – Hadapsar Magarpatta",
        "name_hi": "कात्रज बस स्टैंड – हडपसर मगरपट्टा",
        "state": "Maharashtra",
        "city": "Pune",
        "color": "#EA580C",
        "stops": [
            {"name": "Katraj Bus Stand Zoo", "name_hi": "कात्रज बस स्टैंड प्राणी संग्रहालय", "lat": 18.4550, "lng": 73.8680},
            {"name": "Upper Indira Nagar", "name_hi": "अपर इंदिरा नगर", "lat": 18.4720, "lng": 73.8760},
            {"name": "Market Yard Gultekdi", "name_hi": "मार्केट यार्ड गुलटेकड़ी", "lat": 18.4890, "lng": 73.8710},
            {"name": "Fatimanagar Chowk", "name_hi": "फातिमानगर चौक", "lat": 18.5040, "lng": 73.8960},
            {"name": "Hadapsar Gadital", "name_hi": "हडपसर गाडीतळ", "lat": 18.5020, "lng": 73.9280},
            {"name": "Magarpatta City Main Gate", "name_hi": "मगरपट्टा सिटी मुख्य द्वार", "lat": 18.5170, "lng": 73.9310},
        ],
    },

    # ---------------------------------------------------------------------------
    # 3. Karnataka - BMTC Bengaluru & KSRTC Mysuru (5 routes)
    # ---------------------------------------------------------------------------
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
    {
        "number": "500D",
        "name": "Hebbal – Outer Ring Road – Central Silk Board",
        "name_hi": "हेब्बाल – आउटर रिंग रोड – सेंट्रल सिल्क बोर्ड",
        "state": "Karnataka",
        "city": "Bengaluru",
        "color": "#2563EB",
        "stops": [
            {"name": "Hebbal Flyover", "name_hi": "हेब्बाल फ्लाईओवर", "lat": 13.0350, "lng": 77.5970},
            {"name": "Manyata Tech Park Gate", "name_hi": "मान्यता टेक पार्क गेट", "lat": 13.0450, "lng": 77.6210},
            {"name": "Kalyan Nagar Ring Road", "name_hi": "कल्याण नगर रिंग रोड", "lat": 13.0230, "lng": 77.6430},
            {"name": "Kasturi Nagar", "name_hi": "कस्तूरी नगर", "lat": 13.0030, "lng": 77.6590},
            {"name": "KR Puram Railway Station", "name_hi": "केआर पुरम रेलवे स्टेशन", "lat": 12.9970, "lng": 77.6820},
            {"name": "Marathahalli Multiplex", "name_hi": "मराठाहल्ली मल्टीप्लेक्स", "lat": 12.9540, "lng": 77.7010},
            {"name": "Bellandur Central", "name_hi": "बेलंदूर सेंट्रल", "lat": 12.9320, "lng": 77.6780},
            {"name": "HSR Layout BDA Complex", "name_hi": "एचएसआर लेआउट बीडीए", "lat": 12.9110, "lng": 77.6450},
            {"name": "Central Silk Board Junction", "name_hi": "सेंट्रल सिल्क बोर्ड जंक्शन", "lat": 12.9170, "lng": 77.6230},
        ],
    },
    {
        "number": "201",
        "name": "Banashankari TTMC – Shivajinagar Bus Station",
        "name_hi": "बनशंकरी टीटीएमसी – शिवाजीनगर बस स्टेशन",
        "state": "Karnataka",
        "city": "Bengaluru",
        "color": "#D97706",
        "stops": [
            {"name": "Banashankari TTMC", "name_hi": "बनशंकरी टीटीएमसी", "lat": 12.9160, "lng": 77.5730},
            {"name": "Jayanagar 4th Block Complex", "name_hi": "जयनगर चौथा ब्लॉक", "lat": 12.9290, "lng": 77.5830},
            {"name": "Dairy Circle", "name_hi": "डेयरी सर्कल", "lat": 12.9390, "lng": 77.5980},
            {"name": "Shantinagar Bus Station", "name_hi": "शांतिनगर बस स्टेशन", "lat": 12.9540, "lng": 77.5960},
            {"name": "Richmond Circle", "name_hi": "रिचमंड सर्कल", "lat": 12.9660, "lng": 77.5980},
            {"name": "Shivajinagar Bus Station", "name_hi": "शिवाजीनगर बस स्टेशन", "lat": 12.9860, "lng": 77.6040},
        ],
    },
    {
        "number": "G-3",
        "name": "Brigade Road – Electronic City Phase 1",
        "name_hi": "ब्रिगेड रोड – इलेक्ट्रॉनिक सिटी फेज १",
        "state": "Karnataka",
        "city": "Bengaluru",
        "color": "#DB2777",
        "stops": [
            {"name": "Brigade Road Rex", "name_hi": "ब्रिगेड रोड", "lat": 12.9730, "lng": 77.6070},
            {"name": "Adugodi Police Grounds", "name_hi": "आडुगोडी", "lat": 12.9460, "lng": 77.6110},
            {"name": "St Johns Medical Hospital", "name_hi": "सेंट जॉन्स अस्पताल", "lat": 12.9310, "lng": 77.6200},
            {"name": "Bommanahalli Junction", "name_hi": "बोम्मनहल्ली जंक्शन", "lat": 12.9030, "lng": 77.6270},
            {"name": "Electronic City Toll Gate", "name_hi": "इलेक्ट्रॉनिक सिटी टोल गेट", "lat": 12.8530, "lng": 77.6620},
            {"name": "Electronic City Wipro Gate", "name_hi": "इलेक्ट्रॉनिक सिटी विप्रो गेट", "lat": 12.8390, "lng": 77.6690},
        ],
    },
    {
        "number": "110",
        "name": "Mysuru Palace – Chamundi Hill",
        "name_hi": "मैसूर पैलेस – चामुंडी हिल",
        "state": "Karnataka",
        "city": "Mysuru",
        "color": "#7C2D12",
        "stops": [
            {"name": "Mysuru Palace North Gate", "name_hi": "मैसूर पैलेस नॉर्थ गेट", "lat": 12.3050, "lng": 76.6550},
            {"name": "Hardinge Circle", "name_hi": "हार्डिंग सर्कल", "lat": 12.3080, "lng": 76.6620},
            {"name": "Mysuru Zoo Main Gate", "name_hi": "मैसूर चिड़ियाघर", "lat": 12.3020, "lng": 76.6690},
            {"name": "Karanji Nature Park", "name_hi": "कारंजी नेचर पार्क", "lat": 12.3010, "lng": 76.6780},
            {"name": "Chamundi Hill Temple", "name_hi": "चामुंडी हिल मंदिर", "lat": 12.2740, "lng": 76.6710},
        ],
    },

    # ---------------------------------------------------------------------------
    # 4. Tamil Nadu - MTC Chennai & TNSTC Coimbatore (5 routes)
    # ---------------------------------------------------------------------------
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
    {
        "number": "21G",
        "name": "Broadway – Marina – Tambaram Sanatorium",
        "name_hi": "ब्रॉडवे – मरीना – ताम्बरम सेनेटोरियम",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "color": "#0284C7",
        "stops": [
            {"name": "Broadway Central Terminus", "name_hi": "ब्रॉडवे सेंट्रल टर्मिनस", "lat": 13.0880, "lng": 80.2850},
            {"name": "Marina Beach Light House", "name_hi": "मरीना बीच लाइट हाउस", "lat": 13.0390, "lng": 80.2790},
            {"name": "Santhome Cathedral Basilica", "name_hi": "सैंथोम कैथेड्रल", "lat": 13.0330, "lng": 80.2780},
            {"name": "Adyar Signal Depot", "name_hi": "अड्यार डिपो", "lat": 13.0060, "lng": 80.2570},
            {"name": "Guindy Kathipara Junction", "name_hi": "गिंडी काठीपारा जंक्शन", "lat": 13.0070, "lng": 80.2030},
            {"name": "Meenambakkam Airport Metro", "name_hi": "मीनाम्बक्कम एयरपोर्ट मेट्रो", "lat": 12.9880, "lng": 80.1650},
            {"name": "Chromepet Bus Stand", "name_hi": "क्रोमपेट बस स्टैंड", "lat": 12.9520, "lng": 80.1410},
            {"name": "Tambaram Sanatorium Terminal", "name_hi": "ताम्बरम सेनेटोरियम टर्मिनल", "lat": 12.9310, "lng": 80.1250},
        ],
    },
    {
        "number": "570",
        "name": "CMBT Koyambedu – OMR – Siruseri IT Park",
        "name_hi": "सीएमबीटी कोयमबेडु – ओएमआर – सिरुसेरी आईटी पार्क",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "color": "#059669",
        "stops": [
            {"name": "CMBT Koyambedu Bus Terminus", "name_hi": "सीएमबीटी कोयमबेडु बस टर्मिनस", "lat": 13.0680, "lng": 80.2050},
            {"name": "Vadapalani Temple", "name_hi": "वडापलानी मंदिर", "lat": 13.0520, "lng": 80.2120},
            {"name": "Ashok Nagar Pillar", "name_hi": "अशोक नगर पिलर", "lat": 13.0350, "lng": 80.2110},
            {"name": "Guindy Industrial Estate", "name_hi": "गिंडी इंडस्ट्रियल एस्टेट", "lat": 13.0110, "lng": 80.2130},
            {"name": "Velachery Vijayanagar Bus Stand", "name_hi": "वेलाचेरी विजयनगर बस स्टैंड", "lat": 12.9770, "lng": 80.2210},
            {"name": "Taramani TIDEL Park", "name_hi": "तारामणि टाइडेल पार्क", "lat": 12.9890, "lng": 80.2470},
            {"name": "Thoraipakkam OMR Junction", "name_hi": "तोरईपक्कम ओएमआर जंक्शन", "lat": 12.9390, "lng": 80.2330},
            {"name": "Sholinganallur Junction", "name_hi": "शोलिंगनल्लूर जंक्शन", "lat": 12.9010, "lng": 80.2280},
            {"name": "Siruseri SIPCOT IT Park", "name_hi": "सिरुसेरी सिपकॉट आईटी पार्क", "lat": 12.8310, "lng": 80.2210},
        ],
    },
    {
        "number": "102",
        "name": "Broadway – ECR – Kelambakkam",
        "name_hi": "ब्रॉडवे – ईसीआर – केलमबक्कम",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "color": "#D97706",
        "stops": [
            {"name": "Broadway Bus Terminus", "name_hi": "ब्रॉडवे बस टर्मिनस", "lat": 13.0880, "lng": 80.2850},
            {"name": "Queen Marys College", "name_hi": "क्वीन मैरी कॉलेज", "lat": 13.0470, "lng": 80.2790},
            {"name": "Thiruvanmiyur Bus Depot", "name_hi": "तिरुवानमियुर डिपो", "lat": 12.9830, "lng": 80.2590},
            {"name": "Palavakkam Sea Shore", "name_hi": "पालवक्कम", "lat": 12.9610, "lng": 80.2550},
            {"name": "Neelankarai Police Station", "name_hi": "नीलंकरई", "lat": 12.9460, "lng": 80.2530},
            {"name": "Uthandi Toll Plaza ECR", "name_hi": "उथांडी टोल प्लाजा", "lat": 12.8680, "lng": 80.2470},
            {"name": "Kovalam Beach Junction", "name_hi": "कोवलम बीच जंक्शन", "lat": 12.7930, "lng": 80.2510},
            {"name": "Kelambakkam Bus Terminus", "name_hi": "केलमबक्कम बस टर्मिनस", "lat": 12.7840, "lng": 80.2220},
        ],
    },
    {
        "number": "1A",
        "name": "Gandhipuram – Town Hall – Ukkadam",
        "name_hi": "गांधीपुरम – टाउन हॉल – उक्कड़म",
        "state": "Tamil Nadu",
        "city": "Coimbatore",
        "color": "#7C3AED",
        "stops": [
            {"name": "Gandhipuram Central Bus Stand", "name_hi": "गांधीपुरम सेंट्रल बस स्टैंड", "lat": 11.0180, "lng": 76.9670},
            {"name": "Cross Cut Road Commercial", "name_hi": "क्रॉस कट रोड", "lat": 11.0200, "lng": 76.9610},
            {"name": "Coimbatore Railway Junction", "name_hi": "कोयंबटूर रेलवे जंक्शन", "lat": 10.9980, "lng": 76.9660},
            {"name": "Town Hall Clock Tower", "name_hi": "टाउन हॉल घंटाघर", "lat": 10.9930, "lng": 76.9600},
            {"name": "Ukkadam Bus Stand", "name_hi": "उक्कड़म बस स्टैंड", "lat": 10.9850, "lng": 76.9580},
        ],
    },

    # ---------------------------------------------------------------------------
    # 5. West Bengal - WBTC Kolkata (4 routes)
    # ---------------------------------------------------------------------------
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
    {
        "number": "AC-9",
        "name": "Jadavpur 8B – Airport Gate 1",
        "name_hi": "जादवपुर ८बी – कोलकाता हवाई अड्डा",
        "state": "West Bengal",
        "city": "Kolkata",
        "color": "#0284C7",
        "stops": [
            {"name": "Jadavpur 8B Bus Stand", "name_hi": "जादवपुर ८बी बस स्टैंड", "lat": 22.4980, "lng": 88.3710},
            {"name": "Dhakuria Bridge", "name_hi": "ढाकुरिया ब्रिज", "lat": 22.5110, "lng": 88.3680},
            {"name": "Gariahat Crossing", "name_hi": "गड़ियाहाट क्रॉसिंग", "lat": 22.5190, "lng": 88.3690},
            {"name": "Ruby General Hospital", "name_hi": "रूबी जनरल अस्पताल", "lat": 22.5130, "lng": 88.4020},
            {"name": "Ultadanga Hudco More", "name_hi": "उलटाडांगा हुडको मोड़", "lat": 22.5870, "lng": 88.3880},
            {"name": "Baguiati VIP Road", "name_hi": "बागूईआटी वीआईपी रोड", "lat": 22.6180, "lng": 88.4280},
            {"name": "Chinar Park Rajarhat", "name_hi": "चिनार पार्क राजारहाट", "lat": 22.6250, "lng": 88.4480},
            {"name": "Kolkata Airport Gate 1", "name_hi": "कोलकाता हवाई अड्डा गेट १", "lat": 22.6450, "lng": 88.4460},
        ],
    },
    {
        "number": "230",
        "name": "Alipore Zoo – Salt Lake Karunamoyee",
        "name_hi": "अलीपुर चिड़ियाघर – साल्ट लेक करुणामयी",
        "state": "West Bengal",
        "city": "Kolkata",
        "color": "#16A34A",
        "stops": [
            {"name": "Alipore Zoological Garden", "name_hi": "अलीपुर प्राणी उद्यान", "lat": 22.5360, "lng": 88.3320},
            {"name": "Exide Crossing Rabindra Sadan", "name_hi": "एक्साइड क्रॉसिंग", "lat": 22.5440, "lng": 88.3440},
            {"name": "Park Circus 7 Point", "name_hi": "पार्क सर्कस सात पॉइंट", "lat": 22.5430, "lng": 88.3680},
            {"name": "Sealdah Railway Station", "name_hi": "सियालदह रेलवे स्टेशन", "lat": 22.5680, "lng": 88.3710},
            {"name": "Maniktala Crossing", "name_hi": "मानिकतला क्रॉसिंग", "lat": 22.5860, "lng": 88.3760},
            {"name": "Salt Lake Karunamoyee Central", "name_hi": "साल्ट लेक करुणामयी", "lat": 22.5840, "lng": 88.4190},
        ],
    },
    {
        "number": "37A",
        "name": "Esplanade – Tollygunge – Garia",
        "name_hi": "एस्प्लेनेड – टॉलीगंज – गरिया",
        "state": "West Bengal",
        "city": "Kolkata",
        "color": "#EA580C",
        "stops": [
            {"name": "Esplanade Bus Stand", "name_hi": "एस्प्लेनेड बस स्टैंड", "lat": 22.5645, "lng": 88.3524},
            {"name": "Rabindra Sadan Metro", "name_hi": "रवींद्र सदन मेट्रो", "lat": 22.5390, "lng": 88.3460},
            {"name": "Hazra Crossing", "name_hi": "हाजरा क्रॉसिंग", "lat": 22.5250, "lng": 88.3480},
            {"name": "Tollygunge Tram Depot", "name_hi": "टॉलीगंज ट्राम डिपो", "lat": 22.4990, "lng": 88.3470},
            {"name": "Ranikuthi Telephone Exchange", "name_hi": "रानीकुठी एक्सचेंज", "lat": 22.4830, "lng": 88.3550},
            {"name": "Garia Bus Depot Terminus", "name_hi": "गरिया बस डिपो", "lat": 22.4650, "lng": 88.3810},
        ],
    },

    # ---------------------------------------------------------------------------
    # 6. Gujarat - AMTS Ahmedabad & SITILink Surat (4 routes)
    # ---------------------------------------------------------------------------
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
    {
        "number": "204",
        "name": "Lal Darwaja – Ranip – Chandkheda Ring Road",
        "name_hi": "लाल दरवाजा – रानीप – चांदखेड़ा रिंग रोड",
        "state": "Gujarat",
        "city": "Ahmedabad",
        "color": "#2563EB",
        "stops": [
            {"name": "Lal Darwaja Main Terminus", "name_hi": "लाल दरवाजा मुख्य टर्मिनस", "lat": 23.0250, "lng": 72.5800},
            {"name": "Income Tax Circle Ashram Road", "name_hi": "इनकम टैक्स सर्कल", "lat": 23.0420, "lng": 72.5710},
            {"name": "Usmanpura Cross Road", "name_hi": "उस्मानपुरा", "lat": 23.0490, "lng": 72.5690},
            {"name": "Vadaj Bus Terminus", "name_hi": "वाडज बस टर्मिनस", "lat": 23.0610, "lng": 72.5720},
            {"name": "Ranip BRTS Bus Stand", "name_hi": "रानीप बीआरटीएस", "lat": 23.0760, "lng": 72.5790},
            {"name": "Visat Petrol Pump Circle", "name_hi": "विसात सर्कल", "lat": 23.1020, "lng": 72.5950},
            {"name": "Chandkheda Ring Road", "name_hi": "चांदखेड़ा रिंग रोड", "lat": 23.1180, "lng": 72.5870},
        ],
    },
    {
        "number": "13/1",
        "name": "Maninagar – Kankaria – RTO Subhash Bridge",
        "name_hi": "मणिनगर – कांकरिया – आरटीओ सुभाष ब्रिज",
        "state": "Gujarat",
        "city": "Ahmedabad",
        "color": "#16A34A",
        "stops": [
            {"name": "Maninagar Railway Station East", "name_hi": "मणिनगर रेलवे स्टेशन", "lat": 22.9980, "lng": 72.6110},
            {"name": "Kankaria Lake Gate 1", "name_hi": "कांकरिया झील गेट १", "lat": 23.0060, "lng": 72.6020},
            {"name": "Gita Mandir ST Bus Stand", "name_hi": "गीता मंदिर एसटी बस स्टैंड", "lat": 23.0140, "lng": 72.5920},
            {"name": "Ellisbridge Town Hall", "name_hi": "एलिसब्रिज टाउन हॉल", "lat": 23.0240, "lng": 72.5690},
            {"name": "Navrangpura Commerce College", "name_hi": "नवरंगपुरा कॉमर्स कॉलेज", "lat": 23.0370, "lng": 72.5580},
            {"name": "RTO Circle Subhash Bridge", "name_hi": "आरटीओ सर्कल सुभाष ब्रिज", "lat": 23.0670, "lng": 72.5760},
        ],
    },
    {
        "number": "116",
        "name": "Surat Station – Piplod – Dumas Beach",
        "name_hi": "सूरत स्टेशन – पिपलोद – डुमस बीच",
        "state": "Gujarat",
        "city": "Surat",
        "color": "#D32F2F",
        "stops": [
            {"name": "Surat Railway Station Central", "name_hi": "सूरत रेलवे स्टेशन सेंट्रल", "lat": 21.2040, "lng": 72.8410},
            {"name": "Ring Road Majura Gate", "name_hi": "रिंग रोड मजूरा गेट", "lat": 21.1810, "lng": 72.8220},
            {"name": "Athwa Gate Vanita Vishram", "name_hi": "अठवा गेट", "lat": 21.1730, "lng": 72.8050},
            {"name": "Piplod SVNIT Campus", "name_hi": "पिपलोद एसवीएनआईटी", "lat": 21.1630, "lng": 72.7840},
            {"name": "VR Mall Surat", "name_hi": "वीआर मॉल सूरत", "lat": 21.1480, "lng": 72.7660},
            {"name": "Dumas Beach Promenade", "name_hi": "डुमस बीच", "lat": 21.0890, "lng": 72.7130},
        ],
    },

    # ---------------------------------------------------------------------------
    # 7. Telangana - TSRTC Hyderabad (4 routes)
    # ---------------------------------------------------------------------------
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
    {
        "number": "222",
        "name": "Koti – Jubilee Hills – HITEC City – Gachibowli",
        "name_hi": "कोटी – जुबली हिल्स – हाईटेक सिटी – गाचीबोवली",
        "state": "Telangana",
        "city": "Hyderabad",
        "color": "#0284C7",
        "stops": [
            {"name": "Koti Bus Station Central", "name_hi": "कोटी बस स्टेशन सेंट्रल", "lat": 17.3850, "lng": 78.4860},
            {"name": "Lakdikapul Metro Station", "name_hi": "लकड़ी का पुल मेट्रो", "lat": 17.4040, "lng": 78.4640},
            {"name": "Banjara Hills Road No 1", "name_hi": "बंजारा हिल्स रोड १", "lat": 17.4170, "lng": 78.4480},
            {"name": "Jubilee Hills Checkpost", "name_hi": "जुबली हिल्स चेकपोस्ट", "lat": 17.4290, "lng": 78.4090},
            {"name": "Madhapur Police Station", "name_hi": "माधापुर पुलिस स्टेशन", "lat": 17.4430, "lng": 78.3880},
            {"name": "HITEC City Cyber Towers", "name_hi": "हाईटेक सिटी साइबर टावर्स", "lat": 17.4500, "lng": 78.3810},
            {"name": "Gachibowli Indoor Stadium", "name_hi": "गाचीबोवली इनडोर स्टेडियम", "lat": 17.4450, "lng": 78.3490},
        ],
    },
    {
        "number": "10H",
        "name": "Secunderabad – Ameerpet – Kondapur",
        "name_hi": "सिकंदराबाद – अमीरपेट – कोंडापुर",
        "state": "Telangana",
        "city": "Hyderabad",
        "color": "#16A34A",
        "stops": [
            {"name": "Secunderabad Railway Station", "name_hi": "सिकंदराबाद रेलवे स्टेशन", "lat": 17.4340, "lng": 78.5010},
            {"name": "Paradise Circle", "name_hi": "पैराडाइज सर्कल", "lat": 17.4410, "lng": 78.4870},
            {"name": "Begumpet Lifestyle", "name_hi": "बेगमपेट लाइफस्टाइल", "lat": 17.4450, "lng": 78.4620},
            {"name": "Ameerpet Metro Junction", "name_hi": "अमीरपेट मेट्रो जंक्शन", "lat": 17.4370, "lng": 78.4480},
            {"name": "SR Nagar Bus Stop", "name_hi": "एसआर नगर बस स्टॉप", "lat": 17.4440, "lng": 78.4410},
            {"name": "Bharat Nagar Flyover", "name_hi": "भारत नगर", "lat": 17.4640, "lng": 78.4230},
            {"name": "HITEC City MMTS Station", "name_hi": "हाईटेक सिटी एमएमटीएस", "lat": 17.4720, "lng": 78.3870},
            {"name": "Kondapur RTO Bus Stop", "name_hi": "कोंडापुर बस स्टॉप", "lat": 17.4680, "lng": 78.3610},
        ],
    },
    {
        "number": "5K",
        "name": "Mehdipatnam – Panjagutta – Secunderabad",
        "name_hi": "मेहदीपटनम – पंजागुट्टा – सिकंदराबाद",
        "state": "Telangana",
        "city": "Hyderabad",
        "color": "#9333EA",
        "stops": [
            {"name": "Mehdipatnam Bus Depot", "name_hi": "मेहदीपटनम बस डिपो", "lat": 17.3940, "lng": 78.4420},
            {"name": "Masab Tank Flyover", "name_hi": "मसाब टैंक", "lat": 17.4040, "lng": 78.4520},
            {"name": "Khairatabad RTO", "name_hi": "खैरताबाद", "lat": 17.4120, "lng": 78.4590},
            {"name": "Panjagutta Central Mall", "name_hi": "पंजागुट्टा", "lat": 17.4260, "lng": 78.4520},
            {"name": "Prakash Nagar Begumpet", "name_hi": "प्रकाश नगर", "lat": 17.4430, "lng": 78.4680},
            {"name": "Secunderabad Station Clock Tower", "name_hi": "सिकंदराबाद स्टेशन घंटाघर", "lat": 17.4390, "lng": 78.5020},
        ],
    },

    # ---------------------------------------------------------------------------
    # 8. Kerala - KSRTC Kochi & Thiruvananthapuram (3 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "101",
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
    {
        "number": "205",
        "name": "Vytilla Mobility Hub – Kakkanad InfoPark",
        "name_hi": "वैटीला मोबिलिटी हब – कक्कानाड इन्फोपार्क",
        "state": "Kerala",
        "city": "Kochi",
        "color": "#0284C7",
        "stops": [
            {"name": "Vytilla Mobility Hub Terminal", "name_hi": "वैटीला मोबिलिटी हब", "lat": 9.9680, "lng": 76.3190},
            {"name": "Kadavanthra Metro Junction", "name_hi": "कदावंतरा मेट्रो", "lat": 9.9670, "lng": 76.2990},
            {"name": "Kaloor JLN Stadium", "name_hi": "कालूर जेएलएन स्टेडियम", "lat": 9.9980, "lng": 76.3010},
            {"name": "Palarivattom Pipeline", "name_hi": "पलारीवट्टोम पाइपलाइन", "lat": 10.0120, "lng": 76.3180},
            {"name": "Civil Station Collectorate", "name_hi": "सिविल स्टेशन कलेक्ट्रेट", "lat": 10.0210, "lng": 76.3450},
            {"name": "Kakkanad InfoPark Expressway", "name_hi": "कक्कानाड इन्फोपार्क", "lat": 10.0110, "lng": 76.3680},
        ],
    },
    {
        "number": "12",
        "name": "Thampanoor Central – Technopark Kazhakkoottam",
        "name_hi": "थंपानूर सेंट्रल – टेक्नोपार्क कझाकूट्टम",
        "state": "Kerala",
        "city": "Thiruvananthapuram",
        "color": "#EA580C",
        "stops": [
            {"name": "Thampanoor KSRTC Central", "name_hi": "थंपानूर केएसआरटीसी सेंट्रल", "lat": 8.4870, "lng": 76.9530},
            {"name": "Palayam University Library", "name_hi": "पलायम विश्वविद्यालय", "lat": 8.5020, "lng": 76.9510},
            {"name": "Pattom Junction", "name_hi": "पट्टम जंक्शन", "lat": 8.5250, "lng": 76.9450},
            {"name": "Kesavadasapuram", "name_hi": "केशवदासपुरम", "lat": 8.5390, "lng": 76.9380},
            {"name": "Ulloor Bridge", "name_hi": "उल्लूर ब्रिज", "lat": 8.5470, "lng": 76.9270},
            {"name": "Sreekaryam Loyola Gate", "name_hi": "श्रीकार्यम", "lat": 8.5520, "lng": 76.9150},
            {"name": "Technopark Phase 1 Kazhakkoottam", "name_hi": "टेक्नोपार्क कझाकूट्टम", "lat": 8.5580, "lng": 76.8820},
        ],
    },

    # ---------------------------------------------------------------------------
    # 9. Uttar Pradesh - UPSRTC (5 routes: Lucknow, Noida, Varanasi, Agra)
    # ---------------------------------------------------------------------------
    {
        "number": "101",
        "name": "Charbagh – Hazratganj – Gomti Nagar",
        "name_hi": "चारबाग – हजरतगंज – गोमती नगर",
        "state": "Uttar Pradesh",
        "city": "Lucknow",
        "color": "#B87503",
        "stops": [
            {"name": "Charbagh Railway Station", "name_hi": "चारबाग रेलवे स्टेशन", "lat": 26.8320, "lng": 80.9180},
            {"name": "Hussainganj Crossing", "name_hi": "हुसैनगंज क्रॉसिंग", "lat": 26.8410, "lng": 80.9290},
            {"name": "Hazratganj GPO", "name_hi": "हजरतगंज जीपीओ", "lat": 26.8520, "lng": 80.9450},
            {"name": "Lucknow Zoo Crossing", "name_hi": "लखनऊ चिड़ियाघर", "lat": 26.8550, "lng": 80.9570},
            {"name": "Polytechnic Crossing", "name_hi": "पॉलीटेक्निक चौराहा", "lat": 26.8740, "lng": 80.9990},
            {"name": "Gomti Nagar Patrakarpuram", "name_hi": "गोमती नगर पत्रकारपुरम", "lat": 26.8560, "lng": 81.0110},
        ],
    },
    {
        "number": "102",
        "name": "Alambagh – Kaiserbagh – Munshipulia",
        "name_hi": "आलमबाग – कैसरबाग – मुंशीपुलिया",
        "state": "Uttar Pradesh",
        "city": "Lucknow",
        "color": "#2563EB",
        "stops": [
            {"name": "Alambagh Bus Terminal", "name_hi": "आलमबाग बस टर्मिनल", "lat": 26.8110, "lng": 80.9020},
            {"name": "Charbagh Metro", "name_hi": "चारबाग मेट्रो", "lat": 26.8320, "lng": 80.9180},
            {"name": "Kaiserbagh Bus Stand", "name_hi": "कैसरबाग बस स्टैंड", "lat": 26.8590, "lng": 80.9320},
            {"name": "IT College Crossing", "name_hi": "आईटी कॉलेज क्रॉसिंग", "lat": 26.8710, "lng": 80.9420},
            {"name": "Nishatganj Bridge", "name_hi": "निशातगंज ब्रिज", "lat": 26.8720, "lng": 80.9630},
            {"name": "Munshipulia Metro Terminal", "name_hi": "मुंशीपुलिया मेट्रो", "lat": 26.8870, "lng": 80.9890},
        ],
    },
    {
        "number": "304",
        "name": "Botanical Garden – Pari Chowk Greater Noida",
        "name_hi": "बॉटनिकल गार्डन – परी चौक ग्रेटर नोएडा",
        "state": "Uttar Pradesh",
        "city": "Noida",
        "color": "#16A34A",
        "stops": [
            {"name": "Botanical Garden Metro Station", "name_hi": "बॉटनिकल गार्डन मेट्रो स्टेशन", "lat": 28.5640, "lng": 77.3340},
            {"name": "Sector 37 Golf Course", "name_hi": "सेक्टर ३७ गोल्फ कोर्स", "lat": 28.5680, "lng": 77.3480},
            {"name": "Sector 50 Metro Station", "name_hi": "सेक्टर ५० मेट्रो स्टेशन", "lat": 28.5770, "lng": 77.3780},
            {"name": "Sector 137 Metro Station", "name_hi": "सेक्टर १३७ मेट्रो", "lat": 28.5130, "lng": 77.4080},
            {"name": "Advant Navis Sector 142", "name_hi": "एडवांट नवीस सेक्टर १४२", "lat": 28.4980, "lng": 77.4220},
            {"name": "Knowledge Park II Greater Noida", "name_hi": "नॉलेज पार्क २", "lat": 28.4650, "lng": 77.4980},
            {"name": "Pari Chowk Greater Noida", "name_hi": "परी चौक ग्रेटर नोएडा", "lat": 28.4610, "lng": 77.5130},
        ],
    },
    {
        "number": "105",
        "name": "Varanasi Cantt – Assi Ghat – BHU Lanka Gate",
        "name_hi": "वाराणसी कैंट – अस्सी घाट – बीएचयू लंका गेट",
        "state": "Uttar Pradesh",
        "city": "Varanasi",
        "color": "#D32F2F",
        "stops": [
            {"name": "Varanasi Cantt Railway Station", "name_hi": "वाराणसी कैंट रेलवे स्टेशन", "lat": 25.3280, "lng": 82.9860},
            {"name": "Sigra Sports Stadium", "name_hi": "सिगरा स्पोर्ट्स स्टेडियम", "lat": 25.3140, "lng": 82.9910},
            {"name": "Rathyatra Crossing", "name_hi": "रथयात्रा चौराहा", "lat": 25.3040, "lng": 82.9920},
            {"name": "Bhelupur Water Works", "name_hi": "भेलूपुर", "lat": 25.2970, "lng": 82.9980},
            {"name": "Assi Ghat Ganga Bank", "name_hi": "अस्सी घाट", "lat": 25.2890, "lng": 83.0070},
            {"name": "BHU Lanka Gate", "name_hi": "बीएचयू लंका गेट", "lat": 25.2810, "lng": 82.9990},
        ],
    },
    {
        "number": "108",
        "name": "Agra Cantt – Agra Fort – Taj East Gate",
        "name_hi": "आगरा कैंट – आगरा फोर्ट – ताज पूर्वी गेट",
        "state": "Uttar Pradesh",
        "city": "Agra",
        "color": "#7C3AED",
        "stops": [
            {"name": "Agra Cantt Railway Station", "name_hi": "आगरा कैंट रेलवे स्टेशन", "lat": 27.1580, "lng": 77.9940},
            {"name": "Sadar Bazar Commercial", "name_hi": "सदर बाजार", "lat": 27.1630, "lng": 78.0060},
            {"name": "Agra Fort Main Gate", "name_hi": "आगरा किला मुख्य द्वार", "lat": 27.1790, "lng": 78.0210},
            {"name": "Bijli Ghar Bus Stand", "name_hi": "बिजली घर बस स्टैंड", "lat": 27.1820, "lng": 78.0270},
            {"name": "Taj East Gate Tourist Complex", "name_hi": "ताज पूर्वी गेट", "lat": 27.1730, "lng": 78.0490},
        ],
    },

    # ---------------------------------------------------------------------------
    # 10. Punjab & Chandigarh - PRTC & CTU (4 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "101",
        "name": "Golden Temple – Amritsar Airport",
        "name_hi": "गोल्डन टेम्पल – अमृतसर एयरपोर्ट",
        "state": "Punjab",
        "city": "Amritsar",
        "color": "#7A2F00",
        "stops": [
            {"name": "Golden Temple Main Gate", "name_hi": "स्वर्ण मंदिर मुख्य द्वार", "lat": 31.6200, "lng": 74.8765},
            {"name": "Hall Gate Commercial", "name_hi": "हॉल गेट", "lat": 31.6320, "lng": 74.8720},
            {"name": "Amritsar Railway Station", "name_hi": "अमृतसर रेलवे स्टेशन", "lat": 31.6340, "lng": 74.8620},
            {"name": "Khalsa College Campus", "name_hi": "खालसा कॉलेज", "lat": 31.6420, "lng": 74.8320},
            {"name": "Gumtala Bypass Ring Road", "name_hi": "गुमताला बाईपास", "lat": 31.6680, "lng": 74.8140},
            {"name": "Sri Guru Ram Dass Jee International Airport", "name_hi": "अमृतसर अंतरराष्ट्रीय हवाई अड्डा", "lat": 31.7090, "lng": 74.7970},
        ],
    },
    {
        "number": "201",
        "name": "ISBT Sector 43 – PGI Medical Center",
        "name_hi": "आईएसबीटी सेक्टर ४३ – पीजीआई मेडिकल सेंटर",
        "state": "Punjab",
        "city": "Chandigarh",
        "color": "#0284C7",
        "stops": [
            {"name": "ISBT Sector 43 Terminal", "name_hi": "आईएसबीटी सेक्टर ४३", "lat": 30.7180, "lng": 76.7480},
            {"name": "Sector 35 Market", "name_hi": "सेक्टर ३५ मार्केट", "lat": 30.7290, "lng": 76.7610},
            {"name": "Aroma Chowk Sector 22", "name_hi": "अरोमा चौक सेक्टर २२", "lat": 30.7380, "lng": 76.7720},
            {"name": "Rose Garden Sector 16", "name_hi": "रोज गार्डन सेक्टर १६", "lat": 30.7480, "lng": 76.7790},
            {"name": "Sector 11 Market", "name_hi": "सेक्टर ११ मार्केट", "lat": 30.7610, "lng": 76.7820},
            {"name": "PGI Hospital Gate 1", "name_hi": "पीजीआई अस्पताल गेट १", "lat": 30.7680, "lng": 76.7740},
        ],
    },
    {
        "number": "302",
        "name": "ISBT Sector 17 – IT Park Manimajra",
        "name_hi": "आईएसबीटी सेक्टर १७ – आईटी पार्क मनीमाजरा",
        "state": "Punjab",
        "city": "Chandigarh",
        "color": "#16A34A",
        "stops": [
            {"name": "ISBT Sector 17 Central", "name_hi": "आईएसबीटी सेक्टर १७", "lat": 30.7400, "lng": 76.7840},
            {"name": "Sector 26 Timber Market", "name_hi": "सेक्टर २६ टिंबर मार्केट", "lat": 30.7290, "lng": 76.8040},
            {"name": "Transport Chowk Industrial", "name_hi": "ट्रांसपोर्ट चौक", "lat": 30.7220, "lng": 76.8180},
            {"name": "Chandigarh Railway Station", "name_hi": "चंडीगढ़ रेलवे स्टेशन", "lat": 30.7050, "lng": 76.8290},
            {"name": "Housing Board Chowk Manimajra", "name_hi": "हाउसिंग बोर्ड चौक", "lat": 30.7210, "lng": 76.8440},
            {"name": "Chandigarh IT Park DLF Building", "name_hi": "चंडीगढ़ आईटी पार्क", "lat": 30.7260, "lng": 76.8580},
        ],
    },
    {
        "number": "102",
        "name": "Ludhiana Bus Stand – Clock Tower",
        "name_hi": "लुधियाना बस स्टैंड – घंटाघर",
        "state": "Punjab",
        "city": "Ludhiana",
        "color": "#EA580C",
        "stops": [
            {"name": "Ludhiana Bus Stand Central", "name_hi": "लुधियाना बस स्टैंड", "lat": 30.8980, "lng": 75.8560},
            {"name": "Bharat Nagar Chowk", "name_hi": "भारत नगर चौक", "lat": 30.9020, "lng": 75.8420},
            {"name": "PAU Gate Ferozepur Road", "name_hi": "पीएयू गेट फिरोजपुर रोड", "lat": 30.9030, "lng": 75.8110},
            {"name": "Aarti Chowk Commercial", "name_hi": "आरती चौक", "lat": 30.9060, "lng": 75.8280},
            {"name": "Clock Tower Chaura Bazar", "name_hi": "घंटाघर चौड़ा बाजार", "lat": 30.9110, "lng": 75.8520},
        ],
    },

    # ---------------------------------------------------------------------------
    # 11. Rajasthan - JCTSL Jaipur & Jodhpur (3 routes)
    # ---------------------------------------------------------------------------
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
    {
        "number": "1",
        "name": "Badi Chaupar – Sodala – Mansarovar Depot",
        "name_hi": "बड़ी चौपड़ – सोडाला – मानसरोवर डिपो",
        "state": "Rajasthan",
        "city": "Jaipur",
        "color": "#0284C7",
        "stops": [
            {"name": "Badi Chaupar City Palace", "name_hi": "बड़ी चौपड़ सिटी पैलेस", "lat": 26.9240, "lng": 75.8270},
            {"name": "Chhoti Chaupar Metro", "name_hi": "छोटी चौपड़ मेट्रो", "lat": 26.9250, "lng": 75.8210},
            {"name": "Government Hostel MI Road", "name_hi": "गवर्नमेंट हॉस्टल एमआई रोड", "lat": 26.9180, "lng": 75.7990},
            {"name": "Civil Lines Metro Station", "name_hi": "सिविल लाइंस मेट्रो", "lat": 26.9090, "lng": 75.7870},
            {"name": "Sodala Elevated Road", "name_hi": "सोडाला", "lat": 26.8990, "lng": 75.7760},
            {"name": "Mansarovar Metro Terminal", "name_hi": "मानसरोवर मेट्रो", "lat": 26.8810, "lng": 75.7620},
            {"name": "Mansarovar Bus Depot", "name_hi": "मानसरोवर बस डिपो", "lat": 26.8520, "lng": 75.7640},
        ],
    },
    {
        "number": "5",
        "name": "Jodhpur Station – Circuit House – Mandore Garden",
        "name_hi": "जोधपुर स्टेशन – सर्किट हाउस – मंडोर गार्डन",
        "state": "Rajasthan",
        "city": "Jodhpur",
        "color": "#16A34A",
        "stops": [
            {"name": "Jodhpur Railway Station Main", "name_hi": "जोधपुर रेलवे स्टेशन", "lat": 26.2840, "lng": 73.0230},
            {"name": "Sojati Gate Commercial", "name_hi": "सोजती गेट", "lat": 26.2910, "lng": 73.0270},
            {"name": "Paota Circle", "name_hi": "पावटा सर्किल", "lat": 26.3050, "lng": 73.0420},
            {"name": "Circuit House Road", "name_hi": "सर्किट हाउस", "lat": 26.3210, "lng": 73.0450},
            {"name": "Mandore Garden Heritage Bus Stand", "name_hi": "मंडोर गार्डन बस स्टैंड", "lat": 26.3570, "lng": 73.0410},
        ],
    },

    # ---------------------------------------------------------------------------
    # 12. Andhra Pradesh - APSRTC Visakhapatnam & Vijayawada (3 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "60",
        "name": "RK Beach – RTC Complex – Simhachalam",
        "name_hi": "आरके बीच – आरटीसी कॉम्प्लेक्स – सिम्हाचलम",
        "state": "Andhra Pradesh",
        "city": "Visakhapatnam",
        "color": "#0284C7",
        "stops": [
            {"name": "RK Beach Submarine Museum", "name_hi": "आरके बीच सबमरीन संग्रहालय", "lat": 17.7150, "lng": 83.3320},
            {"name": "Jagadamba Junction", "name_hi": "जगदंबा जंक्शन", "lat": 17.7120, "lng": 83.3030},
            {"name": "Dwaraka RTC Bus Complex", "name_hi": "द्वारका आरटीसी बस कॉम्प्लेक्स", "lat": 17.7280, "lng": 83.3080},
            {"name": "NAD Kotha Road Flyover", "name_hi": "एनएडी कोठा रोड", "lat": 17.7540, "lng": 83.2390},
            {"name": "Gopalapatnam Railway Gate", "name_hi": "गोपालपटनम", "lat": 17.7650, "lng": 83.2180},
            {"name": "Simhachalam Temple Foothills", "name_hi": "सिम्हाचलम मंदिर तलहटी", "lat": 17.7710, "lng": 83.2420},
        ],
    },
    {
        "number": "222-AP",
        "name": "RTC Complex – Maddilapalem – Gajuwaka",
        "name_hi": "आरटीसी कॉम्प्लेक्स – मद्दीलापलेम – गाजुवाका",
        "state": "Andhra Pradesh",
        "city": "Visakhapatnam",
        "color": "#16A34A",
        "stops": [
            {"name": "RTC Bus Complex Dwaraka Nagar", "name_hi": "आरटीसी कॉम्प्लेक्स", "lat": 17.7280, "lng": 83.3080},
            {"name": "Maddilapalem Bus Depot", "name_hi": "मद्दीलापलेम बस डिपो", "lat": 17.7420, "lng": 83.3280},
            {"name": "MVP Colony Sector 2", "name_hi": "एमवीपी कॉलोनी", "lat": 17.7470, "lng": 83.3440},
            {"name": "Marripalem Junction", "name_hi": "मर्रीपलेम", "lat": 17.7490, "lng": 83.2680},
            {"name": "NAD Flyover Junction", "name_hi": "एनएडी जंक्शन", "lat": 17.7540, "lng": 83.2390},
            {"name": "BHPV Industrial Gate", "name_hi": "बीएचपीवी गेट", "lat": 17.7180, "lng": 83.2080},
            {"name": "Gajuwaka Bus Terminal", "name_hi": "गाजुवाका बस टर्मिनल", "lat": 17.6890, "lng": 83.2140},
        ],
    },
    {
        "number": "116-AP",
        "name": "PNBS Bus Station – Benz Circle – Gannavaram Airport",
        "name_hi": "पीएनबीएस बस स्टेशन – बेंज सर्कल – गन्नवरम एयरपोर्ट",
        "state": "Andhra Pradesh",
        "city": "Vijayawada",
        "color": "#D97706",
        "stops": [
            {"name": "Pandit Nehru Bus Station PNBS", "name_hi": "पंडित नेहरू बस स्टेशन", "lat": 16.5080, "lng": 80.6180},
            {"name": "Benz Circle Bandar Road", "name_hi": "बेंज सर्कल", "lat": 16.4990, "lng": 80.6550},
            {"name": "Ramavarappadu Ring", "name_hi": "रामवरप्पाडु रिंग", "lat": 16.5240, "lng": 80.6780},
            {"name": "Enikepadu Junction", "name_hi": "एनिकेपाडु", "lat": 16.5310, "lng": 80.7020},
            {"name": "Kesarapalli IT Park", "name_hi": "केसरपल्ली आईटी पार्क", "lat": 16.5360, "lng": 80.7680},
            {"name": "Vijayawada International Airport", "name_hi": "विजयवाड़ा हवाई अड्डा गन्नवरम", "lat": 16.5310, "lng": 80.7960},
        ],
    },

    # ---------------------------------------------------------------------------
    # 13. Madhya Pradesh - BCLL Bhopal & AiCTSL Indore (3 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "TR-1",
        "name": "Halalpur – MP Nagar – Mandideep",
        "name_hi": "हलालपुर – एमपी नगर – मंडीदीप",
        "state": "Madhya Pradesh",
        "city": "Bhopal",
        "color": "#2563EB",
        "stops": [
            {"name": "Halalpur Bus Stand", "name_hi": "हलालपुर बस स्टैंड", "lat": 23.2750, "lng": 77.3450},
            {"name": "Lalghati Square", "name_hi": "लालघाटी चौराहा", "lat": 23.2840, "lng": 77.3620},
            {"name": "VIP Road Upper Lake", "name_hi": "वीआईपी रोड बड़ी झील", "lat": 23.2650, "lng": 77.3880},
            {"name": "Polytechnic Square", "name_hi": "पॉलीटेक्निक चौराहा", "lat": 23.2380, "lng": 77.4020},
            {"name": "MP Nagar Zone 1", "name_hi": "एमपी नगर जोन १", "lat": 23.2310, "lng": 77.4360},
            {"name": "Habibganj Railway Station", "name_hi": "हबीबगंज रानी कमलापति स्टेशन", "lat": 23.2180, "lng": 77.4420},
            {"name": "Misrod Bypass", "name_hi": "मिसरोद", "lat": 23.1670, "lng": 77.4680},
            {"name": "Mandideep Industrial Area", "name_hi": "मंडीदीप औद्योगिक क्षेत्र", "lat": 23.0840, "lng": 77.5190},
        ],
    },
    {
        "number": "i-Bus",
        "name": "Rajiv Gandhi Square – AB Road – Niranjanpur",
        "name_hi": "राजीव गांधी चौराहा – एबी रोड – निरंजनपुर",
        "state": "Madhya Pradesh",
        "city": "Indore",
        "color": "#16A34A",
        "stops": [
            {"name": "Rajiv Gandhi Square BRTS", "name_hi": "राजीव गांधी चौराहा", "lat": 22.6840, "lng": 75.8590},
            {"name": "Bhanwarkuan Square", "name_hi": "भंवरकुआं चौराहा", "lat": 22.6930, "lng": 75.8670},
            {"name": "Geeta Bhawan Square", "name_hi": "गीता भवन चौराहा", "lat": 22.7160, "lng": 75.8820},
            {"name": "Palasia Square BRTS", "name_hi": "पलासिया चौराहा", "lat": 22.7240, "lng": 75.8920},
            {"name": "Industry House AB Road", "name_hi": "इंडस्ट्री हाउस", "lat": 22.7350, "lng": 75.8960},
            {"name": "LIG Square BRTS", "name_hi": "एलआईजी चौराहा", "lat": 22.7440, "lng": 75.8950},
            {"name": "Vijay Nagar Square", "name_hi": "विजय नगर चौराहा", "lat": 22.7530, "lng": 75.8940},
            {"name": "Niranjanpur BRTS Depot", "name_hi": "निरंजनपुर डिपो", "lat": 22.7780, "lng": 75.8910},
        ],
    },
    {
        "number": "208",
        "name": "Rani Kamlapati – Old City – Bairagarh",
        "name_hi": "रानी कमलापति – पुराना शहर – बैरागढ़",
        "state": "Madhya Pradesh",
        "city": "Bhopal",
        "color": "#D32F2F",
        "stops": [
            {"name": "Rani Kamlapati Railway Station", "name_hi": "रानी कमलापति रेलवे स्टेशन", "lat": 23.2180, "lng": 77.4420},
            {"name": "Board Office Square", "name_hi": "बोर्ड ऑफिस चौराहा", "lat": 23.2340, "lng": 77.4320},
            {"name": "Lily Cinema Old City", "name_hi": "लिली टॉकीज पुराना शहर", "lat": 23.2520, "lng": 77.4110},
            {"name": "Hamidia Hospital Crossing", "name_hi": "हमीदिया अस्पताल", "lat": 23.2610, "lng": 77.3980},
            {"name": "Bairagarh Sant Hirdaram Nagar", "name_hi": "बैरागढ़ संत हिरदाराम नगर", "lat": 23.2780, "lng": 77.3320},
        ],
    },

    # ---------------------------------------------------------------------------
    # 14. Bihar - BSRTC Patna (2 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "111",
        "name": "Gandhi Maidan – Danapur Cantt",
        "name_hi": "गांधी मैदान – दानापुर छावनी",
        "state": "Bihar",
        "city": "Patna",
        "color": "#1B7F31",
        "stops": [
            {"name": "Gandhi Maidan Bus Stand", "name_hi": "गांधी मैदान बस स्टैंड", "lat": 25.6200, "lng": 85.1450},
            {"name": "Dak Bungalow Chowk", "name_hi": "डाक बंगला चौराहा", "lat": 25.6110, "lng": 85.1370},
            {"name": "Patna Junction Railway Station", "name_hi": "पटना जंक्शन रेलवे स्टेशन", "lat": 25.6020, "lng": 85.1320},
            {"name": "Saguna Mor Bailey Road", "name_hi": "सगुना मोड़ बेली रोड", "lat": 25.6170, "lng": 85.0480},
            {"name": "Danapur Cantt Bus Stand", "name_hi": "दानापुर छावनी", "lat": 25.6320, "lng": 85.0310},
        ],
    },
    {
        "number": "222-BR",
        "name": "Patna Junction – Phulwari Sharif – AIIMS Patna",
        "name_hi": "पटना जंक्शन – फुलवारी शरीफ – एम्स पटना",
        "state": "Bihar",
        "city": "Patna",
        "color": "#0284C7",
        "stops": [
            {"name": "Patna Junction South Gate", "name_hi": "पटना जंक्शन साउथ गेट", "lat": 25.6010, "lng": 85.1330},
            {"name": "Mithapur Bus Stand Terminal", "name_hi": "मीठापुर बस स्टैंड", "lat": 25.5920, "lng": 85.1290},
            {"name": "Anisabad Golambar", "name_hi": "अनीसाबाद गोलंबर", "lat": 25.5840, "lng": 85.1030},
            {"name": "Phulwari Sharif Block", "name_hi": "फुलवारी शरीफ", "lat": 25.5780, "lng": 85.0780},
            {"name": "AIIMS Patna Main Hospital Gate", "name_hi": "एम्स पटना मुख्य द्वार", "lat": 25.5610, "lng": 85.0440},
        ],
    },

    # ---------------------------------------------------------------------------
    # 15. Odisha - Mo Bus Bhubaneswar & Cuttack (2 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "10",
        "name": "Biju Patnaik Airport – Nandankanan Zoo",
        "name_hi": "बीजू पटनायक हवाई अड्डा – नंदनकानन चिड़ियाघर",
        "state": "Odisha",
        "city": "Bhubaneswar",
        "color": "#4A4A4A",
        "stops": [
            {"name": "Biju Patnaik International Airport", "name_hi": "बीजू पटनायक अंतरराष्ट्रीय हवाई अड्डा", "lat": 20.2520, "lng": 85.8170},
            {"name": "AG Square Secretariat", "name_hi": "एजी स्क्वायर सचिवालय", "lat": 20.2710, "lng": 85.8280},
            {"name": "Master Canteen Railway Station", "name_hi": "मास्टर कैंटीन रेलवे स्टेशन", "lat": 20.2670, "lng": 85.8430},
            {"name": "Vani Vihar Utkal University", "name_hi": "वाणी विहार उत्कल विश्वविद्यालय", "lat": 20.3010, "lng": 85.8460},
            {"name": "Rasulgarh Square", "name_hi": "रसूलगढ़ स्क्वायर", "lat": 20.3080, "lng": 85.8640},
            {"name": "Patia KIIT Square", "name_hi": "पटिया केआईआईटी स्क्वायर", "lat": 20.3540, "lng": 85.8190},
            {"name": "Nandankanan Zoological Park", "name_hi": "नंदनकानन प्राणी उद्यान", "lat": 20.3980, "lng": 85.8240},
        ],
    },
    {
        "number": "16",
        "name": "Master Canteen – Badambadi Cuttack",
        "name_hi": "मास्टर कैंटीन – बादामबाड़ी कटक",
        "state": "Odisha",
        "city": "Bhubaneswar",
        "color": "#EA580C",
        "stops": [
            {"name": "Master Canteen Bhubaneswar", "name_hi": "मास्टर कैंटीन भुवनेश्वर", "lat": 20.2670, "lng": 85.8430},
            {"name": "Jaydev Vihar Square", "name_hi": "जयदेव विहार", "lat": 20.3010, "lng": 85.8230},
            {"name": "Palasuni NH Crossing", "name_hi": "पलासुनी", "lat": 20.3150, "lng": 85.8750},
            {"name": "Cuttack Netaji Bus Terminal", "name_hi": "कटक नेताजी बस टर्मिनल", "lat": 20.4550, "lng": 85.8680},
            {"name": "Badambadi Bus Stand Cuttack", "name_hi": "बादामबाड़ी बस स्टैंड कटक", "lat": 20.4630, "lng": 85.8810},
        ],
    },

    # ---------------------------------------------------------------------------
    # 16. Assam - ASTC Guwahati (2 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "25",
        "name": "Jalukbari – Paltan Bazaar – Khanapara",
        "name_hi": "जालुकबारी – पलटन बाजार – खानापारा",
        "state": "Assam",
        "city": "Guwahati",
        "color": "#C04A00",
        "stops": [
            {"name": "Jalukbari Point Gauhati University", "name_hi": "जालुकबारी पॉइंट", "lat": 26.1450, "lng": 91.6620},
            {"name": "Maligaon Railway HQ", "name_hi": "मालीगांव रेलवे मुख्यालय", "lat": 26.1550, "lng": 91.7010},
            {"name": "Bharalumukh Riverside", "name_hi": "भरालूमुख", "lat": 26.1680, "lng": 91.7340},
            {"name": "Paltan Bazaar ASTC Stand", "name_hi": "पलटन बाजार एएसटीसी", "lat": 26.1810, "lng": 91.7510},
            {"name": "Ganeshguri Flyover", "name_hi": "गणेशगुड़ी फ्लाईओवर", "lat": 26.1520, "lng": 91.7850},
            {"name": "Khanapara Assam Meghalaya Border", "name_hi": "खानापारा बॉर्डर", "lat": 26.1210, "lng": 91.8210},
        ],
    },
    {
        "number": "28",
        "name": "Paltan Bazaar – Chandmari – Narangi",
        "name_hi": "पलटन बाजार – चांदमारी – नारंगी",
        "state": "Assam",
        "city": "Guwahati",
        "color": "#0284C7",
        "stops": [
            {"name": "Paltan Bazaar Railway Side", "name_hi": "पलटन बाजार", "lat": 26.1810, "lng": 91.7510},
            {"name": "Panbazar Cotton University", "name_hi": "पानबाजार कॉटन कॉलेज", "lat": 26.1880, "lng": 91.7480},
            {"name": "Chandmari Colony Flyover", "name_hi": "चांदमारी कॉलोनी", "lat": 26.1890, "lng": 91.7740},
            {"name": "Noonmati Oil Refinery Gate", "name_hi": "नूनमाटी रिफाइनरी", "lat": 26.1920, "lng": 91.8020},
            {"name": "Narangi Army Cantt Bus Stand", "name_hi": "नारंगी कैंट", "lat": 26.1870, "lng": 91.8340},
        ],
    },

    # ---------------------------------------------------------------------------
    # 17. Goa - KTCL (2 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "101-GA",
        "name": "Panaji KTC – Miramar Beach",
        "name_hi": "पणजी केटीसी – मीरामार बीच",
        "state": "Goa",
        "city": "Panaji",
        "color": "#D32F2F",
        "stops": [
            {"name": "Panaji KTC Central Bus Stand", "name_hi": "पणजी केटीसी सेंट्रल बस स्टैंड", "lat": 15.4980, "lng": 73.8340},
            {"name": "Campal Trade Centre", "name_hi": "कम्पल", "lat": 15.4920, "lng": 73.8180},
            {"name": "Kala Academy Theatre", "name_hi": "कला अकादमी", "lat": 15.4890, "lng": 73.8120},
            {"name": "Caranzalem Circle", "name_hi": "करंजलेम", "lat": 15.4740, "lng": 73.8090},
            {"name": "Miramar Beach Promenade", "name_hi": "मीरामार बीच", "lat": 15.4810, "lng": 73.8050},
        ],
    },
    {
        "number": "102-GA",
        "name": "Panaji KTC – GMC Bambolim – Margao KTC",
        "name_hi": "पणजी केटीसी – जीएमसी बाम्बोलिम – मडगांव केटीसी",
        "state": "Goa",
        "city": "Margao",
        "color": "#16A34A",
        "stops": [
            {"name": "Panaji KTC Bus Stand", "name_hi": "पणजी केटीसी बस स्टैंड", "lat": 15.4980, "lng": 73.8340},
            {"name": "Goa Medical College Bambolim", "name_hi": "जीएमसी बाम्बोलिम", "lat": 15.4610, "lng": 73.8560},
            {"name": "Cortalim Zuari Bridge Circle", "name_hi": "कोरटालिम जुआरी ब्रिज", "lat": 15.4120, "lng": 73.9030},
            {"name": "Verna Industrial Estate", "name_hi": "वेर्ना औद्योगिक क्षेत्र", "lat": 15.3620, "lng": 73.9310},
            {"name": "Margao KTC Bus Terminal", "name_hi": "मडगांव केटीसी बस टर्मिनल", "lat": 15.2840, "lng": 73.9650},
        ],
    },

    # ---------------------------------------------------------------------------
    # 18. Jammu & Kashmir (2 routes: Srinagar & Jammu)
    # ---------------------------------------------------------------------------
    {
        "number": "101-JK",
        "name": "Lal Chowk – Boulevard – Hazratbal",
        "name_hi": "लाल चौक – बुलेवार्ड – हजरतबल",
        "state": "Jammu & Kashmir",
        "city": "Srinagar",
        "color": "#1B7F31",
        "stops": [
            {"name": "Lal Chowk City Centre", "name_hi": "लाल चौक", "lat": 34.0720, "lng": 74.8110},
            {"name": "Dalgate Dal Lake", "name_hi": "डलगेट डल झील", "lat": 34.0840, "lng": 74.8320},
            {"name": "Boulevard Nehru Park", "name_hi": "बुलेवार्ड नेहरू पार्क", "lat": 34.0890, "lng": 74.8470},
            {"name": "Nishat Mughal Gardens", "name_hi": "निशात मुगल गार्डन", "lat": 34.1250, "lng": 74.8820},
            {"name": "Shalimar Bagh Entrance", "name_hi": "शालीमार बाग", "lat": 34.1480, "lng": 74.8710},
            {"name": "Hazratbal Shrine Terminal", "name_hi": "हजरतबल दरगाह", "lat": 34.1290, "lng": 74.8420},
        ],
    },
    {
        "number": "102-JK",
        "name": "Jammu Tawi – Bahu Plaza – Gandhi Nagar",
        "name_hi": "जम्मू तवी – बाहु प्लाजा – गांधी नगर",
        "state": "Jammu & Kashmir",
        "city": "Jammu",
        "color": "#0284C7",
        "stops": [
            {"name": "Jammu Tawi Railway Station", "name_hi": "जम्मू तवी रेलवे स्टेशन", "lat": 32.7050, "lng": 74.8730},
            {"name": "Bikram Chowk Bridge", "name_hi": "बिक्रम चौक", "lat": 32.7160, "lng": 74.8620},
            {"name": "Bahu Plaza Complex", "name_hi": "बाहु प्लाजा कॉम्प्लेक्स", "lat": 32.6990, "lng": 74.8840},
            {"name": "Shastri Nagar", "name_hi": "शास्त्री नगर", "lat": 32.6950, "lng": 74.8710},
            {"name": "Gandhi Nagar Hospital Stand", "name_hi": "गांधी नगर बस स्टैंड", "lat": 32.7080, "lng": 74.8610},
        ],
    },

    # ---------------------------------------------------------------------------
    # 19. Himachal Pradesh - HRTC Shimla (2 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "1-HP",
        "name": "Old Bus Stand – The Mall – Sanjauli",
        "name_hi": "ओल्ड बस स्टैंड – द मॉल – संजौली",
        "state": "Himachal Pradesh",
        "city": "Shimla",
        "color": "#7A2F00",
        "stops": [
            {"name": "Shimla Old Bus Stand", "name_hi": "शिमला ओल्ड बस स्टैंड", "lat": 31.1040, "lng": 77.1680},
            {"name": "Victory Tunnel Cart Road", "name_hi": "विक्ट्री टनल", "lat": 31.1070, "lng": 77.1650},
            {"name": "Lakkar Bazaar Bus Stand", "name_hi": "लक्कड़ बाजार बस स्टैंड", "lat": 31.1090, "lng": 77.1780},
            {"name": "Auckland Tunnel IGMC", "name_hi": "ऑकलैंड टनल आईजीएमसी", "lat": 31.1090, "lng": 77.1890},
            {"name": "Sanjauli Chowk Terminal", "name_hi": "संजौली चौक", "lat": 31.1020, "lng": 77.1990},
        ],
    },
    {
        "number": "5-HP",
        "name": "ISBT Tutikandi – Summer Hill HPU",
        "name_hi": "आईएसबीटी टूटीकंडी – समर हिल एचपीयू",
        "state": "Himachal Pradesh",
        "city": "Shimla",
        "color": "#059669",
        "stops": [
            {"name": "ISBT Tutikandi Bypass", "name_hi": "आईएसबीटी टूटीकंडी बाईपास", "lat": 31.0920, "lng": 77.1510},
            {"name": "Cart Road Crossing", "name_hi": "कार्ट रोड क्रॉसिंग", "lat": 31.1010, "lng": 77.1620},
            {"name": "Boileauganj Chowk", "name_hi": "बॉइलगंज चौक", "lat": 31.1060, "lng": 77.1420},
            {"name": "Summer Hill Himachal University", "name_hi": "समर हिल हिमाचल विश्वविद्यालय", "lat": 31.1120, "lng": 77.1350},
        ],
    },

    # ---------------------------------------------------------------------------
    # 20. Uttarakhand - UTC Dehradun & Haridwar (2 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "101-UK",
        "name": "Clock Tower – ISBT Dehradun",
        "name_hi": "क्लॉक टॉवर – आईएसबीटी देहरादून",
        "state": "Uttarakhand",
        "city": "Dehradun",
        "color": "#4A4A4A",
        "stops": [
            {"name": "Clock Tower Ghanta Ghar", "name_hi": "घंटाघर", "lat": 30.3250, "lng": 78.0410},
            {"name": "Prince Chowk Railway Station", "name_hi": "प्रिंस चौक रेलवे स्टेशन", "lat": 30.3150, "lng": 78.0380},
            {"name": "Saharanpur Chowk", "name_hi": "सहारनपुर चौक", "lat": 30.3090, "lng": 78.0280},
            {"name": "Niranjanpur Sabzi Mandi", "name_hi": "निरंजनपुर मंडी", "lat": 30.2980, "lng": 78.0160},
            {"name": "ISBT Dehradun Terminal", "name_hi": "आईएसबीटी देहरादून टर्मिनल", "lat": 30.2860, "lng": 78.0070},
        ],
    },
    {
        "number": "102-UK",
        "name": "Haridwar Station – Har Ki Pauri",
        "name_hi": "हरिद्वार स्टेशन – हर की पौड़ी",
        "state": "Uttarakhand",
        "city": "Haridwar",
        "color": "#D97706",
        "stops": [
            {"name": "Haridwar Railway Station Front", "name_hi": "हरिद्वार रेलवे स्टेशन", "lat": 29.9450, "lng": 78.1510},
            {"name": "Haridwar Roadways Bus Stand", "name_hi": "हरिद्वार बस स्टैंड", "lat": 29.9470, "lng": 78.1530},
            {"name": "Devpura Chowk", "name_hi": "देवपुरा चौक", "lat": 29.9510, "lng": 78.1580},
            {"name": "Maya Devi Temple Crossing", "name_hi": "माया देवी मंदिर", "lat": 29.9550, "lng": 78.1630},
            {"name": "Har Ki Pauri Ghat Terminus", "name_hi": "हर की पौड़ी घाट", "lat": 29.9570, "lng": 78.1720},
        ],
    },

    # ---------------------------------------------------------------------------
    # 21. Jharkhand - Ranchi & Jamshedpur (2 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "1-JH",
        "name": "Birsa Munda Bus Terminal – Ratu Road",
        "name_hi": "बिरसा मुंडा बस टर्मिनल – रातू रोड",
        "state": "Jharkhand",
        "city": "Ranchi",
        "color": "#B87503",
        "stops": [
            {"name": "Birsa Munda Bus Terminal Khadgarha", "name_hi": "बिरसा मुंडा बस टर्मिनल", "lat": 23.3610, "lng": 85.3460},
            {"name": "Overbridge Kantatoli", "name_hi": "कांटाटोली ओवरब्रिज", "lat": 23.3660, "lng": 85.3410},
            {"name": "Main Road GEL Church", "name_hi": "मेन रोड जीईएल चर्च", "lat": 23.3680, "lng": 85.3280},
            {"name": "Albert Ekka Chowk Firayalal", "name_hi": "अल्बर्ट एक्का चौक", "lat": 23.3720, "lng": 85.3250},
            {"name": "Kutchery Chowk District Court", "name_hi": "कचहरी चौक", "lat": 23.3770, "lng": 85.3230},
            {"name": "Ratu Road Pandra Market", "name_hi": "रातू रोड", "lat": 23.3850, "lng": 85.3020},
        ],
    },
    {
        "number": "2-JH",
        "name": "Tatanagar Station – Sakchi Bus Stand",
        "name_hi": "टाटानगर स्टेशन – साकची बस स्टैंड",
        "state": "Jharkhand",
        "city": "Jamshedpur",
        "color": "#0284C7",
        "stops": [
            {"name": "Tatanagar Railway Station", "name_hi": "टाटानगर रेलवे स्टेशन", "lat": 22.7710, "lng": 86.1990},
            {"name": "Jugsalai Main Road", "name_hi": "जुगसलाई", "lat": 22.7770, "lng": 86.1910},
            {"name": "Bistupur Post Office", "name_hi": "बिष्टुपुर", "lat": 22.7950, "lng": 86.1820},
            {"name": "Golmuri Tinplate", "name_hi": "गोलमुरी", "lat": 22.8020, "lng": 86.2160},
            {"name": "Sakchi Central Bus Stand", "name_hi": "साकची बस स्टैंड", "lat": 22.8120, "lng": 86.2040},
        ],
    },

    # ---------------------------------------------------------------------------
    # 22. Chhattisgarh - Raipur & Nava Raipur (2 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "101-CG",
        "name": "Pandri Bus Stand – Tatibandh AIIMS",
        "name_hi": "पंडरी बस स्टैंड – टाटीबंध एम्स",
        "state": "Chhattisgarh",
        "city": "Raipur",
        "color": "#C04A00",
        "stops": [
            {"name": "Pandri Central Bus Stand", "name_hi": "पंडरी बस स्टैंड", "lat": 21.2580, "lng": 81.6510},
            {"name": "Telibandha Marine Drive", "name_hi": "तेलीबांधा मरीन ड्राइव", "lat": 21.2380, "lng": 81.6620},
            {"name": "Jaistambh Chowk Central", "name_hi": "जयस्तंभ चौक", "lat": 21.2420, "lng": 81.6310},
            {"name": "Sarona Bridge GE Road", "name_hi": "सरोना", "lat": 21.2460, "lng": 81.5850},
            {"name": "Tatibandh AIIMS Hospital Gate", "name_hi": "टाटीबंध एम्स", "lat": 21.2590, "lng": 81.5640},
        ],
    },
    {
        "number": "102-CG",
        "name": "Raipur Station – Atal Nagar Mantralaya",
        "name_hi": "रायपुर स्टेशन – अटल नगर मंत्रालय",
        "state": "Chhattisgarh",
        "city": "Nava Raipur",
        "color": "#16A34A",
        "stops": [
            {"name": "Raipur Junction Railway Station", "name_hi": "रायपुर जंक्शन रेलवे स्टेशन", "lat": 21.2550, "lng": 81.6290},
            {"name": "Telibandha Ring Road", "name_hi": "तेलीबांधा रिंग रोड", "lat": 21.2360, "lng": 81.6680},
            {"name": "Magneto The Mall", "name_hi": "मैग्नेटो मॉल", "lat": 21.2310, "lng": 81.6880},
            {"name": "Uparwara Nava Raipur Station", "name_hi": "उपरवारा", "lat": 21.1710, "lng": 81.7680},
            {"name": "Atal Nagar Mahanadi Mantralaya", "name_hi": "अटल नगर मंत्रालय", "lat": 21.1610, "lng": 81.7890},
        ],
    },

    # ---------------------------------------------------------------------------
    # 23. Haryana - GMCBL Gurugram & Faridabad (2 routes)
    # ---------------------------------------------------------------------------
    {
        "number": "112",
        "name": "HUDA City Centre – DLF Cyber City",
        "name_hi": "हुडा सिटी सेंटर – डीएलएफ साइबर सिटी",
        "state": "Haryana",
        "city": "Gurugram",
        "color": "#D32F2F",
        "stops": [
            {"name": "HUDA City Centre Metro Millennium", "name_hi": "हुडा सिटी सेंटर मेट्रो", "lat": 28.4590, "lng": 77.0720},
            {"name": "IFFCO Chowk Flyover", "name_hi": "इफको चौक", "lat": 28.4720, "lng": 77.0690},
            {"name": "Shankar Chowk Highway", "name_hi": "शंकर चौक", "lat": 28.4980, "lng": 77.0870},
            {"name": "DLF Cyber City Building 10", "name_hi": "डीएलएफ साइबर सिटी", "lat": 28.4950, "lng": 77.0910},
            {"name": "Ambience Mall Toll Gate", "name_hi": "एम्बिएंस मॉल", "lat": 28.5040, "lng": 77.0970},
        ],
    },
    {
        "number": "116-HR",
        "name": "Badarpur Border – Ballabgarh Bus Stand",
        "name_hi": "बदरपुर बॉर्डर – बल्लभगढ़ बस स्टैंड",
        "state": "Haryana",
        "city": "Faridabad",
        "color": "#2563EB",
        "stops": [
            {"name": "Badarpur Metro Border", "name_hi": "बदरपुर बॉर्डर", "lat": 28.4920, "lng": 77.3020},
            {"name": "NHPC Chowk Metro", "name_hi": "एनएचपीसी चौक", "lat": 28.4680, "lng": 77.3110},
            {"name": "Old Faridabad Railway Metro", "name_hi": "ओल्ड फरीदाबाद", "lat": 28.4190, "lng": 77.3160},
            {"name": "Neelam Chowk Ajronda", "name_hi": "नीलम चौक अजरौंदा", "lat": 28.3880, "lng": 77.3140},
            {"name": "Ballabgarh Raja Nahar Singh Terminal", "name_hi": "बल्लभगढ़ बस स्टैंड", "lat": 28.3360, "lng": 77.3190},
        ],
    },

    # ---------------------------------------------------------------------------
    # 24. Tripura - Agartala (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-TR",
        "name": "Agartala Motor Stand – MBB Airport",
        "name_hi": "अगरतला मोटर स्टैंड – एमबीबी एयरपोर्ट",
        "state": "Tripura",
        "city": "Agartala",
        "color": "#16A34A",
        "stops": [
            {"name": "Agartala Central Motor Stand", "name_hi": "अगरतला मोटर स्टैंड", "lat": 23.8340, "lng": 91.2820},
            {"name": "Radhanagar Bus Stand", "name_hi": "राधानगर बस स्टैंड", "lat": 23.8480, "lng": 91.2880},
            {"name": "New Secretariat Complex", "name_hi": "न्यू सेक्रेटेरिएट", "lat": 23.8640, "lng": 91.2940},
            {"name": "Kunjaban VIP Road", "name_hi": "कुंजबन", "lat": 23.8710, "lng": 91.2890},
            {"name": "Maharaja Bir Bikram Airport", "name_hi": "एमबीबी एयरपोर्ट अगरतला", "lat": 23.8860, "lng": 91.2420},
        ],
    },

    # ---------------------------------------------------------------------------
    # 25. Manipur - Imphal (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-MN",
        "name": "Kangla Fort – Imphal Airport",
        "name_hi": "कांगला किला – इंफाल हवाई अड्डा",
        "state": "Manipur",
        "city": "Imphal",
        "color": "#C04A00",
        "stops": [
            {"name": "Kangla Fort Western Gate", "name_hi": "कांगला किला", "lat": 24.8080, "lng": 93.9390},
            {"name": "Keishampat Junction", "name_hi": "कीशमपाट", "lat": 24.7980, "lng": 93.9320},
            {"name": "Singjamei Supermarket", "name_hi": "सिंगजमेई", "lat": 24.7790, "lng": 93.9310},
            {"name": "Bir Tikendrajit Marg", "name_hi": "बीर टिकेंद्रजीत मार्ग", "lat": 24.7640, "lng": 93.9120},
            {"name": "Bir Tikendrajit International Airport", "name_hi": "इंफाल अंतरराष्ट्रीय हवाई अड्डा", "lat": 24.7610, "lng": 93.8960},
        ],
    },

    # ---------------------------------------------------------------------------
    # 26. Meghalaya - Shillong (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-ML",
        "name": "Police Bazar – NEHU Campus",
        "name_hi": "पुलिस बाजार – एनईएचयू परिसर",
        "state": "Meghalaya",
        "city": "Shillong",
        "color": "#D32F2F",
        "stops": [
            {"name": "Police Bazar Centre Point", "name_hi": "पुलिस बाजार", "lat": 25.5780, "lng": 91.8840},
            {"name": "Malki Point", "name_hi": "मलकी पॉइंट", "lat": 25.5670, "lng": 91.8890},
            {"name": "Laitumkhrah Market", "name_hi": "लैतुमख्राह मार्केट", "lat": 25.5680, "lng": 91.8980},
            {"name": "Dhankheti Junction", "name_hi": "धनखेती", "lat": 25.5630, "lng": 91.8920},
            {"name": "NEHU Mawlai Campus Main Gate", "name_hi": "एनईएचयू परिसर", "lat": 25.6120, "lng": 91.9020},
        ],
    },

    # ---------------------------------------------------------------------------
    # 27. Nagaland - Kohima (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-NL",
        "name": "Kohima Town – BOC – High School",
        "name_hi": "कोहिमा टाउन – बीओसी – हाई स्कूल",
        "state": "Nagaland",
        "city": "Kohima",
        "color": "#16A34A",
        "stops": [
            {"name": "Kohima Town Main Bus Stand", "name_hi": "कोहिमा टाउन", "lat": 25.6700, "lng": 94.1080},
            {"name": "PR Hill Junction", "name_hi": "पीआर हिल", "lat": 25.6620, "lng": 94.1050},
            {"name": "Ministers Hill", "name_hi": "मिनिस्टर्स हिल", "lat": 25.6580, "lng": 94.1110},
            {"name": "High School Junction", "name_hi": "हाई स्कूल जंक्शन", "lat": 25.6880, "lng": 94.1140},
            {"name": "BOC Terminal Kohima", "name_hi": "बीओसी कोहिमा", "lat": 25.6510, "lng": 94.1020},
        ],
    },

    # ---------------------------------------------------------------------------
    # 28. Mizoram - Aizawl (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-MZ",
        "name": "Zarkawt – Chanmari – Kulikawn",
        "name_hi": "जारकावत – चनमारी – कुलीकॉन",
        "state": "Mizoram",
        "city": "Aizawl",
        "color": "#2563EB",
        "stops": [
            {"name": "Zarkawt Traffic Point", "name_hi": "जारकावत", "lat": 23.7380, "lng": 92.7170},
            {"name": "Chanmari Main Stand", "name_hi": "चनमारी", "lat": 23.7460, "lng": 92.7240},
            {"name": "Bawngkawn Junction", "name_hi": "बावंगकॉन", "lat": 23.7570, "lng": 92.7310},
            {"name": "Khatla Secretariat Road", "name_hi": "खतला", "lat": 23.7220, "lng": 92.7110},
            {"name": "Kulikawn Hospital Stand", "name_hi": "कुलीकॉन", "lat": 23.7080, "lng": 92.7180},
        ],
    },

    # ---------------------------------------------------------------------------
    # 29. Sikkim - SNT Gangtok (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-SK",
        "name": "Deorali – MG Marg – Paljor Stadium",
        "name_hi": "देवराली – एमजी मार्ग – पालजोर स्टेडियम",
        "state": "Sikkim",
        "city": "Gangtok",
        "color": "#C04A00",
        "stops": [
            {"name": "Deorali SNT Bus Stand", "name_hi": "देवराली एसएनटी बस स्टैंड", "lat": 27.3190, "lng": 88.6080},
            {"name": "Sikkim High Court Crossing", "name_hi": "सिक्किम हाईकोर्ट", "lat": 27.3260, "lng": 88.6110},
            {"name": "Paljor Stadium Road", "name_hi": "पालजोर स्टेडियम", "lat": 27.3320, "lng": 88.6140},
            {"name": "Kazi Road Namnang", "name_hi": "काजी रोड नामनांग", "lat": 27.3290, "lng": 88.6090},
            {"name": "MG Marg Tourist Hub", "name_hi": "एमजी मार्ग गंगटोक", "lat": 27.3310, "lng": 88.6130},
        ],
    },

    # ---------------------------------------------------------------------------
    # 30. Arunachal Pradesh - Itanagar (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-AR",
        "name": "Ganga Market – Naharlagun Station",
        "name_hi": "गंगा मार्केट – नाहरलगुन स्टेशन",
        "state": "Arunachal Pradesh",
        "city": "Itanagar",
        "color": "#D32F2F",
        "stops": [
            {"name": "Ganga Market Main Road", "name_hi": "गंगा मार्केट", "lat": 27.0980, "lng": 93.6180},
            {"name": "Bank Tinali Junction", "name_hi": "बैंक तिनाली", "lat": 27.1020, "lng": 93.6260},
            {"name": "Zero Point Tinali", "name_hi": "जीरो पॉइंट", "lat": 27.1060, "lng": 93.6330},
            {"name": "Papu Nallah Bridge", "name_hi": "पापू नाला", "lat": 27.1110, "lng": 93.6640},
            {"name": "Naharlagun Railway Station", "name_hi": "नाहरलगुन रेलवे स्टेशन", "lat": 27.1140, "lng": 93.6980},
        ],
    },

    # ---------------------------------------------------------------------------
    # 31. Ladakh (UT) - Leh (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-LA",
        "name": "Leh Main Bazaar – Spituk – Choglamsar",
        "name_hi": "लेह मुख्य बाजार – स्पितुक – चोगलमसर",
        "state": "Ladakh",
        "city": "Leh",
        "color": "#1B7F31",
        "stops": [
            {"name": "Leh Main Bazaar Polo Ground", "name_hi": "लेह मुख्य बाजार", "lat": 34.1640, "lng": 77.5850},
            {"name": "Skara Road Junction", "name_hi": "स्कारा रोड", "lat": 34.1520, "lng": 77.5740},
            {"name": "Kushok Bakula Rimpochee Airport Road", "name_hi": "लेह हवाई अड्डा रोड", "lat": 34.1410, "lng": 77.5580},
            {"name": "Spituk Monastery Foothills", "name_hi": "स्पितुक मठ", "lat": 34.1290, "lng": 77.5280},
            {"name": "Choglamsar Tibetan Colony", "name_hi": "चोगलमसर", "lat": 34.1190, "lng": 77.5920},
        ],
    },

    # ---------------------------------------------------------------------------
    # 32. Puducherry (UT) - PRTC (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-PY",
        "name": "Rock Beach – Bus Stand – JIPMER",
        "name_hi": "रॉक बीच – बस स्टैंड – जिपमेर",
        "state": "Puducherry",
        "city": "Puducherry",
        "color": "#0284C7",
        "stops": [
            {"name": "Rock Beach Promenade Gandhi Statue", "name_hi": "रॉक बीच", "lat": 11.9330, "lng": 79.8350},
            {"name": "White Town French Quarter", "name_hi": "व्हाइट टाउन", "lat": 11.9310, "lng": 79.8310},
            {"name": "Puducherry Main Bus Stand Maraimalai", "name_hi": "पुडुचेरी बस स्टैंड", "lat": 11.9380, "lng": 79.8140},
            {"name": "Anna Nagar Arch", "name_hi": "अन्ना नगर", "lat": 11.9480, "lng": 79.8050},
            {"name": "JIPMER Medical Hospital Gate", "name_hi": "जिपमेर अस्पताल", "lat": 11.9540, "lng": 79.7990},
        ],
    },

    # ---------------------------------------------------------------------------
    # 33. Andaman & Nicobar Islands (UT) - Port Blair (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-AN",
        "name": "Aberdeen Bazaar – Cellular Jail – Airport",
        "name_hi": "एबरडीन बाजार – सेलुलर जेल – हवाई अड्डा",
        "state": "Andaman & Nicobar",
        "city": "Port Blair",
        "color": "#D32F2F",
        "stops": [
            {"name": "Aberdeen Bazaar Clock Tower", "name_hi": "एबरडीन बाजार घंटाघर", "lat": 11.6660, "lng": 92.7420},
            {"name": "Marina Park Water Sports", "name_hi": "मरीना पार्क", "lat": 11.6680, "lng": 92.7480},
            {"name": "Cellular Jail National Memorial", "name_hi": "सेलुलर जेल स्मारक", "lat": 11.6740, "lng": 92.7470},
            {"name": "Dairy Farm Junction", "name_hi": "डेयरी फार्म", "lat": 11.6520, "lng": 92.7290},
            {"name": "Veer Savarkar International Airport", "name_hi": "वीर सावरकर अंतरराष्ट्रीय हवाई अड्डा", "lat": 11.6440, "lng": 92.7310},
        ],
    },

    # ---------------------------------------------------------------------------
    # 34. Dadra & Nagar Haveli and Daman & Diu (UT) (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-DD",
        "name": "Nani Daman – Devka Beach – Moti Daman",
        "name_hi": "नानी दमन – देवका बीच – मोटी दमन",
        "state": "Dadra & Nagar Haveli",
        "city": "Daman",
        "color": "#16A34A",
        "stops": [
            {"name": "Nani Daman Bus Stand", "name_hi": "नानी दमन बस स्टैंड", "lat": 20.4190, "lng": 72.8340},
            {"name": "Devka Beach Resort Road", "name_hi": "देवका बीच", "lat": 20.4420, "lng": 72.8270},
            {"name": "Rajiv Gandhi Bridge Damanganga", "name_hi": "राजीव गांधी ब्रिज", "lat": 20.4110, "lng": 72.8390},
            {"name": "Moti Daman Fort Gate", "name_hi": "मोटी दमन फोर्ट", "lat": 20.4040, "lng": 72.8320},
        ],
    },

    # ---------------------------------------------------------------------------
    # 35. Chandigarh (UT) - CTU (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "CTU-1",
        "name": "Sector 17 – Lake – Railway Station",
        "name_hi": "सेक्टर १७ – सुखना लेक – रेलवे स्टेशन",
        "state": "Chandigarh",
        "city": "Chandigarh",
        "color": "#0284C7",
        "stops": [
            {"name": "ISBT Sector 17 Plaza", "name_hi": "सेक्टर १७ प्लाजा", "lat": 30.7400, "lng": 76.7840},
            {"name": "Sector 9 Secretariat", "name_hi": "सेक्टर ९ सचिवालय", "lat": 30.7480, "lng": 76.7920},
            {"name": "Sukhna Lake Entrance", "name_hi": "सुखना लेक", "lat": 30.7430, "lng": 76.8180},
            {"name": "Sector 26 College", "name_hi": "सेक्टर २६ कॉलेज", "lat": 30.7290, "lng": 76.8040},
            {"name": "Chandigarh Junction Railway Station", "name_hi": "चंडीगढ़ जंक्शन", "lat": 30.7050, "lng": 76.8290},
        ],
    },

    # ---------------------------------------------------------------------------
    # 36. Lakshadweep (UT) - Kavaratti (1 route)
    # ---------------------------------------------------------------------------
    {
        "number": "1-LD",
        "name": "Helipad – Marine Aquarium – Jetty",
        "name_hi": "हेलीपैड – मरीन एक्वेरियम – जेट्टी",
        "state": "Lakshadweep",
        "city": "Kavaratti",
        "color": "#0284C7",
        "stops": [
            {"name": "Kavaratti Helipad Point", "name_hi": "कवरत्ती हेलीपैड", "lat": 10.5720, "lng": 72.6380},
            {"name": "Marine Aquarium & Museum", "name_hi": "मरीन एक्वेरियम", "lat": 10.5640, "lng": 72.6410},
            {"name": "Secretariat Complex", "name_hi": "सचिवालय परिसर", "lat": 10.5590, "lng": 72.6420},
            {"name": "Kavaratti Embarkation Jetty", "name_hi": "कवरत्ती जेट्टी", "lat": 10.5540, "lng": 72.6450},
        ],
    },
]
