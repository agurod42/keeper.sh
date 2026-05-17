import { atom } from "jotai";
import { selectAtom } from "jotai/utils";

interface FeedSettings {
  includeEventName: boolean;
  includeEventDescription: boolean;
  includeEventLocation: boolean;
  includeCalendarSource: boolean;
  excludeAllDayEvents: boolean;
  customEventName: string;
}

export type FeedSettingToggleKey = keyof Omit<FeedSettings, "customEventName">;

const DEFAULT_FEED_SETTINGS: FeedSettings = {
  includeEventName: false,
  includeEventDescription: false,
  includeEventLocation: false,
  includeCalendarSource: false,
  excludeAllDayEvents: false,
  customEventName: "Busy",
};

export const feedSettingsAtom = atom<FeedSettings>(DEFAULT_FEED_SETTINGS);
export const feedSettingsLoadedAtom = atom(false);

export const includeEventNameAtom = selectAtom(feedSettingsAtom, (settings) => settings.includeEventName);
export const includeEventDescriptionAtom = selectAtom(feedSettingsAtom, (settings) => settings.includeEventDescription);
export const includeEventLocationAtom = selectAtom(feedSettingsAtom, (settings) => settings.includeEventLocation);
export const includeCalendarSourceAtom = selectAtom(feedSettingsAtom, (settings) => settings.includeCalendarSource);
export const excludeAllDayEventsAtom = selectAtom(feedSettingsAtom, (settings) => settings.excludeAllDayEvents);
export const customEventNameAtom = selectAtom(feedSettingsAtom, (settings) => settings.customEventName);

export const feedSettingAtoms = {
  includeEventName: includeEventNameAtom,
  includeEventDescription: includeEventDescriptionAtom,
  includeEventLocation: includeEventLocationAtom,
  includeCalendarSource: includeCalendarSourceAtom,
  excludeAllDayEvents: excludeAllDayEventsAtom,
} as const;
