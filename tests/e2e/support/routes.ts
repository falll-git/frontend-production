import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

export function discoverStaticDashboardRoutes() {
  const appDirectory = join(process.cwd(), "src", "app");

  return walk(appDirectory)
    .filter((file) => file.endsWith(`${sep}page.tsx`))
    .map((file) => relative(appDirectory, file))
    .filter((file) => !file.includes("["))
    .map((file) => {
      const route = `/${file
        .replace(new RegExp(`\\${sep}page\\.tsx$`), "")
        .split(sep)
        .filter((segment) => !/^\(.*\)$/.test(segment))
        .join("/")}`;
      return route === "/" ? "/" : route.replace(/\/$/, "");
    })
    .filter((route) => route === "/dashboard" || route.startsWith("/dashboard/"))
    .sort();
}
