import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { StudentDashboard } from './components/StudentDashboard';
import { MessManagerDashboard } from './components/MessManagerDashboard';
import { AdminDashboard } from './components/AdminDashboard';

function AppContent() {
  const { currentUser, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Reset tab to 'dashboard' when switching users
  useEffect(() => {
    setActiveTab('dashboard');
  }, [currentUser?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-yellow-400 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-black">
            Loading Hostel Mess System...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-black flex flex-col antialiased">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1">
        {currentUser.role === 'student' && (
          <StudentDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {currentUser.role === 'mess_manager' && (
          <MessManagerDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {currentUser.role === 'admin' && (
          <AdminDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </div>

      {/* Minimal Footer */}
      <footer className="py-4 text-center text-xs text-zinc-600 bg-white border-t border-black/10 mt-auto">
        <span className="font-semibold text-black">Hostel Mess Attendance System</span>
        <span className="mx-2 text-red-600 font-bold">&bull;</span>
        <span className="text-orange-600 font-medium">Asia/Kolkata (IST)</span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
