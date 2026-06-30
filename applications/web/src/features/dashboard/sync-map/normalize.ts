import type { CalendarSource } from "@/types/api";

/**
 * The unified Keeper ICS feed is a virtual aggregator node (not a real calendar
 * row). Calendars flagged `includeInIcalFeed` point an edge at it.
 */
export const ICS_FEED_NODE_ID = "keeper-ics-feed";

export interface SyncMapMappingInput {
  id: string;
  sourceCalendarId: string;
  destinationCalendarId: string;
}

export interface SyncMapInput {
  sources: CalendarSource[];
  mappings: SyncMapMappingInput[];
}

export type SyncMapNodeKind = "calendar" | "ics-feed";

export interface SyncMapNode {
  id: string;
  kind: SyncMapNodeKind;
  name: string;
  accountId: string | null;
  provider: string;
  providerName: string;
  providerIcon: string | null;
  accountLabel: string | null;
  calendarType: string | null;
  color: string | null;
  capabilities: string[];
  includeInIcalFeed: boolean;
  /** Has at least one outgoing edge (feeds another calendar/feed). */
  isSource: boolean;
  /** Has at least one incoming edge (receives events). */
  isDestination: boolean;
  disabled: boolean;
  needsReauthentication: boolean;
  failureCount: number;
  lastFailureAt: string | null;
}

export type SyncMapEdgeKind = "mapping" | "ics-feed";

export interface SyncMapEdge {
  id: string;
  sourceId: string;
  destinationId: string;
  /** Bidirectional pairs (A->B and B->A) collapse into one double-headed edge. */
  bidirectional: boolean;
  kind: SyncMapEdgeKind;
}

export interface SyncMapGraph {
  nodes: SyncMapNode[];
  edges: SyncMapEdge[];
}

const directedKey = (sourceId: string, destinationId: string): string =>
  `${sourceId}->${destinationId}`;

const unorderedKey = (a: string, b: string): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

const collapseMappingEdges = (mappings: SyncMapMappingInput[]): SyncMapEdge[] => {
  const directed = new Set(
    mappings.map((mapping) => directedKey(mapping.sourceCalendarId, mapping.destinationCalendarId)),
  );
  const seenPairs = new Set<string>();
  const edges: SyncMapEdge[] = [];

  for (const mapping of mappings) {
    const { sourceCalendarId, destinationCalendarId } = mapping;
    const pairKey = unorderedKey(sourceCalendarId, destinationCalendarId);

    if (seenPairs.has(pairKey)) {
      continue;
    }
    seenPairs.add(pairKey);

    const hasReverse =
      sourceCalendarId !== destinationCalendarId &&
      directed.has(directedKey(destinationCalendarId, sourceCalendarId));

    edges.push({
      id: mapping.id,
      sourceId: sourceCalendarId,
      destinationId: destinationCalendarId,
      bidirectional: hasReverse,
      kind: "mapping",
    });
  }

  return edges;
};

const buildIcsFeedEdges = (sources: CalendarSource[]): SyncMapEdge[] =>
  sources
    .filter((source) => source.includeInIcalFeed)
    .map((source) => ({
      id: `ics-feed:${source.id}`,
      sourceId: source.id,
      destinationId: ICS_FEED_NODE_ID,
      bidirectional: false,
      kind: "ics-feed" as const,
    }));

const toCalendarNode = (
  source: CalendarSource,
  isSource: boolean,
  isDestination: boolean,
): SyncMapNode => ({
  id: source.id,
  kind: "calendar",
  name: source.name,
  accountId: source.accountId,
  provider: source.provider,
  providerName: source.providerName,
  providerIcon: source.providerIcon,
  accountLabel: source.accountLabel,
  calendarType: source.calendarType,
  color: source.color,
  capabilities: source.capabilities,
  includeInIcalFeed: source.includeInIcalFeed,
  isSource,
  isDestination,
  disabled: source.disabled,
  needsReauthentication: source.needsReauthentication,
  failureCount: source.failureCount,
  lastFailureAt: source.lastFailureAt,
});

const icsFeedNode = (): SyncMapNode => ({
  id: ICS_FEED_NODE_ID,
  kind: "ics-feed",
  name: "Keeper iCal Feed",
  accountId: null,
  provider: "ics",
  providerName: "Keeper",
  providerIcon: null,
  accountLabel: "Unified feed",
  calendarType: "ical",
  color: null,
  capabilities: ["push"],
  includeInIcalFeed: false,
  isSource: false,
  isDestination: true,
  disabled: false,
  needsReauthentication: false,
  failureCount: 0,
  lastFailureAt: null,
});

/**
 * Combine the calendar list and the mapping list into a directed topology
 * graph. Only calendars that participate in at least one flow become nodes, so
 * an account with no mappings yields an empty graph (empty-state in the UI).
 */
export const normalizeSyncMap = ({ sources, mappings }: SyncMapInput): SyncMapGraph => {
  const edges = [...collapseMappingEdges(mappings), ...buildIcsFeedEdges(sources)];

  const sourceIds = new Set<string>();
  const destinationIds = new Set<string>();
  for (const edge of edges) {
    sourceIds.add(edge.sourceId);
    destinationIds.add(edge.destinationId);
    if (edge.bidirectional) {
      sourceIds.add(edge.destinationId);
      destinationIds.add(edge.sourceId);
    }
  }

  const participating = new Set<string>([...sourceIds, ...destinationIds]);

  const nodes: SyncMapNode[] = [];
  for (const source of sources) {
    if (!participating.has(source.id)) {
      continue;
    }
    nodes.push(toCalendarNode(source, sourceIds.has(source.id), destinationIds.has(source.id)));
  }

  if (participating.has(ICS_FEED_NODE_ID)) {
    nodes.push(icsFeedNode());
  }

  return { nodes, edges };
};
