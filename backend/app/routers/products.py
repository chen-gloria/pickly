"""Product search and the price-comparison view (the heart of the app)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product
from ..schemas import ProductOut, ProductWithPrices, StorePrice, StoreOut

router = APIRouter(prefix="/products", tags=["products"])


def build_comparison(product: Product) -> ProductWithPrices:
    """Turn a product + its store prices into the comparison response with savings."""
    store_prices = [
        StorePrice(
            store=StoreOut.model_validate(p.store),
            price=p.price,
            on_special=p.on_special,
        )
        for p in product.prices
    ]
    # Sort cheapest first so the UI can highlight the best deal.
    store_prices.sort(key=lambda sp: sp.price)

    data = ProductWithPrices(
        id=product.id,
        name=product.name,
        brand=product.brand,
        category=product.category,
        size=product.size,
        image_url=product.image_url,
        prices=store_prices,
    )
    if store_prices:
        cheapest = store_prices[0]
        highest = store_prices[-1]
        data.cheapest_store = cheapest.store
        data.cheapest_price = cheapest.price
        data.highest_price = highest.price
        data.potential_saving = round(highest.price - cheapest.price, 2)
    return data


@router.get("", response_model=list[ProductOut])
def search_products(
    q: str = Query("", description="Search text matched against product name"),
    category: str = Query("", description="Filter by category"),
    db: Session = Depends(get_db),
):
    """Search/browse products. Empty query returns everything (browse mode)."""
    query = db.query(Product)
    if q:
        query = query.filter(Product.name.ilike(f"%{q}%"))
    if category:
        query = query.filter(Product.category == category)
    return query.order_by(Product.name).limit(100).all()


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(Product.category).distinct().all()
    return sorted({r[0] for r in rows if r[0]})


@router.get("/{product_id}", response_model=ProductWithPrices)
def product_detail(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return build_comparison(product)
