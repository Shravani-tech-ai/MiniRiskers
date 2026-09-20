import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api, { AUTH_TOKEN_KEY, clearAuthToken, setAuthToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => sessionStorage.getItem(AUTH_TOKEN_KEY) || null
  );
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (!storedToken) {
      setUser(null);
      setToken(null);
      return null;
    }

    const response = await api.get("/auth/me");
    setUser(response.data);
    setToken(storedToken);
    return response.data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        if (sessionStorage.getItem(AUTH_TOKEN_KEY)) {
          await refreshUser();
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [logout, refreshUser]);

  const login = useCallback(async (username, password) => {
    const response = await api.post("/auth/login", {
      username,
      password,
    });

    const accessToken = response.data?.access_token;
    if (!accessToken) {
      throw new Error("Login did not return an access token.");
    }

    setAuthToken(accessToken);
    setToken(accessToken);

    const meResponse = await api.get("/auth/me");
    setUser(meResponse.data);
    return meResponse.data;
  }, []);

  const register = useCallback(async (payload) => {
    const response = await api.post("/auth/register", payload);

    const accessToken = response.data?.access_token;
    if (!accessToken) {
      throw new Error("Registration did not return an access token.");
    }

    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isAuthenticated: Boolean(user && token),
    }),
    [user, token, loading, login, register, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
