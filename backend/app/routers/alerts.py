"""Price-alert endpoints. Users set a target price; a background job (future work)
checks prices and sends a push notification when the target is met."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import PriceAlert, User
from ..schemas import AlertCreate, AlertOut

router = APIRouter(prefix="/alerts", tags=["price-alerts"])


@router.get("", response_model=list[AlertOut])
def list_alerts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(PriceAlert).filter(PriceAlert.user_id == user.id).all()


@router.post("", response_model=AlertOut)
def create_alert(
    body: AlertCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = PriceAlert(
        user_id=user.id, product_id=body.product_id, target_price=body.target_price
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = (
        db.query(PriceAlert)
        .filter(PriceAlert.id == alert_id, PriceAlert.user_id == user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"ok": True}
