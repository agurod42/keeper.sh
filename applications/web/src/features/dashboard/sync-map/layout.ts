import type { SyncMapEdge, SyncMapGraph, SyncMapNode } from "./normalize";

export const NODE_WIDTH = 132;
export const NODE_HEIGHT = 52;
export const LAYER_GAP = 84; // vertical gap between role layers
export const NODE_GAP = 18; // horizontal gap between nodes within a layer
export const PADDING = 16;

export type SyncMapRole = "source" | "both" | "destination";

// Bottom-up: sources at the bottom, "both" in the middle, destinations (and the
// unified feed) at the top. Depth 0 is the source layer.
const LAYER_ORDER: SyncMapRole[] = ["source", "both", "destination"];

export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionedNode {
  node: SyncMapNode;
  role: SyncMapRole;
  layer: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SyncMapLayout {
  nodes: PositionedNode[];
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

/**
 * Reorder each layer in place with a few barycenter sweeps so connected nodes
 * line up and edges cross less. Layers are mutated by reference.
 */
const reduceCrossings = (layers: SyncMapNode[][], edges: SyncMapEdge[]): void => {
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
  const refresh = (layer: SyncMapNode[]) => {
    layer.forEach((node, index) => {
      position.set(node.id, layer.length <= 1 ? 0.5 : index / (layer.length - 1));
    });
  };
  layers.forEach(refresh);

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
    const indices = layers.map((_, index) => index);
    if (iteration % 2 === 1) indices.reverse();
    for (const layerIndex of indices) {
      const layer = layers[layerIndex];
      const key = new Map(layer.map((node) => [node.id, barycenter(node)]));
      layer.sort((a, b) => (key.get(a.id) ?? 0) - (key.get(b.id) ?? 0));
      refresh(layer);
    }
  }
};

/** Vertical S-curve from the top of the source up to the bottom of the destination. */
export const buildEdgePath = (from: NodeRect, to: NodeRect): string => {
  const fromX = from.x + from.width / 2;
  const fromY = from.y;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height;
  const midY = (fromY + toY) / 2;
  return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
};

const rowWidth = (count: number): number =>
  count * NODE_WIDTH + Math.max(0, count - 1) * NODE_GAP;

/**
 * Vertical bipartite-by-role layout: source calendars on the bottom row, the
 * flow rising through the middle to destinations (and the ICS feed) on top.
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

  const layers = LAYER_ORDER.filter((role) => (byRole.get(role)?.length ?? 0) > 0).map(
    (role) => byRole.get(role) as SyncMapNode[],
  );

  reduceCrossings(layers, graph.edges);

  const layerCount = layers.length;
  const maxRowWidth = Math.max(0, ...layers.map((layer) => rowWidth(layer.length)));

  const nodes: PositionedNode[] = [];
  layers.forEach((layerNodes, depth) => {
    // depth 0 (sources) sits at the bottom; the last layer sits at the top.
    const y = PADDING + (layerCount - 1 - depth) * (NODE_HEIGHT + LAYER_GAP);
    const startX = PADDING + (maxRowWidth - rowWidth(layerNodes.length)) / 2;

    layerNodes.forEach((node, index) => {
      nodes.push({
        node,
        role: resolveRole(node),
        layer: depth,
        x: startX + index * (NODE_WIDTH + NODE_GAP),
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });
  });

  const width = maxRowWidth ? PADDING * 2 + maxRowWidth : 0;
  const height = PADDING * 2 + layerCount * NODE_HEIGHT + Math.max(0, layerCount - 1) * LAYER_GAP;

  return { nodes, width, height };
};
