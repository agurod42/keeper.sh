import type { SyncMapEdge, SyncMapGraph, SyncMapNode } from "./normalize";

export const NODE_WIDTH = 168;
export const NODE_HEIGHT = 64;
export const COLUMN_GAP = 88;
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
 * Reorder each column in place with a few barycenter sweeps so connected nodes
 * line up vertically and edges cross less. Columns are mutated by reference.
 */
const reduceCrossings = (columns: SyncMapNode[][], edges: SyncMapEdge[]): void => {
  const adjacency = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    const set = adjacency.get(a) ?? new Set<string>();
    set.add(b);
    adjacency.set(a, set);
  };
  for (const edge of edges) {
    link(edge.sourceId, edge.destinationId);
    link(edge.destinationId, edge.sourceId);
  }

  const position = new Map<string, number>();
  const refresh = (column: SyncMapNode[]) => {
    column.forEach((node, index) => {
      position.set(node.id, column.length <= 1 ? 0.5 : index / (column.length - 1));
    });
  };
  columns.forEach(refresh);

  const barycenter = (node: SyncMapNode): number => {
    const neighbours = adjacency.get(node.id);
    const own = position.get(node.id) ?? 0.5;
    if (!neighbours || neighbours.size === 0) return own;
    let sum = 0;
    let count = 0;
    for (const id of neighbours) {
      const p = position.get(id);
      if (p !== undefined) {
        sum += p;
        count += 1;
      }
    }
    return count ? sum / count : own;
  };

  const SWEEPS = 4;
  for (let iteration = 0; iteration < SWEEPS; iteration += 1) {
    const indices = columns.map((_, index) => index);
    if (iteration % 2 === 1) indices.reverse();
    for (const columnIndex of indices) {
      const column = columns[columnIndex];
      const key = new Map(column.map((node) => [node.id, barycenter(node)]));
      column.sort((a, b) => (key.get(a.id) ?? 0) - (key.get(b.id) ?? 0));
      refresh(column);
    }
  }
};

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

  reduceCrossings(presentColumns.map((role) => byRole.get(role) ?? []), graph.edges);

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
