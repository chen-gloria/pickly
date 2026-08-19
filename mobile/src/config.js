export const API_URL = "https://pickly-api.onrender.com"; // placeholder, not used in mock mode
export const CURRENCY_SYMBOL = "$"; // AUD
// Only gates a few now-unused legacy client.js methods (getList/
// getFavorites/getAlerts and friends — nothing in src/ calls them; they
// targeted a FastAPI backend at API_URL that was never built). Auth
// (api/client.js's signup/login/me) and the watchlist (utils/watchlist.js)
// are real regardless of this flag — see netlify/functions/.
export const MOCK_MODE = true;
