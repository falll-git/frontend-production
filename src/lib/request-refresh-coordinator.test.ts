import { describe, expect, it, vi } from "vitest";

import { createRequestRefreshCoordinator } from "@/lib/request-refresh-coordinator";

describe("request refresh coordinator", () => {
  it("menggabungkan navigasi cepat menjadi satu request yang sedang berjalan", async () => {
    let finish!: () => void;
    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const coordinator = createRequestRefreshCoordinator({
      freshForMs: 60_000,
      retryCooldownMs: 5_000,
    });

    const requests = Array.from({ length: 100 }, () => coordinator.run(task));
    expect(task).toHaveBeenCalledTimes(1);

    finish();
    await expect(Promise.all(requests)).resolves.toEqual(
      Array.from({ length: 100 }, () => "executed"),
    );
  });

  it("memakai data segar selama TTL tetapi refresh eksplisit tetap berjalan", async () => {
    let now = 1_000;
    const task = vi.fn().mockResolvedValue(undefined);
    const coordinator = createRequestRefreshCoordinator({
      freshForMs: 60_000,
      retryCooldownMs: 5_000,
      now: () => now,
    });

    await expect(coordinator.run(task)).resolves.toBe("executed");
    now += 10_000;
    await expect(coordinator.run(task)).resolves.toBe("skipped");
    await expect(coordinator.run(task, { force: true })).resolves.toBe(
      "executed",
    );
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("memberi cooldown setelah kegagalan tanpa menutupi refresh eksplisit", async () => {
    let now = 1_000;
    const failedTask = vi.fn().mockRejectedValue(new Error("429"));
    const recoveryTask = vi.fn().mockResolvedValue(undefined);
    const coordinator = createRequestRefreshCoordinator({
      freshForMs: 60_000,
      retryCooldownMs: 5_000,
      now: () => now,
    });

    await expect(coordinator.run(failedTask)).rejects.toThrow("429");
    now += 1_000;
    await expect(coordinator.run(recoveryTask)).resolves.toBe("skipped");
    await expect(
      coordinator.run(recoveryTask, { force: true }),
    ).resolves.toBe("executed");
    expect(recoveryTask).toHaveBeenCalledTimes(1);
  });
});
