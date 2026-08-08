import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.schemas.lab_category import LabCategoryCreate, LabCategoryUpdate, LabCategoryOut
from app.models.lab_category import LabCategory
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[LabCategoryOut])
def read_lab_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    categories = db.query(LabCategory).offset(skip).limit(limit).all()
    return categories

@router.post("/", response_model=LabCategoryOut)
def create_lab_category(
    category_in: LabCategoryCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = db.query(LabCategory).filter(LabCategory.slug == category_in.slug).first()
    if category:
        raise HTTPException(status_code=400, detail="Category with this slug already exists")
    
    new_category = LabCategory(
        name=category_in.name,
        slug=category_in.slug
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@router.put("/{category_id}", response_model=LabCategoryOut)
def update_lab_category(
    category_id: uuid.UUID,
    category_in: LabCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = db.query(LabCategory).filter(LabCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if category_in.slug:
        existing = db.query(LabCategory).filter(LabCategory.slug == category_in.slug, LabCategory.id != category_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another category with this slug already exists")
    
    update_data = category_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
        
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}")
def delete_lab_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = db.query(LabCategory).filter(LabCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    db.delete(category)
    db.commit()
    return {"detail": "Category deleted successfully"}
