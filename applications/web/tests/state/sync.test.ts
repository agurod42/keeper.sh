import { describe, it, expect } from "vitest";
import { syncStatusLabelAtom } from "../../src/state/sync";

describe("sync state atoms", () => {
  describe("syncStatusLabelAtom", () => {
    it("returns Connecting when not connected", () => {
      const state = { connected: false, hasReceivedAggregate: true, state: "idle", syncEventsRemaining: 0 } as any;
      // @ts-ignore - access raw atom logic if possible, or just test via jotai store
      // But selectAtom logic is pure.
    });
  });
});
