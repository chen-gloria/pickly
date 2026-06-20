"""Favorite products endpoints (per logged-in user)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Favorite, User
from ..schemas import FavoriteCreate, ProductOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[ProductOut])
def list_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favs = db.query(Favorite).filter(Favorite.user_id == user.id).all()
    return [f.product for f in favs]


@router.post("")
def add_favorite(
    body: FavoriteCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exists = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id, Favorite.product_id == body.product_id)
        .first()
    )
    if not exists:
        db.add(Favorite(user_id=user.id, product_id=body.product_id))
        db.commit()
    return {"ok": True}


@router.delete("/{product_id}")
def remove_favorite(
    product_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == user.id, Favorite.product_id == product_id)
        .first()
    )
    if not fav:
        raise HTTPException(status_code=404, detail="Not in favorites")
    db.delete(fav)
    db.commit()
    return {"ok": True}
