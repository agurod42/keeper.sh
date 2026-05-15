import {
  getOAuthAccountsByPlan,
  getOAuthAccountsForUser,
  getUserEventsForSync,
} from "../../../core/oauth/accounts";
import type { OAuthAccount } from "../../../core/oauth/accounts";
import type { SyncableEvent } from "../../../core/types";
import type { Plan } from "@keeper.sh/data-schemas";
import type { BunSQLDatabase } from "drizzle-orm/bun-sql";

const PROVIDER = "zoho";

type ZohoAccount = OAuthAccount;

const getZohoAccountsByPlan = (
  database: BunSQLDatabase,
  targetPlan: Plan,
): Promise<ZohoAccount[]> => getOAuthAccountsByPlan(database, PROVIDER, targetPlan);

const getZohoAccountsForUser = (
  database: BunSQLDatabase,
  userId: string,
): Promise<ZohoAccount[]> => getOAuthAccountsForUser(database, PROVIDER, userId);

const getUserEvents = (database: BunSQLDatabase, userId: string): Promise<SyncableEvent[]> =>
  getUserEventsForSync(database, userId);

export { getZohoAccountsByPlan, getZohoAccountsForUser, getUserEvents };
export type { ZohoAccount };
