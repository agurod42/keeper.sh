import { useCallback, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import useSWR from "swr";
import { Link } from "@tanstack/react-router";
import { LazyMotion } from "motion/react";
import * as m from "motion/react-m";
import AlertTriangle from "lucide-react/dist/esm/icons/triangle-alert";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import KeyRound from "lucide-react/dist/esm/icons/key-round";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle";
import PowerOff from "lucide-react/dist/esm/icons/power-off";
import Rss from "lucide-react/dist/esm/icons/rss";
import X from "lucide-react/dist/esm/icons/x";
import { loadMotionFeatures } from "@/lib/motion-features";
import { useSyncMap } from "@/hooks/use-sync-map";
import {
  buildEdgePath,
  computeSyncMapLayout,
  type NodeRect,
} from "@/features/dashboard/sync-map/layout";
import {
  ICS_FEED_NODE_ID,
  type SyncMapEdge,
  type SyncMapGraph,
  type SyncMapNode,
} from "@/features/dashboard/sync-map/normalize";
import { syncMapHoverNodeIdAtom, syncMapSelectedNodeIdAtom } from "@/state/sync-map-hover";
import { ProviderIcon } from "@/components/ui/primitives/provider-icon";
import { Text } from "@/components/ui/primitives/text";
import { Tooltip } from "@/components/ui/primitives/tooltip";
import { ErrorState } from "@/components/ui/primitives/error-state";
import { formatDate } from "@/lib/time";
import type { CalendarDetail } from "@/types/api";

const NEUTRAL_EDGE = "var(--color-border-elevated)";
const FEED_EDGE = "var(--color-foreground-muted)";
const DRAG_THRESHOLD = 3;

// Distinguishable categorical hues so each source calendar's flows are
// traceable. Calendars that carry a real provider color use that instead.
const EDGE_PALETTE = [
  "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6",
  "#ec4899", "#f97316", "#6366f1", "#84cc16", "#06b6d4",
];

function hashIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function nodeColor(node: SyncMapNode): string {
  if (node.color) return node.color;
  if (node.kind === "ics-feed") return FEED_EDGE;
  return EDGE_PALETTE[hashIndex(node.id) % EDGE_PALETTE.length];
}

interface EdgeStyle {
  stroke: string;
  width: number;
  dash?: string;
  opacity: number;
}

function edgeStyle(active: boolean, isFeed: boolean, sourceColor: string): EdgeStyle {
  if (isFeed) {
    return { stroke: active ? FEED_EDGE : NEUTRAL_EDGE, width: 1.25, dash: "2 5", opacity: active ? 0.5 : 0.12 };
  }
  return { stroke: active ? sourceColor : NEUTRAL_EDGE, width: active ? 2 : 1.25, opacity: active ? 0.9 : 0.18 };
}

function buildNeighbors(edges: SyncMapEdge[]): Map<string, Set<string>> {
  const neighbors = new Map<string, Set<string>>();
  const connect = (a: string, b: string) => {
    const set = neighbors.get(a) ?? new Set<string>();
    set.add(b);
    neighbors.set(a, set);
  };
  for (const edge of edges) {
    connect(edge.sourceId, edge.destinationId);
    connect(edge.destinationId, edge.sourceId);
  }
  return neighbors;
}

function isNodeActive(hoverId: string | null, nodeId: string, neighbors: Map<string, Set<string>>): boolean {
  if (!hoverId) return true;
  if (hoverId === nodeId) return true;
  return neighbors.get(hoverId)?.has(nodeId) ?? false;
}

function isEdgeActive(hoverId: string | null, edge: SyncMapEdge): boolean {
  if (!hoverId) return true;
  return edge.sourceId === hoverId || edge.destinationId === hoverId;
}

export function SyncMap() {
  const { graph, isLoading, isEmpty, error, retry } = useSyncMap();

  if (error) {
    return <ErrorState message="Failed to load the sync map." onRetry={retry} />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoaderCircle size={20} className="animate-spin text-foreground-muted" />
      </div>
    );
  }

  if (isEmpty) {
    return <SyncMapEmptyState />;
  }

  return (
    <LazyMotion features={loadMotionFeatures}>
      <div className="flex flex-col gap-3">
        <SyncMapCanvas graph={graph} />
        <SyncMapDetailPanel graph={graph} />
      </div>
    </LazyMotion>
  );
}

function SyncMapEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-elevated bg-background-hover px-6 py-10 text-center">
      <Rss size={20} className="text-foreground-muted" />
      <Text size="sm" tone="muted">
        No sync flows yet. Connect calendars and link them to see the topology here.
      </Text>
      <Link
        to="/dashboard/connect"
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-sm font-medium text-foreground-inverse"
      >
        Connect calendars
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

type Positions = Record<string, { x: number; y: number }>;

function SyncMapCanvas({ graph }: { graph: SyncMapGraph }) {
  const layout = useMemo(() => computeSyncMapLayout(graph), [graph]);
  const neighbors = useMemo(() => buildNeighbors(graph.edges), [graph.edges]);
  const hoverId = useAtomValue(syncMapHoverNodeIdAtom);

  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const { node } of layout.nodes) map.set(node.id, nodeColor(node));
    return map;
  }, [layout.nodes]);

  // User-dragged position overrides, keyed by node id. Kept across background
  // revalidations so a refresh never yanks the user's arrangement; overrides for
  // removed nodes are simply never read (only current layout nodes are drawn).
  const [positions, setPositions] = useState<Positions>({});

  const rectById = useMemo(() => {
    const map = new Map<string, NodeRect>();
    for (const positioned of layout.nodes) {
      const override = positions[positioned.node.id];
      map.set(positioned.node.id, {
        x: override?.x ?? positioned.x,
        y: override?.y ?? positioned.y,
        width: positioned.width,
        height: positioned.height,
      });
    }
    return map;
  }, [layout.nodes, positions]);

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  return (
    // Only the diagram breaks out of the dashboard's narrow max-w-sm column; it
    // is capped and centered so the bottom-up flow fits without swimming.
    <div className="relative left-1/2 w-screen max-w-5xl -translate-x-1/2 overflow-x-auto px-4">
      <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
        <svg
          className="pointer-events-none absolute inset-0 overflow-visible"
          width={layout.width}
          height={layout.height}
          fill="none"
        >
          <defs>
            <marker
              id="sync-map-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 7 4 L 0 7 z" fill="context-stroke" />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const from = rectById.get(edge.sourceId);
            const to = rectById.get(edge.destinationId);
            if (!from || !to) return null;
            const active = isEdgeActive(hoverId, edge);
            const style = edgeStyle(active, edge.kind === "ics-feed", colorById.get(edge.sourceId) ?? NEUTRAL_EDGE);
            return (
              <m.path
                key={edge.id}
                d={buildEdgePath(from, to)}
                stroke={style.stroke}
                strokeWidth={style.width}
                strokeDasharray={style.dash}
                strokeLinecap="round"
                markerEnd="url(#sync-map-arrow)"
                markerStart={edge.bidirectional ? "url(#sync-map-arrow)" : undefined}
                initial={{ opacity: 0 }}
                animate={{ opacity: style.opacity }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              />
            );
          })}
        </svg>
        {layout.nodes.map((positioned) => {
          const rect = rectById.get(positioned.node.id);
          if (!rect) return null;
          return (
            <SyncMapNodeCard
              key={positioned.node.id}
              node={positioned.node}
              x={rect.x}
              y={rect.y}
              width={positioned.width}
              height={positioned.height}
              active={isNodeActive(hoverId, positioned.node.id, neighbors)}
              onMove={moveNode}
            />
          );
        })}
      </div>
    </div>
  );
}

interface SyncMapNodeCardProps {
  node: SyncMapNode;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  onMove: (id: string, x: number, y: number) => void;
}

