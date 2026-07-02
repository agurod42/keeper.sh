import type { SyncMapEdge, SyncMapGraph, SyncMapNode } from "./normalize";

export const NODE_WIDTH = 172;
export const NODE_HEIGHT = 64;
export const COLUMN_GAP = 120;
export const ROW_GAP = 20;
export const PADDING = 16;

export type SyncMapRole = "source" | "both" | "destination";

const COLUMN_ORDER: SyncMapRole[] = ["source", "both", "destination"];

export interface PositionedNode {
  node: SyncMapNode;
  role: SyncMapRole;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerY: number;
}

export interface PositionedEdge {
  edge: SyncMapEdge;
  path: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface SyncMapLayout {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  width: number;
  height: number;
}

const resolveRole = (node: SyncMapNode): SyncMapRole => {
  if (node.kind === "ics-feed") {
    return "destination";
  }
  if (node.isSource && node.isDestination) {
    return "both";
  }
  if (node.isSource) {
    return "source";
  }
  return "destination";
};

const bezierPath = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  c1X: number,
  c2X: number,
): string => `M ${fromX} ${fromY} C ${c1X} ${fromY}, ${c2X} ${toY}, ${toX} ${toY}`;

/**
 * Bipartite-by-role layout (design layout A): pure sources on the left,
 * source+destination calendars in the middle, pure destinations (and the ICS
 * feed) on the right. Empty columns collapse so two-column accounts still read
 * as a clean left-to-right Sankey.
 */
export const computeSyncMapLayout = (graph: SyncMapGraph): SyncMapLayout => {
  const byRole = new Map<SyncMapRole, SyncMapNode[]>();
  for (const node of graph.nodes) {
    const role = resolveRole(node);
    const bucket = byRole.get(role);
    if (bucket) {
      bucket.push(node);
    } else {
      byRole.set(role, [node]);
    }
  }

  const presentColumns = COLUMN_ORDER.filter((role) => (byRole.get(role)?.length ?? 0) > 0);

  const columnHeight = (count: number): number =>
    count * NODE_HEIGHT + Math.max(0, count - 1) * ROW_GAP;

  const maxColumnHeight = Math.max(
    0,
    ...presentColumns.map((role) => columnHeight(byRole.get(role)?.length ?? 0)),
  );

  const positionedByptr = new Map<string, PositionedNode>();
  const positioned: PositionedNode[] = [];

  presentColumns.forEach((role, column) => {
    const columnNodes = byRole.get(role) ?? [];
    const startY = PADDING + (maxColumnHeight - columnHeight(columnNodes.length)) / 2;
    const x = PADDING + column * (NODE_WIDTH + COLUMN_GAP);

    columnNodes.forEach((node, row) => {
      const y = startY + row * (NODE_HEIGHT + ROW_GAP);
      const entry: PositionedNode = {
        node,
        role,
        column,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        centerY: y + NODE_HEIGHT / 2,
      };
      positioned.push(entry);
      positionedByptr.set(node.id, entry);
    });
  });

  const edges: PositionedEdge[] = [];
  for (const edge of graph.edges) {
    const from = positionedByptr.get(edge.sourceId);
    const to = positionedByptr.get(edge.destinationId);
    if (!from || !to) {
      continue;
    }

    if (to.x > from.x) {
      const fromX = from.x + from.width;
      const toX = to.x;
      const delta = (toX - fromX) * 0.5;
      edges.push({
        edge,
        fromX,
        fromY: from.centerY,
        toX,
        toY: to.centerY,
        path: bezierPath(fromX, from.centerY, toX, to.centerY, fromX + delta, toX - delta),
      });
      continue;
    }

    // Same column (bidirectional pair) or reverse flow: bulge out to the right.
    const fromX = from.x + from.width;
    const toX = to.x + to.width;
    const bulge = NODE_WIDTH * 0.45 + COLUMN_GAP * 0.5;
    edges.push({
      edge,
      fromX,
      fromY: from.centerY,
      toX,
      toY: to.centerY,
      path: bezierPath(fromX, from.centerY, toX, to.centerY, fromX + bulge, toX + bulge),
    });
  }

  const width = presentColumns.length
    ? PADDING * 2 + presentColumns.length * NODE_WIDTH + (presentColumns.length - 1) * COLUMN_GAP
    : 0;
  const height = PADDING * 2 + maxColumnHeight;

  return { nodes: positioned, edges, width, height };
};
