'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';
const LiveMap = dynamic(() => import('./components/LiveMap'), { ssr: false });
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { 
  fetchRoutes, 
  fetchTrips, 
  createBooking, 
  fetchTripSeats, 
  boardBooking, 
  cancelBooking,
  createKnock,
  fetchNotifications
} from '@/lib/api';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [dbUserId, setDbUserId] = useState<number | null>(null);
  
  // Data States
  const [routes, setRoutes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [matchingTrip, setMatchingTrip] = useState<any>(null);
  
  // Seats layout states
  const [seatsList, setSeatsList] = useState<string[]>([]);
  const [bookedSeatsMap, setBookedSeatsMap] = useState<any>({});
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  
  // Booking status & Ticket details
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [qrPaymentModalOpen, setQrPaymentModalOpen] = useState(false);
  const [qrPaymentStep, setQrPaymentStep] = useState<'qr' | 'processing' | 'success'>('qr');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bKash');
  
  // Form States
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentPhone, setStudentPhone] = useState('');

  // Live tracking & Knocking States
  const [trackBusName, setTrackBusName] = useState('');
  const [trackingTrip, setTrackingTrip] = useState<any>(null);
  const [busDistance, setBusDistance] = useState<number>(0.8); // start at 0.8 km
  const [knockStatus, setKnockStatus] = useState<string>(''); // pending, accepted, ignored
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  // Load baseline routes and trips
  const loadData = async () => {
    try {
      const r = await fetchRoutes();
      if (r) setRoutes(r);
    } catch (e) {
      console.warn("Could not fetch routes", e);
    }
    try {
      const t = await fetchTrips();
      if (t) setTrips(t);
    } catch (e) {
      console.warn("Could not fetch trips", e);
    }
  };

  useEffect(() => {
    loadData();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        setStudentName(user.user_metadata?.full_name || '');
        setStudentId(user.user_metadata?.student_id || '');
        
        // Retrieve or fetch database user ID
        const cachedId = localStorage.getItem('dbUserId');
        if (cachedId && cachedId !== 'admin') {
          const uId = Number(cachedId);
          setDbUserId(uId);
          loadUserBookingsAndNotifications(uId);
        } else {
          try {
            const res = await fetch(`http://localhost:8000/users/email/${encodeURIComponent(user.email || '')}`);
            if (res.ok) {
              const dbUser = await res.json();
              setDbUserId(dbUser.id);
              localStorage.setItem('dbUserId', dbUser.id.toString());
              loadUserBookingsAndNotifications(dbUser.id);
            }
          } catch (e) {
            console.error("Error retrieving user from DB", e);
          }
        }
      }
    });

    // Auto-refresh loops for tracking distance & active status
    const trackingInterval = setInterval(() => {
      // Simulate bus moving closer if trip is active
      setBusDistance(prev => {
        if (prev > 0.3) {
          return parseFloat((prev - 0.05).toFixed(2));
        }
        return prev;
      });
    }, 10000);

    return () => clearInterval(trackingInterval);
  }, []);

  // Auto-load trip and seats when time is selected
  useEffect(() => {
    if (selectedRoute && selectedTime) {
      const match = trips.find(t => t.id === Number(selectedTime));
      if (match) {
        setMatchingTrip(match);
        setTrackingTrip(match);
        fetchTripSeats(match.id).then(data => {
          setSeatsList(data.all_seats);
          setBookedSeatsMap(data.bookings);
        }).catch(e => console.error("Error auto-loading seats", e));
      }
    }
  }, [selectedRoute, selectedTime, trips]);

  // Real-time seat polling
  useEffect(() => {
    let seatInterval: NodeJS.Timeout;
    if (matchingTrip) {
      seatInterval = setInterval(async () => {
        try {
          const data = await fetchTripSeats(matchingTrip.id);
          setSeatsList(data.all_seats);
          setBookedSeatsMap(data.bookings);
        } catch (e) {
          console.error("Error polling seats", e);
        }
      }, 3000); // Poll every 3 seconds for real-time
    }
    return () => clearInterval(seatInterval);
  }, [matchingTrip]);

  const loadUserBookingsAndNotifications = async (uId: number) => {
    try {
      // Load notifications
      const notifs = await fetchNotifications(uId);
      if (notifs) setNotificationsList(notifs);

      // Fetch bookings to check if this user already has an active booking
      const res = await fetch('http://localhost:8000/bookings/');
      if (res.ok) {
        const bookings = await res.json();
        const userBooking = bookings.find((b: any) => b.user_id === uId && (b.status === 'confirmed' || b.status === 'boarded'));
        if (userBooking) {
          setActiveBooking(userBooking);
        }
      }
    } catch (e) {
      console.error("Error loading user dynamic data", e);
    }
  };

  const handleSearch = async () => {
    if (!selectedRoute || !selectedTime) {
      return alert("Please select both route and time!");
    }
    
    // Find matching scheduled trip
    const match = trips.find(t => 
      t.id === Number(selectedTime)
    );

    if (match) {
      setMatchingTrip(match);
      setTrackingTrip(match);
      // Load seats for this trip
      try {
        const data = await fetchTripSeats(match.id);
        setSeatsList(data.all_seats);
        setBookedSeatsMap(data.bookings);
      } catch (e) {
        console.error("Error loading trip seats", e);
      }
    } else {
      alert("No active trip schedules found for the selected route and time.");
      setMatchingTrip(null);
    }
  };

  const handleBookSeat = async () => {
    if (!selectedSeat) return alert("Please select a seat from the map!");
    if (!matchingTrip) return alert("Please search for an active trip schedule first!");
    if (!dbUserId) return alert("Please sign in or register to book a seat!");

    try {
      const booking = await createBooking({
        trip_id: matchingTrip.id,
        seat_number: selectedSeat,
        user_id: dbUserId
      });
      alert("Seat selected! Proceed to Confirm Your Seat.");
      setActiveBooking(booking);
      setSelectedSeat('');
      
      // Reload matching seats
      handleSearch();
      loadUserBookingsAndNotifications(dbUserId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBoardSeat = () => {
    if (!activeBooking) return;
    // Open QR payment modal instead of directly boarding
    setQrPaymentStep('qr');
    setQrPaymentModalOpen(true);
  };

  const handlePaymentConfirm = async () => {
    if (!activeBooking) return;
    setQrPaymentStep('processing');
    
    // Simulate payment processing delay
    setTimeout(async () => {
      try {
        const updated = await boardBooking(activeBooking.id);
        setQrPaymentStep('success');
        setActiveBooking(updated);
localStorage.setItem('activeBooking', JSON.stringify(updated));
        if (dbUserId) loadUserBookingsAndNotifications(dbUserId);
        
        // Save payment to localStorage for dashboard history
        const paymentRecord = {
          id: Date.now(),
          booking_id: activeBooking.id,
          seat: activeBooking.seat_number,
          route: activeBooking.trip?.route?.name || 'Unknown Route',
          amount: 40,
          method: selectedPaymentMethod,
          date: new Date().toISOString(),
          status: 'paid'
        };
        const existingPayments = JSON.parse(localStorage.getItem('paymentHistory') || '[]');
        existingPayments.push(paymentRecord);
        localStorage.setItem('paymentHistory', JSON.stringify(existingPayments));
        
        // Auto-close after 2.5s
        setTimeout(() => {
          setQrPaymentModalOpen(false);
          setQrPaymentStep('qr');
        }, 2500);
      } catch (e: any) {
        alert(e.message);
        setQrPaymentModalOpen(false);
        setQrPaymentStep('qr');
      }
    }, 2000);
  };

  const handleCancelTicket = async () => {
    if (!activeBooking) return;
    const confirmAction = confirm("Are you sure you want to cancel this booking?");
    if (!confirmAction) return;

    try {
      await cancelBooking(activeBooking.id);
      alert("Ticket cancelled successfully!");
      setActiveBooking(null);
      if (dbUserId) {
        loadUserBookingsAndNotifications(dbUserId);
        handleSearch();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleKnockBus = async () => {
    if (!trackingTrip) return alert("Please select or search a route to track a bus first!");
    if (!dbUserId) return alert("Please log in first to knock driver!");
    
    try {
      const knock = await createKnock({
        trip_id: trackingTrip.id,
        user_id: dbUserId,
        distance: busDistance
      });
      setKnockStatus('pending');
      alert("Driver knocked! Waiting for driver's response...");
      
      // Setup polling for knock response
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:8000/notifications/user/${dbUserId}`);
          if (res.ok) {
            const list = await res.json();
            setNotificationsList(list);
            
            // Look for driver response notifications
            const acceptNotif = list.find((n: any) => n.message.includes("accepted your knock"));
            const ignoreNotif = list.find((n: any) => n.message.includes("could not stop"));
            
            if (acceptNotif) {
              setKnockStatus('accepted');
              clearInterval(pollInterval);
            } else if (ignoreNotif) {
              setKnockStatus('ignored');
              clearInterval(pollInterval);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 5000);

      // Stop polling after 2 minutes max
      setTimeout(() => clearInterval(pollInterval), 120000);

    } catch (e) {
      alert("Error sending knock request.");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDbUserId(null);
    setActiveBooking(null);
    localStorage.removeItem('dbUserId');
    localStorage.removeItem('userRole');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full overflow-x-hidden font-sans">
      
      {/* Navbar */}
      <nav className="sticky top-0 w-full z-50 px-4 md:px-8 py-4 flex flex-wrap items-center justify-between text-white bg-[#0A4D20] shadow-md">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg overflow-hidden transition-all duration-300 hover:scale-105">
            <img src="/dst_logo.png" alt="DST Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-extrabold text-md tracking-wider hidden sm:inline">Daffodil Smart Transport</span>
        </div>
        
        <div className="hidden lg:flex space-x-8 font-bold text-sm tracking-wide">
          <Link href="#" className="hover:text-green-300 transition-colors">Home</Link>
          <Link href="#book" className="hover:text-green-300 transition-colors">Book Seat</Link>
          <Link href="#track" className="hover:text-green-300 transition-colors">Track Bus</Link>
          <button onClick={() => setPaymentModalOpen(true)} className="hover:text-green-300 transition-colors font-bold text-sm">Payment</button>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 focus:outline-none"
              >
                <div className="w-10 h-10 bg-white/25 hover:bg-white/35 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/30 shadow-md">
                  <span className="text-sm font-bold">👤</span>
                </div>
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in text-gray-800">
                  <div className="p-4 border-b border-gray-100 bg-gray-50/80 text-left">
                    <p className="text-sm font-extrabold text-gray-900 truncate">{user.user_metadata?.full_name || 'Student'}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">{user.email}</p>
                  </div>
                  
                  {/* Notifications list inside dropdown */}
                  <div className="p-3 border-b border-gray-100 max-h-[160px] overflow-y-auto">
                    <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Recent Notifications</p>
                    {notificationsList.length === 0 ? (
                      <p className="text-[10px] text-gray-400 py-2">No new notifications.</p>
                    ) : (
                      <div className="space-y-2">
                        {notificationsList.slice(0, 3).map(notif => (
                          <div key={notif.id} className="text-[10px] leading-tight border-b border-gray-50 pb-1.5 last:border-0">
                            <span className="font-medium text-gray-700">{notif.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-2 bg-gray-50/50 space-y-1">
                    <Link 
                      href="/dashboard"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full text-left px-3 py-2.5 text-sm font-bold text-primary hover:bg-green-50 rounded-xl transition-colors flex items-center"
                    >
                      <span className="mr-3 text-lg">📊</span> My Dashboard
                    </Link>
                    <button 
                      onClick={() => { setProfileDropdownOpen(false); handleSignOut(); }} 
                      className="w-full text-left px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors flex items-center"
                    >
                      <span className="mr-3 text-lg">🚪</span> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="bg-white text-primary px-6 py-2.5 rounded-full text-sm font-extrabold hover:bg-gray-100 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5">Login</Link>
          )}
          
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="lg:hidden w-10 h-10 flex flex-col justify-center items-center bg-white/10 rounded-full backdrop-blur-md border border-white/20"
          >
            <span className={`block w-5 h-0.5 bg-white transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : 'mb-1'}`}></span>
            <span className={`block w-5 h-0.5 bg-white transition-opacity ${mobileMenuOpen ? 'opacity-0' : 'mb-1'}`}></span>
            <span className={`block w-5 h-0.5 bg-white transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-[72px] left-0 w-full bg-[#0A4D20]/95 backdrop-blur-xl z-40 border-t border-white/10 flex flex-col items-center py-6 space-y-6 shadow-xl text-white">
          <Link href="#" onClick={() => setMobileMenuOpen(false)} className="font-bold text-lg">Home</Link>
          <Link href="#book" onClick={() => setMobileMenuOpen(false)} className="font-bold text-lg">Book Seat</Link>
          <Link href="#track" onClick={() => setMobileMenuOpen(false)} className="font-bold text-lg">Track Bus</Link>
          <button onClick={() => { setPaymentModalOpen(true); setMobileMenuOpen(false); }} className="font-bold text-lg">Payment</button>
        </div>
      )}

      {/* Hero Section */}
      <div 
        className="relative w-full h-[55vh] min-h-[400px] bg-gradient-to-r from-green-800 to-blue-900 flex items-center justify-center px-4 shadow-inner"
        style={{ backgroundImage: 'url("/hero_bg.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 text-center text-white w-full max-w-4xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight drop-shadow-md">
            Daffodil Smart Transport
          </h1>
          <p className="text-base md:text-lg text-gray-200 mb-8 max-w-xl mx-auto">
            Book seats online in seconds, monitor live bus positions, and request driver stop knocks instantly.
          </p>
          <a href="#book" className="bg-primary hover:bg-primary-hover px-8 py-3.5 rounded-full font-extrabold shadow-lg transition-all transform hover:scale-105 inline-block text-sm uppercase tracking-wider">
            Book Bus Seat
          </a>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        
        {/* Book Seat Section */}
        <section id="book" className="text-center w-full">
          <h2 className="text-3xl font-extrabold mb-10 text-gray-800">Available Bus Seat Booking</h2>
          
          {/* Search Bar */}
          <div className="bg-[#0A4D20] text-white rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between shadow-xl mb-12 gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <span className="font-bold whitespace-nowrap text-sm text-green-200 uppercase tracking-wide">Select Route:</span>
              <select 
                className="bg-white text-gray-800 rounded-full px-5 py-3 outline-none w-full md:w-64 font-medium"
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
              >
                <option value="">Select Target Destination</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <span className="font-bold whitespace-nowrap text-sm text-green-200 uppercase tracking-wide">Select Time & Bus:</span>
              <select 
                className="bg-white text-gray-800 rounded-full px-5 py-3 outline-none w-full md:w-48 font-medium"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={!selectedRoute}
              >
                <option value="">{selectedRoute ? "Select Hour" : "Select Route First"}</option>
                {trips
                  .filter(t => (t.route_id || t.route?.id) === Number(selectedRoute) && t.status !== 'completed')
                  .map(trip => {
                    const d = new Date(trip.departure_time);
                    return (
                      <option key={trip.id} value={trip.id}>
                        {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {trip.bus?.name ? `- ${trip.bus.name}` : ''}
                      </option>
                    )
                  })}
              </select>
            </div>
            
            <button 
              onClick={handleSearch}
              className="bg-primary hover:bg-primary-hover text-white font-extrabold rounded-full px-10 py-3.5 transition-all w-full md:w-auto shadow-md"
            >
              Search Buses
            </button>
          </div>

          {/* Booking Content Container */}
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-gray-100 grid lg:grid-cols-2 gap-12 text-left">
            {/* Seat Map */}
            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800 text-xl">
                  {matchingTrip?.bus?.name ? `${matchingTrip.bus.name} Seating` : "Bus Seating"} 
                </h3>
                {seatsList.length > 0 && (
                  <div className="bg-green-100 text-green-800 px-4 py-1.5 rounded-full font-bold text-sm animate-pulse">
                    Available: {seatsList.length - Object.values(bookedSeatsMap).filter((b: any) => b.status === 'confirmed' || b.status === 'boarded').length} / {seatsList.length} Seats
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-6">Colors mapping: White (Available), Red (Booked), Dashed Green Stroke (Processing), Solid Green (Selected by you)</p>
              
              {matchingTrip ? (
                <div className="max-w-[300px] mx-auto bg-gray-50 p-6 rounded-3xl border border-gray-200">
                  {/* Steering wheel placeholder */}
                  <div className="flex justify-end mb-6">
                    <div className="w-10 h-10 rounded-full border-[4px] border-gray-300 flex items-center justify-center">
                       <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    {seatsList.map((seat) => {
                       const booking = bookedSeatsMap[seat];
                       const isBooked = booking && (booking.status === 'confirmed' || booking.status === 'boarded');
                       const isSelected = selectedSeat === seat;
                       
                       let seatStyle = 'bg-white border-gray-200 text-gray-600 hover:border-primary/50 hover:bg-green-50';
                       
                       if (isBooked) {
                         // Booked = Red
                         seatStyle = 'bg-red-500 text-white border-red-500 cursor-not-allowed';
                       } else if (isSelected) {
                         // Selected by current user = Solid Green
                         seatStyle = 'bg-primary text-white border-primary shadow-md';
                       } else if (booking && booking.status === 'processing') {
                         // Processing = Green border stroke
                         seatStyle = 'bg-white text-primary border-primary border-[3px] border-dashed animate-pulse';
                       }

                       return (
                         <button 
                           key={seat}
                           onClick={() => !isBooked && setSelectedSeat(seat)}
                           disabled={isBooked}
                           className={`py-3 rounded-xl border-2 font-bold text-xs transition-all transform hover:scale-[1.03] ${seatStyle}`}
                         >
                           {seat}
                         </button>
                       );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-[250px] bg-gray-50 rounded-2xl flex items-center justify-center border text-sm text-gray-400 font-medium">
                  Search for routes to display seat map.
                </div>
              )}
            </div>

            {/* Passenger Form */}
            <div className="w-full space-y-5 bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-200 h-fit">
              <h3 className="font-bold text-gray-800 mb-6 text-xl">Passenger Credentials</h3>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Student Name</label>
                <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} required placeholder="Enter student full name" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Student / Faculty ID</label>
                <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} required placeholder="e.g. 211-15-1234" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Phone Number</label>
                <input type="tel" value={studentPhone} onChange={e => setStudentPhone(e.target.value)} required placeholder="Enter active mobile number" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800" />
              </div>
              
              <button 
                onClick={handleBookSeat}
                className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl py-4 mt-6 transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.01]"
              >
                Book Selected Seat
              </button>
            </div>
          </div>
        </section>

        {/* Ticket Boarding Control Section */}
        {activeBooking && (
          <>
            <h2 className="text-2xl font-extrabold mb-6 text-gray-800">Your Active Boarding Pass</h2>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-6 md:p-8 shadow-sm border border-green-100 max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 w-full bg-white rounded-2xl p-6 border border-green-100/50 shadow-inner">
                <div className="flex justify-between items-center border-b border-dashed border-gray-100 pb-3 mb-3">
                  <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">Route</span>
                  <span className="font-extrabold text-sm text-gray-800">{activeBooking.trip?.route?.name || 'Assigned Route'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-gray-100 pb-3 mb-3">
                  <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">Departure Time</span>
                  <span className="font-extrabold text-sm text-gray-800">{activeBooking.trip?.departure_time ? new Date(activeBooking.trip.departure_time).toLocaleString() : '10:00 AM'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-gray-100 pb-3 mb-3">
                  <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">Assigned Seat</span>
                  <span className="font-extrabold text-xl text-primary">{activeBooking.seat_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">Boarding Status</span>
                  <span className="font-extrabold text-sm text-gray-800">{activeBooking.status || 'Pending'}</span>
                </div>
              </div>
              <div className="w-full md:w-auto flex flex-col justify-center gap-3">
                {activeBooking.status !== 'boarded' && (
                  <button 
                    onClick={handleBoardSeat} 
                    className="bg-primary text-white font-bold py-3 px-6 rounded-xl shadow-md hover:bg-primary-hover transition-all whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <span>💳</span> Confirm Boarding Pass
                  </button>
                )}
                <button 
                  onClick={handleCancelTicket} 
                  className="bg-red-50 text-red-600 font-bold py-3 px-6 rounded-xl border border-red-200 hover:bg-red-100 transition-all whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <span>❌</span> Cancel Ticket
                </button>
              </div>
            </div>
          </>
        )}

        {/* Live GPS Track Bus / Knocking */}
        <section id="track" className="text-center pb-24 w-full">
          <h2 className="text-3xl font-extrabold mb-10 text-gray-800">Track & Stop Your Bus</h2>
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-gray-100 grid lg:grid-cols-2 gap-10 max-w-5xl mx-auto text-left">
            <div className="space-y-6 flex flex-col justify-center">
               <div className="flex flex-col sm:flex-row gap-3">
                 <select 
                   value={trackBusName} 
                   onChange={e => {
                     setTrackBusName(e.target.value);
                     const match = trips.find(t => t.id === Number(e.target.value));
                     setTrackingTrip(match || null);
                     setBusDistance(0.8);
                     setKnockStatus('');
                   }}
                   className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 outline-none font-medium text-gray-800"
                 >
                   <option value="">Select Scheduled Bus to Track</option>
                   {trips.filter(t => t.status === 'active' || t.status === 'scheduled').map(trip => (
                     <option key={trip.id} value={trip.id}>{trip.bus?.name} - {trip.route?.name}</option>
                   ))}
                 </select>
               </div>
               
               <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h4 className="font-bold mb-4 text-gray-800 text-sm uppercase tracking-wide">Status Overview</h4>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-500 font-medium">Distance from your position</span>
                    <span className="font-bold text-lg text-primary">{busDistance} km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Est. Arrival Time</span>
                    <span className="font-bold text-lg text-gray-800">
                      {busDistance > 0.5 ? Math.ceil(busDistance * 10) : '2'} mins
                    </span>
                  </div>
               </div>
               
               <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button 
                    onClick={handleKnockBus}
                    disabled={busDistance > 0.5 || knockStatus === 'pending' || knockStatus === 'accepted'}
                    className={`flex-1 font-extrabold rounded-xl py-4 shadow-lg transition-all transform hover:scale-[1.01] ${busDistance <= 0.5 && knockStatus !== 'accepted' ? 'bg-primary hover:bg-primary-hover text-white shadow-primary/20 animate-pulse' : 'bg-gray-100 text-gray-400 border cursor-not-allowed'}`}
                  >
                    {knockStatus === 'pending' ? 'Knock Request Sent...' : knockStatus === 'accepted' ? 'Knock Request Accepted! ✅' : 'KNOCK BUS (Inside 0.5 km)'}
                  </button>
                  {busDistance > 0.5 && (
                    <button className="flex-1 bg-gray-100 text-gray-400 font-bold rounded-xl py-4 cursor-not-allowed border border-gray-200 text-center text-sm">
                      Out of Range (Distance &gt; 0.5 km)
                    </button>
                  )}
               </div>

               {knockStatus === 'accepted' && (
                 <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs font-bold">
                   The driver accepted your knock request! The bus will stop for you.
                 </div>
               )}
               {knockStatus === 'ignored' && (
                 <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-bold">
                   The driver could not stop for your knock request. Please board at the official stop.
                 </div>
               )}
            </div>
            
            <div className="bg-blue-50 rounded-[2rem] h-[350px] overflow-hidden relative border border-gray-200 shadow-inner z-0">
               {trackingTrip ? (
                 <LiveMap busDistance={busDistance} showUser={true} />
               ) : (
                 <div className="flex flex-col items-center justify-center h-full w-full">
                   <div className="absolute inset-0 opacity-25 bg-cover bg-center" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
                   <div className="relative z-10 flex flex-col items-center p-4">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-3xl mb-4 shadow-xl border-4 border-white animate-bounce">🚌</div>
                      <span className="text-primary font-extrabold text-md bg-white px-6 py-2.5 rounded-full shadow-md uppercase tracking-wider text-center">Select a bus to view Live Map</span>
                   </div>
                 </div>
               )}
            </div>
          </div>
        </section>
      </div>

      {/* Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-fade-in">
            <button onClick={() => setPaymentModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl font-bold">×</button>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-6 text-center">Top Up / Payment</h2>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Current Balance</p>
                <p className="text-3xl font-extrabold text-primary">৳ 120.00</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Recharge Amount (BDT)</label>
                <input type="number" placeholder="e.g. 500" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-gray-800 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Payment Method</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-gray-800 font-bold">
                  <option>bKash</option>
                  <option>Nagad</option>
                  <option>Card</option>
                </select>
              </div>
              <button onClick={() => { alert('Mock Payment Successful!'); setPaymentModalOpen(false); }} className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl py-3.5 mt-4 transition-all shadow-lg shadow-primary/30">
                Proceed to Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Payment Modal — appears when clicking GET SEAT */}
      {qrPaymentModalOpen && activeBooking && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-fade-in">
            <button onClick={() => { setQrPaymentModalOpen(false); setQrPaymentStep('qr'); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl font-bold z-10">×</button>
            
            {qrPaymentStep === 'qr' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">💳</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-800">Complete Payment</h2>
                  <p className="text-gray-500 text-sm mt-1">Scan QR code or select a method to pay</p>
                </div>

                {/* Booking Summary */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-6 border border-green-100">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 font-bold text-xs uppercase">Route</p>
                      <p className="font-extrabold text-gray-800">{activeBooking.trip?.route?.name || 'Route'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-bold text-xs uppercase">Seat</p>
                      <p className="font-extrabold text-primary text-lg">{activeBooking.seat_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-bold text-xs uppercase">Departure</p>
                      <p className="font-bold text-gray-800 text-xs">{activeBooking.trip?.departure_time ? new Date(activeBooking.trip.departure_time).toLocaleString() : 'Scheduled'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-bold text-xs uppercase">Fare</p>
                      <p className="font-extrabold text-primary text-lg">৳ 40.00</p>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center mb-6">
                  <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-primary/30 shadow-inner">
                    <QRCodeSVG 
                      value={`dst-payment://booking/${activeBooking.id}?seat=${activeBooking.seat_number}&amount=40&method=${selectedPaymentMethod}&user=${dbUserId}`}
                      size={180}
                      bgColor="#ffffff"
                      fgColor="#0F7A31"
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium">Scan with bKash/Nagad app to pay instantly</p>
                </div>

                {/* Payment Method Selector */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Select Payment Method</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'bKash', label: 'bKash', color: 'bg-pink-50 border-pink-200 text-pink-700', icon: '📱' },
                      { id: 'Nagad', label: 'Nagad', color: 'bg-orange-50 border-orange-200 text-orange-700', icon: '📲' },
                      { id: 'Card', label: 'Card', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '💳' },
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPaymentMethod(method.id)}
                        className={`py-3 px-2 rounded-xl border-2 font-bold text-xs transition-all flex flex-col items-center space-y-1 ${
                          selectedPaymentMethod === method.id 
                            ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20 scale-[1.03]' 
                            : method.color + ' hover:scale-[1.02]'
                        }`}
                      >
                        <span className="text-xl">{method.icon}</span>
                        <span>{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handlePaymentConfirm}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl py-4 transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.01] flex items-center justify-center space-x-2"
                >
                  <span>✅</span>
                  <span>Confirm Payment — ৳ 40.00</span>
                </button>
              </>
            )}

            {qrPaymentStep === 'processing' && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-extrabold text-gray-800 mb-2">Processing Payment...</h3>
                <p className="text-gray-500 text-sm">Verifying your {selectedPaymentMethod} payment</p>
                <div className="mt-6 flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
                  <span className="text-yellow-600 animate-pulse">●</span>
                  <span className="text-xs font-bold text-yellow-700">Do not close this window</span>
                </div>
              </div>
            )}

            {qrPaymentStep === 'success' && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-200/50">
                  <span className="text-4xl">✅</span>
                </div>
                <h3 className="text-2xl font-extrabold text-gray-800 mb-2">Payment Successful!</h3>
                <p className="text-gray-500 text-sm mb-4">Your seat has been boarded successfully</p>
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 w-full max-w-xs text-center">
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Transaction ID</p>
                  <p className="font-mono font-bold text-green-800 text-sm">DST-{activeBooking.id}-{Date.now().toString(36).toUpperCase()}</p>
                  <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-green-500">Amount</p><p className="font-bold text-green-800">৳ 40.00</p></div>
                    <div><p className="text-green-500">Method</p><p className="font-bold text-green-800">{selectedPaymentMethod}</p></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Section */}
      <footer className="bg-[#0A4D20] text-white pt-16 pb-8 border-t-[10px] border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary font-bold shadow-md">
                  DST
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Daffodil Smart<br/>Transport</h3>
                </div>
              </div>
              <p className="text-green-100 text-sm leading-relaxed">
                Empowering students and drivers with real-time tracking, seamless seat booking, and secure transportation management.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6 border-b border-green-700 pb-2 inline-block">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link href="#book" className="text-green-100 hover:text-white transition-colors text-sm flex items-center"><span className="mr-2">›</span> Book a Seat</Link></li>
                <li><Link href="#track" className="text-green-100 hover:text-white transition-colors text-sm flex items-center"><span className="mr-2">›</span> Track Bus</Link></li>
                <li><Link href="/login" className="text-green-100 hover:text-white transition-colors text-sm flex items-center"><span className="mr-2">›</span> Driver Login</Link></li>
                <li><Link href="/admin" className="text-green-100 hover:text-white transition-colors text-sm flex items-center"><span className="mr-2">›</span> Admin Portal</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6 border-b border-green-700 pb-2 inline-block">Support</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-green-100 hover:text-white transition-colors text-sm flex items-center"><span className="mr-2">›</span> FAQ</Link></li>
                <li><Link href="#" className="text-green-100 hover:text-white transition-colors text-sm flex items-center"><span className="mr-2">›</span> Privacy Policy</Link></li>
                <li><Link href="#" className="text-green-100 hover:text-white transition-colors text-sm flex items-center"><span className="mr-2">›</span> Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6 border-b border-green-700 pb-2 inline-block">Contact Info</h4>
              <ul className="space-y-4 text-green-100 text-sm">
                <li className="flex items-start space-x-3">
                  <span className="text-primary bg-white rounded-full p-1 w-6 h-6 flex items-center justify-center">📍</span>
                  <span>Daffodil International University<br/>Daffodil Smart City, Ashulia</span>
                </li>
                <li className="flex items-center space-x-3">
                  <span className="text-primary bg-white rounded-full p-1 w-6 h-6 flex items-center justify-center">📞</span>
                  <span>+880 123 456 7890</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-green-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-green-200 text-sm">
              &copy; {new Date().getFullYear()} Daffodil Smart Transport. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
