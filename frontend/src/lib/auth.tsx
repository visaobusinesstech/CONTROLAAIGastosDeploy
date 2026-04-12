import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { meRequest, type ApiUser } from "./api";

const TOKEN_KEY = "controla_token";
const USER_KEY = "controla_user";

function loadStoredUser(): ApiUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

type AuthContextValue = {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: ApiUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<ApiUser | null>(() => loadStoredUser());
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setUser(null);
      setToken(null);
      localStorage.removeItem(USER_KEY);
      return;
    }
    const { user: u } = await meRequest(t);
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = localStorage.getItem(TOKEN_KEY);
      if (!t) {
        if (!cancelled) {
          setLoading(false);
          setUser(null);
        }
        return;
      }
      try {
        const { user: u } = await meRequest(t);
        if (!cancelled) {
          setUser(u);
          setToken(t);
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
          setToken(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback((newToken: string, u: ApiUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(newToken);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      setSession,
      logout,
      refreshUser,
    }),
    [user, token, loading, setSession, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
