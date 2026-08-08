import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.lab import Lab
from app.models.lab_borrowing import LabBorrowing, LabBorrowingMember, BorrowingStatus
from app.models.lab_schedule import LabSchedule
from app.schemas.lab_borrowing import LabBorrowingCreate, LabBorrowingResponse, LabBorrowingUpdateStatus
from app.services.email_service import send_approval_email, send_rejection_email
from app.services.pdf_generator import generate_approval_pdf

router = APIRouter()

@router.get("/public/labs")
def get_public_labs(type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Lab.id, Lab.name, Lab.type).filter(Lab.is_active == True)
    if type:
        query = query.filter(Lab.type == type)
    labs = query.all()
    return [{"id": l.id, "name": l.name, "type": l.type} for l in labs]

@router.post("/", response_model=LabBorrowingResponse)
def create_borrowing(
    borrowing_in: LabBorrowingCreate,
    db: Session = Depends(get_db)
):
    # Option B: Check for conflicts with approved bookings
    conflicts = db.query(LabBorrowing).filter(
        LabBorrowing.lab_name == borrowing_in.lab_name,
        LabBorrowing.status == BorrowingStatus.approved,
        LabBorrowing.start_datetime < borrowing_in.end_datetime,
        LabBorrowing.end_datetime > borrowing_in.start_datetime
    ).first()
    
    if conflicts:
        raise HTTPException(
            status_code=400, 
            detail="Jadwal peminjaman bentrok dengan peminjaman lain yang sudah disetujui."
        )
        
    # Check for conflicts with Master Schedules
    DAYS_ID = {0: "Senin", 1: "Selasa", 2: "Rabu", 3: "Kamis", 4: "Jumat", 5: "Sabtu", 6: "Minggu"}
    day_of_week_str = DAYS_ID.get(borrowing_in.start_datetime.weekday())
    req_start_time = borrowing_in.start_datetime.time()
    req_end_time = borrowing_in.end_datetime.time()

    lab = db.query(Lab).filter(Lab.name == borrowing_in.lab_name).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab tidak ditemukan.")

    schedule_conflict = db.query(LabSchedule).filter(
        LabSchedule.lab_id == lab.id,
        LabSchedule.day_of_week == day_of_week_str,
        LabSchedule.start_time < req_end_time,
        LabSchedule.end_time > req_start_time
    ).first()

    if schedule_conflict:
        raise HTTPException(
            status_code=400,
            detail="Maaf, jadwal peminjaman bentrok dengan kegiatan perkuliahan/reguler di Lab tersebut."
        )
        
    new_borrowing = LabBorrowing(
        user_npm=borrowing_in.user_npm,
        user_name=borrowing_in.user_name,
        user_email=borrowing_in.user_email,
        num_people=borrowing_in.num_people,
        lab_type=borrowing_in.lab_type,
        lab_name=borrowing_in.lab_name,
        start_datetime=borrowing_in.start_datetime,
        end_datetime=borrowing_in.end_datetime,
        purpose=borrowing_in.purpose,
        is_urgent=borrowing_in.is_urgent,
        status=BorrowingStatus.pending
    )
    
    db.add(new_borrowing)
    db.flush() # flush to get the id
    
    # Add members if any
    for member_in in borrowing_in.members:
        member = LabBorrowingMember(
            lab_borrowing_id=new_borrowing.id,
            npm=member_in.npm,
            name=member_in.name
        )
        db.add(member)
        
    db.commit()
    db.refresh(new_borrowing)
    return new_borrowing

@router.get("/", response_model=List[LabBorrowingResponse])
def get_borrowings(
    skip: int = 0,
    limit: int = 100,
    status: Optional[BorrowingStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(LabBorrowing).order_by(LabBorrowing.created_at.desc())
    if status:
        query = query.filter(LabBorrowing.status == status)
    return query.offset(skip).limit(limit).all()

@router.put("/{borrowing_id}/status", response_model=LabBorrowingResponse)
def update_status(
    borrowing_id: uuid.UUID,
    status_update: LabBorrowingUpdateStatus,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    borrowing = db.query(LabBorrowing).filter(LabBorrowing.id == borrowing_id).first()
    if not borrowing:
        raise HTTPException(status_code=404, detail="Peminjaman tidak ditemukan")
        
    borrowing.status = status_update.status
    
    if status_update.status == BorrowingStatus.approved:
        # Generate Booking ID (e.g. BKG-20231015-XYZ)
        date_str = datetime.datetime.now().strftime("%Y%m%d")
        unique_suffix = str(borrowing.id)[:4].upper()
        borrowing.booking_id = f"BKG-{date_str}-{unique_suffix}"
        
        # Prepare background task for PDF and email
        booking_data = {
            "booking_id": borrowing.booking_id,
            "user_name": borrowing.user_name,
            "user_npm": borrowing.user_npm,
            "lab_type": borrowing.lab_type,
            "lab_name": borrowing.lab_name,
            "start_datetime": borrowing.start_datetime,
            "end_datetime": borrowing.end_datetime,
            "purpose": borrowing.purpose,
            "num_people": borrowing.num_people
        }
        
        # Hardcode domain for now or get from env
        verification_url = f"http://localhost:5173/verify/{borrowing.booking_id}"
        
        def process_approval():
            pdf_bytes = generate_approval_pdf(booking_data, verification_url)
            send_approval_email(borrowing.user_email, borrowing.user_name, borrowing.lab_name, pdf_bytes)
            
        background_tasks.add_task(process_approval)
        
    elif status_update.status == BorrowingStatus.rejected:
        background_tasks.add_task(send_rejection_email, borrowing.user_email, borrowing.user_name)
        
    db.commit()
    db.refresh(borrowing)
    return borrowing

@router.get("/verify/{booking_id}", response_model=LabBorrowingResponse)
def verify_booking(
    booking_id: str,
    db: Session = Depends(get_db)
):
    borrowing = db.query(LabBorrowing).filter(
        LabBorrowing.booking_id == booking_id,
        LabBorrowing.status == BorrowingStatus.approved
    ).first()
    
    if not borrowing:
        raise HTTPException(status_code=404, detail="Booking tidak ditemukan atau tidak valid")
        
    return borrowing
