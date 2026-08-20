CREATE TABLE "store_filters" (
	"user_id" integer PRIMARY KEY,
	"recommendation_stores" text[] DEFAULT '{}'::text[] NOT NULL,
	"search_stores" text[] DEFAULT '{}'::text[] NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_filters" ADD CONSTRAINT "store_filters_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;