import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  shouldUseDevelopmentCsp,
} from "./content-security-policy";

describe("buildContentSecurityPolicy", () => {
  it("uses a nonce and strict-dynamic without unsafe-inline for scripts", () => {
    const policy = buildContentSecurityPolicy({
      backendOrigin: "https://api.example.test/api/v1",
      nonce: "nonce-value",
    });

    expect(policy).toContain(
      "script-src 'self' 'nonce-nonce-value' 'strict-dynamic'",
    );
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).toContain("connect-src 'self' https://api.example.test");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("only permits unsafe-eval in development", () => {
    const production = buildContentSecurityPolicy({ nonce: "production" });
    const development = buildContentSecurityPolicy({
      isDevelopment: true,
      nonce: "development",
    });

    expect(production).not.toContain("'unsafe-eval'");
    expect(development).toContain("'unsafe-eval'");
    expect(development).not.toContain("upgrade-insecure-requests");
  });
});

describe("shouldUseDevelopmentCsp", () => {
  it("mengizinkan HTTP hanya untuk test loopback yang diminta eksplisit", () => {
    expect(
      shouldUseDevelopmentCsp({
        allowInsecureLoopback: "true",
        hostname: "127.0.0.1",
        nodeEnvironment: "production",
      }),
    ).toBe(true);
    expect(
      shouldUseDevelopmentCsp({
        allowInsecureLoopback: "true",
        hostname: "localhost",
        nodeEnvironment: "production",
      }),
    ).toBe(true);
  });

  it("tidak dapat menurunkan CSP production pada host non-loopback", () => {
    expect(
      shouldUseDevelopmentCsp({
        allowInsecureLoopback: "true",
        hostname: "demo.ruwangarsip.com",
        nodeEnvironment: "production",
      }),
    ).toBe(false);
    expect(
      shouldUseDevelopmentCsp({
        allowInsecureLoopback: "false",
        hostname: "localhost",
        nodeEnvironment: "production",
      }),
    ).toBe(false);
  });
});
