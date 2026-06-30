import { useMemo } from "react";
import useSWR from "swr";
import { normalizeSyncMap } from "@/features/dashboard/sync-map/normalize";
import type { SyncMapGraph } from "@/features/dashboard/sync-map/normalize";
import type { ApiMapping, CalendarSource } from "@/types/api";

const EMPTY_GRAPH: SyncMapGraph = { nodes: [], edges: [] };

export interface UseSyncMapResult {
  graph: SyncMapGraph;
  isLoading: boolean;
  isEmpty: boolean;
  error: unknown;
  retry: () => void;
}

/**
 * Build the sync topology graph client-side by combining the existing
 * `/api/sources` (nodes) and `/api/mappings` (edges) fetches. No dedicated
 * endpoint — the normalizer does the cross-join and bidirectional collapse.
 */
export function useSyncMap(): UseSyncMapResult {
  const sources = useSWR<CalendarSource[]>("/api/sources");
  const mappings = useSWR<ApiMapping[]>("/api/mappings");

  const graph = useMemo<SyncMapGraph>(() => {
    if (!sources.data || !mappings.data) {
      return EMPTY_GRAPH;
    }
    return normalizeSyncMap({ sources: sources.data, mappings: mappings.data });
  }, [sources.data, mappings.data]);

  return {
    graph,
    isLoading: sources.isLoading || mappings.isLoading,
    isEmpty: graph.nodes.length === 0,
    error: sources.error ?? mappings.error,
    retry: () => {
      void sources.mutate();
      void mappings.mutate();
    },
  };
}
