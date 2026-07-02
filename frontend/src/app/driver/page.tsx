'use client';
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import dynamic from 'next/dynamic';
const LiveMap = dynamic(() => import('../components/LiveMap'), { ssr: false });

export default function DriverDashboard() {
  const [driver, setDriver] = useState<any>(null);
  const [dbDriverId, setDbDriverId] = useState<number | null>(null);

  // Profile Edit States
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [driverNameState, setDriverNameState] = useState('');
  const [driverPhoneState, setDriverPhoneState] = useState('');
  
  // Active Trip & Seat States
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [seatsData, setSeatsData] = useState<any>(null);
  const [liveKnocks, setLiveKnocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Today's completed vs scheduled trips count
  const [completedCount, setCompletedCount] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('dbUserId');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  const loadDriverData = async (userId: number) => {
    try {
      // Fetch all trips
      const res = await fetch('http://localhost:8000/trips/');
      if (res.ok) {
        const trips = await res.json();
        
        // Filter driver trips
        const driverTrips = trips.filter((t: any) => t.driver_id === userId);
        
        // Find active (or scheduled if no active) trip
        const active = driverTrips.find((t: any) => t.status === 'active' || t.status === 'scheduled');
        setActiveTrip(active || null);

        // Count complete / scheduled for today
        const todayStr = new Date().toDateString();
        const completed = driverTrips.filter((t: any) => t.status === 'completed' && new Date(t.departure_time).toDateString() === todayStr).length;
        const scheduled = driverTrips.filter((t: any) => t.status === 'scheduled' && new Date(t.departure_time).toDateString() === todayStr).length;
        setCompletedCount(completed);
        setScheduledCount(scheduled);

        if (active) {
          // Load seat occupancy details
          const seatsRes = await fetch(`http://localhost:8000/trips/${active.id}/seats`);
          if (seatsRes.ok) {
            setSeatsData(await seatsRes.json());
          }

          // Load passenger knock requests
          const knocksRes = await fetch(`http://localhost:8000/knocks/trip/${active.id}`);
          if (knocksRes.ok) {
            setLiveKnocks(await knocksRes.json());
          }
        }
      }
    } catch (e) {
      console.error("Error loading driver trip data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login';
      } else {
        setDriver(user);
        setDriverNameState(user.user_metadata?.full_name || 'Driver');
        
        // Check if database ID exists in localStorage
        const cachedId = localStorage.getItem('dbUserId');
        if (cachedId && cachedId !== 'admin') {
          const uId = Number(cachedId);
          setDbDriverId(uId);
          loadDriverData(uId);
        } else {
          // Fetch driver details from DB
          try {
            const userRes = await fetch(`http://localhost:8000/users/email/${encodeURIComponent(user.email || '')}`);
            if (userRes.ok) {
              const dbUser = await userRes.json();
              setDbDriverId(dbUser.id);
              localStorage.setItem('dbUserId', dbUser.id.toString());
              loadDriverData(dbUser.id);
            }
          } catch (e) {
            console.error("Error fetching db user", e);
            setLoading(false);
          }
        }
      }
    });

    // Auto-refresh knocks/seats data every 8 seconds if active trip
    const interval = setInterval(() => {
      const cachedId = localStorage.getItem('dbUserId');
      if (cachedId && cachedId !== 'admin') {
        loadDriverData(Number(cachedId));
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleStartTrip = async () => {
    if (!activeTrip) return;
    try {
      const res = await fetch(`http://localhost:8000/trips/${activeTrip.id}/start`, { method: 'POST' });
      if (res.ok) {
        alert("Trip started! 10-minute boarding window is now active.");
        if (dbDriverId) loadDriverData(dbDriverId);
      }
    } catch (e) {
      alert("Error starting trip");
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    try {
      const res = await fetch(`http://localhost:8000/trips/${activeTrip.id}/end`, { method: 'POST' });
      if (res.ok) {
        alert("Trip completed successfully!");
        if (dbDriverId) loadDriverData(dbDriverId);
      }
    } catch (e) {
      alert("Error ending trip");
    }
  };

  const handleKnockAction = async (knockId: number, status: 'accepted' | 'ignored') => {
    try {
      const res = await fetch(`http://localhost:8000/knocks/${knockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        // Refresh knocks list
        setLiveKnocks(liveKnocks.filter(k => k.id !== knockId));
        alert(`Passenger request ${status}!`);
        if (dbDriverId) loadDriverData(dbDriverId);
      }
    } catch (e) {
      alert("Error handling passenger request.");
    }
  };

  const getBookedCount = () => {
    if (!seatsData || !seatsData.bookings) return 0;
    return Object.values(seatsData.bookings).filter((b: any) => b.status === 'confirmed' || b.status === 'boarded').length;
  };

  const getAvailableCount = () => {
    if (!seatsData || !seatsData.all_seats) return 0;
    return seatsData.all_seats.length - getBookedCount();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full overflow-x-hidden">
      {/* Navbar */}
      <nav className="bg-white border-b px-4 md:px-8 py-4 flex flex-wrap items-center justify-between z-10 sticky top-0 shadow-sm">
        <div className="flex items-center space-x-3 mb-2 sm:mb-0">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
            <img src="/dst_logo.png" alt="DST Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 leading-tight">Daffodil Smart Transport</h1>
            <p className="text-primary font-semibold text-sm leading-tight">Driver Panel</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div 
            className="flex items-center space-x-3 border-l border-gray-200 pl-6 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setProfileModalOpen(true)}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shadow-sm">D</div>
            <div className="hidden sm:block">
              <p className="font-bold text-sm text-gray-800">{driverNameState || driver?.user_metadata?.full_name || 'Driver'}</p>
              <p className="text-xs text-gray-500 font-medium">Bus: {activeTrip?.bus?.name || 'Unassigned'}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2 rounded-xl text-sm transition-colors border border-red-100">
            Logout
          </button>
        </div>
      </nav>

      {loading ? (
        <div className="flex-1 flex items-center justify-center font-bold text-lg text-gray-600">Loading Dashboard...</div>
      ) : (
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Welcome Banner */}
          <div className="lg:col-span-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-3xl p-6 md:p-10 border border-blue-100 flex items-center justify-between relative overflow-hidden shadow-sm">
             <div className="z-10 relative">
               <p className="text-gray-600 font-bold tracking-wide uppercase text-sm mb-1">Welcome back,</p>
               <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">{driverNameState || driver?.user_metadata?.full_name || 'Driver'}</h2>
               <p className="text-gray-500 mt-2 font-medium">Have a safe trip today!</p>
             </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:col-span-3">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-primary text-2xl font-bold">🗺️</div>
              <div>
                <p className="text-sm font-bold text-gray-500">Completed Trips</p>
                <p className="text-3xl font-extrabold text-gray-800">{completedCount}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl font-bold">📆</div>
              <div>
                <p className="text-sm font-bold text-gray-500">Remaining Trips</p>
                <p className="text-3xl font-extrabold text-gray-800">{scheduledCount}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-primary text-2xl font-bold">🚌</div>
              <div>
                <p className="text-sm font-bold text-gray-500">Bus Status</p>
                <p className="text-3xl font-extrabold text-gray-800">
                  {activeTrip?.status === 'active' ? 'Running' : activeTrip?.status === 'scheduled' ? 'Boarding' : 'Stopped'}
                </p>
              </div>
            </div>
          </div>

          {/* Left Column */}
          <div className="space-y-6 lg:col-span-1">
            {/* Active Route */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="font-extrabold text-xl mb-6 text-gray-800">Active Route Info</h3>
              {activeTrip ? (
                <div className="space-y-5">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-gray-500 font-medium">Route</span>
                    <span className="font-bold text-gray-800">{activeTrip.route?.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-gray-500 font-medium">Departure</span>
                    <span className="font-bold text-gray-800">
                      {new Date(activeTrip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                    <span className="text-gray-500 font-medium">Bus Fleet</span>
                    <span className="font-bold text-gray-800">{activeTrip.bus?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Status</span>
                    <span className={`font-bold px-3 py-1 rounded-full text-xs uppercase ${activeTrip.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {activeTrip.status}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    {activeTrip.status === 'scheduled' && (
                      <button onClick={handleStartTrip} className="flex-1 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl py-3.5 shadow-md shadow-primary/20 transition-all">
                        Start Trip
                      </button>
                    )}
                    {activeTrip.status === 'active' && (
                      <button onClick={handleEndTrip} className="flex-1 bg-danger hover:bg-red-600 text-white font-extrabold rounded-xl py-3.5 shadow-md shadow-red-500/20 transition-all">
                        End Trip
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No active or scheduled trip assigned for today.</p>
              )}
            </div>

            {/* Seat Overview */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
               <h3 className="font-extrabold text-xl mb-6 text-gray-800">Seat Overview</h3>
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                     <p className="text-gray-500 font-bold text-xs mb-1 uppercase">Booked</p>
                     <p className="text-3xl font-extrabold text-primary">{getBookedCount()}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                     <p className="text-gray-500 font-bold text-xs mb-1 uppercase">Available</p>
                     <p className="text-3xl font-extrabold text-gray-800">{getAvailableCount()}</p>
                  </div>
               </div>
               
               {/* Visual seat map */}
               {seatsData && seatsData.all_seats ? (
                 <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold max-w-[220px] mx-auto bg-gray-50 p-4 rounded-xl border">
                    {seatsData.all_seats.map((seat: string) => {
                      const booking = seatsData.bookings[seat];
                      const isBooked = booking && (booking.status === 'confirmed' || booking.status === 'boarded');
                      const isBoarded = booking && booking.status === 'boarded';
                      
                      return (
                        <div 
                          key={seat} 
                          className={`py-2 rounded-lg font-bold border transition-all ${isBoarded ? 'bg-primary text-white border-primary' : isBooked ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white text-gray-400 border-gray-200'}`}
                          title={booking ? `${booking.user_name} (${booking.status})` : 'Empty'}
                        >
                          {seat}
                        </div>
                      );
                    })}
                 </div>
               ) : (
                 <p className="text-xs text-gray-500 text-center">Seats detail will load when a trip starts.</p>
               )}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Passenger Requests (Knocks) */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-extrabold text-xl flex items-center text-gray-800">
                  Live Requests 
                  {liveKnocks.filter(k => k.status === 'pending').length > 0 && (
                    <span className="ml-3 bg-danger text-white text-xs px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                      {liveKnocks.filter(k => k.status === 'pending').length} New
                    </span>
                  )}
                </h3>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {liveKnocks.filter(k => k.status === 'pending').map(knock => (
                  <div key={knock.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-gray-100 rounded-2xl p-4 hover:border-green-200 transition-colors bg-gray-50">
                    <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                      <div className="w-12 h-12 bg-white border rounded-full flex items-center justify-center text-2xl shadow-sm">👤</div>
                      <div>
                        <p className="font-bold text-gray-900">Passenger Request</p>
                        <p className="text-xs font-semibold text-gray-500">User #{knock.user_id}</p>
                        <p className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200 inline-block mt-1">
                          Distance: <span className="text-primary">{(knock.distance * 1000).toFixed(0)}m</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleKnockAction(knock.id, 'accepted')}
                        className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleKnockAction(knock.id, 'ignored')}
                        className="bg-white border border-gray-200 text-gray-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-100 transition-all"
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                ))}
                
                {liveKnocks.filter(k => k.status === 'pending').length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No active live requests from nearby passengers.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
               <h3 className="font-extrabold text-xl mb-6 text-gray-800">Live GPS Location</h3>
               <div className="h-[250px] bg-blue-50 rounded-2xl mb-6 relative overflow-hidden flex items-center justify-center border border-gray-200 shadow-inner z-0">
                  <LiveMap 
                     busLat={23.8759} 
                     busLng={90.3205} 
                     showUser={false} 
                     passengers={liveKnocks.filter((k: any) => k.status === 'accepted').map((k: any) => ({
                       lat: 23.8759 - (k.distance * 0.009), 
                       lng: 90.3205 - (k.distance * 0.009), 
                       name: `User #${k.user_id}`
                     }))} 
                  />
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                     <div className="text-primary text-3xl bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">⏱️</div>
                     <div>
                       <p className="text-xs font-bold text-gray-500 uppercase">Speed</p>
                       <p className="font-extrabold text-xl text-gray-900">{activeTrip?.status === 'active' ? '38' : '0'} <span className="text-sm font-semibold text-gray-400">KM/H</span></p>
                     </div>
                  </div>
                  <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                     <div className="text-primary text-3xl bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">👥</div>
                     <div>
                       <p className="text-xs font-bold text-gray-500 uppercase">Seated</p>
                       <p className="font-extrabold text-xl text-gray-900">
                         {seatsData && seatsData.bookings ? Object.values(seatsData.bookings).filter((b: any) => b.status === 'boarded').length : 0}
                       </p>
                     </div>
                  </div>
                  <div className="flex items-center space-x-4 bg-primary p-4 rounded-2xl shadow-md text-white col-span-2 md:col-span-1">
                     <div className="text-3xl bg-white/20 w-12 h-12 rounded-full flex items-center justify-center">🟢</div>
                     <div>
                       <p className="text-xs font-bold text-green-100 uppercase">GPS Status</p>
                       <p className="font-extrabold text-xl">{activeTrip?.status === 'active' ? 'Active' : 'Offline'}</p>
                     </div>
                  </div>
               </div>
            </div>
            
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-fade-in">
            <button onClick={() => setProfileModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl font-bold">×</button>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-6 text-center">Edit Driver Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Full Name</label>
                <input type="text" value={driverNameState} onChange={(e) => setDriverNameState(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-gray-800 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Phone Number</label>
                <input type="tel" value={driverPhoneState} onChange={(e) => setDriverPhoneState(e.target.value)} placeholder="e.g. 01700000000" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-gray-800 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Change Password</label>
                <input type="password" placeholder="Enter new password" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-gray-800 font-bold" />
              </div>
              <button onClick={async () => { 
                try {
                  const updates: any = {};
                  if (driverNameState) updates.data = { full_name: driverNameState };
                  const { error } = await supabase.auth.updateUser(updates);
                  if (error) throw error;
                  alert('Profile Updated Successfully!'); 
                  setProfileModalOpen(false); 
                } catch (e: any) {
                  alert(e.message || 'Error updating profile');
                }
              }} className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl py-3.5 mt-4 transition-all shadow-lg shadow-primary/30">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
