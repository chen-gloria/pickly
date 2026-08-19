CREATE TABLE "alerts_sent" (
	"id" serial PRIMARY KEY,
	"watchlist_item_id" integer NOT NULL,
	"price_at_send" double precision NOT NULL,
	"notified" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_observations" (
	"id" serial PRIMARY KEY,
	"product_key" text NOT NULL,
	"date" text NOT NULL,
	"price" double precision NOT NULL,
	"votes" integer DEFAULT 0,
	"kind" text,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_observations_product_date_unique" UNIQUE("product_key","date")
);
--> statement-breakpoint
CREATE TABLE "tracked_products" (
	"product_key" text PRIMARY KEY,
	"title" text NOT NULL,
	"store" text,
	"store_label" text,
	"category" text,
	"icon" text,
	"icon_color" text,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"item_key" text NOT NULL,
	"title" text NOT NULL,
	"store" text,
	"image" text,
	"url" text,
	"price_when_saved" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_items_user_item_unique" UNIQUE("user_id","item_key")
);
--> statement-breakpoint
ALTER TABLE "alerts_sent" ADD CONSTRAINT "alerts_sent_watchlist_item_id_watchlist_items_id_fkey" FOREIGN KEY ("watchlist_item_id") REFERENCES "watchlist_items"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_atmeN0ndBgUL_fkey" FOREIGN KEY ("product_key") REFERENCES "tracked_products"("product_key") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;