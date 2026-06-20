// Holds the logged-in user + token for the whole app, and persists the token
// on the device so you stay logged in between app launches.
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";

const AuthContext = createContext(null);
const TOKEN_KEY = "pickly_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On startup, try to restore a saved login.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(TOKEN_KEY);
        if (saved) {
          const me = await api.me(saved);
          setToken(saved);
          setUser(me);
        }
      } catch (_) {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveSession(accessToken) {
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    const me = await api.me(accessToken);
    setToken(accessToken);
    setUser(me);
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
    await AsyncStorage.removeItem(TOKEN_KEY);
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
