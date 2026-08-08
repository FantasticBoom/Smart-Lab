import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class StatusPenanganan(str, enum.Enum):
    perlu_perbaikan = "perlu_perbaikan"
    telah_diperbaiki = "telah_diperbaiki"
    alat_baru = "alat_baru"


class BeritaAcara(Base):
    __tablename__ = "berita_acara"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), nullable=True, index=True)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=True, index=True)
    lab_id = Column(UUID(as_uuid=True), ForeignKey("labs.id"), nullable=False, index=True)

    keterangan_kerusakan = Column(String, nullable=False)
    keterangan_perbaikan = Column(String, nullable=True)

    status_penanganan = Column(
        Enum(StatusPenanganan),
        nullable=False,
        default=StatusPenanganan.perlu_perbaikan
    )

    tanggal_lapor = Column(DateTime, default=datetime.utcnow, nullable=False)
    tanggal_selesai = Column(DateTime, nullable=True)

    # Relationships
    inventory_item = relationship("InventoryItem", backref="berita_acara")
    device = relationship("Device", backref="berita_acara")
    lab = relationship("Lab", backref="berita_acara")
