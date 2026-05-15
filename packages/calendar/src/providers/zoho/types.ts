/**
 * Lightweight shape descriptors mirrored from Zoho schema arktype definitions
 * in `@keeper.sh/data-schemas`. Imported by the provider tree for ergonomic
 * typing in places where the inferred schema types are too narrow.
 *
 * Empirically validated against Zoho Calendar REST API on 2026-05-13. See
 * `Engineering/Operations/Zoho Calendar API - notes.md`.
 */
interface ZohoDateTime {
  start?: string;
  end?: string;
  timezone?: string;
}

interface PartialZohoDateTime {
  start?: string;
  end?: string;
  timezone?: string;
}

interface ZohoApiError {
  code?: number | string;
  message?: string;
  status?: string;
}

export type { ZohoDateTime, PartialZohoDateTime, ZohoApiError };
