ALTER TABLE "calendars" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "ical_feed_settings" ADD COLUMN "includeCalendarSource" boolean DEFAULT false NOT NULL;