"""Database tables, defined as Python classes (SQLAlchemy ORM)."""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


def _now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=_now)


class Store(Base):
    """A supermarket, e.g. Woolworths, Coles, Aldi, IGA."""
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    color = Column(String, default="#888888")  # brand color for the UI


class Product(Base):
    """A grocery item, independent of which store sells it."""
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String, index=True, nullable=False)
    brand = Column(String, default="")
    category = Column(String, index=True, default="")
    size = Column(String, default="")          # e.g. "1L", "500g"
    image_url = Column(String, default="")

    prices = relationship("Price", back_populates="product", cascade="all, delete-orphan")


class Price(Base):
    """The price of one product at one store. This is what powers comparison."""
    __tablename__ = "prices"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    price = Column(Float, nullable=False)            # in dollars, e.g. 4.50
    on_special = Column(Boolean, default=False)
    source = Column(String, default="manual")        # where this price came from
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    product = relationship("Product", back_populates="prices")
    store = relationship("Store")

    __table_args__ = (UniqueConstraint("product_id", "store_id", name="uix_product_store"),)


class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    checked = Column(Boolean, default=False)

    product = relationship("Product")


class Favorite(Base):
    __tablename__ = "favorites"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    product = relationship("Product")
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uix_user_fav"),)


class PriceAlert(Base):
    __tablename__ = "price_alerts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    target_price = Column(Float, nullable=False)
    active = Column(Boolean, default=True)

    product = relationship("Product")
