/**
 * Zoho-specific HTTP constants.
 *
 * The calendar API base URL is REGION-AWARE and must be read from the
 * per-credential providerMetadata — there is no global base URL. Use
 * `getCalendarApiBaseFromMetadata` (exported from `core/oauth/zoho`) to
 * resolve it for each request.
 */

const ZOHO_PAGE_SIZE = 100;

/**
 * Zoho returns 412 Precondition Failed when an etag is stale on PUT/DELETE.
 * The destination provider does GET-then-mutate and retries ONCE on 412.
 */
const PRECONDITION_FAILED_STATUS = 412;

export { ZOHO_PAGE_SIZE, PRECONDITION_FAILED_STATUS };
