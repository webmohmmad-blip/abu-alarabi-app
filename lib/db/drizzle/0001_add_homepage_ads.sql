CREATE TABLE IF NOT EXISTS "homepage_ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"image_key" text NOT NULL,
	"mobile_image_key" text,
	"tablet_image_key" text,
	"link_url" text,
	"open_in_new_tab" boolean DEFAULT false NOT NULL,
	"cta_text" text,
	"display_style" varchar(30) DEFAULT 'image_only' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"created_by" integer REFERENCES "users"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_homepage_ads_active_position" ON "homepage_ads" ("is_active", "position");
