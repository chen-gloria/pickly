"""Shopping list endpoints (per logged-in user)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import ShoppingListItem, User
from ..schemas import ListItemCreate, ListItemOut

router = APIRouter(prefix="/list", tags=["shopping-list"])


@router.get("", response_model=list[ListItemOut])
def get_list(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ShoppingListItem).filter(ShoppingListItem.user_id == user.id).all()


@router.post("", response_model=ListItemOut)
def add_item(
    body: ListItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # If the product is already on the list, just bump the quantity.
    item = (
        db.query(ShoppingListItem)
        .filter(
            ShoppingListItem.user_id == user.id,
            ShoppingListItem.product_id == body.product_id,
        )
        .first()
    )
    if item:
        item.quantity += body.quantity
    else:
        item = ShoppingListItem(
            user_id=user.id, product_id=body.product_id, quantity=body.quantity
        )
        db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}/toggle", response_model=ListItemOut)
def toggle_checked(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, user, db)
    item.checked = not item.checked
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, user, db)
    db.delete(item)
    db.commit()
    return {"ok": True}


def _get_owned_item(item_id: int, user: User, db: Session) -> ShoppingListItem:
    item = (
        db.query(ShoppingListItem)
        .filter(ShoppingListItem.id == item_id, ShoppingListItem.user_id == user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
