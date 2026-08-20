// Holds the logged-in user + token for the whole app, and persists the token
// on the device so you stay logged in between app launches.
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { getToken, setToken as persistToken, clearToken } from "../utils/authToken";
import { migrateLocalWatchlistToServer } from "../utils/watchlist";
import { migrateLocalStoreFiltersToServer } from "../utils/storeFilter";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On startup, try to restore a saved login.
  useEffect(() => {
    (async () => {
      try {
        const saved = await getToken();
        if (saved) {
          const me = await api.me(saved);
          setToken(saved);
          setUser(me);
        }
      } catch (_) {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveSession(accessToken) {
    await persistToken(accessToken);
    const me = await api.me(accessToken);
    setToken(accessToken);
    setUser(me);
    // Only on an actual login/signup (not the silent startup restore below),
    // since that's the moment anonymous, device-local watchlist data could
    // otherwise just disappear the instant reads switch to the server.
    await migrateLocalWatchlistToServer(accessToken).catch(() => {});
    await migrateLocalStoreFiltersToServer(accessToken).catch(() => {});
  }

  async function login(email, password) {
    const { access_token } = await api.login(email, password);
    await saveSession(access_token);
  }

  async function signup(email, name, password) {
    const { access_token } = await api.signup(email, name, password);
    await saveSession(access_token);
  }

  async function logout() {
    await clearToken();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
