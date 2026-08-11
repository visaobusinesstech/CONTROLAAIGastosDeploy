/**
 * Contexto de autenticação — login, logout, token JWT e usuário logado.
 * Persiste sessão em localStorage e expõe useAuth() para toda a app.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"; // Hooks e tipos React para o provider de sessão
import { meRequest, type ApiUser } from "./api"; // GET /auth/me — valida token e retorna usuário

/** Chaves do localStorage para token e dados do usuário. */
const TOKEN_KEY = "controla_token";
const USER_KEY = "controla_user";

/** Lê o usuário serializado do localStorage (ou null se inválido). */
function loadStoredUser(): ApiUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

/** Contrato exposto pelo contexto de autenticação. */
type AuthContextValue = {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: ApiUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Provider que envolve a aplicação em main.tsx. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<ApiUser | null>(() => loadStoredUser());
  const [loading, setLoading] = useState(true); // true até validar token na API

  /** Revalida o token atual chamando GET /auth/me. */
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

  // Ao montar: valida token salvo ou limpa sessão expirada
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

  /** Grava token e usuário após login ou registro bem-sucedido. */
  const setSession = useCallback((newToken: string, u: ApiUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(newToken);
    setUser(u);
    setLoading(false);
  }, []);

  /** Encerra sessão e remove dados do localStorage. */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
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

/** Hook para consumir o contexto — lança erro se usado fora do AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
