import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const dashboardOverviewSource = readFileSync(
  join(
    process.cwd(),
    "src/components/dashboard/DashboardOverviewClient.tsx",
  ),
  "utf8",
);
const animationsSource = readFileSync(
  join(process.cwd(), "src/styles/animations.css"),
  "utf8",
);

function keyframesBody(name: string) {
  const match = animationsSource.match(
    new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"),
  );

  return match?.[1] ?? "";
}

describe("kontrak animasi masuk dashboard", () => {
  it("tidak memudarkan seluruh kelompok konten dashboard", () => {
    expect(dashboardOverviewSource).not.toContain("animate-fade-in");
  });

  it("membatasi animasi banner prioritas hingga 240 ms tanpa opacity", () => {
    expect(dashboardOverviewSource).toContain("animate-dashboard-priority-in");
    expect(animationsSource).toMatch(
      /\.animate-dashboard-priority-in\s*\{\s*animation:\s*dashboardPriorityEnter 0\.24s/,
    );
    expect(keyframesBody("dashboardPriorityEnter")).not.toContain("opacity");
  });

  it("menjaga entrance opsional shell pada 220 ms tanpa opacity", () => {
    expect(animationsSource).toMatch(
      /\.animate-dashboard-page-in\s*\{\s*animation:\s*dashboardPageEnter 0\.22s/,
    );
    expect(keyframesBody("dashboardPageEnter")).not.toContain("opacity");
  });
});
