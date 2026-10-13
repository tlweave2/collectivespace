CREATE TABLE "add_ons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"price_type" text DEFAULT 'flat' NOT NULL,
	"applies_to" text DEFAULT 'rental' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blackouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"location_id" integer,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"customer_id" integer NOT NULL,
	"package_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"block_start" timestamp with time zone NOT NULL,
	"block_end" timestamp with time zone NOT NULL,
	"guests" integer DEFAULT 1 NOT NULL,
	"add_ons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"credit_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"first_payment_cents" integer NOT NULL,
	"balance_cents" integer DEFAULT 0 NOT NULL,
	"balance_due_at" timestamp with time zone,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"payment_method_id" text,
	"checkout_session_id" text,
	"notes" text DEFAULT '' NOT NULL,
	"admin_notes" text DEFAULT '' NOT NULL,
	"balance_reminder_sent" boolean DEFAULT false NOT NULL,
	"post_event_reviewed" boolean DEFAULT false NOT NULL,
	"post_event_notified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"kind" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"payment_intent_id" text,
	"photo_urls" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"stripe_customer_id" text,
	"credit_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'logged' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"location_id" integer NOT NULL,
	"weekday" integer NOT NULL,
	"open_time" text DEFAULT '09:00' NOT NULL,
	"close_time" text DEFAULT '22:00' NOT NULL,
	"closed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"location_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'rental' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"inclusions" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"duration_minutes" integer DEFAULT 480 NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"base_capacity" integer DEFAULT 50 NOT NULL,
	"max_capacity" integer DEFAULT 100 NOT NULL,
	"extra_guest_fee_cents" integer DEFAULT 0 NOT NULL,
	"payment_mode" text DEFAULT 'deposit' NOT NULL,
	"deposit_type" text DEFAULT 'percent' NOT NULL,
	"deposit_value" integer DEFAULT 50 NOT NULL,
	"buffer_minutes" integer DEFAULT 60 NOT NULL,
	"slot_interval_minutes" integer DEFAULT 60 NOT NULL,
	"min_notice_hours" integer DEFAULT 48 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_hours" ADD CONSTRAINT "location_hours_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;