'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { createUserInDb } from '@/lib/api';

export default function SignUp() {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    // Using Supabase Auth for email registration
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          student_id: studentId,
        }
      }
    });

    if (error) {
      setError(error.message);
    } else {
      try {
        await createUserInDb({
          name,
          email,
          university_id: studentId,
          role: 'student'
        });
      } catch (dbErr: any) {
        console.error("Database sync error", dbErr);
      }
      setMessage('Registration successful! Please check your email to verify your account.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A] p-4">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-black">SIGN UP</h1>
        
        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm text-center">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">{error}</div>}

        <form className="space-y-4" onSubmit={handleSignUp}>
          <div>
            <input 
              type="text" 
              placeholder="Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-100/80 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all text-gray-800"
            />
          </div>
          <div>
            <input 
              type="text" 
              placeholder="Student ID (e.g. 211-15-1234)" 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              className="w-full bg-gray-100/80 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all text-gray-800"
            />
          </div>
          <div>
            <input 
              type="email" 
              placeholder="Email" 
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
          
          <div className="pt-2">
            <button 
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl py-3 transition-colors shadow-lg shadow-primary/30"
            >
              Sign Up
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account? <Link href="/login" className="text-blue-600 hover:underline font-semibold">Log In</Link>
        </p>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-[1px] bg-gray-300 w-full"></div>
          <span className="text-gray-400 text-sm font-medium px-2">or</span>
          <div className="h-[1px] bg-gray-300 w-full"></div>
        </div>

        <div className="mt-6">
          <button className="w-full border border-gray-300 rounded-xl py-3 flex items-center justify-center space-x-3 hover:bg-gray-50 transition-colors">
            <span className="text-xl font-bold text-black">G</span>
            <span className="text-gray-700 font-medium text-sm">Sign up with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}
