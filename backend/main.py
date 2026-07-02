from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta

import models, schemas, database
from database import engine, get_db

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Daffodil Smart Transport API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized Helper for Boarding Auto-Cancellation
def check_and_cancel_unboarded_bookings(trip_id: int, db: Session):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip or trip.status != "active" or not trip.started_at:
        return
    
    # Calculate elapsed time since start
    now = datetime.now(timezone.utc)
    # Ensure trip.started_at is timezone-aware for comparison
    started_at = trip.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
        
    elapsed_seconds = (now - started_at).total_seconds()
    if elapsed_seconds > 600:  # 10 minutes
        # Find all unboarded (confirmed but not seated/boarded/cancelled) bookings
        unboarded_bookings = db.query(models.Booking).filter(
            models.Booking.trip_id == trip_id,
            models.Booking.status == "confirmed"
        ).all()
        
        if unboarded_bookings:
            for booking in unboarded_bookings:
                booking.status = "cancelled"
                
                # Add notification for the passenger
                notif = models.Notification(
                    user_id=booking.user_id,
                    message=f"Your booking for seat {booking.seat_number} on Trip {trip_id} was auto-cancelled because you did not board in time."
                )
                db.add(notif)
            
            db.commit()

@app.get("/")
def read_root():
    return {"message": "Welcome to Daffodil Smart Transport API"}

# --- Users ---
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        # If user already exists, just return them to allow simple frontend sync
        return db_user
    
    fake_hashed_password = user.password + "notreallyhashed"
    new_user = models.User(
        name=user.name, 
        email=user.email, 
        university_id=user.university_id,
        role=user.role,
        hashed_password=fake_hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/", response_model=List[schemas.User])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.User).offset(skip).limit(limit).all()

@app.get("/users/email/{email}", response_model=schemas.User)
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- Buses ---
@app.post("/buses/", response_model=schemas.Bus)
def create_bus(bus: schemas.BusCreate, db: Session = Depends(get_db)):
    new_bus = models.Bus(**bus.dict())
    db.add(new_bus)
    db.commit()
    db.refresh(new_bus)
    return new_bus

@app.get("/buses/", response_model=List[schemas.Bus])
def get_buses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Bus).offset(skip).limit(limit).all()

@app.put("/buses/{id}", response_model=schemas.Bus)
def update_bus(id: int, bus_update: schemas.BusUpdate, db: Session = Depends(get_db)):
    bus = db.query(models.Bus).filter(models.Bus.id == id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    update_data = bus_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bus, key, value)
    db.commit()
    db.refresh(bus)
    return bus

