from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    university_id: str
    role: str = "student"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    university_id: Optional[str] = None


class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Bus Schemas ---
class BusBase(BaseModel):
    name: str
    capacity: int = 40
    status: str = "active"
    seats: Optional[str] = "A1,A2,A3,A4,B1,B2,B3,B4,C1,C2,C3,C4,D1,D2,D3,D4"

class BusCreate(BusBase):
    pass

class BusUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None

class Bus(BusBase):
    id: int

    class Config:
        from_attributes = True

# --- Route Schemas ---
class RouteBase(BaseModel):
    name: str
    start_point: str
    end_point: str

class RouteCreate(RouteBase):
    pass

class RouteUpdate(BaseModel):
    name: Optional[str] = None
    start_point: Optional[str] = None
    end_point: Optional[str] = None

class Route(RouteBase):
    id: int

    class Config:
        from_attributes = True

# --- Trip Schemas ---
class TripBase(BaseModel):
    bus_id: int
    driver_id: int
    route_id: int
    departure_time: datetime
    started_at: Optional[datetime] = None
    status: str = "scheduled"

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    bus_id: Optional[int] = None
    driver_id: Optional[int] = None
    route_id: Optional[int] = None
    departure_time: Optional[datetime] = None
    status: Optional[str] = None

class Trip(TripBase):
    id: int
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    speed: int = 0

    class Config:
        from_attributes = True

# --- Booking Schemas ---
class BookingBase(BaseModel):
    trip_id: int
    seat_number: str

class BookingCreate(BookingBase):
    user_id: int # Often derived from auth token, but explicit here for simplicity

class Booking(BookingBase):
    id: int
    user_id: int
    status: str

    class Config:
        from_attributes = True

# --- Knock Schemas ---
class KnockBase(BaseModel):
    trip_id: int
    user_id: int
    distance: float
    status: str = "pending"

class KnockCreate(KnockBase):
    pass

class KnockUpdate(BaseModel):
    status: str

class Knock(KnockBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationBase(BaseModel):
    user_id: int
    message: str
    is_read: bool = False

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Detailed Schemas for Enriched Responses ---
class Route(RouteBase):
    id: int
    
    class Config:
        from_attributes = True

class TripDetail(BaseModel):
    id: int
    bus: Bus
    route: Route
    driver: Optional[User] = None
    departure_time: datetime
    started_at: Optional[datetime] = None
    status: str
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    speed: int

    class Config:
        from_attributes = True

class BookingDetail(BaseModel):
    id: int
    trip: TripDetail
    user: User
    seat_number: str
    status: str

    class Config:
        from_attributes = True

# --- Maintenance Report Schemas ---
class MaintenanceReportBase(BaseModel):
    bus_id: int
    issue_description: str

class MaintenanceReportCreate(MaintenanceReportBase):
    reported_by: int

class MaintenanceReport(MaintenanceReportBase):
    id: int
    reported_by: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
