# Price data sources

This folder is where grocery prices come from. It's deliberately isolated so the
rest of the app never needs to know *how* a price was obtained.

## How it works
- `base.py` defines `PriceRecord` (the shape of one price) and the `PriceSource`
  contract (`fetch_prices()`).
- `manual.py` is the source used today: admin/sample data. Legal, reliable,
  perfect for launching and testing demand.
- `seed.py` (in the parent folder) reads the active source and loads the database.

## Adding a new source later
Create a new file (e.g. `affiliate.py` or `scraper.py`) with a class that has a
`name` and a `fetch_prices()` method returning `list[PriceRecord]`. Then point
`ACTIVE_SOURCE` in `manual.py` at it (or combine several). Nothing else changes.

## A note on scraping (read before you build it)
Scraping Woolworths/Coles violates their Terms of Service, breaks often, and can
draw legal complaints. Prefer:
1. Manual/admin + crowdsourced data to launch.
2. Official **affiliate / specials feeds** (both chains run affiliate programs).
3. Scraping only as a last resort, rate-limited and isolated in its own module.
