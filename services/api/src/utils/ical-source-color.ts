const SOURCE_COLOR_PALETTE = [
  "#4285F4",
  "#EA4335",
  "#FBBC04",
  "#34A853",
  "#A142F4",
  "#F4511E",
  "#0B8043",
  "#3F51B5",
  "#D81B60",
  "#039BE5",
  "#7986CB",
  "#33B679",
] as const;

const fnv1aHash = (input: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const isValidHexColor = (value: string): boolean => /^#[0-9a-fA-F]{6}$/.test(value);

interface ResolveSourceColorArgs {
  calendarId: string;
  nativeColor: string | null;
}

const resolveSourceColor = ({ calendarId, nativeColor }: ResolveSourceColorArgs): string => {
  if (nativeColor && isValidHexColor(nativeColor)) {
    return nativeColor.toUpperCase();
  }
  const index = fnv1aHash(calendarId) % SOURCE_COLOR_PALETTE.length;
  // Safe by construction: modulo guarantees a valid index over a non-empty palette.
  return SOURCE_COLOR_PALETTE[index] ?? SOURCE_COLOR_PALETTE[0]!;
};

export { resolveSourceColor, SOURCE_COLOR_PALETTE };
