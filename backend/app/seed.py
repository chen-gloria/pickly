"""Create the database tables and load starter data.

Run from the backend folder:   python -m app.seed
"""
from .database import Base, SessionLocal, engine
from .datasources.manual import ACTIVE_SOURCE
from .models import Price, Product, Store

# Display info for the Australian chains (slug -> name, brand color).
STORES = {
    "woolworths": ("Woolworths", "#178841"),
    "coles": ("Coles", "#E01A22"),
    "aldi": ("ALDI", "#00457C"),
    "iga": ("IGA", "#E4002B"),
}


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Stores
        store_by_slug = {}
        for slug, (name, color) in STORES.items():
            store = db.query(Store).filter(Store.slug == slug).first()
            if not store:
                store = Store(slug=slug, name=name, color=color)
                db.add(store)
                db.flush()
            store_by_slug[slug] = store

        # 2. Products + prices from the active data source
        records = ACTIVE_SOURCE.fetch_prices()
        product_cache = {}
        for r in records:
            key = (r.product_name, r.size)
            product = product_cache.get(key)
            if product is None:
                product = (
                    db.query(Product)
                    .filter(Product.name == r.product_name, Product.size == r.size)
                    .first()
                )
                if not product:
                    product = Product(
                        name=r.product_name,
                        brand=r.brand,
                        category=r.category,
                        size=r.size,
                        image_url=r.image_url,
                    )
                    db.add(product)
                    db.flush()
                product_cache[key] = product

            store = store_by_slug[r.store_slug]
            price = (
                db.query(Price)
                .filter(Price.product_id == product.id, Price.store_id == store.id)
                .first()
            )
            if price:
                price.price = r.price
                price.on_special = r.on_special
                price.source = ACTIVE_SOURCE.name
            else:
                db.add(
                    Price(
                        product_id=product.id,
                        store_id=store.id,
                        price=r.price,
                        on_special=r.on_special,
                        source=ACTIVE_SOURCE.name,
                    )
                )

        db.commit()
        n_products = db.query(Product).count()
        n_prices = db.query(Price).count()
        print(f"Seeded {len(STORES)} stores, {n_products} products, {n_prices} prices.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
