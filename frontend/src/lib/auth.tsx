/**
 * Contexto de autenticação — login, logout, token JWT e usuário logado.
 * Persiste sessão em localStorage e expõe useAuth() para toda a app.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  createContext,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  useCallback,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  useContext,
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect,
  // Calcula valor só quando dependências mudam (performance)
  useMemo,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  useState,
  // Define formato de dados (TypeScript)
  type ReactNode,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "react"; // Hooks e tipos React para o provider de sessão
// Importa funções/componentes de ./api
import { meRequest, type ApiUser } from "./api"; // GET /auth/me — valida token e retorna usuário

/** Chaves do localStorage para token e dados do usuário. */
// Constante local
const TOKEN_KEY = "controla_token";
// Constante local
const USER_KEY = "controla_user";

/** Lê o usuário serializado do localStorage (ou null se inválido). */
// Declara função auxiliar interna
function loadStoredUser(): ApiUser | null {
  // Tenta executar — erros vão para catch
  try {
    // Constante local
    const raw = localStorage.getItem(USER_KEY);
    // Condição — executa bloco só se verdadeira
    if (!raw) return null;
    // Retorna valor ou JSX para quem chamou
    return JSON.parse(raw) as ApiUser;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch {
    // Retorna valor ou JSX para quem chamou
    return null;
  }
}

/** Contrato exposto pelo contexto de autenticação. */
// Define formato de dados (TypeScript)
type AuthContextValue = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  user: ApiUser | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  token: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  loading: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  setSession: (token: string, user: ApiUser) => void;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  logout: () => void;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  refreshUser: () => Promise<void>;
};

// Constante local
const AuthContext = createContext<AuthContextValue | null>(null);

/** Provider que envolve a aplicação em main.tsx. */
// Exporta função usada por outros arquivos
export function AuthProvider({ children }: { children: ReactNode }) {
  // Armazena dado no navegador (persiste após fechar aba)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [user, setUser] = useState<ApiUser | null>(() => loadStoredUser());
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [loading, setLoading] = useState(true); // true até validar token na API

  /** Revalida o token atual chamando GET /auth/me. */
  // Função memorizada — evita recriar a cada render
  const refreshUser = useCallback(async () => {
    // Constante local
    const t = localStorage.getItem(TOKEN_KEY);
    // Condição — executa bloco só se verdadeira
    if (!t) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setUser(null);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setToken(null);
      // Armazena dado no navegador (persiste após fechar aba)
      localStorage.removeItem(USER_KEY);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Desestrutura valores do hook/contexto (acesso direto às variáveis)
    const { user: u } = await meRequest(t);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setUser(u);
    // Transforma objeto em texto JSON para enviar à API
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, []);

  // Ao montar: valida token salvo ou limpa sessão expirada
  useEffect(() => {
    // Variável mutável local
    let cancelled = false;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    (async () => {
      // Constante local
      const t = localStorage.getItem(TOKEN_KEY);
      // Condição — executa bloco só se verdadeira
      if (!t) {
        // Condição — executa bloco só se verdadeira
        if (!cancelled) {
          // Instrução do fluxo — parte da lógica de negócio ou interface
          setLoading(false);
          // Instrução do fluxo — parte da lógica de negócio ou interface
          setUser(null);
        }
        // Instrução do fluxo — parte da lógica de negócio ou interface
        return;
      }
      // Tenta executar — erros vão para catch
      try {
        // Desestrutura valores do hook/contexto (acesso direto às variáveis)
        const { user: u } = await meRequest(t);
        // Condição — executa bloco só se verdadeira
        if (!cancelled) {
          // Instrução do fluxo — parte da lógica de negócio ou interface
          setUser(u);
          // Instrução do fluxo — parte da lógica de negócio ou interface
          setToken(t);
          // Transforma objeto em texto JSON para enviar à API
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        }
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } catch {
        // Condição — executa bloco só se verdadeira
        if (!cancelled) {
          // Armazena dado no navegador (persiste após fechar aba)
          localStorage.removeItem(TOKEN_KEY);
          // Armazena dado no navegador (persiste após fechar aba)
          localStorage.removeItem(USER_KEY);
          // Instrução do fluxo — parte da lógica de negócio ou interface
          setUser(null);
          // Instrução do fluxo — parte da lógica de negócio ou interface
          setToken(null);
        }
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } finally {
        // Condição — executa bloco só se verdadeira
        if (!cancelled) setLoading(false);
      }
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    })();
    // Retorna valor ou JSX para quem chamou
    return () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      cancelled = true;
    };
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, []);

  /** Grava token e usuário após login ou registro bem-sucedido. */
  // Função memorizada — evita recriar a cada render
  const setSession = useCallback((newToken: string, u: ApiUser) => {
    // Armazena dado no navegador (persiste após fechar aba)
    localStorage.setItem(TOKEN_KEY, newToken);
    // Transforma objeto em texto JSON para enviar à API
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setToken(newToken);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setUser(u);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setLoading(false);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, []);

  /** Encerra sessão e remove dados do localStorage. */
  // Função memorizada — evita recriar a cada render
  const logout = useCallback(() => {
    // Armazena dado no navegador (persiste após fechar aba)
    localStorage.removeItem(TOKEN_KEY);
    // Armazena dado no navegador (persiste após fechar aba)
    localStorage.removeItem(USER_KEY);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setToken(null);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setUser(null);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setLoading(false);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, []);

  // Valor memorizado — recalcula só quando dependências mudam
  const value = useMemo(
    // Instrução do fluxo — parte da lógica de negócio ou interface
    () => ({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      user,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      token,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      loading,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setSession,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      logout,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      refreshUser,
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    }),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    [user, token, loading, setSession, logout, refreshUser],
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );

  // Retorna valor ou JSX para quem chamou
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para consumir o contexto — lança erro se usado fora do AuthProvider. */
// Exporta função usada por outros arquivos
export function useAuth(): AuthContextValue {
  // Constante local
  const ctx = useContext(AuthContext);
  // Condição — executa bloco só se verdadeira
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  // Retorna valor ou JSX para quem chamou
  return ctx;
}
