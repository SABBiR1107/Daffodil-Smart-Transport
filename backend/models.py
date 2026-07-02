from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    university_id = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="student") # student, faculty, driver, admin
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bookings = relationship("Booking", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class Bus(Base):
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    capacity = Column(Integer, default=40)
    status = Column(String, default="active") # active, inactive, maintenance
    seats = Column(String, default="A1,A2,A3,A4,B1,B2,B3,B4,C1,C2,C3,C4,D1,D2,D3,D4")
    
    trips = relationship("Trip", back_populates="bus")

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # e.g., DSA - Mirpur
    start_point = Column(String)
    end_point = Column(String)

    trips = relationship("Trip", back_populates="route")

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(Integer, ForeignKey("buses.id"))
    driver_id = Column(Integer, ForeignKey("users.id"))
    route_id = Column(Integer, ForeignKey("routes.id"))
    departure_time = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="scheduled") # scheduled, active, completed
    
    # Live tracking info (could also be in a separate real-time table/cache)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    speed = Column(Integer, default=0)

    bus = relationship("Bus", back_populates="trips")
    route = relationship("Route", back_populates="trips")
    driver = relationship("User")
    bookings = relationship("Booking", back_populates="trip")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    seat_number = Column(String)
    status = Column(String, default="confirmed") # confirmed, cancelled, seated

    trip = relationship("Trip", back_populates="bookings")
    user = relationship("User", back_populates="bookings")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")

class Knock(Base):
    __tablename__ = "knocks"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending") # pending, accepted, ignored
    distance = Column(Float) # in km
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip")
    user = relationship("User")

class MaintenanceReport(Base):
    __tablename__ = "maintenance_reports"

    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(Integer, ForeignKey("buses.id"))
    reported_by = Column(Integer, ForeignKey("users.id"))
    issue_description = Column(String)
    status = Column(String, default="pending") # pending, resolved
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bus = relationship("Bus")
    reporter = relationship("User")
