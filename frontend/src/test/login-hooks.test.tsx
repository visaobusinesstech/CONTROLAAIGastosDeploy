/**
 * Smoke tests de auth — login sem OTP e ordem de hooks do Login.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    token: "fake-token",
    user: {
      id: "1",
      name: "Administrador",
      email: "admin@admin.com",
      phone: null,
      plan: "premium",
      createdAt: new Date().toISOString(),
      accessLevel: "admin",
      isActive: true,
    },
    loading: false,
    setSession: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

import Login from "@/pages/Login";

describe("Login hooks", () => {
  it("não lança 'Rendered fewer hooks' quando já autenticado", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    expect(() =>
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <Login />
          </MemoryRouter>
        </QueryClientProvider>,
      ),
    ).not.toThrow();
  });
});
