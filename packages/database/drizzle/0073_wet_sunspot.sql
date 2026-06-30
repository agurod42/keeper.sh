CREATE TABLE "availability_rules" (
	"endMinute" integer NOT NULL,
	"eventTypeId" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"startMinute" integer NOT NULL,
	"weekday" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_profiles" (
	"avatarUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"displayName" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" text NOT NULL,
	CONSTRAINT "booking_profiles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "booking_profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"cancelToken" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"endTime" timestamp NOT NULL,
	"eventTypeId" uuid NOT NULL,
	"guestEmail" text NOT NULL,
	"guestName" text NOT NULL,
	"guestNotes" text,
	"guestTimezone" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"startTime" timestamp NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"userEventId" text NOT NULL,
	CONSTRAINT "bookings_cancelToken_unique" UNIQUE("cancelToken")
);
--> statement-breakpoint
CREATE TABLE "event_types" (
	"bufferAfterMinutes" integer DEFAULT 0 NOT NULL,
	"bufferBeforeMinutes" integer DEFAULT 0 NOT NULL,
	"color" text,
	"conflictCalendarIds" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"destinationCalendarId" text NOT NULL,
	"durationMinutes" integer NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"locationType" text DEFAULT 'none' NOT NULL,
	"locationValue" text,
	"maxAdvanceDays" integer DEFAULT 60 NOT NULL,
	"minNoticeMinutes" integer DEFAULT 0 NOT NULL,
	"slug" text NOT NULL,
	"timezone" text NOT NULL,
	"title" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_eventTypeId_event_types_id_fk" FOREIGN KEY ("eventTypeId") REFERENCES "public"."event_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_profiles" ADD CONSTRAINT "booking_profiles_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_eventTypeId_event_types_id_fk" FOREIGN KEY ("eventTypeId") REFERENCES "public"."event_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_types" ADD CONSTRAINT "event_types_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_rules_event_type_idx" ON "availability_rules" USING btree ("eventTypeId");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_confirmed_slot_idx" ON "bookings" USING btree ("eventTypeId","startTime") WHERE "bookings"."status" = 'confirmed';--> statement-breakpoint
CREATE INDEX "bookings_event_type_idx" ON "bookings" USING btree ("eventTypeId");--> statement-breakpoint
CREATE UNIQUE INDEX "event_types_user_slug_idx" ON "event_types" USING btree ("userId","slug");--> statement-breakpoint
CREATE INDEX "event_types_user_idx" ON "event_types" USING btree ("userId");