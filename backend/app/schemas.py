"""Pydantic schemas: define the shape of data going in and out of the API."""
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict


# ---------- Auth ----------
class SignupRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    name: str


# ---------- Stores & products ----------
class StoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    color: str


class StorePrice(BaseModel):
    """One store's price for a product, used in the comparison view."""
    store: StoreOut
    price: float
    on_special: bool


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    brand: str
    category: str
    size: str
    image_url: str


class ProductWithPrices(ProductOut):
    """Product detail: includes every store's price, plus the savings summary."""
    prices: list[StorePrice]
    cheapest_store: Optional[StoreOut] = None
    cheapest_price: Optional[float] = None
    highest_price: Optional[float] = None
    potential_saving: Optional[float] = None  # highest - cheapest


# ---------- Shopping list ----------
class ListItemCreate(BaseModel):
    product_id: int
    quantity: int = 1


class ListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    quantity: int
    checked: bool
    product: ProductOut


# ---------- Favorites ----------
class FavoriteCreate(BaseModel):
    product_id: int


# ---------- Price alerts ----------
class AlertCreate(BaseModel):
    product_id: int
    target_price: float


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    target_price: float
    active: bool
    product: ProductOut
