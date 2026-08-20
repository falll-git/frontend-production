export type RefreshRunResult = "executed" | "skipped";

type RefreshCoordinatorOptions = {
  freshForMs: number;
  retryCooldownMs: number;
  now?: () => number;
};

type RefreshRunOptions = {
  force?: boolean;
};

export function createRequestRefreshCoordinator({
  freshForMs,
  retryCooldownMs,
  now = () => Date.now(),
}: RefreshCoordinatorOptions) {
  let inFlight: Promise<RefreshRunResult> | null = null;
  let lastAttemptAt: number | null = null;
  let lastSuccessAt: number | null = null;

  return {
    run(
      task: () => Promise<void>,
      { force = false }: RefreshRunOptions = {},
    ): Promise<RefreshRunResult> {
      if (inFlight) return inFlight;

      const currentTime = now();
      if (
        !force &&
        ((lastSuccessAt !== null &&
          currentTime - lastSuccessAt < freshForMs) ||
          (lastAttemptAt !== null &&
            currentTime - lastAttemptAt < retryCooldownMs))
      ) {
        return Promise.resolve("skipped");
      }

      lastAttemptAt = currentTime;
      const current = task()
        .then(() => {
          lastSuccessAt = now();
          return "executed" as const;
        })
        .finally(() => {
          if (inFlight === current) inFlight = null;
        });
      inFlight = current;
      return current;
    },

    reset() {
      lastAttemptAt = null;
      lastSuccessAt = null;
    },
  };
}
