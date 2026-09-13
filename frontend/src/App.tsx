/**
 * Raiz React — rotas, providers e layout global
 *
 * O que faz: BrowserRouter, AuthProvider, QueryClientProvider, ThemeProvider e
 * definição de rotas públicas (/login, /register) vs protegidas (/dashboard, admin).
 *
 * Onde entra: main.tsx renderiza App; centraliza guards (RequireAdmin, RequireStaff)
 * e componentes Layout/DocumentTitle.
 *
 * Integrações: pages/*, components/Layout, lib/auth, lib/routes, billing paywall
 * quando assinatura/trial expira.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Cache global de requisições
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom"; // Roteamento SPA
import { Toaster as Sonner } from "@/components/ui/sonner"; // Toast Sonner (notificações)
import { Toaster } from "@/components/ui/toaster"; // Toast shadcn legado
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
import { DocumentTitle } from "@/components/DocumentTitle"; // Título dinâmico da aba
import { AppErrorBoundaryWithRouter } from "@/components/AppErrorBoundary"; // Captura erros de render
import { useAuth } from "@/lib/auth"; // Hook de sessão JWT

const queryClient = new QueryClient();

/** Redireciona para /login se não houver token válido. */
// Declara função auxiliar interna
function RequireAuth() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, loading } = useAuth();
  if (loading) {
    return (
      // Tag HTML na interface
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      // Tag HTML na interface
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Layout com sidebar para rotas autenticadas. */
// Declara função auxiliar interna
function AuthenticatedShell() {
  return <Layout />;
}

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
                  path="admin/whatsapp"
                  element={
                    // Elemento/componente React na tela
                    <RequireAdmin>
                      // Elemento/componente React na tela
                      <WhatsAppPage />
                    // Elemento/componente React na tela
                    </RequireAdmin>
                  }
                />
                // Elemento/componente React na tela
                <Route
                  path="admin/subscribers"
                  element={
                    // Elemento/componente React na tela
                    <RequireAdminAuth>
                      // Elemento/componente React na tela
                      <AdminSubscribersPage />
                    // Elemento/componente React na tela
                    </RequireAdminAuth>
                  }
                />
                // Elemento/componente React na tela
                <Route
                  path="admin/audit"
                  element={
                    // Elemento/componente React na tela
                    <RequireStaff>
                      // Elemento/componente React na tela
                      <AdminAuditLogsPage />
                    // Elemento/componente React na tela
                    </RequireStaff>
                  }
                />
                // Elemento/componente React na tela
                <Route
                  path="admin/lgpd"
                  element={
                    // Elemento/componente React na tela
                    <RequireStaff>
                      // Elemento/componente React na tela
                      <AdminLgpdPage />
                    // Elemento/componente React na tela
                    </RequireStaff>
                  }
                />
                // Elemento/componente React na tela
                <Route
                  path="admin/ai-logs"
                  element={
                    // Elemento/componente React na tela
                    <RequireStaff>
                      // Elemento/componente React na tela
                      <AiLogsPage />
                    // Elemento/componente React na tela
                    </RequireStaff>
                  }
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
);

export default App;
