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
function RequireAuth() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Layout com sidebar para rotas autenticadas. */
function AuthenticatedShell() {
  return <Layout />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppErrorBoundaryWithRouter>
          <DocumentTitle />
          <Routes>
            {/* Rotas públicas — autenticação */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Rotas protegidas — exigem JWT */}
            <Route element={<RequireAuth />}>
              <Route element={<AuthenticatedShell />}>
                <Route index element={<Dashboard />} />
                <Route path="goals" element={<Goals />} />
                <Route path="ai" element={<AiChat />} />
                <Route path="settings" element={<SettingsPage />} />
                {/* Rotas admin — WhatsApp Baileys e logs OpenAI */}
                <Route
                  path="admin/whatsapp"
                  element={
                    <RequireAdmin>
                      <WhatsAppPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="admin/subscribers"
                  element={
                    <RequireAdminAuth>
                      <AdminSubscribersPage />
                    </RequireAdminAuth>
                  }
                />
                <Route
                  path="admin/audit"
                  element={
                    <RequireStaff>
                      <AdminAuditLogsPage />
                    </RequireStaff>
                  }
                />
                <Route
                  path="admin/lgpd"
                  element={
                    <RequireStaff>
                      <AdminLgpdPage />
                    </RequireStaff>
                  }
                />
                <Route
                  path="admin/ai-logs"
                  element={
                    <RequireStaff>
                      <AiLogsPage />
                    </RequireStaff>
                  }
                />
              </Route>
            </Route>
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} /> {/* 404 */}
          </Routes>
        </AppErrorBoundaryWithRouter>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
