'use client';
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminNameState, setAdminNameState] = useState('Admin');
  const [adminEmailState, setAdminEmailState] = useState('admin@daffodil.edu');

  // Form States
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [createdDriverPassword, setCreatedDriverPassword] = useState('');

  const [busName, setBusName] = useState('');
  const [busCapacity, setBusCapacity] = useState(40);

  const [routeName, setRouteName] = useState('');
  const [routeStart, setRouteStart] = useState('');
  const [routeEnd, setRouteEnd] = useState('');

  // Trip Scheduling States
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  // Dynamic Seat Generator: 4 seats per row (A1-A4, B1-B4 etc.)
  const generateSeats = (capacity: number): string => {
    const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const seats: string[] = [];
    let row = 0;
    let col = 1;
    for (let i = 0; i < capacity; i++) {
      seats.push(`${rows[row]}${col}`);
      col++;
      if (col > 4) { col = 1; row++; }
    }
    return seats.join(',');
  };

  const ALL_SEATS_FROM_CAPACITY = (capacity: number) => generateSeats(capacity).split(',');

  // Seat Configuration States
  const [selectedBusForSeats, setSelectedBusForSeats] = useState<any>(null);
  const [configuredSeats, setConfiguredSeats] = useState<string[]>([]);

  // Edit Modal State
  const [editModal, setEditModal] = useState<{
    open: boolean;
    type: 'bus' | 'route' | 'trip' | null;
    id: number;
    fields: { label: string; key: string; value: string; type?: string }[];
  }>({ open: false, type: null, id: 0, fields: [] });

  const openEditModal = (type: 'bus' | 'route' | 'trip', id: number, fields: { label: string; key: string; value: string; type?: string }[]) => {
    setEditModal({ open: true, type, id, fields });
  };

  const closeEditModal = () => setEditModal({ open: false, type: null, id: 0, fields: [] });

  const handleEditModalSave = async () => {
    const { type, id, fields } = editModal;
    const body: any = {};
    fields.forEach(f => { body[f.key] = f.type === 'number' ? Number(f.value) : f.value; });
    let url = '';
    if (type === 'bus') url = `http://localhost:8000/buses/${id}`;
    else if (type === 'route') url = `http://localhost:8000/routes/${id}`;
    else if (type === 'trip') url = `http://localhost:8000/trips/${id}`;
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) { closeEditModal(); fetchData(); }
      else alert('Failed to update.');
    } catch (e) { alert('Error updating.'); }
  };

  // Data States for Tabs
  const [usersList, setUsersList] = useState<any[]>([]);
  const [busesList, setBusesList] = useState<any[]>([]);
  const [routesList, setRoutesList] = useState<any[]>([]);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [tripsList, setTripsList] = useState<any[]>([]);

  // Analytics & Reports States
  const [timeFilter, setTimeFilter] = useState('1 Week');
  const [reportBusId, setReportBusId] = useState('');
  const [reportIssue, setReportIssue] = useState('');
  const [reportsList, setReportsList] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      // Fetch users
      const usersRes = await fetch('http://localhost:8000/users/');
      if (usersRes.ok) setUsersList(await usersRes.json());

      // Fetch buses
      const busesRes = await fetch('http://localhost:8000/buses/');
      if (busesRes.ok) setBusesList(await busesRes.json());

      // Fetch routes
      const routesRes = await fetch('http://localhost:8000/routes/');
      if (routesRes.ok) setRoutesList(await routesRes.json());

      // Fetch bookings
      const bookingsRes = await fetch('http://localhost:8000/bookings/');
      if (bookingsRes.ok) setBookingsList(await bookingsRes.json());

      // Fetch trips
      const tripsRes = await fetch('http://localhost:8000/trips/');
      if (tripsRes.ok) setTripsList(await tripsRes.json());

      // Fetch maintenance reports
      const reportsRes = await fetch('http://localhost:8000/reports/');
      if (reportsRes.ok) setReportsList(await reportsRes.json());

    } catch (error) {
      console.warn("Backend is not running or accessible.", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate an 8-character password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let autoPassword = '';
    for(let i = 0; i < 8; i++) {
        autoPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { data, error } = await supabase.auth.signUp({
      email: driverEmail,
      password: autoPassword,
      options: {
        data: {
          full_name: driverName,
          role: 'driver'
        }
      }
    });

    if (error) {
      alert(error.message);
    } else {
      // Sync driver user details to FastAPI database
      try {
        const syncRes = await fetch('http://localhost:8000/users/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: driverName,
            email: driverEmail,
            university_id: `DRIVER-${Math.floor(Math.random() * 9000) + 1000}`,
            role: 'driver',
            password: 'supabaseauthsync'
          })
        });
        if (syncRes.ok) {
          fetchData();
        }
      } catch (dbErr) {
        console.error("Error syncing driver to DB:", dbErr);
      }

      setCreatedDriverPassword(autoPassword);
      setDriverName(''); setDriverEmail('');
    }
  };

  const handleCreateBus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const defaultSeats = generateSeats(busCapacity);
      const res = await fetch('http://localhost:8000/buses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: busName, capacity: busCapacity, status: 'active', seats: defaultSeats })
      });
      if (!res.ok) throw new Error("Failed to create bus");
      const newBus = await res.json();
      alert("Bus Created Successfully!");
      setBusesList([...busesList, newBus]);
      setBusName(''); setBusCapacity(40);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/routes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: routeName, start_point: routeStart, end_point: routeEnd })
      });
      if (!res.ok) throw new Error("Failed to create route");
      const newRoute = await res.json();
      alert("Route Created Successfully!");
      setRoutesList([...routesList, newRoute]);
      setRouteName(''); setRouteStart(''); setRouteEnd('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusId || !selectedRouteId || !selectedDriverId || !departureTime) {
      return alert("Please fill out all schedule fields!");
    }
    try {
      // departureTime is '2026-06-09T20:00' -> needs timezone for ISO
      const formattedTime = new Date(departureTime).toISOString();
      const res = await fetch('http://localhost:8000/trips/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bus_id: Number(selectedBusId),
          route_id: Number(selectedRouteId),
          driver_id: Number(selectedDriverId),
          departure_time: formattedTime,
          status: 'scheduled'
        })
      });
      if (!res.ok) throw new Error("Failed to create schedule");
      alert("Trip Scheduled Successfully!");
      setSelectedBusId(''); setSelectedRouteId(''); setSelectedDriverId(''); setDepartureTime('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBus = async (id: number) => {
    if (!confirm("Are you sure you want to delete this bus?")) return;
    try {
      const res = await fetch(`http://localhost:8000/buses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Bus deleted successfully");
        fetchData();
      } else {
        alert("Failed to delete bus");
      }
    } catch (e) {
      alert("Error deleting bus");
    }
  };

  const handleUpdateBus = (b: any) => {
    openEditModal('bus', b.id, [
      { label: 'Bus Name/ID', key: 'name', value: b.name },
      { label: 'Seat Capacity', key: 'capacity', value: String(b.capacity), type: 'number' },
      { label: 'Status', key: 'status', value: b.status },
    ]);
  };

  const handleDeleteRoute = async (id: number) => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    try {
      const res = await fetch(`http://localhost:8000/routes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Route deleted successfully");
        fetchData();
      }
    } catch (e) {
      alert("Error deleting route");
    }
  };

  const handleUpdateRoute = (r: any) => {
    openEditModal('route', r.id, [
      { label: 'Route Name', key: 'name', value: r.name },
      { label: 'Start Point', key: 'start_point', value: r.start_point },
      { label: 'End Point', key: 'end_point', value: r.end_point },
    ]);
  };

  const handleDeleteTrip = async (id: number) => {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    try {
      const res = await fetch(`http://localhost:8000/trips/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Trip deleted successfully");
        fetchData();
      }
    } catch (e) {
      alert("Error deleting trip");
    }
  };

  const handleUpdateTrip = (t: any) => {
    openEditModal('trip', t.id, [
      { label: 'Status (scheduled/active/completed)', key: 'status', value: t.status },
    ]);
  };

  const loadBusSeats = async (bus: any) => {
    setSelectedBusForSeats(bus);
    try {
      const res = await fetch(`http://localhost:8000/buses/${bus.id}/seats`);
      if (res.ok) {
        const data = await res.json();
        setConfiguredSeats(data.seats);
      }
    } catch (e) {
      console.error("Error loading seats", e);
    }
  };

  const toggleSeat = (seat: string) => {
    if (configuredSeats.includes(seat)) {
      setConfiguredSeats(configuredSeats.filter(s => s !== seat));
    } else {
      setConfiguredSeats([...configuredSeats, seat]);
    }
  };

  const saveSeatConfig = async () => {
    if (!selectedBusForSeats) return;
    try {
      const res = await fetch(`http://localhost:8000/buses/${selectedBusForSeats.id}/seats`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configuredSeats)
      });
      if (res.ok) {
        alert("Seat layout updated successfully!");
        setSelectedBusForSeats(null);
        fetchData();
      }
    } catch (e) {
      alert("Error saving seats configuration.");
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportBusId) return alert("Please select a bus.");
    try {
      const res = await fetch('http://localhost:8000/reports/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bus_id: Number(reportBusId), issue_description: reportIssue, reported_by: 1 }) // 1 is mock admin ID
      });
      if (res.ok) {
        alert("Maintenance Report submitted successfully!");
        setReportBusId(''); setReportIssue('');
        fetchData();
      }
    } catch (e) {
      alert("Error submitting report.");
    }
  };

  const getChartData = () => {
    if (timeFilter === '1 Day') {
      return [
        { time: '08:00', bookings: 12, trips: 2 },
        { time: '12:00', bookings: 45, trips: 5 },
        { time: '16:00', bookings: 30, trips: 4 },
        { time: '20:00', bookings: 15, trips: 2 },
      ];
    } else if (timeFilter === '1 Week') {
      return [
        { time: 'Mon', bookings: 120, trips: 15 },
        { time: 'Tue', bookings: 132, trips: 16 },
        { time: 'Wed', bookings: 101, trips: 12 },
        { time: 'Thu', bookings: 143, trips: 18 },
        { time: 'Fri', bookings: 90, trips: 10 },
        { time: 'Sat', bookings: 40, trips: 5 },
        { time: 'Sun', bookings: 30, trips: 4 },
      ];
    } else {
      return [
        { time: 'Week 1', bookings: 500, trips: 60 },
        { time: 'Week 2', bookings: 620, trips: 75 },
        { time: 'Week 3', bookings: 480, trips: 55 },
        { time: 'Week 4', bookings: 710, trips: 85 },
      ];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">

      {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={closeEditModal}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-gray-800 capitalize">Edit {editModal.type}</h2>
              <button onClick={closeEditModal} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">✕</button>
            </div>
            <div className="space-y-4">
              {editModal.fields.map((field, idx) => (
                <div key={field.key}>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">{field.label}</label>
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={field.value}
                    onChange={e => {
                      const updated = [...editModal.fields];
                      updated[idx] = { ...updated[idx], value: e.target.value };
                      setEditModal(prev => ({ ...prev, fields: updated }));
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800 font-medium"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleEditModalSave} className="flex-1 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl py-3.5 transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.02]">
                Save Changes
              </button>
              <button onClick={closeEditModal} className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl py-3.5 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white z-50 p-4 border-b flex justify-between items-center shadow-sm">
         <div className="flex items-center space-x-3">
           <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs">DST</div>
           <span className="font-bold text-sm">Admin</span>
         </div>
         <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-800 focus:outline-none p-2">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path></svg>
         </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`w-64 bg-[#0A4D20] text-white flex flex-col min-h-screen fixed z-40 transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-lg`}>
        <div className="p-6 flex items-center space-x-3 border-b border-green-800 mt-14 md:mt-0">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary font-bold text-sm shadow-md overflow-hidden">
            <img src="/dst_logo.png" alt="DST Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">Daffodil Smart<br/>Transport</h1>
            <p className="text-green-300 text-xs mt-1">Admin Panel</p>
          </div>
        </div>
        
        <nav className="flex-1 py-6 space-y-1.5 px-4 overflow-y-auto">
          {[
            { id: 'Dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'Users', label: 'Users', icon: '👤' },
            { id: 'Drivers', label: 'Drivers', icon: '🧑‍✈️' },
            { id: 'Buses', label: 'Buses', icon: '🚌' },
            { id: 'Routes', label: 'Routes', icon: '🗺️' },
            { id: 'Schedules', label: 'Schedules', icon: '📆' },
            { id: 'Bookings', label: 'Bookings', icon: '📅' },
            { id: 'Analytics', label: 'Analytics', icon: '📈' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }} 
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id ? 'bg-white text-primary shadow-md' : 'text-green-100 hover:bg-green-800'}`}
            >
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-green-800">
           <button onClick={() => window.location.href = '/login'} className="flex items-center space-x-3 text-green-100 hover:text-white hover:bg-red-600 px-4 py-3 w-full rounded-xl transition-colors font-bold">
             <span>🚪</span>
             <span>Log Out</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 mt-16 md:mt-0 w-full min-w-0">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">{activeTab === 'Dashboard' ? 'Dashboard' : activeTab}</h2>
            <p className="text-gray-500 font-medium">{activeTab === 'Dashboard' ? 'System Overview & Activity summary' : `Manage ${activeTab.toLowerCase()} effectively.`}</p>
          </div>
          <div className="flex items-center space-x-4 w-full sm:w-auto">
             <div 
               className="flex items-center space-x-3 pl-4 border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
               onClick={() => setProfileModalOpen(true)}
             >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shadow-sm">{adminNameState.charAt(0).toUpperCase()}</div>
                <div>
                  <p className="font-bold text-sm text-gray-800">{adminNameState}</p>
                  <p className="text-xs text-gray-500 font-medium">Super Admin</p>
                </div>
             </div>
          </div>
        </header>

        {activeTab === 'Dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { name: 'Total Students', count: usersList.filter(u => u.role === 'student').length, emoji: '👨‍🎓', color: 'text-primary' },
                { name: 'Total Drivers', count: usersList.filter(u => u.role === 'driver').length, emoji: '🧑‍✈️', color: 'text-blue-500' },
                { name: 'Total Buses', count: busesList.length, emoji: '🚌', color: 'text-purple-500' },
                { name: 'Active Trips', count: tripsList.filter(t => t.status === 'active').length, emoji: '📈', color: 'text-green-500' },
                { name: 'Bookings Today', count: bookingsList.filter(b => new Date(b.trip?.departure_time).toDateString() === new Date().toDateString()).length, emoji: '📅', color: 'text-orange-500' },
                { name: 'Pending Issues', count: reportsList.filter(r => r.status === 'pending').length, emoji: '⚠️', color: 'text-red-500' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                     <div>
                       <p className="text-gray-500 font-semibold text-xs mb-1">{stat.name}</p>
                       <h3 className="text-2xl font-bold text-gray-800">{stat.count}</h3>
                     </div>
                     <div className={`${stat.color} text-xl`}>{stat.emoji}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Map Placeholder */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800">Live Bus Tracking</h3>
                  <button className="text-primary text-xs font-bold" onClick={() => setActiveTab('Schedules')}>View All</button>
                </div>
                <div className="h-[200px] bg-blue-50 rounded-xl relative overflow-hidden border border-gray-200 flex items-center justify-center mb-4">
                   <div className="absolute inset-0 opacity-40 bg-cover" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
                   <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-md"></div>
                   <div className="absolute top-1/2 right-1/3 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-md"></div>
                </div>
                
                <div className="space-y-3 flex-1 overflow-y-auto">
                   {tripsList.filter(t => t.status === 'active').map(trip => (
                     <div key={trip.id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2">
                        <span className="font-bold text-gray-800 flex items-center"><span className="text-gray-400 mr-2">🚌</span>{trip.bus?.name || 'Bus'}</span>
                        <span className="text-gray-500">{trip.route?.name}</span>
                        <span className="font-semibold text-gray-600">{trip.speed || 35} KM/H</span>
                        <span className="text-primary font-bold">On Route •</span>
                     </div>
                   ))}
                   {tripsList.filter(t => t.status === 'active').length === 0 && (
                     <p className="text-xs text-gray-500 text-center py-4">No active trips currently running.</p>
                   )}
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800">Recent Bookings</h3>
                  <button className="text-primary text-xs font-bold" onClick={() => setActiveTab('Bookings')}>View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100">
                        <th className="pb-3 font-medium">Student Name</th>
                        <th className="pb-3 font-medium">Route</th>
                        <th className="pb-3 font-medium">Seat</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bookingsList.slice(-4).reverse().map(booking => (
                        <tr key={booking.id}>
                          <td className="py-3 font-bold text-gray-800">{booking.user?.name}</td>
                          <td className="py-3 text-gray-500">{booking.trip?.route?.name || 'Main Route'}</td>
                          <td className="py-3 font-bold text-gray-700">{booking.seat_number}</td>
                          <td className="py-3 text-gray-500">{new Date(booking.trip?.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${booking.status === 'boarded' ? 'bg-green-100 text-green-700' : booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{booking.status}</span></td>
                        </tr>
                      ))}
                      {bookingsList.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-gray-500">No bookings made yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-xl">
               <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setActiveTab('Buses')} className="bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl py-3 shadow-md flex items-center justify-between px-4 transition-all">
                    <span className="flex items-center"><span className="mr-2">🚌</span> Add Bus</span><span>›</span>
                  </button>
                  <button onClick={() => setActiveTab('Drivers')} className="bg-[#0A4D20] hover:bg-green-950 text-white text-sm font-bold rounded-xl py-3 shadow-md flex items-center justify-between px-4 transition-all">
                    <span className="flex items-center"><span className="mr-2">👤</span> Add Driver</span><span>›</span>
                  </button>
                  <button onClick={() => setActiveTab('Routes')} className="bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl py-3 shadow-md flex items-center justify-between px-4 transition-all">
                    <span className="flex items-center"><span className="mr-2">🗺️</span> Add Route</span><span>›</span>
                  </button>
                  <button onClick={() => setActiveTab('Schedules')} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl py-3 shadow-md flex items-center justify-between px-4 transition-all">
                    <span className="flex items-center"><span className="mr-2">📆</span> Schedule Trip</span><span>›</span>
                  </button>
               </div>
            </div>
          </>
        )}

        {activeTab === 'Users' && (
          <div className="bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">All Registered Users</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase">
                    <th className="p-4 font-bold rounded-tl-xl">ID</th>
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersList.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No users found in database.</td></tr>}
                  {usersList.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-800">#{u.id}</td>
                      <td className="p-4 text-gray-700">{u.name}</td>
                      <td className="p-4 text-gray-500">{u.email}</td>
                      <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'driver' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{u.role}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Drivers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-sm h-fit">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Register New Driver</h3>
              <form onSubmit={handleCreateDriver} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Driver Name</label>
                  <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input type="email" value={driverEmail} onChange={(e) => setDriverEmail(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800" />
                </div>
                <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl py-4 mt-6 transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.02]">
                  Create Driver Account
                </button>
              </form>
              
              {createdDriverPassword && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col space-y-3">
                  <p className="text-sm text-green-800 font-bold flex items-center"><span className="mr-2 text-lg">✅</span> Driver Account Created Successfully!</p>
                  <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-green-200 shadow-sm">
                    <span className="font-mono text-gray-800 font-bold tracking-wider">{createdDriverPassword}</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        navigator.clipboard.writeText(createdDriverPassword);
                        alert('Password copied to clipboard!');
                      }}
                      className="text-primary font-bold text-xs bg-green-100 px-4 py-2 rounded-md hover:bg-green-200 transition-colors shadow-sm">
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-green-600 font-medium">Please copy and share this temporary password with the driver.</p>
                </div>
              )}
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-xl mb-4 text-gray-800">Existing Drivers</h3>
              <ul className="space-y-3">
                {usersList.filter((u:any) => u.role === 'driver').length === 0 && <p className="text-gray-500">No drivers registered yet.</p>}
                {usersList.filter((u:any) => u.role === 'driver').map((d: any) => (
                   <li key={d.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                     <span className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">D</span>
                     <div><p className="font-bold text-gray-800">{d.name}</p><p className="text-xs text-gray-500">{d.email}</p></div>
                   </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'Buses' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-sm h-fit">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Add New Bus</h3>
              <form onSubmit={handleCreateBus} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Bus Name/ID</label>
                  <input type="text" placeholder="e.g. BUS-01" value={busName} onChange={(e) => setBusName(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Seat Capacity</label>
                  <input type="number" min={10} max={40} value={busCapacity} onChange={(e) => setBusCapacity(Number(e.target.value))} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800" />
                </div>
                <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl py-4 mt-6 transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.02]">
                  Register Bus
                </button>
              </form>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="font-bold text-xl mb-4 text-gray-800">Bus Fleet Database</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                   {busesList.length === 0 && <p className="text-gray-500">No buses added yet.</p>}
                   {busesList.map((b: any) => (
                       <div key={b.id} className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100/50 rounded-xl border border-gray-100 cursor-pointer" onClick={() => loadBusSeats(b)}>
                         <div>
                           <p className="font-bold text-gray-800">{b.name}</p>
                           <p className="text-xs text-gray-500">Capacity: {b.capacity} Seats (Click to Configure)</p>
                         </div>
                         <div className="flex items-center space-x-3">
                           <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">{b.status}</span>
                           <button onClick={(e) => { e.stopPropagation(); handleUpdateBus(b); }} className="text-blue-500 hover:text-blue-700" title="Edit">✏️</button>
                           <button onClick={(e) => { e.stopPropagation(); handleDeleteBus(b.id); }} className="text-red-500 hover:text-red-700" title="Delete">🗑️</button>
                         </div>
                       </div>
                   ))}
                </div>
              </div>

              {selectedBusForSeats && (
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">Configure Seats for: <span className="text-primary">{selectedBusForSeats.name}</span></h3>
                  <p className="text-xs text-gray-500 mb-4">Click seats to enable/disable them for booking. Green represents enabled seats.</p>
                  
                  <div className="grid grid-cols-4 gap-2 max-w-[280px] bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-4">
                    {ALL_SEATS_FROM_CAPACITY(selectedBusForSeats.capacity).map(seat => {
                      const isActive = configuredSeats.includes(seat);
                      return (
                        <button
                          key={seat}
                          type="button"
                          onClick={() => toggleSeat(seat)}
                          className={`py-2 rounded-lg font-bold text-xs border transition-all ${isActive ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-200'}`}
                        >
                          {seat}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex space-x-3">
                    <button onClick={saveSeatConfig} className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm">
                      Save Layout
                    </button>
                    <button onClick={() => setSelectedBusForSeats(null)} className="bg-white border border-gray-200 text-gray-600 text-xs font-bold px-4 py-2.5 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Routes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-sm h-fit">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Add New Route</h3>
              <form onSubmit={handleCreateRoute} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Route Name</label>
                  <input type="text" placeholder="e.g. DSA to Mirpur" value={routeName} onChange={(e) => setRouteName(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Start Point</label>
                  <input type="text" placeholder="e.g. DSA" value={routeStart} onChange={(e) => setRouteStart(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">End Point</label>
                  <input type="text" placeholder="e.g. Mirpur 10" value={routeEnd} onChange={(e) => setRouteEnd(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800" />
                </div>
                <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl py-4 mt-6 transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.02]">
                  Create Route
                </button>
              </form>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-xl mb-4 text-gray-800">Active Routes</h3>
              <div className="space-y-3">
                 {routesList.length === 0 && <p className="text-gray-500">No routes added yet.</p>}
                 {routesList.map((r: any) => (
                    <div key={r.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-primary mb-2">{r.name}</p>
                        <div className="flex items-center text-sm text-gray-600">
                           <span>{r.start_point}</span>
                           <span className="mx-2 text-gray-300">→</span>
                           <span>{r.end_point}</span>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button onClick={() => handleUpdateRoute(r)} className="text-blue-500 hover:text-blue-700" title="Edit">✏️</button>
                        <button onClick={() => handleDeleteRoute(r.id)} className="text-red-500 hover:text-red-700" title="Delete">🗑️</button>
                      </div>
                    </div>
                 ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Schedules' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm h-fit">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Schedule Trip</h3>
              <form onSubmit={handleCreateSchedule} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Bus</label>
                  <select 
                    value={selectedBusId} 
                    onChange={e => setSelectedBusId(e.target.value)} 
                    required 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800"
                  >
                    <option value="">Select Bus</option>
                    {busesList.map(bus => <option key={bus.id} value={bus.id}>{bus.name} (Cap: {bus.capacity})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Route</label>
                  <select 
                    value={selectedRouteId} 
                    onChange={e => setSelectedRouteId(e.target.value)} 
                    required 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800"
                  >
                    <option value="">Select Route</option>
                    {routesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Assign Driver</label>
                  <select 
                    value={selectedDriverId} 
                    onChange={e => setSelectedDriverId(e.target.value)} 
                    required 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800"
                  >
                    <option value="">Select Driver</option>
                    {usersList.filter(u => u.role === 'driver').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Departure Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={departureTime} 
                    onChange={e => setDepartureTime(e.target.value)} 
                    required 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-gray-800"
                  />
                </div>
                <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold rounded-xl py-4 mt-6 transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.02]">
                  Add Time Schedule
                </button>
              </form>
            </div>
            
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <h3 className="font-bold text-xl mb-4 text-gray-800">Scheduled Trips List</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase">
                      <th className="p-4 font-bold rounded-tl-xl">Trip ID</th>
                      <th className="p-4 font-bold">Bus</th>
                      <th className="p-4 font-bold">Route</th>
                      <th className="p-4 font-bold">Driver</th>
                      <th className="p-4 font-bold">Departure Time</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tripsList.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-500">No scheduled trips found.</td></tr>}
                    {tripsList.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-4 font-bold text-gray-800">#{t.id}</td>
                        <td className="p-4 font-bold text-gray-700">{t.bus?.name}</td>
                        <td className="p-4 text-gray-700">{t.route?.name}</td>
                        <td className="p-4 text-gray-500">{t.driver?.name || 'Unassigned'}</td>
                        <td className="p-4 text-gray-500">{new Date(t.departure_time).toLocaleString()}</td>
                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.status === 'completed' ? 'bg-gray-100 text-gray-600' : t.status === 'active' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-blue-100 text-blue-700'}`}>{t.status}</span></td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <button onClick={() => handleUpdateTrip(t)} className="text-blue-500 hover:text-blue-700" title="Edit Status">✏️</button>
                            <button onClick={() => handleDeleteTrip(t.id)} className="text-red-500 hover:text-red-700" title="Delete">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Bookings' && (
          <div className="bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">All Database Bookings</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase">
                    <th className="p-4 font-bold rounded-tl-xl">Booking ID</th>
                    <th className="p-4 font-bold">Passenger Name</th>
                    <th className="p-4 font-bold">Trip / Route</th>
                    <th className="p-4 font-bold">Seat Number</th>
                    <th className="p-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookingsList.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No bookings found in database.</td></tr>}
                  {bookingsList.map((b: any) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-800">#{b.id}</td>
                      <td className="p-4 text-gray-700">{b.user?.name} (#{b.user_id})</td>
                      <td className="p-4 text-gray-500">Trip #{b.trip_id} - {b.trip?.route?.name}</td>
                      <td className="p-4 font-bold text-primary">{b.seat_number}</td>
                      <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${b.status === 'boarded' ? 'bg-green-100 text-green-700' : b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Analytics' && (
          <div className="space-y-8">
            <div className="bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h3 className="text-2xl font-bold text-gray-800">Booking & Trip Analytics</h3>
                <div className="flex space-x-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                  {['1 Day', '1 Week', '1 Month'].map(f => (
                    <button 
                      key={f} 
                      onClick={() => setTimeFilter(f)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeFilter === f ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-[300px]">
                  <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider text-center">Bookings Trend</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                      <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Line type="monotone" dataKey="bookings" stroke="#16a34a" strokeWidth={4} dot={{r: 4, fill: '#16a34a', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="h-[300px]">
                  <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider text-center">Trips Executed</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="trips" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-sm h-fit">
                <h3 className="text-2xl font-bold mb-6 text-gray-800">Generate Maintenance Report</h3>
                <form onSubmit={handleCreateReport} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Bus with Issue</label>
                    <select 
                      value={reportBusId} 
                      onChange={e => setReportBusId(e.target.value)} 
                      required 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-gray-800"
                    >
                      <option value="">Select Bus</option>
                      {busesList.map(bus => <option key={bus.id} value={bus.id}>{bus.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Issue Description</label>
                    <textarea 
                      value={reportIssue} 
                      onChange={e => setReportIssue(e.target.value)} 
                      required 
                      rows={4}
                      placeholder="Describe the defect or maintenance needed..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-gray-800 resize-none"
                    ></textarea>
                  </div>
                  <button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-xl py-4 mt-6 transition-all shadow-lg shadow-red-500/30 transform hover:scale-[1.02]">
                    Submit Issue Report
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-xl mb-4 text-gray-800">Recent Maintenance Reports</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                   {reportsList.length === 0 && <p className="text-gray-500">No issues reported yet.</p>}
                   {reportsList.map((rep: any) => (
                      <div key={rep.id} className="p-4 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-red-800 flex items-center">
                            <span className="mr-2">⚠️</span> Bus: {busesList.find(b => b.id === rep.bus_id)?.name || `ID #${rep.bus_id}`}
                          </p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${rep.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-200 text-red-800'}`}>{rep.status}</span>
                        </div>
                        <p className="text-sm text-red-900/80 mb-2">{rep.issue_description}</p>
                        <p className="text-xs text-red-400 font-medium">Reported on: {new Date(rep.created_at).toLocaleDateString()}</p>
                      </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Profile Edit Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-fade-in">
            <button onClick={() => setProfileModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-xl font-bold">×</button>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-6 text-center">Edit Admin Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Name</label>
                <input type="text" value={adminNameState} onChange={(e) => setAdminNameState(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-gray-800 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Email</label>
                <input type="email" value={adminEmailState} onChange={(e) => setAdminEmailState(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-gray-800 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Password</label>
                <input type="password" placeholder="Enter new password to change" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-gray-800 font-bold" />
              </div>
              <button onClick={async () => { 
                try {
                  const updates: any = {};
                  if (adminNameState) updates.data = { full_name: adminNameState };
                  if (adminEmailState) updates.email = adminEmailState;
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
