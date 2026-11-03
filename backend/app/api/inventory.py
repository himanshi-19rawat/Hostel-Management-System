from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import require_admin_or_warden, require_warden
from app.models.models import MessInventory, User
from app.schemas.schemas import (
    MessInventoryCreate, MessInventoryUpdate, MessInventoryOut
)

router = APIRouter(prefix="/mess/inventory", tags=["Mess Inventory"])

@router.get("", response_model=List[MessInventoryOut])
@router.get("/", response_model=List[MessInventoryOut], include_in_schema=False)
def list_inventory(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_warden)
):
    """
    List mess inventory items.
    Accessible to Warden and Administrator (read-only oversight).
    Accounts Staff and Students are forbidden (HTTP 403).
    """
    query = db.query(MessInventory)
    if category:
        query = query.filter(MessInventory.category == category)
    
    items = query.order_by(MessInventory.category.asc(), MessInventory.item_name.asc()).all()
    results = []
    for item in items:
        results.append(MessInventoryOut(
            id=item.id,
            item_name=item.item_name,
            category=item.category,
            quantity=float(item.quantity),
            unit=item.unit,
            min_threshold=float(item.min_threshold) if item.min_threshold is not None else None,
            unit_price=float(item.unit_price) if item.unit_price is not None else None,
            notes=item.notes,
            updated_by=item.updated_by,
            created_at=item.created_at,
            updated_at=item.updated_at
        ))
    return results

@router.post("", response_model=MessInventoryOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=MessInventoryOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_inventory_item(
    data: MessInventoryCreate,
    db: Session = Depends(get_db),
    warden: User = Depends(require_warden)
):
    """
    Add a new real mess inventory item.
    Warden is the ONLY role permitted to add inventory items.
    """
    item_name_clean = data.item_name.strip()
    if not item_name_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Item name is required.")
    
    try:
        item = MessInventory(
            item_name=item_name_clean,
            category=data.category.strip(),
            quantity=data.quantity,
            unit=data.unit.strip(),
            min_threshold=data.min_threshold,
            unit_price=data.unit_price,
            notes=data.notes.strip() if data.notes else None,
            updated_by=warden.id
        )
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database save error for inventory item: {str(e)}"
        )

    return MessInventoryOut(
        id=item.id,
        item_name=item.item_name,
        category=item.category,
        quantity=float(item.quantity),
        unit=item.unit,
        min_threshold=float(item.min_threshold) if item.min_threshold is not None else None,
        unit_price=float(item.unit_price) if item.unit_price is not None else None,
        notes=item.notes,
        updated_by=item.updated_by,
        created_at=item.created_at,
        updated_at=item.updated_at
    )

@router.put("/{item_id}", response_model=MessInventoryOut)
@router.put("/{item_id}/", response_model=MessInventoryOut, include_in_schema=False)
def update_inventory_item(
    item_id: int,
    data: MessInventoryUpdate,
    db: Session = Depends(get_db),
    warden: User = Depends(require_warden)
):
    """
    Update mess inventory item details and stock quantities.
    Warden is the ONLY role permitted to edit or update inventory.
    """
    item = db.query(MessInventory).filter(MessInventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inventory item #{item_id} not found.")

    try:
        for field, val in data.model_dump(exclude_unset=True).items():
            if val is not None and isinstance(val, str):
                val = val.strip()
            setattr(item, field, val)

        item.updated_by = warden.id
        item.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(item)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update error for inventory item #{item_id}: {str(e)}"
        )

    return MessInventoryOut(
        id=item.id,
        item_name=item.item_name,
        category=item.category,
        quantity=float(item.quantity),
        unit=item.unit,
        min_threshold=float(item.min_threshold) if item.min_threshold is not None else None,
        unit_price=float(item.unit_price) if item.unit_price is not None else None,
        notes=item.notes,
        updated_by=item.updated_by,
        created_at=item.created_at,
        updated_at=item.updated_at
    )

@router.delete("/{item_id}")
@router.delete("/{item_id}/", include_in_schema=False)
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    warden: User = Depends(require_warden)
):
    """
    Delete a mess inventory item.
    Warden is the ONLY role permitted to delete inventory items.
    """
    item = db.query(MessInventory).filter(MessInventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inventory item #{item_id} not found.")

    try:
        db.delete(item)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database delete error for inventory item #{item_id}: {str(e)}"
        )
    return {"message": "Inventory item deleted successfully."}
