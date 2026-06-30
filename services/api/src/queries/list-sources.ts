import {
  calendarAccountsTable,
  calendarsTable,
} from "@keeper.sh/database/schema";
import { asc, eq } from "drizzle-orm";
import { withAccountDisplay } from "@/provider-display";
import type { KeeperDatabase, KeeperSource } from "@/types";

const toIsoString = (value: Date | null): string | null => {
  if (!value) {
    return null;
  }

  return value.toISOString();
};

const listSources = async (database: KeeperDatabase, userId: string): Promise<KeeperSource[]> => {
  const calendars = await database
    .select({
      id: calendarsTable.id,
      name: calendarsTable.name,
      calendarType: calendarsTable.calendarType,
      capabilities: calendarsTable.capabilities,
      accountId: calendarAccountsTable.id,
      provider: calendarAccountsTable.provider,
      displayName: calendarAccountsTable.displayName,
      email: calendarAccountsTable.email,
      accountIdentifier: calendarAccountsTable.accountId,
      needsReauthentication: calendarAccountsTable.needsReauthentication,
      includeInIcalFeed: calendarsTable.includeInIcalFeed,
      color: calendarsTable.color,
      disabled: calendarsTable.disabled,
      failureCount: calendarsTable.failureCount,
      lastFailureAt: calendarsTable.lastFailureAt,
    })
    .from(calendarsTable)
    .innerJoin(calendarAccountsTable, eq(calendarsTable.accountId, calendarAccountsTable.id))
    .where(eq(calendarsTable.userId, userId))
    .orderBy(asc(calendarsTable.createdAt));

  return calendars.map(({ lastFailureAt, ...calendar }) =>
    withAccountDisplay({
      ...calendar,
      lastFailureAt: toIsoString(lastFailureAt),
    }));
};

export { listSources };
