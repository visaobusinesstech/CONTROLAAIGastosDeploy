/**
 * Rotas da aplicação — dashboard, metas, chat IA, admin WhatsApp e autenticação.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @tanstack/react-query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Cache global de requisições
// Importa funções/componentes de react-router-dom
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom"; // Roteamento SPA
// Importa funções/componentes de @/components/ui/sonner
import { Toaster as Sonner } from "@/components/ui/sonner"; // Toast Sonner (notificações)
// Importa funções/componentes de @/components/ui/toaster
import { Toaster } from "@/components/ui/toaster"; // Toast shadcn legado
// Importa funções/componentes de @/components/ui/tooltip
import { TooltipProvider } from "@/components/ui/tooltip"; // Tooltips globais
// Importa de @/components/Layout
import Layout from "@/components/Layout"; // Shell com sidebar e outlet
// Importa de @/pages/Dashboard
import Dashboard from "@/pages/Dashboard";
// Importa de @/pages/Goals
import Goals from "@/pages/Goals";
// Importa de @/pages/AiChat
import AiChat from "@/pages/AiChat";
// Importa de @/pages/Settings
import SettingsPage from "@/pages/Settings";
// Importa de @/pages/Login
import Login from "@/pages/Login";
// Importa de @/pages/Register
import Register from "@/pages/Register";
// Importa de @/pages/ForgotPassword
import ForgotPassword from "@/pages/ForgotPassword";
// Importa de @/pages/ResetPassword
import ResetPassword from "@/pages/ResetPassword";
// Importa de @/pages/NotFound
import NotFound from "@/pages/NotFound";
// Importa de @/pages/WhatsApp
import WhatsAppPage from "@/pages/WhatsApp";
// Importa de @/pages/AiLogs
import AiLogsPage from "@/pages/AiLogs";
// Importa de @/pages/AdminSubscribers
import AdminSubscribersPage from "@/pages/AdminSubscribers";
// Importa de @/pages/AdminAuditLogs
import AdminAuditLogsPage from "@/pages/AdminAuditLogs";
// Importa de @/pages/AdminLgpd
import AdminLgpdPage from "@/pages/AdminLgpd";
// Importa de @/components/RequireAdmin
import RequireAdmin from "@/components/RequireAdmin"; // Guard WhatsApp / modelo
// Importa de @/components/RequireStaff
import RequireStaff from "@/components/RequireStaff"; // Guard governança
// Importa de @/components/RequireAdminAuth
import RequireAdminAuth from "@/components/RequireAdminAuth"; // Guard só admin@admin.com
// Importa funções/componentes de @/components/DocumentTitle
import { DocumentTitle } from "@/components/DocumentTitle"; // Título dinâmico da aba
// Importa funções/componentes de @/components/AppErrorBoundary
import { AppErrorBoundaryWithRouter } from "@/components/AppErrorBoundary"; // Captura erros de render
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth"; // Hook de sessão JWT

// Constante local
const queryClient = new QueryClient();

/** Redireciona para /login se não houver token válido. */
// Declara função auxiliar interna
function RequireAuth() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, loading } = useAuth();
  // Condição — executa bloco só se verdadeira
  if (loading) {
    // Retorna valor ou JSX para quem chamou
    return (
      // Tag HTML na interface
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        // Instrução do fluxo — parte da lógica de negócio ou interface
        Carregando…
      // Tag HTML na interface
      </div>
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    );
  }
  // Condição — executa bloco só se verdadeira
  if (!token) return <Navigate to="/login" replace />;
  // Retorna valor ou JSX para quem chamou
  return <Outlet />;
}

/** Layout com sidebar para rotas autenticadas. */
// Declara função auxiliar interna
function AuthenticatedShell() {
  // Retorna valor ou JSX para quem chamou
  return <Layout />;
}

