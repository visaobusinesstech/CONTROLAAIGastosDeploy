/**
 * Contexto de autenticação React — Controla.ai
 *
 * O que faz: AuthProvider guarda JWT + usuário em memória/localStorage, expõe login,
 * logout, register, refreshMe e estado isAuthenticated para rotas protegidas.
 *
 * Onde entra: envolve App.tsx; RequireAdmin/RequireStaff leem useAuth(); Login e
 * Register disparam fluxos OTP/2FA quando o backend retorna requiresTwoFactor.
 *
 * Integrações: frontend/api/auth/* (Vercel) ou backend /auth/* (Railway); api.ts
 * injeta Authorization Bearer nas chamadas subsequentes.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import {
  createContext,
  useCallback,
  useContext,
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect,
  // Calcula valor só quando dependências mudam (performance)
  useMemo,
  useState,
  type ReactNode,
} from "react"; // Hooks e tipos React para o provider de sessão
import { meRequest, type ApiUser } from "./api"; // GET /auth/me — valida token e retorna usuário

/** Chaves do localStorage para token e dados do usuário. */
const TOKEN_KEY = "controla_token";
const USER_KEY = "controla_user";

/** Lê o usuário serializado do localStorage (ou null se inválido). */
// Declara função auxiliar interna
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
// Exporta função usada por outros arquivos
export function AuthProvider({ children }: { children: ReactNode }) {
  // Armazena dado no navegador (persiste após fechar aba)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<ApiUser | null>(() => loadStoredUser());
  const [loading, setLoading] = useState(true); // true até validar token na API
  /** Revalida o token atual chamando GET /auth/me. */
  // Função memorizada — evita recriar a cada render
  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setUser(null);
      setToken(null);
      // Armazena dado no navegador (persiste após fechar aba)
      localStorage.removeItem(USER_KEY);
      return;
    }
    // Desestrutura valores do hook/contexto (acesso direto às variáveis)
    const { user: u } = await meRequest(t);
    setUser(u);
    // Transforma objeto em texto JSON para enviar à API
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
        // Desestrutura valores do hook/contexto (acesso direto às variáveis)
        const { user: u } = await meRequest(t);
        if (!cancelled) {
          setUser(u);
          setToken(t);
          // Transforma objeto em texto JSON para enviar à API
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        }
      } catch {
        if (!cancelled) {
          // Armazena dado no navegador (persiste após fechar aba)
          localStorage.removeItem(TOKEN_KEY);
          // Armazena dado no navegador (persiste após fechar aba)
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
  // Função memorizada — evita recriar a cada render
  const setSession = useCallback((newToken: string, u: ApiUser) => {
    // Armazena dado no navegador (persiste após fechar aba)
    localStorage.setItem(TOKEN_KEY, newToken);
    // Transforma objeto em texto JSON para enviar à API
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(newToken);
    setUser(u);
    setLoading(false);
  }, []);
  /** Encerra sessão e remove dados do localStorage. */
  // Função memorizada — evita recriar a cada render
  const logout = useCallback(() => {
    // Armazena dado no navegador (persiste após fechar aba)
    localStorage.removeItem(TOKEN_KEY);
    // Armazena dado no navegador (persiste após fechar aba)
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);
  // Valor memorizado — recalcula só quando dependências mudam
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
// Exporta função usada por outros arquivos
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