function SyncMapNodeCard({ node, x, y, width, height, active, onMove }: SyncMapNodeCardProps) {
  const setHover = useSetAtom(syncMapHoverNodeIdAtom);
  const setSelected = useSetAtom(syncMapSelectedNodeIdAtom);
  const isFeed = node.kind === "ics-feed";
  const drag = useRef<{ pointerX: number; pointerY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerX: event.clientX, pointerY: event.clientY, originX: x, originY: y, moved: false };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.pointerX;
    const dy = event.clientY - state.pointerY;
    if (!state.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) state.moved = true;
    if (state.moved) onMove(node.id, state.originX + dx, state.originY + dy);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    suppressClick.current = state.moved;
    drag.current = null;
  };

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setSelected(node.id);
  };

  return (
    <div
      className="absolute cursor-grab touch-none active:z-10 active:cursor-grabbing"
      style={{ left: x, top: y, width, height, opacity: active ? 1 : 0.4, transition: "opacity 0.2s" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerEnter={() => setHover(node.id)}
      onPointerLeave={() => setHover(null)}
    >
      <Tooltip content={<SyncMapNodeTooltip node={node} />}>
        <button
          type="button"
          onClick={handleClick}
          data-disabled={node.disabled ? "" : undefined}
          className="flex h-full w-full items-center gap-1.5 rounded-lg border border-border-elevated bg-background-elevated px-2 text-left shadow-sm data-disabled:opacity-60 data-disabled:saturate-50"
          style={isFeed ? { borderStyle: "dashed" } : { borderLeft: `3px solid ${nodeColor(node)}` }}
        >
          <div className="flex size-5 shrink-0 items-center justify-center">
            {isFeed ? (
              <Rss size={14} className="text-foreground-muted" />
            ) : (
              <ProviderIcon provider={node.provider} calendarType={node.calendarType ?? undefined} size={14} />
            )}
          </div>
          <span className="min-w-0 flex-1 truncate text-xs text-foreground">{node.name}</span>
          <SyncMapNodeBadges node={node} />
        </button>
      </Tooltip>
    </div>
  );
}

function SyncMapNodeBadges({ node }: { node: SyncMapNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {node.disabled && <PowerOff size={12} className="text-foreground-muted" />}
      {node.needsReauthentication && <KeyRound size={12} className="text-amber-500" />}
      {node.failureCount > 0 && (
        <span className="flex items-center gap-0.5 text-red-500">
          <AlertTriangle size={12} />
          <span className="text-[0.625rem] tabular-nums">{node.failureCount}</span>
        </span>
      )}
    </div>
  );
}

function SyncMapNodeTooltip({ node }: { node: SyncMapNode }) {
  const role = node.isSource && node.isDestination ? "Source and destination" : node.isSource ? "Source" : "Destination";
  return (
    <div className="flex flex-col gap-0.5 text-left">
      <Text size="xs" tone="inverse">{node.name}</Text>
      <Text size="xs" tone="inverseMuted">{node.accountLabel ?? node.providerName}</Text>
      <Text size="xs" tone="inverseMuted">{role}</Text>
      {node.disabled && <Text size="xs" tone="inverseMuted">Disabled</Text>}
      {node.needsReauthentication && <Text size="xs" tone="inverseMuted">Needs reauthentication</Text>}
      {node.failureCount > 0 && (
        <Text size="xs" tone="inverseMuted">
          {node.failureCount} recent {node.failureCount === 1 ? "failure" : "failures"}
          {node.lastFailureAt ? ` (last ${formatDate(node.lastFailureAt)})` : ""}
        </Text>
      )}
    </div>
  );
}

function SyncMapDetailPanel({ graph }: { graph: SyncMapGraph }) {
  const [selectedId, setSelected] = useAtom(syncMapSelectedNodeIdAtom);
  const node = graph.nodes.find((candidate) => candidate.id === selectedId);

  if (!selectedId || !node) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border-elevated bg-background-elevated p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {node.kind === "ics-feed" ? (
            <Rss size={16} className="text-foreground-muted shrink-0" />
          ) : (
            <ProviderIcon provider={node.provider} calendarType={node.calendarType ?? undefined} size={16} />
          )}
          <Text size="sm" tone="default" className="truncate">{node.name}</Text>
        </div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          aria-label="Close detail panel"
          className="shrink-0 text-foreground-muted"
        >
          <X size={16} />
        </button>
      </div>
      {selectedId === ICS_FEED_NODE_ID ? (
        <Text size="sm" tone="muted">
          The unified Keeper iCal feed aggregates every calendar marked for the feed into a single
          subscribable link.
        </Text>
      ) : (
        <SyncMapCalendarDetail calendarId={node.id} accountId={node.accountId} />
      )}
    </div>
  );
}

function SyncMapCalendarDetail({ calendarId, accountId }: { calendarId: string; accountId: string | null }) {
  const { data, isLoading } = useSWR<CalendarDetail>(`/api/sources/${calendarId}`);

  if (isLoading) {
    return (
      <div className="flex justify-center py-3">
        <LoaderCircle size={16} className="animate-spin text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {data && (
        <Text size="sm" tone="muted">
          Sends to {data.destinationIds.length} {data.destinationIds.length === 1 ? "calendar" : "calendars"},
          receives from {data.sourceIds.length}.
        </Text>
      )}
      {accountId && (
        <Link
          to="/dashboard/accounts/$accountId/$calendarId"
          params={{ accountId, calendarId }}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border-elevated px-3 py-1.5 text-sm text-foreground"
        >
          Open settings
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
