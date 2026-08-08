import uuid
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password

def seed():
    db = SessionLocal()
    existing_admin = db.query(User).filter(User.username == "admin").first()
    if not existing_admin:
        admin = User(
            id=uuid.uuid4(),
            username="admin",
            password_hash=hash_password("admin123"),
            role=UserRole.superadmin
        )
        db.add(admin)
        db.commit()
        print("Superadmin user created successfully: username 'admin', password 'admin123'")
    else:
        print("Superadmin user already exists")
    db.close()

if __name__ == "__main__":
    seed()
