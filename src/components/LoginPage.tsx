import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  X,
  GraduationCap,
  ChefHat,
  Shield,
  ArrowRight,
  UserCheck,
  AlertCircle,
  Clock,
  Check,
} from 'lucide-react';
import { Role } from '../types';

export const LoginPage: React.FC = () => {
  const { login, registerStudent } = useAuth();

  // Active portal: 'student' (default), 'mess_manager', 'admin'
  const [activePortal, setActivePortal] = useState<Role>('student');
  // Sub-mode for student: 'login' or 'register'
  const [studentMode, setStudentMode] = useState<'login' | 'register'>('login');

  // Hamburger menu toggle
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regId, setRegId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRoom, setRegRoom] = useState('');
  const [regDept, setRegDept] = useState('');

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Handle switching portals
  const handleSelectPortal = (role: Role) => {
    setActivePortal(role);
    setIsMenuOpen(false);
    setErrorMsg('');
    setPassword('');

    if (role === 'student') {
      setIdentifier('');
      setStudentMode('login');
    } else if (role === 'mess_manager') {
      setIdentifier('manager@hostelmess.edu');
    } else if (role === 'admin') {
      setIdentifier('admin@hostelmess.edu');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identifier.trim()) {
      setErrorMsg('Please enter your credentials');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await login(identifier.trim(), activePortal);
      if (!ok) {
        if (activePortal === 'student') {
          setErrorMsg('Student ID or Email not found. Check your details or register below.');
        } else if (activePortal === 'mess_manager') {
          setErrorMsg('Manager account not found. Try manager@hostelmess.edu');
        } else {
          setErrorMsg('Admin account not found. Try admin@hostelmess.edu');
        }
      }
    } catch {
      setErrorMsg('Login failed. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!regName.trim() || !regId.trim() || !regEmail.trim()) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerStudent({
        name: regName,
        studentId: regId,
        email: regEmail,
        roomNumber: regRoom || 'Room-101',
        department: regDept || 'Engineering',
      });
    } catch {
      setErrorMsg('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col justify-between antialiased">
      {/* Top Navigation Bar with Title & Top-Right Hamburger Menu */}
      <header className="bg-white border-b-2 border-black/10 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-yellow-300 ring-2 ring-black flex items-center justify-center font-black text-lg shadow-xs">
              HM
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-black leading-tight">
                Hostel Mess Attendance System
              </h1>
              <p className="text-xs font-semibold text-zinc-600">
                {activePortal === 'student' && 'Student Portal (Default)'}
                {activePortal === 'mess_manager' && 'Mess Manager Portal'}
                {activePortal === 'admin' && 'Admin Portal'}
              </p>
            </div>
          </div>

          {/* Top Right Hamburger Button & Menu */}
          <div className="relative" ref={menuRef}>
            <button
              id="btn-hamburger-menu"
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-xl border-2 transition-all flex items-center gap-2 cursor-pointer ${
                isMenuOpen
                  ? 'bg-red-600 text-white border-red-700 shadow-xs'
                  : 'bg-white text-black border-black/20 hover:bg-yellow-100'
              }`}
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              <span className="text-xs font-black hidden sm:inline">
                Portals
              </span>
            </button>

            {/* Hamburger Dropdown Menu */}
            {isMenuOpen && (
              <div
                id="hamburger-dropdown"
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border-2 border-black py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-4 py-2 border-b border-black/10">
                  <p className="text-[11px] font-black uppercase tracking-wider text-black">
                    Switch Login Portal
                  </p>
                </div>

                <div className="p-1 space-y-1">
                  {/* Student Option */}
                  <button
                    id="menu-opt-student"
                    type="button"
                    onClick={() => handleSelectPortal('student')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activePortal === 'student'
                        ? 'bg-yellow-400 text-black border border-black shadow-xs'
                        : 'text-black hover:bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className={`w-4 h-4 ${activePortal === 'student' ? 'text-black' : 'text-yellow-600'}`} />
                      <div className="text-left">
                        <div className="font-black">Student Login</div>
                        <div className="text-[10px] text-zinc-600 font-medium">Default Front Page</div>
                      </div>
                    </div>
                    {activePortal === 'student' && <Check className="w-4 h-4 text-black" />}
                  </button>

                  {/* Mess Manager Option */}
                  <button
                    id="menu-opt-manager"
                    type="button"
                    onClick={() => handleSelectPortal('mess_manager')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activePortal === 'mess_manager'
                        ? 'bg-orange-500 text-white border border-orange-600 shadow-xs'
                        : 'text-black hover:bg-orange-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ChefHat className={`w-4 h-4 ${activePortal === 'mess_manager' ? 'text-white' : 'text-orange-600'}`} />
                      <div className="text-left">
                        <div className="font-black">Mess Manager Login</div>
                        <div className="text-[10px] text-zinc-200 font-medium">View meal counts</div>
                      </div>
                    </div>
                    {activePortal === 'mess_manager' && <Check className="w-4 h-4 text-white" />}
                  </button>

                  {/* Admin Option */}
                  <button
                    id="menu-opt-admin"
                    type="button"
                    onClick={() => handleSelectPortal('admin')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activePortal === 'admin'
                        ? 'bg-red-600 text-white border border-red-700 shadow-xs'
                        : 'text-black hover:bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className={`w-4 h-4 ${activePortal === 'admin' ? 'text-white' : 'text-red-600'}`} />
                      <div className="text-left">
                        <div className="font-black">Admin Login</div>
                        <div className="text-[10px] text-zinc-200 font-medium">Manage residents & staff</div>
                      </div>
                    </div>
                    {activePortal === 'admin' && <Check className="w-4 h-4 text-white" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="flex-1 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 sm:px-10 shadow-md border-2 border-black/10 rounded-2xl">
            {/* Header for Current Portal */}
            <div className="mb-6">
              {activePortal === 'student' && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400 text-black border border-black/20 flex items-center justify-center font-black shadow-xs">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-black">Student Portal</h2>
                    <p className="text-xs text-zinc-600 font-medium">Sign in to mark meal attendance</p>
                  </div>
                </div>
              )}

              {activePortal === 'mess_manager' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 text-white border border-orange-600 flex items-center justify-center font-black shadow-xs">
                      <ChefHat className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-black">Mess Manager Login</h2>
                      <p className="text-xs text-zinc-600 font-medium">Kitchen supervisor access</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectPortal('student')}
                    className="text-xs font-bold text-red-600 hover:text-red-700 underline"
                  >
                    Student Login
                  </button>
                </div>
              )}

              {activePortal === 'admin' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white border border-red-700 flex items-center justify-center font-black shadow-xs">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-black">Hostel Admin Login</h2>
                      <p className="text-xs text-zinc-600 font-medium">Chief warden & system admin</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectPortal('student')}
                    className="text-xs font-bold text-red-600 hover:text-red-700 underline"
                  >
                    Student Login
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-2.5 text-xs text-red-900 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STUDENT PORTAL FORM */}
            {activePortal === 'student' && (
              <div>
                {/* Sign In / Register Tabs for Students */}
                <div className="flex items-center p-1 bg-yellow-50 rounded-xl mb-5 border-2 border-yellow-300">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentMode('login');
                      setErrorMsg('');
                    }}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                      studentMode === 'login'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-black hover:bg-yellow-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentMode('register');
                      setErrorMsg('');
                    }}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                      studentMode === 'register'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-black hover:bg-yellow-200'
                    }`}
                  >
                    New Student?
                  </button>
                </div>

                {studentMode === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                        Student Roll or Email
                      </label>
                      <input
                        id="input-student-id"
                        type="text"
                        required
                        placeholder="e.g. ES24AM46 or saravanavelj5@gmail.com"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-black/20 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-black"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                        Password
                      </label>
                      <input
                        id="input-student-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-black/20 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-black"
                      />
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setIdentifier('ES24AM46')}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Sample: ES24AM46 (Saravanavel J)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIdentifier('STU101')}
                        className="text-xs font-bold text-black hover:underline"
                      >
                        STU101 (Arun)
                      </button>
                    </div>

                    <button
                      id="btn-student-submit"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full mt-2 py-3 px-4 rounded-xl font-black text-sm text-white bg-red-600 hover:bg-red-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <span>{isSubmitting ? 'Signing in...' : 'Sign In as Student'}</span>
                      <ArrowRight className="w-4 h-4 text-yellow-300" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs sm:text-sm">
                    <div>
                      <label className="block font-bold text-black mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Saravanavel J"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-black/20 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 text-black font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-black mb-1">Student Roll *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. ES24AM46"
                          value={regId}
                          onChange={(e) => setRegId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border-2 border-black/20 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 text-black font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-black mb-1">Room NO</label>
                        <input
                          type="text"
                          placeholder="e.g. 007"
                          value={regRoom}
                          onChange={(e) => setRegRoom(e.target.value)}
                          className="w-full px-3 py-2 bg-white border-2 border-black/20 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 text-black font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-black mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. saravanavelj5@gmail.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-black/20 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 text-black font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-black mb-1">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. AI&ML"
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-black/20 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 text-black font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full mt-2 py-3 px-4 rounded-xl font-black text-sm text-white bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <span>{isSubmitting ? 'Registering...' : 'Register as Student'}</span>
                      <UserCheck className="w-4 h-4 text-yellow-300" />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* MESS MANAGER PORTAL FORM */}
            {activePortal === 'mess_manager' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                    Mess Manager Email / Username
                  </label>
                  <input
                    id="input-manager-email"
                    type="text"
                    required
                    placeholder="manager@hostelmess.edu"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-black/20 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    id="input-manager-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-black/20 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-black"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-zinc-600 pt-1">
                  <span>Default Manager: Ramesh Sharma</span>
                  <button
                    type="button"
                    onClick={() => setIdentifier('manager@hostelmess.edu')}
                    className="text-orange-600 font-bold hover:underline"
                  >
                    Use default email
                  </button>
                </div>

                <button
                  id="btn-manager-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-black text-sm text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In as Mess Manager'}</span>
                  <ArrowRight className="w-4 h-4 text-yellow-300" />
                </button>
              </form>
            )}

            {/* ADMIN PORTAL FORM */}
            {activePortal === 'admin' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                    Admin Email / Username
                  </label>
                  <input
                    id="input-admin-email"
                    type="text"
                    required
                    placeholder="admin@hostelmess.edu"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-black/20 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    id="input-admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-black/20 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-black"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-zinc-600 pt-1">
                  <span>Default Admin: Chief Warden</span>
                  <button
                    type="button"
                    onClick={() => setIdentifier('admin@hostelmess.edu')}
                    className="text-red-600 font-bold hover:underline"
                  >
                    Use default email
                  </button>
                </div>

                <button
                  id="btn-admin-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-black text-sm text-yellow-300 bg-black hover:bg-zinc-900 border-2 border-yellow-400 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In as Admin'}</span>
                  <ArrowRight className="w-4 h-4 text-yellow-300" />
                </button>
              </form>
            )}
          </div>

          {/* Quote at the center bottom of the front page */}
          <div className="mt-8 text-center max-w-md mx-auto">
            <div className="p-4 sm:p-5 bg-white border-2 border-black rounded-2xl shadow-md">
              <p className="text-base sm:text-lg md:text-xl font-black text-black tracking-tight leading-snug">
                &ldquo;A Small Tap, A Big Difference.
              </p>
              <p className="text-xs sm:text-sm md:text-base font-black text-red-600 mt-1.5 leading-snug">
                Mark your attendance on time. Help us serve better&rdquo;
              </p>
            </div>
          </div>

          {/* Clean helper footnote */}
          <div className="mt-5 text-center text-xs font-bold text-black flex items-center justify-center gap-2">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            <span>
              Breakfast 12:00 AM &bull; Lunch 7:00 AM &bull; Dinner 12:00 PM (IST)
            </span>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-zinc-600 border-t border-black/10 bg-white">
        <span className="font-bold text-black">Hostel Mess Attendance System</span>
        <span className="mx-2 text-red-600 font-bold">&bull;</span>
        <span className="text-orange-600 font-medium">Asia/Kolkata (IST)</span>
      </footer>
    </div>
  );
};
