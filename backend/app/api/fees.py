from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.core.permissions import get_current_user, require_warden
from app.models.models import FeeRecord, StudentProfile, User
from app.schemas.schemas import FeeRecordOut, FeeRecordCreate, FeeRecordUpdate, FeePaymentCreate

router = APIRouter(prefix="/fees", tags=["Fees & Payments"])

@router.get("", response_model=List[FeeRecordOut])
@router.get("/", response_model=List[FeeRecordOut], include_in_schema=False)
def list_fees(
    status_filter: Optional[str] = None,
    fee_type: Optional[str] = None,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "student":
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not student_profile:
            return []
        query = db.query(FeeRecord).join(StudentProfile).filter(FeeRecord.student_id == student_profile.id)
    elif current_user.role in ("warden", "admin"):
        # Warden manages fees; Admin has read-only oversight to monitor collected vs pending
        query = db.query(FeeRecord).join(StudentProfile)
        if student_id:
            query = query.filter(FeeRecord.student_id == student_id)
        if status_filter:
            query = query.filter(FeeRecord.status == status_filter)
        if fee_type:
            query = query.filter(FeeRecord.fee_type == fee_type)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Accounts Staff must not create, edit, collect, or update fees."
        )

    fees = query.order_by(FeeRecord.due_date.desc(), FeeRecord.id.desc()).all()
    results = []
    for f in fees:
        results.append(FeeRecordOut(
            id=f.id,
            student_id=f.student_id,
            student_name=f.student.full_name if f.student else None,
            fee_type=f.fee_type,
            amount_due=float(f.amount_due),
            amount_paid=float(f.amount_paid),
            due_date=f.due_date,
            status=f.status,
            payment_date=f.payment_date,
            payment_method=f.payment_method,
            receipt_no=f.receipt_no,
            notes=f.notes,
            created_at=f.created_at
        ))
    return results

@router.post("", response_model=FeeRecordOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=FeeRecordOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_fee_record(
    data: FeeRecordCreate,
    db: Session = Depends(get_db),
    warden_user: User = Depends(require_warden)
):
    student = db.query(StudentProfile).filter(StudentProfile.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student ID #{data.student_id} not found.")

    try:
        fee = FeeRecord(
            student_id=data.student_id,
            fee_type=data.fee_type.strip(),
            amount_due=data.amount_due,
            amount_paid=0.00,
            due_date=data.due_date,
            status="pending",
            notes=data.notes.strip() if data.notes else None
        )
        db.add(fee)
        db.commit()
        db.refresh(fee)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error saving fee record: {str(e)}")

    return FeeRecordOut(
        id=fee.id,
        student_id=fee.student_id,
        student_name=student.full_name,
        fee_type=fee.fee_type,
        amount_due=float(fee.amount_due),
        amount_paid=float(fee.amount_paid),
        due_date=fee.due_date,
        status=fee.status,
        payment_date=fee.payment_date,
        payment_method=fee.payment_method,
        receipt_no=fee.receipt_no,
        notes=fee.notes,
        created_at=fee.created_at
    )

@router.put("/{fee_id}", response_model=FeeRecordOut)
def update_fee_record(
    fee_id: int,
    data: FeeRecordUpdate,
    db: Session = Depends(get_db),
    warden_user: User = Depends(require_warden)
):
    fee = db.query(FeeRecord).filter(FeeRecord.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fee record not found.")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(fee, field, val)

    db.commit()
    db.refresh(fee)

    return FeeRecordOut(
        id=fee.id,
        student_id=fee.student_id,
        student_name=fee.student.full_name if fee.student else None,
        fee_type=fee.fee_type,
        amount_due=float(fee.amount_due),
        amount_paid=float(fee.amount_paid),
        due_date=fee.due_date,
        status=fee.status,
        payment_date=fee.payment_date,
        payment_method=fee.payment_method,
        receipt_no=fee.receipt_no,
        notes=fee.notes,
        created_at=fee.created_at
    )

@router.post("/{fee_id}/pay", response_model=FeeRecordOut)
@router.post("/{fee_id}/pay/", response_model=FeeRecordOut, include_in_schema=False)
def record_payment(
    fee_id: int,
    data: FeePaymentCreate,
    db: Session = Depends(get_db),
    warden_user: User = Depends(require_warden)
):
    fee = db.query(FeeRecord).filter(FeeRecord.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Fee record #{fee_id} not found.")

    new_total_paid = float(fee.amount_paid) + float(data.amount_paying)
    if new_total_paid > float(fee.amount_due):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount exceeds outstanding due ({float(fee.amount_due) - float(fee.amount_paid):.2f})."
        )
    
    try:
        fee.amount_paid = new_total_paid
        fee.payment_date = datetime.utcnow()
        fee.payment_method = data.payment_method.strip()
        if data.receipt_no:
            fee.receipt_no = data.receipt_no.strip()
        if data.notes:
            fee.notes = f"{fee.notes or ''}\n{data.notes.strip()}".strip()

        if fee.amount_paid >= fee.amount_due:
            fee.status = "paid"
        else:
            fee.status = "partial"

        db.commit()
        db.refresh(fee)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error recording payment: {str(e)}")

    return FeeRecordOut(
        id=fee.id,
        student_id=fee.student_id,
        student_name=fee.student.full_name if fee.student else None,
        fee_type=fee.fee_type,
        amount_due=float(fee.amount_due),
        amount_paid=float(fee.amount_paid),
        due_date=fee.due_date,
        status=fee.status,
        payment_date=fee.payment_date,
        payment_method=fee.payment_method,
        receipt_no=fee.receipt_no,
        notes=fee.notes,
        created_at=fee.created_at
    )
    db.refresh(fee)

    return FeeRecordOut(
        id=fee.id,
        student_id=fee.student_id,
        student_name=fee.student.full_name if fee.student else None,
        fee_type=fee.fee_type,
        amount_due=float(fee.amount_due),
        amount_paid=float(fee.amount_paid),
        due_date=fee.due_date,
        status=fee.status,
        payment_date=fee.payment_date,
        payment_method=fee.payment_method,
        receipt_no=fee.receipt_no,
        notes=fee.notes,
        created_at=fee.created_at
    )