// Constante local
const App = () => (
  // Elemento/componente React na tela
  <QueryClientProvider client={queryClient}>
    // Elemento/componente React na tela
    <TooltipProvider>
      // Elemento/componente React na tela
      <Toaster />
      // Elemento/componente React na tela
      <Sonner />
      // Elemento/componente React na tela
      <BrowserRouter>
        // Elemento/componente React na tela
        <AppErrorBoundaryWithRouter>
          // Elemento/componente React na tela
          <DocumentTitle />
          // Elemento/componente React na tela
          <Routes>
            {/* Rotas públicas — autenticação */}
            <Route path="/login" element={<Login />} />
            // Elemento/componente React na tela
            <Route path="/register" element={<Register />} />
            // Elemento/componente React na tela
            <Route path="/forgot-password" element={<ForgotPassword />} />
            // Elemento/componente React na tela
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Rotas protegidas — exigem JWT */}
            <Route element={<RequireAuth />}>
              // Elemento/componente React na tela
              <Route element={<AuthenticatedShell />}>
                // Elemento/componente React na tela
                <Route index element={<Dashboard />} />
                // Elemento/componente React na tela
                <Route path="goals" element={<Goals />} />
                // Elemento/componente React na tela
                <Route path="ai" element={<AiChat />} />
                // Elemento/componente React na tela
                <Route path="settings" element={<SettingsPage />} />
                {/* Rotas admin — WhatsApp Baileys e logs OpenAI */}
                <Route
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  path="admin/whatsapp"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  element={
                    // Elemento/componente React na tela
                    <RequireAdmin>
                      // Elemento/componente React na tela
                      <WhatsAppPage />
                    // Elemento/componente React na tela
                    </RequireAdmin>
                  }
                // Instrução do fluxo — parte da lógica de negócio ou interface
                />
                // Elemento/componente React na tela
                <Route
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  path="admin/subscribers"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  element={
                    // Elemento/componente React na tela
                    <RequireAdminAuth>
                      // Elemento/componente React na tela
                      <AdminSubscribersPage />
                    // Elemento/componente React na tela
                    </RequireAdminAuth>
                  }
                // Instrução do fluxo — parte da lógica de negócio ou interface
                />
                // Elemento/componente React na tela
                <Route
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  path="admin/audit"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  element={
                    // Elemento/componente React na tela
                    <RequireStaff>
                      // Elemento/componente React na tela
                      <AdminAuditLogsPage />
                    // Elemento/componente React na tela
                    </RequireStaff>
                  }
                // Instrução do fluxo — parte da lógica de negócio ou interface
                />
                // Elemento/componente React na tela
                <Route
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  path="admin/lgpd"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  element={
                    // Elemento/componente React na tela
                    <RequireStaff>
                      // Elemento/componente React na tela
                      <AdminLgpdPage />
                    // Elemento/componente React na tela
                    </RequireStaff>
                  }
                // Instrução do fluxo — parte da lógica de negócio ou interface
                />
                // Elemento/componente React na tela
                <Route
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  path="admin/ai-logs"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  element={
                    // Elemento/componente React na tela
                    <RequireStaff>
                      // Elemento/componente React na tela
                      <AiLogsPage />
                    // Elemento/componente React na tela
                    </RequireStaff>
                  }
                // Instrução do fluxo — parte da lógica de negócio ou interface
                />
              // Elemento/componente React na tela
              </Route>
            // Elemento/componente React na tela
            </Route>

            // Elemento/componente React na tela
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            // Elemento/componente React na tela
            <Route path="/admin" element={<Navigate to="/login" replace />} />
            // Elemento/componente React na tela
            <Route path="*" element={<NotFound />} /> {/* 404 */}
          // Elemento/componente React na tela
          </Routes>
        // Elemento/componente React na tela
        </AppErrorBoundaryWithRouter>
      // Elemento/componente React na tela
      </BrowserRouter>
    // Elemento/componente React na tela
    </TooltipProvider>
  // Elemento/componente React na tela
  </QueryClientProvider>
// Passo do algoritmo — executa parte da regra de negócio ou da interface
);

// Exporta como padrão do módulo (import default)
export default App;
