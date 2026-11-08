import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { formatDateOnly, formatDateTime } from "./date";

it("calendar date markup hydrates without changing the API date-only value", async () => {
  const errors: unknown[] = [];
  const content = <time dateTime="2026-09-26">{formatDateOnly("2026-09-26")}</time>;
  const container = document.createElement("div");
  container.innerHTML = renderToString(content);
  document.body.appendChild(container);
  let root: ReturnType<typeof hydrateRoot>;
  try {
    await act(async () => { root = hydrateRoot(container, content, {onRecoverableError:error=>errors.push(error)}); });
    expect(container.textContent).toBe("26 September 2026");
    expect(container.querySelector("time")).toHaveAttribute("datetime", "2026-09-26");
    expect(errors).toEqual([]);
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

it("timestamp markup preserves machine-readable datetime and normal visible text", () => {
  const timestamp = new Date(2026, 8, 26, 13, 33).toISOString();
  const markup = renderToString(<time dateTime={timestamp}>{formatDateTime(timestamp)}</time>);
  expect(markup).toContain(`dateTime="${timestamp}"`);
  expect(markup).toContain("26 September 2026, 13:33");
  expect(markup).not.toMatch(/GMT|UTC/);
});
