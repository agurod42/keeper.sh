import { describe, it, expect } from "vitest";
import { generateDeterministicEventUid, isKeeperEvent } from "../../../src/core/events/identity";

describe("event identity utils", () => {
  it("generateDeterministicEventUid returns stable UID with suffix", () => {
    const seed = "test-seed";
    const uid1 = generateDeterministicEventUid(seed);
    const uid2 = generateDeterministicEventUid(seed);
    
    expect(uid1).toBe(uid2);
    expect(uid1).toContain("@keeper.sh");
  });

  it("isKeeperEvent identifies keeper events", () => {
    expect(isKeeperEvent("abc@keeper.sh")).toBe(true);
    expect(isKeeperEvent("abc@google.com")).toBe(false);
  });

  it("generateDeterministicEventUid generates different UIDs for different seeds", () => {
    const uid1 = generateDeterministicEventUid("seed1");
    const uid2 = generateDeterministicEventUid("seed2");
    expect(uid1).not.toBe(uid2);
  });

  it("handles empty seed", () => {
    expect(generateDeterministicEventUid("")).toBeDefined();
  });
});
