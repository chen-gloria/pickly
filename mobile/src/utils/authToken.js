// Single source of truth for where the session token lives on-device.
// AuthContext.js and utils/watchlist.js both need it — AuthContext to
// manage the login lifecycle, watchlist.js to attach it to API calls — so
// it's a shared module rather than two places independently agreeing on the
// same string key.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const TOKEN_KEY = "pickly_token";

export function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  return AsyncStorage.removeItem(TOKEN_KEY);
}
