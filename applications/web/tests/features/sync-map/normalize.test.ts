import { describe, expect, it } from "vitest";
import {
  ICS_FEED_NODE_ID,
  normalizeSyncMap,
  type SyncMapMappingInput,
} from "@/features/dashboard/sync-map/normalize";
import type { CalendarSource } from "@/types/api";

const createSource = (overrides: Partial<CalendarSource> = {}): CalendarSource => ({
  id: "cal-1",
  name: "Calendar",
  calendarType: "oauth",
  capabilities: ["pull", "push"],
  accountId: "acc-1",
  provider: "google",
  providerName: "Google Calendar",
  providerIcon: null,
  displayName: null,
  email: "user@example.test",
  accountLabel: "user@example.test",
  accountIdentifier: "user@example.test",
  needsReauthentication: false,
  includeInIcalFeed: false,
  color: null,
  disabled: false,
  failureCount: 0,
  lastFailureAt: null,
  ...overrides,
});

const mapping = (
  id: string,
  sourceCalendarId: string,
  destinationCalendarId: string,
): SyncMapMappingInput => ({ id, sourceCalendarId, destinationCalendarId });

describe("normalizeSyncMap", () => {
  it("returns an empty graph when there are no mappings or feed members", () => {
    const graph = normalizeSyncMap({
      sources: [createSource({ id: "a" }), createSource({ id: "b" })],
      mappings: [],
    });

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it("only includes calendars that participate in a flow", () => {
    const graph = normalizeSyncMap({
      sources: [
        createSource({ id: "a" }),
        createSource({ id: "b" }),
        createSource({ id: "orphan" }),
      ],
      mappings: [mapping("m1", "a", "b")],
    });

    expect(graph.nodes.map((node) => node.id)).toEqual(["a", "b"]);
  });

  it("builds a one-way directed edge with correct role flags", () => {
    const graph = normalizeSyncMap({
      sources: [createSource({ id: "a" }), createSource({ id: "b" })],
      mappings: [mapping("m1", "a", "b")],
    });

    expect(graph.edges).toEqual([
      { id: "m1", sourceId: "a", destinationId: "b", bidirectional: false, kind: "mapping" },
    ]);

    const a = graph.nodes.find((node) => node.id === "a");
    const b = graph.nodes.find((node) => node.id === "b");
    expect(a).toMatchObject({ isSource: true, isDestination: false });
    expect(b).toMatchObject({ isSource: false, isDestination: true });
  });

  it("collapses a bidirectional pair into a single double-headed edge", () => {
    const graph = normalizeSyncMap({
      sources: [createSource({ id: "a" }), createSource({ id: "b" })],
      mappings: [mapping("m1", "a", "b"), mapping("m2", "b", "a")],
    });

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({ sourceId: "a", destinationId: "b", bidirectional: true });

    const a = graph.nodes.find((node) => node.id === "a");
    const b = graph.nodes.find((node) => node.id === "b");
    expect(a).toMatchObject({ isSource: true, isDestination: true });
    expect(b).toMatchObject({ isSource: true, isDestination: true });
  });

  it("keeps fan-out and fan-in edges distinct", () => {
    const graph = normalizeSyncMap({
      sources: [createSource({ id: "a" }), createSource({ id: "b" }), createSource({ id: "c" })],
      mappings: [mapping("m1", "a", "b"), mapping("m2", "a", "c")],
    });

    expect(graph.edges).toHaveLength(2);
    expect(graph.edges.every((edge) => !edge.bidirectional)).toBe(true);
    expect(graph.nodes.find((node) => node.id === "a")).toMatchObject({
      isSource: true,
      isDestination: false,
    });
  });

  it("renders an ICS pull-only calendar as a source-only node", () => {
    const graph = normalizeSyncMap({
      sources: [
        createSource({ id: "ics", calendarType: "ical", provider: "ics", capabilities: ["pull"] }),
        createSource({ id: "dest" }),
      ],
      mappings: [mapping("m1", "ics", "dest")],
    });

    const ics = graph.nodes.find((node) => node.id === "ics");
    expect(ics).toMatchObject({ isSource: true, isDestination: false, capabilities: ["pull"] });
  });

  it("preserves disabled and needs-reauth health flags on nodes", () => {
    const graph = normalizeSyncMap({
      sources: [
        createSource({ id: "a", disabled: true, failureCount: 3, lastFailureAt: "2026-06-30T00:00:00.000Z" }),
        createSource({ id: "b", needsReauthentication: true }),
      ],
      mappings: [mapping("m1", "a", "b")],
    });

    expect(graph.nodes.find((node) => node.id === "a")).toMatchObject({
      disabled: true,
      failureCount: 3,
      lastFailureAt: "2026-06-30T00:00:00.000Z",
    });
    expect(graph.nodes.find((node) => node.id === "b")).toMatchObject({
      needsReauthentication: true,
    });
  });

  it("adds the unified Keeper ICS feed as a virtual destination node", () => {
    const graph = normalizeSyncMap({
      sources: [
        createSource({ id: "a", includeInIcalFeed: true }),
        createSource({ id: "b", includeInIcalFeed: true }),
      ],
      mappings: [],
    });

    const feedNode = graph.nodes.find((node) => node.id === ICS_FEED_NODE_ID);
    expect(feedNode).toMatchObject({ kind: "ics-feed", isDestination: true, isSource: false });

    const feedEdges = graph.edges.filter((edge) => edge.kind === "ics-feed");
    expect(feedEdges).toHaveLength(2);
    expect(feedEdges.map((edge) => edge.sourceId).sort()).toEqual(["a", "b"]);
    expect(feedEdges.every((edge) => edge.destinationId === ICS_FEED_NODE_ID)).toBe(true);

    expect(graph.nodes.find((node) => node.id === "a")).toMatchObject({ isSource: true });
  });

  it("does not add the feed node when no calendar opts into the feed", () => {
    const graph = normalizeSyncMap({
      sources: [createSource({ id: "a" }), createSource({ id: "b" })],
      mappings: [mapping("m1", "a", "b")],
    });

    expect(graph.nodes.some((node) => node.id === ICS_FEED_NODE_ID)).toBe(false);
  });
});
