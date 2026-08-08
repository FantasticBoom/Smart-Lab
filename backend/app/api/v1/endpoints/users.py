import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.models.user import User, UserRole
from app.core.security import hash_password

router = APIRouter()

@router.get("/", response_model=List[UserOut], dependencies=[Depends(require_role(["superadmin"]))])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=UserOut, dependencies=[Depends(require_role(["superadmin"]))])
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if username exists
    user = db.query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )
    
    user = User(
        username=user_in.username,
        password_hash=hash_password(user_in.password),
        role=user_in.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserOut, dependencies=[Depends(require_role(["superadmin"]))])
def update_user(user_id: uuid.UUID, user_in: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_in.username is not None:
        # Check if new username conflicts
        existing_user = db.query(User).filter(User.username == user_in.username).first()
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=400, detail="Username already exists")
        user.username = user_in.username
        
    if user_in.password is not None:
        user.password_hash = hash_password(user_in.password)
        
    if user_in.role is not None:
        user.role = user_in.role
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", response_model=dict)
def delete_user(
    user_id: uuid.UUID, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["superadmin"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent superadmin from deleting themselves if they are the only superadmin
    if user.id == current_user.id:
        superadmin_count = db.query(User).filter(User.role == UserRole.superadmin.value).count()
        if superadmin_count <= 1:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete the only remaining superadmin account"
            )
            
    db.delete(user)
    db.commit()
    return {"detail": "User deleted successfully"}
