"""Manual / admin-entered data source.

This is the legal, fast-to-launch source we start with. The data below is sample
Australian grocery data so the app works out of the box. In production you would
replace this with prices entered through an admin panel or imported from a CSV.
"""
from .base import PriceRecord, PriceSource

# Sample Australian products with realistic-ish prices across the four big chains.
# (store_slug, product_name, brand, category, size, woolies, coles, aldi, iga)
_SAMPLE = [
    ("Full Cream Milk", "Dairy Farmers", "Dairy & Eggs", "2L", 3.60, 3.50, 2.99, 3.80),
    ("Free Range Eggs", "Pace Farm", "Dairy & Eggs", "12pk", 6.50, 6.20, 5.49, 6.90),
    ("White Bread", "Wonder White", "Bakery", "700g", 3.20, 3.00, 2.49, 3.40),
    ("Bananas", "Cavendish", "Fruit & Veg", "1kg", 4.50, 4.20, 3.99, 4.60),
    ("Tomatoes", "Truss", "Fruit & Veg", "1kg", 6.90, 6.50, 5.99, 7.20),
    ("Chicken Breast", "Lilydale", "Meat & Seafood", "1kg", 13.00, 12.50, 10.99, 13.50),
    ("Tasty Cheese Block", "Bega", "Dairy & Eggs", "500g", 7.50, 6.00, 6.49, 7.80),
    ("Pasta Spirals", "San Remo", "Pantry", "500g", 2.20, 2.00, 1.49, 2.40),
    ("Pasta Sauce", "Leggos", "Pantry", "500g", 3.50, 3.20, 2.79, 3.70),
    ("Olive Oil", "Cobram Estate", "Pantry", "750ml", 12.00, 11.00, 9.99, 12.50),
    ("Coffee Beans", "Vittoria", "Pantry", "1kg", 28.00, 26.00, 19.99, 29.00),
    ("Toilet Paper", "Quilton", "Household", "12pk", 9.00, 8.50, 6.99, 9.50),
    ("Dishwashing Liquid", "Morning Fresh", "Household", "900ml", 4.50, 4.00, 3.49, 4.70),
    ("Orange Juice", "Daily Juice", "Drinks", "2L", 5.00, 4.50, 3.99, 5.20),
    ("Greek Yoghurt", "Chobani", "Dairy & Eggs", "907g", 8.00, 7.50, 6.99, 8.30),
]

_STORE_ORDER = ["woolworths", "coles", "aldi", "iga"]


class ManualSource:
    name = "manual"

    def fetch_prices(self) -> list[PriceRecord]:
        records: list[PriceRecord] = []
        for name, brand, category, size, *store_prices in _SAMPLE:
            for slug, price in zip(_STORE_ORDER, store_prices):
                # Mark Aldi prices (cheapest column) as specials sometimes.
                on_special = slug == "aldi"
                records.append(
                    PriceRecord(
                        store_slug=slug,
                        product_name=name,
                        brand=brand,
                        category=category,
                        size=size,
                        price=price,
                        on_special=on_special,
                    )
                )
        return records


# This is the source the app uses today. Change this line to swap sources.
ACTIVE_SOURCE: PriceSource = ManualSource()
