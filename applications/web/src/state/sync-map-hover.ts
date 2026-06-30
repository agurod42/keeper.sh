import { atom } from "jotai";

/** Node currently hovered; highlights its connected subgraph. */
export const syncMapHoverNodeIdAtom = atom<string | null>(null);

/** Node whose detail panel is open (click to select). */
export const syncMapSelectedNodeIdAtom = atom<string | null>(null);
