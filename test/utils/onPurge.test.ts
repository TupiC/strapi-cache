import { describe, it, expect, vi } from "vitest";
import { runOnPurge } from "../../server/src/utils/onPurge";

vi.mock("../../server/src/utils/log", () => ({
  loggy: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { loggy } from "../../server/src/utils/log";

const strapiWith = (onPurge: unknown) => ({
  plugin: () => ({ config: (key: string) => (key === "onPurge" ? onPurge : undefined) }),
});

describe("runOnPurge", () => {
  it("calls the hook with the purge event", async () => {
    const hook = vi.fn().mockResolvedValue(undefined);

    await runOnPurge(strapiWith(hook), { scope: "key", source: "admin", key: "products" });

    expect(hook).toHaveBeenCalledWith({ scope: "key", source: "admin", key: "products" });
  });

  it("does nothing when no hook is configured", async () => {
    await expect(
      runOnPurge(strapiWith(undefined), { scope: "all", source: "admin" }),
    ).resolves.toBeUndefined();
  });

  it("swallows and logs hook errors", async () => {
    const hook = vi.fn().mockRejectedValue(new Error("cloudflare down"));

    await expect(
      runOnPurge(strapiWith(hook), { scope: "all", source: "admin" }),
    ).resolves.toBeUndefined();
    expect(loggy.error).toHaveBeenCalled();
  });
});
