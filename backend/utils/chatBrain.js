// backend/utils/chatBrain.js

/**
 * Predefined responses for the Rule-Based Chatbot
 * Logic: Matches user keywords to these keys
 */
const chatResponses = {
    // 1. Core Help & Reporting
    "report": "To report a crime: Go to 'Report Crime', fill in incident details, select your location, and submit. You will receive a unique tracking ID.",
    "track": "To track your report: Login to your Citizen Dashboard and check the 'Live Status' in the history table.",
    "cancel": "To cancel a report: Please visit the nearest police station with your Tracking ID for verification.",

    // 2. Emergency & Safety
    "emergency": "For immediate danger: Call 100 or 112. You can also use the red SOS button on our app to alert nearby units instantly.",
    "sos": "The SOS button sends your live GPS coordinates to all nearby police officers. Only use it in real life-threatening situations.",
    "help": "If you are in danger, click the SOS button or call emergency services (100). For reporting theft or other crimes, use the 'Report' form.",
    "station": "Nearest police stations: Banjara Hills PS, Jubilee Hills PS, and LB Nagar PS are currently active in our portal mapping.",

    // 3. App Usage
    "priority": "AI Priority Logic: Our system monitors descriptions. If keywords like 'gun', 'threat', or 'blood' are used, it automatically upgrades to HIGH priority.",
    "risk": "Risk Levels: Red highlights on the map indicate 'High Risk' areas with 5+ recent incidents. Stay vigilant!",
    "map": "Crime Map: Displays real-time hotspots. Red circles are active areas, while Green ones are secure.",

    // 4. Account Issues
    "login": "Login Issues: Ensure your email/password is correct. If your account was recently blocked by an admin, you will not be able to log in.",
    "password": "Password: Use the 'Forgot Password' link on the login page (Beta) or contact admin support for assistance.",
    "blocked": "Account Blocked: Administrative action may be taken due to false reporting. Contact the station for a review.",

    // 5. Safety Tips
    "night": "Night Safety: Avoid walking alone in dark alleyways. Use the Safety Map to check if an area has a 'High Risk' rating.",
    "safe": "Public Safety: Keep your phone reachable. If you feel followed, head to the nearest brightly lit public place or police station.",
    "theft": "During Theft: Stay calm, do not resist if the attacker is armed. Try to remember identifying features and report immediately via the portal.",

    // 6. Greetings & Fallback
    "hi": "Hello! I am your Safety Assistant. How can I help you today? Ask about reporting, safety tips, or SOS.",
    "hello": "Hi there! I'm here to guide you through the SafetyFirst platform. What's on your mind?",
    "thanks": "You're welcome! Stay safe out there.",
    
    "default": "I'm sorry, I didn't quite understand that. Try asking about 'reporting', 'safety tips', 'emergency', or 'how to use the map'."
};

module.exports = chatResponses;
