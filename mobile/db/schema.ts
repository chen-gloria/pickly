// Real schema, replacing two JSON-file-based stores:
//   - mobile/data/price-history.json  -> trackedProducts + priceObservations
//   - AsyncStorage's watchlist         -> watchlistItems (+ alertsSent for
//                                          "don't re-announce the same drop")
//
// Table shapes deliberately mirror the JSON structures they replace
// (scripts/lib/productKey.js's identity fields, watchlist.js's findDrops
// logic) so the matching/judging algorithms port over almost unchanged —
// only the storage calls change.
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One row per real-world product we've ever seen a price for — the display
// identity (title/store/icon) that individual dated observations attach to.
// product_key is the fingerprint from scripts/lib/productKey.js, computed
// once when a deal is first observed and stable across differently-worded
// re-postings of the same item.
export const trackedProducts = pgTable("tracked_products", {
  productKey: text("product_key").primaryKey(),
  title: text("title").notNull(),
  store: text("store"),
  storeLabel: text("store_label"),
  category: text("category"),
  icon: text("icon"),
  iconColor: text("icon_color"),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// The moat: one row per (product, day) — this is the append-only history
// everything else in the app is downstream of. Never updated in place; a
// re-run on the same day upserts the same (product_key, date) row rather
// than creating a duplicate, matching the JSON version's "one observation
// per product per day" rule.
export const priceObservations = pgTable(
  "price_observations",
  {
    id: serial("id").primaryKey(),
    productKey: text("product_key")
      .notNull()
      .references(() => trackedProducts.productKey, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD, matches the JSON format exactly
    price: doublePrecision("price").notNull(),
    votes: integer("votes").default(0),
    kind: text("kind"),
    url: text("url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("price_observations_product_date_unique").on(t.productKey, t.date)]
);

// A saved deal or search result. item_key is either the OzBargain deal id
// or "product-{searchResultId}" (see utils/watchlist.js's productWatchId) —
// kept as a plain string rather than a foreign key into tracked_products
// because plenty of watched items (a one-off search result, a deal with no
// price history yet) have no tracked-product row at all.
export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    title: text("title").notNull(),
    store: text("store"),
    image: text("image"),
    url: text("url"),
    priceWhenSaved: doublePrecision("price_when_saved"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("watchlist_items_user_item_unique").on(t.userId, t.itemKey)]
);

// Records which price a drop alert was already sent at, so the same drop
// doesn't re-notify on every check — mirrors the old getSeenDrops()/
// markDropSeen() pair in utils/watchlist.js, moved server-side so it holds
// even if the user is on a different device than the one that saw it first.
export const alertsSent = pgTable("alerts_sent", {
  id: serial("id").primaryKey(),
  watchlistItemId: integer("watchlist_item_id")
    .notNull()
    .references(() => watchlistItems.id, { onDelete: "cascade" }),
  priceAtSend: doublePrecision("price_at_send").notNull(),
  notified: boolean("notified").notNull().default(false), // true once actually pushed/emailed, not just detected
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// One row per signed-in user, holding which of the five filterable sources
// (Coles/Woolworths/ALDI/Alpha Fresh/OzBargain — see utils/storeFilter.js)
// they want applied. Three independent lists on purpose: someone might want
// the recommendation feed narrowed to just what's near them, while still
// searching or checking the leaderboard across everything. Empty array
// means "no filter, show all sources" in every case — there's no separate
// "All" value to keep in sync (the Profile screen's "All" chip is just what
// an empty array renders as).
//
// Mirrors watchlist_items' dual-backed pattern (utils/watchlist.js):
// signed-in reads/writes hit this table so the choice follows the account
// across devices; a signed-out user keeps the same preference in
// AsyncStorage only, since there's no account to attach it to yet.
export const storeFilters = pgTable("store_filters", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  recommendationStores: text("recommendation_stores")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  searchStores: text("search_stores").array().notNull().default(sql`'{}'::text[]`),
  leaderboardStores: text("leaderboard_stores")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
