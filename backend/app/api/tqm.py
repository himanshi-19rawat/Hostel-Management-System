from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_admin, require_admin_or_warden, require_management
from app.models.models import (
    User, TqmVoC, TqmCtq, TqmSipoc, TqmFmea, TqmDefect, TqmPdca
)
from app.schemas.schemas import (
    TqmVoCCreate, TqmVoCOut,
    TqmCtqCreate, TqmCtqOut,
    TqmSipocCreate, TqmSipocOut,
    TqmFmeaCreate, TqmFmeaOut,
    TqmDefectCreate, TqmDefectUpdate, TqmDefectOut,
    TqmPdcaCreate, TqmPdcaUpdate, TqmPdcaOut,
)

router = APIRouter(prefix="/tqm", tags=["TQM Quality Framework & Usability"])

# ========================================================
# 1. Voice of Customer (VoC) / Usability Evidence
# ========================================================

@router.get("/voc", response_model=List[TqmVoCOut])
def list_voc_feedback(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TqmVoC)

    if current_user.role == "student":
        # Students see only own VoC evidence
        query = query.filter(TqmVoC.user_id == current_user.id)
    elif current_user.role == "accounts_staff":
        query = query.filter(TqmVoC.stakeholder_type.in_(["staff", "admin"]))

    if category:
        query = query.filter(TqmVoC.feedback_category == category)

    return query.order_by(TqmVoC.created_at.desc()).all()

