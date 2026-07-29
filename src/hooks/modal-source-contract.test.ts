import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

test("setiap implementasi dialog modal memakai pengelola fokus bersama", () => {
  const sourceRoots = [
    join(process.cwd(), "src", "app"),
    join(process.cwd(), "src", "components"),
  ];
  const dialogFiles = sourceRoots
    .flatMap(walk)
    .filter((file) => /\.(?:ts|tsx)$/.test(file))
    .filter((file) => readFileSync(file, "utf8").includes('aria-modal="true"'));

  expect(dialogFiles.length).toBeGreaterThan(0);
  const unmanaged = dialogFiles.filter((file) => {
    const source = readFileSync(file, "utf8");
    return !source.includes("useAccessibleModal");
  });
  expect(unmanaged).toEqual([]);
});

test("overlay modal aplikasi hanya dibuat oleh komponen UI bersama", () => {
  const sourceRoots = [
    join(process.cwd(), "src", "app"),
    join(process.cwd(), "src", "components"),
  ];
  const overlayOwners = sourceRoots
    .flatMap(walk)
    .filter((file) => /\.(?:ts|tsx)$/.test(file))
    .filter((file) =>
      /data-dashboard-overlay="true"\s*\n\s*className=/.test(
        readFileSync(file, "utf8"),
      ),
    )
    .map((file) => file.slice(process.cwd().length + 1).replaceAll("\\", "/"))
    .sort();

  expect(overlayOwners).toEqual([
    "src/components/ui/DashboardModal.tsx",
    "src/components/ui/DocumentPreviewContext.tsx",
  ]);
});
