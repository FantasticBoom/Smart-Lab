import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
import openpyxl
from io import BytesIO
import re
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models.lab_schedule import LabSchedule
from app.models.lab import Lab
from app.models.user import User
from app.schemas.lab_schedule import LabScheduleCreate, LabScheduleUpdate, LabScheduleOut

router = APIRouter()

@router.get("/labs")
def get_labs_with_schedules(db: Session = Depends(get_db)):
    # Returns list of labs with their types and schedule count
    labs = db.query(
        Lab.id, 
        Lab.name, 
        Lab.location,
        func.count(LabSchedule.id).label("schedule_count")
    ).outerjoin(LabSchedule).group_by(Lab.id).all()
    
    result = []
    for lab in labs:
        # Get category slug manually since we didn't join it to keep it simple, or we can just return what we have
        # Let's fetch full lab object to get category slug
        full_lab = db.query(Lab).filter(Lab.id == lab.id).first()
        result.append({
            "id": lab.id,
            "name": lab.name,
            "location": lab.location,
            "type_slug": full_lab.type,
            "schedule_count": lab.schedule_count
        })
    return result

@router.get("/all")
def get_all_schedules(db: Session = Depends(get_db)):
    # Returns all schedules with lab info
    schedules = db.query(LabSchedule).join(Lab).order_by(Lab.name, LabSchedule.day_of_week, LabSchedule.start_time).all()
    
    return [{
        "id": s.id,
        "lab_id": s.lab_id,
        "lab_name": s.lab.name,
        "location": s.lab.location,
        "day_of_week": s.day_of_week,
        "start_time": s.start_time,
        "end_time": s.end_time,
        "subject": s.subject,
        "lecturer": s.lecturer
    } for s in schedules]

@router.get("/labs/{lab_id}", response_model=List[LabScheduleOut])
def get_lab_schedules(lab_id: uuid.UUID, db: Session = Depends(get_db)):
    schedules = db.query(LabSchedule).filter(LabSchedule.lab_id == lab_id).all()
    return schedules

@router.post("/", response_model=LabScheduleOut)
def create_schedule(
    schedule_in: LabScheduleCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lab = db.query(Lab).filter(Lab.id == schedule_in.lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found")
        
    db_schedule = LabSchedule(**schedule_in.model_dump())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@router.put("/{schedule_id}", response_model=LabScheduleOut)
def update_schedule(
    schedule_id: uuid.UUID,
    schedule_in: LabScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_schedule = db.query(LabSchedule).filter(LabSchedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    update_data = schedule_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_schedule, field, value)
        
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_schedule = db.query(LabSchedule).filter(LabSchedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    db.delete(db_schedule)
    db.commit()
    return {"detail": "Schedule deleted successfully"}

def parse_waktu(waktu_str):
    # Example format: "Senin 08:00 - 10:00" or "Senin, 08.00-10.00"
    waktu_str = str(waktu_str).strip()
    # Try to extract day and time range using regex
    match = re.match(r"([A-Za-z]+)[\s,]+(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})", waktu_str)
    if match:
        day = match.group(1).capitalize()
        start_time_str = match.group(2).replace('.', ':')
        end_time_str = match.group(3).replace('.', ':')
        
        # Ensure HH:MM format
        if len(start_time_str.split(':')[0]) == 1:
            start_time_str = "0" + start_time_str
        if len(end_time_str.split(':')[0]) == 1:
            end_time_str = "0" + end_time_str
            
        start_time = datetime.strptime(start_time_str, "%H:%M").time()
        end_time = datetime.strptime(end_time_str, "%H:%M").time()
        
        return day, start_time, end_time
    return None, None, None

@router.post("/upload")
def upload_schedule(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")
        
    try:
        contents = file.file.read()
        wb = openpyxl.load_workbook(BytesIO(contents))
        sheet = wb.active
        
        # Assume headers are on first row: No, Nama Lab, Waktu, Mata Kuliah, Dosen Pengampu
        # Let's find column indexes
        headers = [str(cell.value).lower().strip() for cell in sheet[1]]
        
        try:
            lab_idx = next(i for i, h in enumerate(headers) if 'lab' in h)
            waktu_idx = next(i for i, h in enumerate(headers) if 'waktu' in h)
            matkul_idx = next(i for i, h in enumerate(headers) if 'mata kuliah' in h or 'matkul' in h)
            dosen_idx = next(i for i, h in enumerate(headers) if 'dosen' in h)
        except StopIteration:
            raise HTTPException(status_code=400, detail="Format Excel tidak sesuai. Pastikan ada kolom Nama Lab, Waktu, Mata Kuliah, Dosen Pengampu")
            
        added_count = 0
        skipped_count = 0
        errors = []
        
        # Cache lab lookups
        labs_cache = {lab.name.lower(): lab for lab in db.query(Lab).all()}
        
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not any(row):  # Skip empty rows
                continue
                
            lab_name = str(row[lab_idx]).strip() if row[lab_idx] else None
            waktu = row[waktu_idx]
            matkul = str(row[matkul_idx]).strip() if row[matkul_idx] else None
            dosen = str(row[dosen_idx]).strip() if row[dosen_idx] else None
            
            if not all([lab_name, waktu, matkul, dosen]):
                skipped_count += 1
                errors.append(f"Baris {row_idx}: Data tidak lengkap")
                continue
                
            day, start_time, end_time = parse_waktu(waktu)
            if not day:
                skipped_count += 1
                errors.append(f"Baris {row_idx}: Format waktu salah ({waktu}). Gunakan format 'Senin 08:00 - 10:00'")
                continue
                
            lab = labs_cache.get(lab_name.lower())
            if not lab:
                # Try exact match or partial match
                lab = db.query(Lab).filter(Lab.name.ilike(f"%{lab_name}%")).first()
                if not lab:
                    skipped_count += 1
                    errors.append(f"Baris {row_idx}: Lab '{lab_name}' tidak ditemukan")
                    continue
                labs_cache[lab_name.lower()] = lab
                
            # Create schedule
            db_schedule = LabSchedule(
                lab_id=lab.id,
                day_of_week=day,
                start_time=start_time,
                end_time=end_time,
                subject=matkul,
                lecturer=dosen
            )
            db.add(db_schedule)
            added_count += 1
            
        db.commit()
        
        return {
            "detail": f"Berhasil mengupload {added_count} jadwal. Gagal/Dilewati: {skipped_count}",
            "added": added_count,
            "errors": errors
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan saat memproses file: {str(e)}")
