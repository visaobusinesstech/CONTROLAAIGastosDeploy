import { describe, expect, it } from "vitest";

/** Espelha a resolução de path do api/auth.ts (query.path). */
function pathKey(query: { path?: string | string[] }): string {
  const raw = query.path;
  if (Array.isArray(raw)) return raw.filter(Boolean).join("/");
  if (typeof raw === "string" && raw.length > 0) return raw.replace(/^\/+|\/+$/g, "");
  return "";
}

describe("api/auth pathKey", () => {
  it("resolve login e 2fa/verify", () => {
    expect(pathKey({ path: "login" })).toBe("login");
    expect(pathKey({ path: "2fa/verify" })).toBe("2fa/verify");
  });

  it("aceita array de segmentos", () => {
    expect(pathKey({ path: ["2fa", "enable"] })).toBe("2fa/enable");
  });
});
