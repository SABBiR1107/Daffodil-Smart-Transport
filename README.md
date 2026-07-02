<p align="center">
  <strong>🚌 Daffodil Smart Transport (DST)</strong>
</p>

<p align="center">
  A full-stack smart university transportation management system built for<br/>
  <strong>Daffodil International University</strong> — enabling real-time seat booking,<br/>
  live GPS bus tracking, driver-passenger knock communication, and admin fleet management.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/SQLAlchemy-ORM-red?logo=sqlalchemy" alt="SQLAlchemy" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Leaflet-Maps-199900?logo=leaflet" alt="Leaflet" />
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Project](#running-the-project)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [User Roles & Access](#user-roles--access)
- [Database Schema](#database-schema)
- [Screenshots](#screenshots)
- [Team & Contributors](#team--contributors)
- [License](#license)

---

## Overview

**Daffodil Smart Transport (DST)** is a comprehensive university bus management system designed to solve the daily commute challenges faced by students, faculty, and transport staff at Daffodil International University. The platform digitizes the entire transport workflow — from scheduling and seat reservation to live GPS tracking and on-the-go driver communication.

The system consists of three role-specific interfaces:
1. **Student/Passenger Portal** — Book seats, track buses in real-time, and knock the driver to request a stop.
2. **Driver Dashboard** — Manage active trips, view seat occupancy, and respond to passenger knock requests.
3. **Admin Panel** — Full fleet management including buses, routes, schedules, drivers, analytics, and maintenance reports.

---

## Features

### 🎫 Student / Passenger Portal
| Feature | Description |
|---|---|
| **Seat Booking** | Browse available trips by route and time, view an interactive seat map, and book your preferred seat in real-time. |
| **Real-Time Seat Updates** | Seat availability polls every 3 seconds, ensuring students always see the latest occupancy status. |
| **Live GPS Bus Tracking** | Track any active or scheduled bus on an interactive Leaflet map showing the bus position relative to the student. |
| **Knock-the-Driver** | When within 0.5 km of the bus, passengers can send a "knock" request to the driver, asking them to stop. |
| **Boarding Pass** | After booking, students receive a digital boarding pass with route, departure time, seat, and status info. |
| **Board / Cancel Ticket** | Students can board (confirm physically getting on the bus) or cancel their ticket before departure. |
| **Auto-Cancel (10 min rule)** | If a trip has started and a student hasn't boarded within 10 minutes, their booking is auto-cancelled and the seat is released for others. |
| **Notifications** | Real-time notifications for trip starts, knock responses, and auto-cancellations — visible in the profile dropdown. |
| **Payment Modal** | Mock payment integration supporting bKash, Nagad, and Card top-up (UI-ready for future integration). |

### 🧑‍✈️ Driver Dashboard
| Feature | Description |
|---|---|
| **Trip Management** | View assigned trips, start trips (activates 10-minute boarding window), and end trips. |
| **Seat Occupancy View** | Visual seat map showing booked (yellow), boarded (green), and empty (white) seats in real-time. |
| **Live Knock Requests** | Receive real-time passenger knock requests with distance info; accept or ignore each request. |
| **GPS Location Map** | Live Leaflet map showing current bus position and accepted passenger locations. |
| **Driver Profile** | Edit name, phone, and password from within the dashboard. |
| **Auto-Refresh** | Dashboard data auto-refreshes every 8 seconds for real-time situational awareness. |

### 🛡️ Admin Panel
| Feature | Description |
|---|---|
| **Dashboard Overview** | Stats cards showing total students, drivers, buses, active trips, bookings, and pending issues. |
| **User Management** | View all registered users (students, drivers, admins) in a searchable table. |
| **Driver Registration** | Create new driver accounts via Supabase Auth with auto-generated passwords. |
| **Bus Fleet Management** | Add, edit, delete buses. Click any bus to visually configure its seat layout (toggle individual seats on/off). |
| **Route Management** | Create, edit, and delete routes (e.g., DSA → Mirpur 10, DSA → Uttara). |
| **Trip Scheduling** | Schedule trips by assigning a bus, route, driver, and departure time. |
| **Booking Overview** | View all bookings with student name, route, seat, time, and status. |
| **Analytics & Charts** | Interactive Line/Bar charts (via Recharts) showing booking and trip trends by day/week/month. |
| **Maintenance Reports** | Submit and track bus maintenance issues. |
| **Seat Configuration** | Toggle individual seats per bus to enable/disable them for booking. |

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | React framework with server-side rendering and routing |
| **TypeScript** | Type-safe development |
| **Tailwind CSS 4** | Utility-first CSS framework |
| **Supabase JS Client** | Authentication (signup, login, session management) |
| **Leaflet + React-Leaflet** | Interactive real-time GPS maps |
| **Recharts** | Admin analytics charts (Line & Bar) |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | High-performance Python REST API |
| **SQLAlchemy** | ORM for database models and queries |
| **Pydantic** | Request/response schema validation |
| **Uvicorn** | ASGI server for FastAPI |
| **PostgreSQL (Supabase)** | Cloud-hosted production database |
| **SQLite** | Fallback local development database |
| **python-dotenv** | Environment variable management |

### Infrastructure
| Service | Purpose |
|---|---|
| **Supabase** | Authentication (Auth), PostgreSQL database hosting |

---

## Project Structure

```
Daffodil Smart Transport/
├── backend/
│   ├── main.py              # FastAPI application & all API endpoints
│   ├── models.py            # SQLAlchemy database models (User, Bus, Route, Trip, Booking, Knock, Notification, MaintenanceReport)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # Database engine & session configuration
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Database connection string (PostgreSQL/Supabase)
│   └── transport.db         # SQLite fallback database
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Student/Passenger home page (booking, tracking, knocking)
│   │   │   ├── layout.tsx         # Root layout with Geist fonts
│   │   │   ├── globals.css        # Global styles & CSS variables
│   │   │   ├── login/page.tsx     # Login page (students, drivers, admin)
│   │   │   ├── signup/page.tsx    # Student registration page
│   │   │   ├── admin/page.tsx     # Admin dashboard (full fleet management)
│   │   │   ├── driver/page.tsx    # Driver dashboard (trip & knock management)
│   │   │   └── components/
│   │   │       └── LiveMap.tsx    # Leaflet map component for GPS tracking
│   │   └── lib/
│   │       ├── api.ts             # API helper functions (fetch wrappers)
│   │       └── supabaseClient.ts  # Supabase client initialization
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── .env.local                 # Supabase keys & admin credentials
│   └── postcss.config.mjs
│
└── README.md                      # This file
```

---

## Prerequisites

Before running this project, ensure you have:

- **Node.js** ≥ 18.x ([Download](https://nodejs.org/))
- **Python** ≥ 3.9 ([Download](https://www.python.org/downloads/))
- **pip** (comes with Python)
- **npm** (comes with Node.js)
- **Git** (optional, for cloning)

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/daffodil-smart-transport.git
cd "Daffodil Smart Transport"
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install
```

---

## Running the Project

You need **two terminal windows** — one for the backend and one for the frontend.

### Terminal 1 — Start Backend (FastAPI)

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: **http://localhost:8000**  
Interactive API docs (Swagger): **http://localhost:8000/docs**

### Terminal 2 — Start Frontend (Next.js)

```bash
cd frontend
npm run dev
```

The web app will be available at: **http://localhost:3000**

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Supabase PostgreSQL Connection String
# Get from: Supabase Dashboard → Settings → Database → Connection string → URI
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

> **Note:** If `DATABASE_URL` is not set, the backend falls back to a local SQLite database (`transport.db`).

### Frontend (`frontend/.env.local`)

```env
# Supabase project credentials
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Admin login credentials (hardcoded for demo)
NEXT_PUBLIC_ADMIN_EMAIL="admin@dst.com"
NEXT_PUBLIC_ADMIN_PASSWORD="adminpassword"
```

---

## API Endpoints

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users/` | Create or sync a user |
| `GET` | `/users/` | List all users |
| `GET` | `/users/email/{email}` | Get user by email |

### Buses
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/buses/` | Create a new bus |
| `GET` | `/buses/` | List all buses |
| `PUT` | `/buses/{id}` | Update bus details |
| `DELETE` | `/buses/{id}` | Delete a bus |
| `GET` | `/buses/{id}/seats` | Get seat layout for a bus |
| `PUT` | `/buses/{id}/seats` | Update seat layout |

### Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/routes/` | Create a new route |
| `GET` | `/routes/` | List all routes |
| `PUT` | `/routes/{id}` | Update a route |
| `DELETE` | `/routes/{id}` | Delete a route |

### Trips / Schedules
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/trips/` | Schedule a new trip |
| `GET` | `/trips/` | List all trips |
| `GET` | `/trips/{id}` | Get trip details |
| `PUT` | `/trips/{id}` | Update trip details |
| `DELETE` | `/trips/{id}` | Delete a trip |
| `POST` | `/trips/{id}/start` | Start a trip (activates boarding window) |
| `POST` | `/trips/{id}/end` | End a trip |
| `GET` | `/trips/{id}/seats` | Get real-time seat availability for a trip |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/bookings/` | Create a new booking |
| `GET` | `/bookings/` | List all bookings |
| `POST` | `/bookings/{id}/board` | Mark booking as boarded |
| `POST` | `/bookings/{id}/cancel` | Cancel a booking |

### Knock Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/knocks/` | Send a knock request to driver |
| `PUT` | `/knocks/{id}` | Accept or ignore a knock |
| `GET` | `/knocks/trip/{trip_id}` | Get active knocks for a trip |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/notifications/user/{user_id}` | Get user notifications |
| `PUT` | `/notifications/{id}/read` | Mark notification as read |

### Maintenance Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/reports/` | Create a maintenance report |
| `GET` | `/reports/` | List all reports |

---

## User Roles & Access

| Role | Login Method | Access |
|------|-------------|--------|
| **Student** | Supabase Auth (Email/Password signup) | Home page — book seats, track buses, knock driver |
| **Driver** | Supabase Auth (created by admin) | Driver dashboard — manage trips, view seats, handle knocks |
| **Admin** | Hardcoded credentials in `.env.local` | Admin panel — full system management |

### Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@dst.com` |
| Password | `adminpassword` |

---

## Database Schema

The system uses 7 core database tables:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Users     │     │    Buses     │     │    Routes    │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ name         │     │ name         │     │ name         │
│ email        │     │ capacity     │     │ start_point  │
│ university_id│     │ status       │     │ end_point    │
│ role         │     │ seats        │     └──────┬───────┘
│ hashed_pass  │     └──────┬───────┘            │
│ created_at   │            │                    │
└──────┬───────┘     ┌──────┴────────────────────┴───────┐
       │             │              Trips                │
       │             ├───────────────────────────────────┤
       │             │ id (PK)                           │
       ├─────────────│ bus_id (FK → Buses)               │
       │             │ driver_id (FK → Users)            │
       │             │ route_id (FK → Routes)            │
       │             │ departure_time                    │
       │             │ started_at                        │
       │             │ status (scheduled/active/completed)│
       │             │ current_lat, current_lng, speed   │
       │             └──────┬───────────────────────────┘
       │                    │
  ┌────┴─────────┐   ┌─────┴──────────┐   ┌──────────────┐
  │  Bookings    │   │    Knocks      │   │Notifications │
  ├──────────────┤   ├────────────────┤   ├──────────────┤
  │ id (PK)      │   │ id (PK)        │   │ id (PK)      │
  │ trip_id (FK) │   │ trip_id (FK)   │   │ user_id (FK) │
  │ user_id (FK) │   │ user_id (FK)   │   │ message      │
  │ seat_number  │   │ status         │   │ is_read      │
  │ status       │   │ distance       │   │ created_at   │
  └──────────────┘   │ created_at     │   └──────────────┘
                     └────────────────┘

  ┌──────────────────────┐
  │ MaintenanceReports   │
  ├──────────────────────┤
  │ id (PK)              │
  │ bus_id (FK → Buses)  │
  │ reported_by (FK)     │
  │ issue_description    │
  │ status               │
  │ created_at           │
  └──────────────────────┘
```

---

## Screenshots

### Student Portal
- **Hero Section** with gradient background and call-to-action
- **Seat Booking** with interactive visual seat map (color-coded: white=available, red=booked, green=selected)
- **Live GPS Tracking** with Leaflet map integration
- **Knock-the-Driver** proximity-based feature

### Driver Dashboard
- **Welcome banner** with driver stats
- **Active route info** with Start/End trip controls
- **Seat occupancy** visual grid
- **Live knock requests** with Accept/Ignore actions
- **GPS map** with bus and passenger markers

### Admin Panel
- **Sidebar navigation** with 8 management sections
- **Dashboard** with stat cards, live bus tracking, and recent bookings
- **Bus fleet management** with seat configuration
- **Trip scheduling** form
- **Analytics** with interactive Recharts graphs

---

## Key Business Rules

1. **10-Minute Boarding Window**: Once a driver starts a trip, passengers have 10 minutes to board (click "GET SEAT"). After 10 minutes, unboarded bookings are auto-cancelled and the seats are released.

2. **Cancellation Policy**: Students can cancel bookings up to 10 minutes before the scheduled departure time. Once the trip is active and the 10-minute boarding window has passed, manual cancellation is no longer permitted.

3. **Knock Distance Threshold**: The "Knock Bus" feature only activates when a passenger is within **0.5 km** of the bus, preventing spam from distant users.

4. **Duplicate Prevention**: The system prevents duplicate bookings for the same seat on the same trip, and duplicate knock requests from the same user.

---

## Team & Contributors

| Name | Role | Student ID |
|------|------|-----------|
| Abdul Momin | Developer | 211-15-XXXX |

> Built as a project for Daffodil International University

---

## License

This project is developed for academic purposes at **Daffodil International University**.  
All rights reserved © 2026 Daffodil Smart Transport.

---

<p align="center">
  Made with ❤️ at <strong>Daffodil International University</strong>
</p>
