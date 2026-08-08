from sqlalchemy.orm import declarative_base

Base = declarative_base()

from app.models.lab import Lab
from app.models.lab_category import LabCategory
from app.models.device import Device
from app.models.inventory_item import InventoryItem
from app.models.lab_schedule import LabSchedule