@router.post("/voc", response_model=TqmVoCOut, status_code=status.HTTP_201_CREATED)
def submit_voc_feedback(
    data: TqmVoCCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure stakeholder type matches user role
    stakeholder = current_user.role
    if stakeholder == "accounts_staff":
        stakeholder = "staff"

    voc = TqmVoC(
        user_id=current_user.id,
        stakeholder_type=stakeholder,
        feedback_category=data.feedback_category,
        customer_verbatim=data.customer_verbatim,
        key_issue=data.key_issue,
        satisfaction_rating=data.satisfaction_rating,
        usability_metric=data.usability_metric,
    )
    db.add(voc)
    db.commit()
    db.refresh(voc)
    return voc


# ========================================================
# 2. Critical to Quality (CTQ) Parameters
# ========================================================

@router.get("/ctq", response_model=List[TqmCtqOut])
def list_ctq_parameters(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    return db.query(TqmCtq).order_by(TqmCtq.id.asc()).all()

@router.post("/ctq", response_model=TqmCtqOut, status_code=status.HTTP_201_CREATED)
def create_ctq_parameter(
    data: TqmCtqCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    ctq = TqmCtq(
        need_statement=data.need_statement,
        quality_driver=data.quality_driver,
        ctq_metric=data.ctq_metric,
        target_specification=data.target_specification,
        lower_limit=data.lower_limit,
        upper_limit=data.upper_limit,
        created_by=admin.id,
    )
    db.add(ctq)
    db.commit()
    db.refresh(ctq)
    return ctq

@router.delete("/ctq/{ctq_id}")
def delete_ctq_parameter(
    ctq_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    ctq = db.query(TqmCtq).filter(TqmCtq.id == ctq_id).first()
    if not ctq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CTQ parameter not found")
    db.delete(ctq)
    db.commit()
    return {"message": "CTQ parameter deleted"}


# ========================================================
# 3. SIPOC Process Mapping
# ========================================================

@router.get("/sipoc", response_model=List[TqmSipocOut])
def list_sipoc_maps(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_warden)
):
    return db.query(TqmSipoc).order_by(TqmSipoc.id.asc()).all()

@router.post("/sipoc", response_model=TqmSipocOut, status_code=status.HTTP_201_CREATED)
def create_sipoc_map(
    data: TqmSipocCreate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    sipoc = TqmSipoc(
        process_name=data.process_name,
        supplier=data.supplier,
        inputs=data.inputs,
        process_steps=data.process_steps,
        outputs=data.outputs,
        customer=data.customer,
        created_by=manager.id,
    )
    db.add(sipoc)
    db.commit()
    db.refresh(sipoc)
    return sipoc

@router.delete("/sipoc/{sipoc_id}")
def delete_sipoc_map(
    sipoc_id: int,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    sipoc = db.query(TqmSipoc).filter(TqmSipoc.id == sipoc_id).first()
    if not sipoc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SIPOC process map not found")
    db.delete(sipoc)
    db.commit()
    return {"message": "SIPOC process map deleted"}


# ========================================================
# 4. FMEA with RPN (Failure Mode and Effects Analysis)
# ========================================================

@router.get("/fmea", response_model=List[TqmFmeaOut])
def list_fmea_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_management)
):
    # Students restricted; Admin, Warden, Staff can view risk register
    return db.query(TqmFmea).order_by(TqmFmea.rpn.desc()).all()

@router.post("/fmea", response_model=TqmFmeaOut, status_code=status.HTTP_201_CREATED)
def create_fmea_record(
    data: TqmFmeaCreate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    # Calculate Risk Priority Number: RPN = Severity * Occurrence * Detection
    calculated_rpn = data.severity * data.occurrence * data.detection

    fmea = TqmFmea(
        process_step=data.process_step,
        potential_failure_mode=data.potential_failure_mode,
        potential_effect=data.potential_effect,
        severity=data.severity,
        potential_cause=data.potential_cause,
        occurrence=data.occurrence,
        current_controls=data.current_controls,
        detection=data.detection,
        rpn=calculated_rpn,
        recommended_action=data.recommended_action,
        action_taken=data.action_taken,
        created_by=manager.id,
    )
    db.add(fmea)
    db.commit()
    db.refresh(fmea)
    return fmea

@router.delete("/fmea/{fmea_id}")
def delete_fmea_record(
    fmea_id: int,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    fmea = db.query(TqmFmea).filter(TqmFmea.id == fmea_id).first()
    if not fmea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FMEA record not found")
    db.delete(fmea)
    db.commit()
    return {"message": "FMEA record deleted"}


# ========================================================
# 5. Defect Logging & Remediation Tracking
# ========================================================

@router.get("/defects", response_model=List[TqmDefectOut])
def list_defects(
    defect_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TqmDefect)
    # Students and accounts staff can review only defects they submitted.
    # Administrators and wardens need the full register to manage remediation.
    if current_user.role in {"student", "accounts_staff"}:
        query = query.filter(TqmDefect.reported_by == current_user.id)
    if defect_type:
        query = query.filter(TqmDefect.defect_type == defect_type)
    if status_filter:
        query = query.filter(TqmDefect.status == status_filter)
    return query.order_by(TqmDefect.created_at.desc()).all()

@router.post("/defects", response_model=TqmDefectOut, status_code=status.HTTP_201_CREATED)
def log_defect(
    data: TqmDefectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    defect = TqmDefect(
        title=data.title,
        description=data.description,
        defect_type=data.defect_type,
        severity=data.severity,
        reported_by=current_user.id,
        status="logged",
    )
    db.add(defect)
    db.commit()
    db.refresh(defect)
    return defect

@router.put("/defects/{defect_id}", response_model=TqmDefectOut)
def update_defect_resolution(
    defect_id: int,
    data: TqmDefectUpdate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    defect = db.query(TqmDefect).filter(TqmDefect.id == defect_id).first()
    if not defect:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Defect not found")

    if data.root_cause is not None:
        defect.root_cause = data.root_cause
    if data.corrective_action is not None:
        defect.corrective_action = data.corrective_action
    if data.status is not None:
        defect.status = data.status

    db.commit()
    db.refresh(defect)
    return defect


# ========================================================
# 6. PDCA Continuous Improvement Cycles
# ========================================================

@router.get("/pdca", response_model=List[TqmPdcaOut])
def list_pdca_cycles(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_warden)
):
    query = db.query(TqmPdca)
    if status_filter:
        query = query.filter(TqmPdca.status == status_filter)
    return query.order_by(TqmPdca.created_at.desc()).all()

@router.post("/pdca", response_model=TqmPdcaOut, status_code=status.HTTP_201_CREATED)
def create_pdca_cycle(
    data: TqmPdcaCreate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    pdca = TqmPdca(
        cycle_name=data.cycle_name,
        target_objective=data.target_objective,
        plan_stage=data.plan_stage,
        do_stage=data.do_stage,
        check_stage=data.check_stage,
        act_stage=data.act_stage,
        status=data.status,
        created_by=manager.id,
    )
    db.add(pdca)
    db.commit()
    db.refresh(pdca)
    return pdca

@router.put("/pdca/{cycle_id}", response_model=TqmPdcaOut)
def update_pdca_cycle(
    cycle_id: int,
    data: TqmPdcaUpdate,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    pdca = db.query(TqmPdca).filter(TqmPdca.id == cycle_id).first()
    if not pdca:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDCA cycle not found")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(pdca, field, val)

    db.commit()
    db.refresh(pdca)
    return pdca

@router.delete("/pdca/{cycle_id}")
def delete_pdca_cycle(
    cycle_id: int,
    db: Session = Depends(get_db),
    manager: User = Depends(require_admin_or_warden)
):
    pdca = db.query(TqmPdca).filter(TqmPdca.id == cycle_id).first()
    if not pdca:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDCA cycle not found")
    db.delete(pdca)
    db.commit()
    return {"message": "PDCA cycle deleted"}
