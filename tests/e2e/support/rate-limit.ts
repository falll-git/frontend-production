import type { Page, Response } from "@playwright/test";

const DEFAULT_MINIMUM_REMAINING = 20;
const RESET_SAFETY_MARGIN_MS = 500;
const TRACKED_POLICY_WINDOW_SECONDS = Number(
  process.env.E2E_API_RATE_LIMIT_WINDOW_SECONDS || 60,
);

function readPositiveNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readPolicyWindowSeconds(value: string | undefined) {
  const match = value?.match(/(?:^|;)\s*w=(\d+)(?:;|$)/i);
  return match ? readPositiveNumber(match[1]) : null;
}

export function trackApiRateLimit(page: Page) {
  let lowestRemaining = Number.POSITIVE_INFINITY;
  let resetAfterSeconds = 0;
  let observationResolved = false;
  let resolveObservation: (() => void) | null = null;
  const observation = new Promise<void>((resolve) => {
    resolveObservation = resolve;
  });

  const handleResponse = (response: Response) => {
    const headers = response.headers();
    const policyWindow = readPolicyWindowSeconds(
      headers["ratelimit-policy"],
    );
    if (policyWindow !== TRACKED_POLICY_WINDOW_SECONDS) return;

    if (!observationResolved) {
      observationResolved = true;
      resolveObservation?.();
    }

    const remaining = readPositiveNumber(headers["ratelimit-remaining"]);
    const reset = readPositiveNumber(headers["ratelimit-reset"]);

    if (remaining === null || remaining > lowestRemaining) return;

    lowestRemaining = remaining;
    resetAfterSeconds = reset ?? resetAfterSeconds;
  };

  page.on("response", handleResponse);

  return {
    async waitForObservation(timeoutMs = 15_000): Promise<void> {
      if (observationResolved) return;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error(
              "Header limiter API umum tidak teramati setelah login.",
            ),
          );
        }, timeoutMs);

        void observation.then(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    },
    async waitForCapacity(
      minimumRemaining = DEFAULT_MINIMUM_REMAINING,
    ): Promise<boolean> {
      if (lowestRemaining > minimumRemaining) return false;

      const waitMs =
        Math.ceil(resetAfterSeconds * 1000) + RESET_SAFETY_MARGIN_MS;
      if (waitMs > 0) {
        await page.waitForTimeout(waitMs);
      }

      lowestRemaining = Number.POSITIVE_INFINITY;
      resetAfterSeconds = 0;
      return true;
    },
    dispose() {
      page.off("response", handleResponse);
    },
  };
}
