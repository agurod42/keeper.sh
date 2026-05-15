export {
  createZohoSourceFetcher,
  type ZohoSourceFetcherConfig,
} from "./source/fetch-adapter";
export {
  listUserCalendars,
  CalendarListError,
  type ListUserCalendarsOptions,
} from "./source/utils/list-calendars";
export {
  fetchCalendarEvents,
  fetchCalendarName,
  parseZohoEvents,
  EventsFetchError,
} from "./source/utils/fetch-events";
export {
  createZohoSourceProvider,
  ZohoSourceProvider,
  resolveProviderMetadata,
  type CreateZohoSourceProviderConfig,
  type ZohoSourceAccount,
  type ZohoSourceConfig,
} from "./source/provider";
export type {
  ZohoCalendarListEntry,
  ZohoCalendarListResponse,
  ZohoEventDateTime,
  ZohoCalendarEvent,
  ZohoEventsListResponse,
  FetchEventsOptions,
  FetchEventsResult,
  EventTimeSlot,
} from "./source/types";

export {
  createZohoSyncProvider,
  type ZohoSyncProviderConfig,
} from "./destination/provider";
export {
  serializeZohoEvent,
  buildZohoEventData,
  type ZohoEventDataPayload,
} from "./destination/serialize-event";
export {
  getZohoAccountsByPlan,
  getZohoAccountsForUser,
  getUserEvents,
  type ZohoAccount,
} from "./destination/sync";

export { ZOHO_PAGE_SIZE, PRECONDITION_FAILED_STATUS } from "./shared/api";
export {
  hasRateLimitMessage,
  isAuthError,
  isSimpleAuthError,
  ZOHO_AUTH_ERROR_CODES,
} from "./shared/errors";
export {
  parseZohoBasicDateTime,
  formatZohoBasicDateTime,
  formatZohoBasicDate,
  parseEventDateTime,
  parseEventTime,
} from "./shared/date-time";
export type { ZohoDateTime, PartialZohoDateTime, ZohoApiError } from "./types";
