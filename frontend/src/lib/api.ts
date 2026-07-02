// src/lib/api.ts

const API_BASE_URL = 'http://localhost:8000';

export const fetchRoutes = async () => {
  const res = await fetch(`${API_BASE_URL}/routes/`);
  return res.json();
};

export const fetchBuses = async () => {
  const res = await fetch(`${API_BASE_URL}/buses/`);
  return res.json();
};

export const fetchTrips = async () => {
  const res = await fetch(`${API_BASE_URL}/trips/`);
  return res.json();
};

export const fetchTripById = async (tripId: number) => {
  const res = await fetch(`${API_BASE_URL}/trips/${tripId}`);
  return res.json();
};

export const createTrip = async (tripData: { bus_id: number, driver_id: number, route_id: number, departure_time: string }) => {
  const res = await fetch(`${API_BASE_URL}/trips/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tripData),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to schedule trip');
  }
  return res.json();
};

export const startTrip = async (tripId: number) => {
  const res = await fetch(`${API_BASE_URL}/trips/${tripId}/start`, { method: 'POST' });
  return res.json();
};

export const endTrip = async (tripId: number) => {
  const res = await fetch(`${API_BASE_URL}/trips/${tripId}/end`, { method: 'POST' });
  return res.json();
};

export const fetchTripSeats = async (tripId: number) => {
  const res = await fetch(`${API_BASE_URL}/trips/${tripId}/seats`);
  return res.json();
};

export const createBooking = async (bookingData: { trip_id: number, seat_number: string, user_id: number }) => {
  const res = await fetch(`${API_BASE_URL}/bookings/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to book seat');
  }
  return res.json();
};

export const boardBooking = async (bookingId: number) => {
  const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/board`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to board bus');
  }
  return res.json();
};

export const cancelBooking = async (bookingId: number) => {
  const res = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, { method: 'POST' });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to cancel booking');
  }
  return res.json();
};

export const fetchUserByEmail = async (email: string) => {
  const res = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(email)}`);
  if (!res.ok) return null;
  return res.json();
};

export const createUserInDb = async (userData: { name: string, email: string, university_id: string, role: string }) => {
  const res = await fetch(`${API_BASE_URL}/users/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...userData, password: 'supabaseauthsync' })
  });
  return res.json();
};

export const fetchBusSeats = async (busId: number) => {
  const res = await fetch(`${API_BASE_URL}/buses/${busId}/seats`);
  return res.json();
};

export const updateBusSeats = async (busId: number, seats: string[]) => {
  const res = await fetch(`${API_BASE_URL}/buses/${busId}/seats`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seats)
  });
  return res.json();
};

export const createKnock = async (knockData: { trip_id: number, user_id: number, distance: number }) => {
  const res = await fetch(`${API_BASE_URL}/knocks/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(knockData)
  });
  return res.json();
};

export const updateKnockStatus = async (knockId: number, status: 'accepted' | 'ignored') => {
  const res = await fetch(`${API_BASE_URL}/knocks/${knockId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
};

export const fetchTripKnocks = async (tripId: number) => {
  const res = await fetch(`${API_BASE_URL}/knocks/trip/${tripId}`);
  return res.json();
};

export const fetchNotifications = async (userId: number) => {
  const res = await fetch(`${API_BASE_URL}/notifications/user/${userId}`);
  return res.json();
};

export const markNotificationRead = async (notifId: number) => {
  const res = await fetch(`${API_BASE_URL}/notifications/${notifId}/read`, { method: 'PUT' });
  return res.json();
};
