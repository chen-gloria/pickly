// ---------------------------------------------------------------------------
// API location.
//
// • On an iOS Simulator / Android Emulator on the same Mac: "http://localhost:8000"
//   works for iOS. For the Android emulator use "http://10.0.2.2:8000".
// • On a REAL PHONE (Expo Go): localhost will NOT work. Use your computer's
//   local network IP, e.g. "http://192.168.1.23:8000". Find it on a Mac with:
//       ipconfig getifaddr en0
//   and make sure your phone and computer are on the same Wi-Fi.
// ---------------------------------------------------------------------------
// TEMP for local phone testing — your Mac's LAN IP. When you deploy to Render,
// swap this for your live URL, e.g. "https://pickly-api.onrender.com".
// (Don't commit this LAN IP — it only works on your home Wi-Fi.)
export const API_URL = "http://192.168.20.3:8000";

export const CURRENCY_SYMBOL = "$"; // AUD
