import { describe, expect, it } from "vitest";
import { DEFAULT_BACKEND_URL, resolveBackendUrl } from "../../lib/backend-url";

describe("resolveBackendUrl", () => {
  it("usa o serviço deste repositório quando a env está vazia", () => {
    expect(resolveBackendUrl({})).toBe(DEFAULT_BACKEND_URL);
  });

  it("descarta o host Railway que não existe mais", () => {
    expect(
      resolveBackendUrl({
        BACKEND_URL: "https://controlaai-backend-production.up.railway.app",
      }),
    ).toBe(DEFAULT_BACKEND_URL);
  });

  it("descarta URL da Vercel e localhost", () => {
    expect(resolveBackendUrl({ BACKEND_URL: "https://controlaai-frontend.vercel.app" })).toBe(
      DEFAULT_BACKEND_URL,
    );
    expect(resolveBackendUrl({ BACKEND_URL: "http://localhost:3333" })).toBe(DEFAULT_BACKEND_URL);
  });

  it("aceita outro host railway.app explícito", () => {
    expect(
      resolveBackendUrl({ BACKEND_URL: "https://outro-servico.up.railway.app/" }),
    ).toBe("https://outro-servico.up.railway.app");
  });
});
