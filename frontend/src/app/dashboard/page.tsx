'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

interface Booking {
  id: number;
  seat_number: string;
  status: string;
  trip?: {
    route?: { name: string };
    departure_time?: string;
    bus?: { name: string };
  };
}

interface PaymentRecord {
  id: number;
  booking_id: number;
  seat: string;
  route: string;
  amount: number;
  method: string;
  date: string;
  status: string;
}

export default function Dashboard() {
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const storedBooking = localStorage.getItem('activeBooking');
    if (storedBooking) {
      try { setActiveBooking(JSON.parse(storedBooking)); } catch (e) {}
    }
    const storedPayments = localStorage.getItem('paymentHistory');
    if (storedPayments) {
      try { setPaymentHistory(JSON.parse(storedPayments)); } catch (e) {}
    }
    
    // Fetch notifications (mocking the fetch for display if no db user id linked directly here)
    const dbUserId = localStorage.getItem('dbUserId');
    if (dbUserId && dbUserId !== 'admin') {
      fetch(`http://localhost:8000/notifications/user/${dbUserId}`)
        .then(res => res.json())
        .then(data => setNotifications(data))
        .catch(() => {});
    }
  }, []);

  const totalSpent = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  const totalTrips = paymentHistory.length; // rough estimate
  const currentBalance = 120.00; // Mocked for now, can be computed later

  const handleDownloadPDF = async () => {
    const element = document.getElementById('boarding-pass-card');
    if (!element) return;
    try {
      // Hide button temporarily
      const btnContainer = element.querySelector('[data-html2canvas-ignore="true"]') as HTMLElement;
      if (btnContainer) btnContainer.style.display = 'none';

      const dataUrl = await toPng(element, { quality: 1, pixelRatio: 2 });
      
      if (btnContainer) btnContainer.style.display = '';

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [element.offsetWidth * 2, element.offsetHeight * 2]
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, element.offsetWidth * 2, element.offsetHeight * 2);
      pdf.save(`Boarding_Pass_${activeBooking?.seat_number || 'DST'}.pdf`);
    } catch (e: any) {
      console.error('Failed to generate PDF', e);
      alert('Failed to generate PDF: ' + (e.message || String(e)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Navbar with logo */}
      <nav className="bg-white px-4 md:px-8 py-4 flex flex-wrap items-center justify-between shadow-sm sticky top-0 z-50 transition-all">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden">
              <img src="/dst_logo.png" alt="DST Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 leading-tight">Daffodil Smart Transport</h1>
              <p className="text-primary font-semibold text-xs uppercase tracking-wider">Student Dashboard</p>
            </div>
          </Link>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
           <Link href="/" className="font-bold text-sm text-gray-500 hover:text-primary transition-colors hidden sm:block">Back to Home</Link>
           <button onClick={() => { supabase.auth.signOut(); window.location.href='/'; }} className="bg-red-50 text-red-600 font-bold px-4 py-2 rounded-xl text-sm hover:bg-red-100 transition-colors border border-red-100">
             Logout
           </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        
        {/* Left Column: Profile & Stats */}
        <div className="lg:col-span-1 space-y-8 animate-fade-in">
          {/* Profile Card */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary to-green-500"></div>
            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg relative z-10 mb-4 mt-8">
              <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-400">
                👤
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">{user?.user_metadata?.full_name || 'Student Name'}</h2>
            <p className="text-gray-500 text-sm font-medium">{user?.email || 'student@daffodil.edu'}</p>
            <p className="bg-green-50 text-green-700 border border-green-100 px-4 py-1 rounded-full text-xs font-bold mt-4 shadow-sm">Active Member</p>
          </div>

          {/* Wallet / Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center transition-all hover:shadow-md hover:border-green-100">
               <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Wallet Balance</p>
               <p className="text-3xl font-extrabold text-primary">৳ {currentBalance}</p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center transition-all hover:shadow-md hover:border-blue-100">
               <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Total Trips</p>
               <p className="text-3xl font-extrabold text-gray-800">{totalTrips}</p>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
               Recent Notifications
               {notifications.length > 0 && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold animate-pulse">Live</span>}
             </h3>
             <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
               {notifications.length === 0 ? (
                 <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                   <p className="text-sm text-gray-400 font-medium">No recent notifications</p>
                 </div>
               ) : (
                 notifications.map(notif => (
                   <div key={notif.id} className="p-3 bg-gray-50 hover:bg-green-50 transition-colors rounded-xl border border-gray-100 text-sm flex items-start gap-3">
                     <span className="mt-1 text-primary">📩</span>
                     <div>
                       <p className="text-gray-700 font-medium leading-snug">{notif.message}</p>
                       <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide">{new Date(notif.created_at).toLocaleString()}</p>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>

        {/* Right Column: Active Booking & History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Ticket Banner */}
          {activeBooking ? (
            <div id="boarding-pass-card" className="bg-gradient-to-br from-gray-900 to-[#0A4D20] rounded-3xl p-6 md:p-8 shadow-2xl text-white relative overflow-hidden transform transition-all duration-300 hover:scale-[1.01] hover:shadow-green-900/30">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[80px] opacity-30 -mr-20 -mt-20"></div>
               <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 rounded-full blur-[80px] opacity-20 -ml-10 -mb-10"></div>
               
               <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                 <div>
                   <h2 className="text-2xl md:text-3xl font-extrabold flex items-center"><span className="mr-3 text-3xl">🎫</span> Your Boarding Pass</h2>
                   <p className="text-green-100 text-sm mt-1 font-medium">Please show this to the driver upon boarding.</p>
                 </div>
                 <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest shadow-sm ${activeBooking.status === 'boarded' ? 'bg-green-400/20 text-green-300 border border-green-400/30' : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'}`}>
                   {activeBooking.status}
                 </span>
               </div>
               
               <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-inner grid grid-cols-2 md:grid-cols-4 gap-6">
                 <div>
                   <p className="text-green-200 text-[10px] font-extrabold uppercase tracking-widest mb-1">Route</p>
                   <p className="font-extrabold text-lg md:text-xl truncate" title={activeBooking.trip?.route?.name}>{activeBooking.trip?.route?.name || 'Assigned Route'}</p>
                 </div>
                 <div>
                   <p className="text-green-200 text-[10px] font-extrabold uppercase tracking-widest mb-1">Bus Fleet</p>
                   <p className="font-extrabold text-lg md:text-xl truncate">{activeBooking.trip?.bus?.name || 'Bus-01'}</p>
                 </div>
                 <div>
                   <p className="text-green-200 text-[10px] font-extrabold uppercase tracking-widest mb-1">Departure</p>
                   <p className="font-extrabold text-lg md:text-xl">{activeBooking.trip?.departure_time ? new Date(activeBooking.trip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'}</p>
                 </div>
                 <div>
                   <p className="text-green-300 text-[10px] font-extrabold uppercase tracking-widest mb-1">Assigned Seat</p>
                   <p className="font-black text-3xl md:text-4xl text-green-400 drop-shadow-md">{activeBooking.seat_number}</p>
                 </div>
               </div>
               
               <div className="mt-6 flex justify-end" data-html2canvas-ignore="true">
                 <button onClick={handleDownloadPDF} className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-full border border-white/20 transition-all backdrop-blur-md">
                   Download Pass PDF
                 </button>
               </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[250px] transition-all hover:shadow-md">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner border border-green-100">📭</div>
              <h3 className="font-extrabold text-gray-800 text-2xl">No Active Booking</h3>
              <p className="text-gray-500 text-sm mt-3 max-w-sm font-medium leading-relaxed">You haven't booked any seat for upcoming trips. Go to the homepage to search routes and book your ride.</p>
              <Link href="/" className="mt-8 bg-primary hover:bg-primary-hover text-white font-extrabold px-8 py-4 rounded-xl transition-all shadow-lg shadow-primary/30 transform hover:scale-[1.02]">Search & Book a Seat</Link>
            </div>
          )}

          {/* Payment History */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm transition-all hover:shadow-md">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-extrabold text-gray-800 flex items-center"><span className="mr-2">💳</span> Trip & Payment History</h3>
             </div>
             
             {paymentHistory.length === 0 ? (
               <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                 <p className="text-gray-500 font-bold">No previous trips recorded yet.</p>
                 <p className="text-xs text-gray-400 mt-1">Once you complete a trip and payment, it will show up here.</p>
               </div>
             ) : (
               <div className="overflow-x-auto rounded-xl border border-gray-100">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-gray-50 text-gray-500 text-[10px] font-extrabold uppercase tracking-widest">
                       <th className="p-4 border-b border-gray-100">Date</th>
                       <th className="p-4 border-b border-gray-100">Route</th>
                       <th className="p-4 border-b border-gray-100">Seat</th>
                       <th className="p-4 border-b border-gray-100">Amount</th>
                       <th className="p-4 border-b border-gray-100">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {paymentHistory.slice().reverse().map(pay => (
                       <tr key={pay.id} className="hover:bg-gray-50/80 transition-colors">
                         <td className="p-4 text-sm text-gray-600 font-bold whitespace-nowrap">{new Date(pay.date).toLocaleDateString()}</td>
                         <td className="p-4 text-sm text-gray-800 font-extrabold">{pay.route}</td>
                         <td className="p-4 text-sm font-extrabold text-gray-500">{pay.seat}</td>
                         <td className="p-4 text-sm font-black text-primary">৳ {pay.amount.toFixed(2)}</td>
                         <td className="p-4">
                           <span className="bg-green-100 border border-green-200 text-green-700 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">{pay.status}</span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
