import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getISTTime, setSimulatedTimeOffset } from '../lib/timeUtils';
import { LogOut, Clock, Shield, ChefHat, GraduationCap, Calendar, Sliders } from 'lucide-react';
import { Role } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, logout } = useAuth();
  const [istTime, setIstTime] = useState(getISTTime());
  const [showTimeSimulator, setShowTimeSimulator] = useState(false);
  const [simOption, setSimOption] = useState<'live' | 'morning' | 'noon' | 'afternoon'>('live');

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setIstTime(getISTTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSimTimeChange = (type: 'live' | 'morning' | 'noon' | 'afternoon') => {
    setSimOption(type);
    if (type === 'live') {
      setSimulatedTimeOffset(0);
    } else if (type === 'morning') {
      // 06:30 AM IST today (Breakfast closed at 00:00, Lunch closes at 07:00 => 30m left, Dinner closes at 12:00)
      const current = getISTTime();
      const [y, m, d] = current.dateString.split('-').map(Number);
      // Construct 06:30 AM IST in UTC: IST is UTC+5:30 -> UTC is 01:00 AM
      const targetUtc = Date.UTC(y, m - 1, d, 1, 0, 0);
      setSimulatedTimeOffset(targetUtc - Date.now());
    } else if (type === 'noon') {
      // 10:00 AM IST today (Breakfast closed, Lunch closed at 07:00, Dinner closes at 12:00 => 2h left)
      const current = getISTTime();
      const [y, m, d] = current.dateString.split('-').map(Number);
      // 10:00 AM IST -> 04:30 UTC
      const targetUtc = Date.UTC(y, m - 1, d, 4, 30, 0);
      setSimulatedTimeOffset(targetUtc - Date.now());
    } else if (type === 'afternoon') {
      // 02:00 PM IST today (All 3 meals closed for today)
      const current = getISTTime();
      const [y, m, d] = current.dateString.split('-').map(Number);
      // 14:00 IST -> 08:30 UTC
      const targetUtc = Date.UTC(y, m - 1, d, 8, 30, 0);
      setSimulatedTimeOffset(targetUtc - Date.now());
    }
    setIstTime(getISTTime());
  };

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case 'student':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-yellow-400 text-black border border-black/20 shadow-xs">
            <GraduationCap className="w-3.5 h-3.5" />
            Student
          </span>
        );
      case 'mess_manager':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-orange-500 text-white border border-orange-600 shadow-xs">
            <ChefHat className="w-3.5 h-3.5" />
            Mess Manager
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-red-600 text-white border border-red-700 shadow-xs">
            <Shield className="w-3.5 h-3.5" />
            Admin
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-white border-b-2 border-black/10 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6">
        {/* Top Navbar Row */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-red-600 text-yellow-300 ring-2 ring-black flex items-center justify-center font-black text-sm sm:text-base shadow-xs shrink-0">
              HM
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs xs:text-sm sm:text-base font-black text-black leading-tight truncate">
                  Hostel Mess
                </h1>
                {currentUser && getRoleBadge(currentUser.role)}
              </div>
              <p className="text-[11px] text-zinc-600 hidden sm:block font-medium">
                Daily Meal Availability Portal
              </p>
            </div>
          </div>

          {/* Center / Right: Time & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* IST Time Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-black rounded-lg text-xs font-bold text-white border border-black shadow-xs">
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-300">{istTime.timeString} IST</span>
              <span className="text-zinc-600">|</span>
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-white">{istTime.formattedShortDate}</span>
            </div>

            {/* Time simulation toggle for testing deadlines easily */}
            <button
              id="btn-time-simulator"
              type="button"
              onClick={() => setShowTimeSimulator(!showTimeSimulator)}
              title="Test Attendance Deadlines by adjusting IST time"
              className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                simOption !== 'live'
                  ? 'bg-orange-500 border-orange-600 text-white'
                  : 'bg-white border-orange-400 text-orange-800 hover:bg-orange-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden xs:inline">
                {simOption !== 'live' ? 'Simulating' : 'Time Tool'}
              </span>
            </button>

            {/* User Info & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-black hidden lg:inline-block max-w-[120px] truncate">
                  {currentUser.name}
                </span>
                <button
                  id="btn-logout"
                  type="button"
                  onClick={logout}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-lg border border-red-700 shadow-xs transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Time Simulator Banner (Collapsible) */}
        {showTimeSimulator && (
          <div className="py-2.5 px-3 mb-2 bg-orange-50 border-2 border-orange-300 rounded-xl text-xs text-black flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="font-bold text-black">Simulate IST Time for Testing Deadlines:</span>
              <span className="bg-yellow-300 text-black px-2 py-0.5 rounded font-mono font-bold border border-yellow-500">
                {istTime.timeString} IST
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSimTimeChange('live')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  simOption === 'live'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-black border border-orange-400 hover:bg-orange-100'
                }`}
              >
                Real IST Time
              </button>
              <button
                type="button"
                onClick={() => handleSimTimeChange('morning')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  simOption === 'morning'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-black border border-orange-400 hover:bg-orange-100'
                }`}
              >
                6:30 AM (Lunch Open)
              </button>
              <button
                type="button"
                onClick={() => handleSimTimeChange('noon')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  simOption === 'noon'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-black border border-orange-400 hover:bg-orange-100'
                }`}
              >
                10:00 AM (Dinner Open)
              </button>
              <button
                type="button"
                onClick={() => handleSimTimeChange('afternoon')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  simOption === 'afternoon'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-black border border-orange-400 hover:bg-orange-100'
                }`}
              >
                2:00 PM (All Closed)
              </button>
            </div>
          </div>
        )}

        {/* Role-based Navigation Tabs */}
        {currentUser && (
          <nav className="flex items-center gap-1.5 border-t border-black/10 py-1.5 overflow-x-auto scrollbar-none">
            {currentUser.role === 'student' && (
              <>
                <button
                  id="tab-student-dashboard"
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-black hover:bg-yellow-100 hover:text-black'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  id="tab-student-profile"
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-black hover:bg-yellow-100 hover:text-black'
                  }`}
                >
                  Profile
                </button>
              </>
            )}

            {currentUser.role === 'mess_manager' && (
              <>
                <button
                  id="tab-manager-dashboard"
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-black hover:bg-yellow-100 hover:text-black'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  id="tab-manager-attendance"
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'attendance'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-black hover:bg-yellow-100 hover:text-black'
                  }`}
                >
                  Attendance List
                </button>
              </>
            )}

            {currentUser.role === 'admin' && (
              <>
                <button
                  id="tab-admin-dashboard"
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-black hover:bg-yellow-100 hover:text-black'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  id="tab-admin-students"
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'students'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-black hover:bg-yellow-100 hover:text-black'
                  }`}
                >
                  Students
                </button>
                <button
                  id="tab-admin-managers"
                  type="button"
                  onClick={() => setActiveTab('managers')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'managers'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-black hover:bg-yellow-100 hover:text-black'
                  }`}
                >
                  Mess Managers
                </button>
                <button
                  id="tab-admin-attendance"
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'attendance'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-black hover:bg-yellow-100 hover:text-black'
                  }`}
                >
                  Attendance
                </button>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
