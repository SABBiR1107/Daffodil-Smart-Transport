'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchUserByEmail, createUserInDb } from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Admin login via env variables
    if (
      email === process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
      password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD
    ) {
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('dbUserId', 'admin');
      localStorage.setItem('userRole', 'admin');
      router.push('/admin');
      return;
    }
    
    // Regular user/driver login via Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      try {
        let dbUser = await fetchUserByEmail(email);
        if (!dbUser && data.user) {
          dbUser = await createUserInDb({
            name: data.user.user_metadata?.full_name || 'User',
            email: data.user.email || email,
            university_id: data.user.user_metadata?.student_id || 'UNKNOWN',
            role: data.user.user_metadata?.role || 'student'
          });
        }
        if (dbUser) {
          localStorage.setItem('dbUserId', dbUser.id.toString());
          localStorage.setItem('userRole', dbUser.role);
        }
      } catch (dbErr) {
        console.error("Error retrieving DB user:", dbErr);
      }

      // Check role from dbUser if available, else from metadata
      const role = localStorage.getItem('userRole') || data.user?.user_metadata?.role || 'student';
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'driver') {
        router.push('/driver');
      } else {
        router.push('/');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A] p-4">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-black">LOGIN</h1>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">{error}</div>}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <input 
              type="email" 
              placeholder="Your Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-100/80 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all text-gray-800"
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-100/80 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all text-gray-800"
            />
          </div>
          
          <div className="text-right">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium">
              Forgot password?
            </a>
          </div>
          
          <button 
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl py-3 transition-colors shadow-lg shadow-primary/30"
          >
            Login
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center space-x-4">
          <div className="h-[1px] bg-gray-300 w-full"></div>
          <span className="text-gray-400 text-sm font-medium px-2">or</span>
          <div className="h-[1px] bg-gray-300 w-full"></div>
        </div>

        <div className="mt-6 flex justify-center space-x-4">
          <button className="w-14 h-14 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
            <span className="text-2xl font-bold text-black">G</span>
          </button>
          <button className="w-14 h-14 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
            <span className="text-2xl font-bold text-black">f</span>
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Don't have an account? <Link href="/signup" className="text-blue-600 hover:underline font-semibold">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
