"""The contract every price data source must follow.

THIS IS THE KEY ABSTRACTION for the app's biggest risk: where prices come from.
Today we use ManualSource (admin/seed data). Later you can add an
AffiliateFeedSource or a ScraperSource WITHOUT changing any other code -- as long
as the new source returns the same `PriceRecord` shape from `fetch_prices()`.
"""
from dataclasses import dataclass
from typing import Protocol


@dataclass
class PriceRecord:
    """One price for one product at one store, in a source-independent shape."""
    store_slug: str          # e.g. "woolworths"
    product_name: str
    brand: str
    category: str
    size: str
    price: float             # dollars
    on_special: bool = False
    image_url: str = ""


class PriceSource(Protocol):
    """Any data source (manual, affiliate feed, scraper) implements this."""

    name: str

    def fetch_prices(self) -> list[PriceRecord]:
        """Return the latest prices this source knows about."""
        ...
