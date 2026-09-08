import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("login form security contract", () => {
  it("mencegah kredensial masuk ke query URL sebelum hydration", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "app", "page.tsx"),
      "utf8",
    );

    expect(source).toContain("const isHydrated = useSyncExternalStore(");
    expect(source).toContain("() => false");
    expect(source).toContain('method="post"');
    expect(source).toContain('action="/api/auth/login"');
    expect(source).toContain("if (!isHydrated || isLoading) return");
    expect(source.match(/disabled={!isHydrated \|\| isLoading}/g)).toHaveLength(5);
  });
});