@app.delete("/buses/{id}")
def delete_bus(id: int, db: Session = Depends(get_db)):
    bus = db.query(models.Bus).filter(models.Bus.id == id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    db.delete(bus)
    db.commit()
    return {"detail": "Bus deleted successfully"}

@app.get("/buses/{id}/seats")
def get_bus_seats(id: int, db: Session = Depends(get_db)):
    bus = db.query(models.Bus).filter(models.Bus.id == id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    return {"bus_id": bus.id, "seats": bus.seats.split(",")}

@app.put("/buses/{id}/seats")
def update_bus_seats(id: int, seats: List[str], db: Session = Depends(get_db)):
    bus = db.query(models.Bus).filter(models.Bus.id == id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    bus.seats = ",".join(seats)
    db.commit()
    return {"message": "Seats updated successfully", "seats": bus.seats.split(",")}

# --- Routes ---
@app.post("/routes/", response_model=schemas.Route)
def create_route(route: schemas.RouteCreate, db: Session = Depends(get_db)):
    new_route = models.Route(**route.dict())
    db.add(new_route)
    db.commit()
    db.refresh(new_route)
    return new_route

@app.get("/routes/", response_model=List[schemas.Route])
def get_routes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Route).offset(skip).limit(limit).all()

@app.put("/routes/{id}", response_model=schemas.Route)
def update_route(id: int, route_update: schemas.RouteUpdate, db: Session = Depends(get_db)):
    route = db.query(models.Route).filter(models.Route.id == id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    update_data = route_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(route, key, value)
    db.commit()
    db.refresh(route)
    return route

@app.delete("/routes/{id}")
def delete_route(id: int, db: Session = Depends(get_db)):
    route = db.query(models.Route).filter(models.Route.id == id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    db.delete(route)
    db.commit()
    return {"detail": "Route deleted successfully"}

# --- Trips / Schedules ---
@app.post("/trips/", response_model=schemas.TripDetail)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db)):
    new_trip = models.Trip(**trip.dict())
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return new_trip

@app.get("/trips/", response_model=List[schemas.TripDetail])
def get_trips(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    trips = db.query(models.Trip).offset(skip).limit(limit).all()
    # Run auto-cancel boarding check for active trips
    for t in trips:
        if t.status == "active":
            check_and_cancel_unboarded_bookings(t.id, db)
    return trips

@app.put("/trips/{id}", response_model=schemas.TripDetail)
def update_trip(id: int, trip_update: schemas.TripUpdate, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    update_data = trip_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(trip, key, value)
    db.commit()
    db.refresh(trip)
    return trip

@app.delete("/trips/{id}")
def delete_trip(id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db.delete(trip)
    db.commit()
    return {"detail": "Trip deleted successfully"}


@app.get("/trips/{id}", response_model=schemas.TripDetail)
def get_trip(id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status == "active":
        check_and_cancel_unboarded_bookings(trip.id, db)
    return trip

@app.post("/trips/{id}/start", response_model=schemas.TripDetail)
def start_trip(id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip.status = "active"
    trip.started_at = datetime.now(timezone.utc)
    
    # Broadcast notification to passengers booked on this trip
    bookings = db.query(models.Booking).filter(
        models.Booking.trip_id == id,
        models.Booking.status == "confirmed"
    ).all()
    
    for b in bookings:
        notif = models.Notification(
            user_id=b.user_id,
            message=f"Trip has started for your booking (Seat {b.seat_number})! Please click GET SEAT within 10 minutes to board."
        )
        db.add(notif)
        
    db.commit()
    db.refresh(trip)
    return trip

@app.post("/trips/{id}/end", response_model=schemas.TripDetail)
def end_trip(id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Run final check before ending to cancel any remaining unboarded passengers
    check_and_cancel_unboarded_bookings(id, db)
    
    trip.status = "completed"
    db.commit()
    db.refresh(trip)
    return trip

@app.get("/trips/{id}/seats")
def get_trip_seats(id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.id == id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Auto-cancel unboarded bookings if window is passed
    check_and_cancel_unboarded_bookings(id, db)
    
    # Get active seats list for the bus assigned to this trip
    bus_seats = trip.bus.seats.split(",") if trip.bus.seats else []
    
    # Fetch active bookings for this trip
    bookings = db.query(models.Booking).filter(
        models.Booking.trip_id == id
    ).all()
    
    booking_map = {}
    for b in bookings:
        # Include status and user info
        booking_map[b.seat_number] = {
            "booking_id": b.id,
            "user_id": b.user_id,
            "user_name": b.user.name if b.user else "Unknown",
            "status": b.status
        }
        
    return {
        "trip_id": id,
        "bus_name": trip.bus.name,
        "bus_capacity": trip.bus.capacity,
        "all_seats": bus_seats,
        "bookings": booking_map
    }

# --- Bookings ---
@app.post("/bookings/", response_model=schemas.Booking)
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    # Run boarding window checks first to clear expired bookings
    check_and_cancel_unboarded_bookings(booking.trip_id, db)
    
    # Check if seat is already booked for this trip and active
    existing_booking = db.query(models.Booking).filter(
        models.Booking.trip_id == booking.trip_id,
        models.Booking.seat_number == booking.seat_number,
        models.Booking.status.in_(["confirmed", "seated", "boarded"])
    ).first()
    
    if existing_booking:
        raise HTTPException(status_code=400, detail="Seat is already booked")
        
    new_booking = models.Booking(**booking.dict())
    new_booking.status = "confirmed"
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking

@app.get("/bookings/", response_model=List[schemas.BookingDetail])
def get_bookings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).offset(skip).limit(limit).all()
    return bookings

@app.post("/bookings/{id}/board", response_model=schemas.Booking)
def board_booking(id: int, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Check if trip is active and past 10 minutes
    trip = booking.trip
    if trip and trip.status == "active" and trip.started_at:
        # Run cancel checks to see if this booking was auto-cancelled
        check_and_cancel_unboarded_bookings(trip.id, db)
        if booking.status == "cancelled":
            raise HTTPException(status_code=400, detail="Booking was cancelled automatically due to late boarding.")
            
    booking.status = "boarded"
    db.commit()
    db.refresh(booking)
    return booking

@app.post("/bookings/{id}/cancel", response_model=schemas.Booking)
def cancel_booking(id: int, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    trip = booking.trip
    if trip:
        # Validation: Manual cancellation is only allowed up to 10 minutes BEFORE departure
        now = datetime.now(timezone.utc)
        dep_time = trip.departure_time
        if dep_time.tzinfo is None:
            dep_time = dep_time.replace(tzinfo=timezone.utc)
            
        time_until_departure = (dep_time - now).total_seconds()
        
        # If trip is already active (started), they can cancel only if unboarded and within the 10 min window
        if trip.status == "active":
            if trip.started_at:
                started_at = trip.started_at.replace(tzinfo=timezone.utc) if trip.started_at.tzinfo is None else trip.started_at
                if (now - started_at).total_seconds() > 600:
                    raise HTTPException(status_code=400, detail="Boarding time has ended. Booking cannot be manually cancelled.")
        elif time_until_departure < 600: # Less than 10 mins before departure
            raise HTTPException(status_code=400, detail="Cannot manually cancel ticket within 10 minutes of departure.")
            
    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return booking

# --- Passenger Knock Requests ---
@app.post("/knocks/", response_model=schemas.Knock)
def create_knock(knock: schemas.KnockCreate, db: Session = Depends(get_db)):
    # Check for existing pending knock
    existing = db.query(models.Knock).filter(
        models.Knock.trip_id == knock.trip_id,
        models.Knock.user_id == knock.user_id,
        models.Knock.status == "pending"
    ).first()
    if existing:
        return existing
        
    new_knock = models.Knock(**knock.dict())
    db.add(new_knock)
    db.commit()
    db.refresh(new_knock)
    return new_knock

@app.put("/knocks/{id}", response_model=schemas.Knock)
def update_knock(id: int, knock_update: schemas.KnockUpdate, db: Session = Depends(get_db)):
    knock = db.query(models.Knock).filter(models.Knock.id == id).first()
    if not knock:
        raise HTTPException(status_code=404, detail="Knock request not found")
        
    knock.status = knock_update.status
    
    # Notify user of driver's action
    message = ""
    if knock_update.status == "accepted":
        message = "The driver accepted your knock! The bus will stop for you."
    elif knock_update.status == "ignored":
        message = "The driver could not stop for your knock request."
        
    if message:
        notif = models.Notification(
            user_id=knock.user_id,
            message=message
        )
        db.add(notif)
        
    db.commit()
    db.refresh(knock)
    return knock

@app.get("/knocks/trip/{trip_id}", response_model=List[schemas.Knock])
def get_trip_knocks(trip_id: int, db: Session = Depends(get_db)):
    return db.query(models.Knock).filter(
        models.Knock.trip_id == trip_id,
        models.Knock.status.in_(["pending", "accepted"])
    ).all()

# --- Notifications ---
@app.get("/notifications/user/{user_id}", response_model=List[schemas.Notification])
def get_user_notifications(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id
    ).order_by(models.Notification.created_at.desc()).all()

@app.put("/notifications/{id}/read", response_model=schemas.Notification)
def mark_notification_read(id: int, db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

# --- Maintenance Reports ---
@app.post("/reports/", response_model=schemas.MaintenanceReport)
def create_report(report: schemas.MaintenanceReportCreate, db: Session = Depends(get_db)):
    new_report = models.MaintenanceReport(**report.model_dump() if hasattr(report, 'model_dump') else report.dict())
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

@app.get("/reports/", response_model=List[schemas.MaintenanceReport])
def get_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.MaintenanceReport).offset(skip).limit(limit).all()
