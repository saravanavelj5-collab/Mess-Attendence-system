import React, { useState, useEffect } from 'react';
import { AttendanceRecord, UserProfile } from '../types';
import { subscribeToDailyAttendance, subscribeToUsers, matchStudentAttendance } from '../lib/attendanceService';
import { getISTTime, getTomorrowISTDateString, checkMealDeadline } from '../lib/timeUtils';
import { Users, Search, CheckCircle2, XCircle, MinusCircle, Lock, Calendar, ChefHat } from 'lucide-react';

interface MessManagerDashboardProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
}

export const MessManagerDashboard: React.FC<MessManagerDashboardProps> = ({ activeTab, setActiveTab }) => {
  const ist = getISTTime();
  const todayStr = ist.dateString;
  const tomorrowStr = getTomorrowISTDateString();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to registered students in real-time
  useEffect(() => {
    let isMounted = true;
    const unsubUsers = subscribeToUsers((users) => {
      if (isMounted) {
        setAllStudents(users.filter((u) => u.role === 'student'));
      }
    });
    return () => {
      isMounted = false;
      unsubUsers();
    };
  }, []);

  // Subscribe to attendance records for selectedDate in real-time
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const unsub = subscribeToDailyAttendance(selectedDate, (records) => {
      if (isMounted) {
        setAttendanceList(records);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [selectedDate]);

  // Merge registered students with their attendance record using robust matching
  const studentRows: { student: UserProfile; record: AttendanceRecord }[] = allStudents.map((student) => {
    const sId = student.studentId || student.id;
    const record = matchStudentAttendance(student, attendanceList);

    return {
      student,
      record: record || {
        id: `${sId}_${selectedDate}`,
        studentId: sId,
        studentName: student.name,
        roomNumber: student.roomNumber || '',
        department: student.department || '',
        date: selectedDate,
        breakfast: 'available' as const,
        lunch: 'available' as const,
        dinner: 'available' as const,
        updatedAt: '',
      },
    };
  });

  // Also include any attendance records for students not yet in allStudents list
  const matchedRecordIds = new Set(studentRows.map((r) => r.record.id));
  const unmatchedAttendance = attendanceList.filter((a) => !matchedRecordIds.has(a.id));
  unmatchedAttendance.forEach((extra) => {
    studentRows.push({
      student: {
        id: extra.studentId || extra.id,
        name: extra.studentName || 'Student',
        email: '',
        role: 'student',
        studentId: extra.studentId || '',
        roomNumber: extra.roomNumber || '',
        department: extra.department || '',
        createdAt: '',
      },
      record: extra,
    });
  });

  // OPT-OUT ATTENDANCE LOGIC:
  // Available Count = Total Registered Students − Not Available Count
  const totalRegistered = studentRows.length;

  const breakfastNotAvailableCount = studentRows.filter((r) => r.record.breakfast === 'not_available').length;
  const breakfastAvailableCount = Math.max(0, totalRegistered - breakfastNotAvailableCount);

  const lunchNotAvailableCount = studentRows.filter((r) => r.record.lunch === 'not_available').length;
  const lunchAvailableCount = Math.max(0, totalRegistered - lunchNotAvailableCount);

  const dinnerNotAvailableCount = studentRows.filter((r) => r.record.dinner === 'not_available').length;
  const dinnerAvailableCount = Math.max(0, totalRegistered - dinnerNotAvailableCount);

  const anyNotAvailableCount = studentRows.filter(
    (r) => r.record.breakfast === 'not_available' || r.record.lunch === 'not_available' || r.record.dinner === 'not_available'
  ).length;

  // Filter tab for quick viewing: All vs List of Not Available Students
  const [activeFilterTab, setActiveFilterTab] = useState<
    'all' | 'not_available_any' | 'not_available_breakfast' | 'not_available_lunch' | 'not_available_dinner'
  >('all');

  // Filtered rows for search and not-available tab
  const filteredRows = studentRows.filter(({ student, record }) => {
    // Apply Not Available Tab filter
    if (activeFilterTab === 'not_available_any') {
      const isNotAvail =
        record.breakfast === 'not_available' || record.lunch === 'not_available' || record.dinner === 'not_available';
      if (!isNotAvail) return false;
    } else if (activeFilterTab === 'not_available_breakfast') {
      if (record.breakfast !== 'not_available') return false;
    } else if (activeFilterTab === 'not_available_lunch') {
      if (record.lunch !== 'not_available') return false;
    } else if (activeFilterTab === 'not_available_dinner') {
      if (record.dinner !== 'not_available') return false;
    }

    // Apply Search Query
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      student.name.toLowerCase().includes(q) ||
      (student.studentId && student.studentId.toLowerCase().includes(q)) ||
      (student.roomNumber && student.roomNumber.toLowerCase().includes(q)) ||
      (student.department && student.department.toLowerCase().includes(q))
    );
  });

  // Cell status renderer according to opt-out rules
  const renderStatusIcon = (status: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
    const deadline = checkMealDeadline(meal, selectedDate);

    if (status === 'not_available') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-red-600 text-white border border-red-700 shadow-xs">
          <XCircle className="w-3.5 h-3.5 text-white shrink-0" />
          <span>Not Available</span>
          {deadline.isClosed && <Lock className="w-3 h-3 text-yellow-300 ml-0.5" />}
        </span>
      );
    }

    // Default status is Available
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-yellow-400 text-black border border-black/20 shadow-xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
        <span>Available (Default)</span>
        {deadline.isClosed && <Lock className="w-3 h-3 text-black/70 ml-0.5" />}
      </span>
    );
  };

  return (
    <main className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Title & Date Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-black/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-wider font-black text-red-600 mb-0.5">
            <ChefHat className="w-3.5 h-3.5 text-red-600 shrink-0" />
            MESS MANAGER DASHBOARD
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
            Today's Mess Attendance
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-zinc-600 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 shrink-0" />
            <span>
              {selectedDate === todayStr ? ist.formattedDate : `Date: ${selectedDate}`}
            </span>
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-yellow-100/70 p-1.5 rounded-xl border-2 border-yellow-300 self-stretch sm:self-auto justify-center">
          <button
            id="btn-manager-date-today"
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`flex-1 sm:flex-initial min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
              selectedDate === todayStr
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-black hover:bg-yellow-200'
            }`}
          >
            Today
          </button>
          <button
            id="btn-manager-date-tomorrow"
            type="button"
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`flex-1 sm:flex-initial min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
              selectedDate === tomorrowStr
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-black hover:bg-yellow-200'
            }`}
          >
            Tomorrow
          </button>
          <input
            id="input-manager-custom-date"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) setSelectedDate(e.target.value);
            }}
            className="px-2.5 py-1.5 text-xs font-bold bg-white border-2 border-black/20 rounded-lg text-black focus:outline-hidden focus:border-red-600"
            title="Pick a specific date"
          />
        </div>
      </div>

      {/* Available Counts - 3 Clean Cards (Opt-Out Logic) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* BREAKFAST CARD */}
        <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-2xl sm:text-3xl" role="img" aria-label="Breakfast">
              🍳
            </span>
            <span className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-950 border border-orange-300">
              Closes 12:00 AM
            </span>
          </div>
          <h3 className="text-xs font-black text-red-600 uppercase tracking-wider">
            Breakfast
          </h3>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
            <Users className="w-5 h-5 text-orange-600 self-center shrink-0" />
            <span className="text-2xl sm:text-3xl font-black text-black">
              {breakfastAvailableCount}
            </span>
            <span className="text-xs sm:text-sm font-black text-orange-600">Expected</span>
          </div>
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-600 mt-2 pt-2 border-t border-black/10 font-semibold">
            <span>Registered: <strong className="text-black">{totalRegistered}</strong></span>
            <span className="text-red-600 font-black">
              Opted Out: {breakfastNotAvailableCount}
            </span>
          </div>
        </div>

        {/* LUNCH CARD */}
        <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-2xl sm:text-3xl" role="img" aria-label="Lunch">
              🍛
            </span>
            <span className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-950 border border-orange-300">
              Closes 7:00 AM
            </span>
          </div>
          <h3 className="text-xs font-black text-red-600 uppercase tracking-wider">
            Lunch
          </h3>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
            <Users className="w-5 h-5 text-orange-600 self-center shrink-0" />
            <span className="text-2xl sm:text-3xl font-black text-black">
              {lunchAvailableCount}
            </span>
            <span className="text-xs sm:text-sm font-black text-orange-600">Expected</span>
          </div>
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-600 mt-2 pt-2 border-t border-black/10 font-semibold">
            <span>Registered: <strong className="text-black">{totalRegistered}</strong></span>
            <span className="text-red-600 font-black">
              Opted Out: {lunchNotAvailableCount}
            </span>
          </div>
        </div>

        {/* DINNER CARD */}
        <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <span className="text-2xl sm:text-3xl" role="img" aria-label="Dinner">
              🍽️
            </span>
            <span className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-950 border border-orange-300">
              Closes 12:00 PM
            </span>
          </div>
          <h3 className="text-xs font-black text-red-600 uppercase tracking-wider">
            Dinner
          </h3>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
            <Users className="w-5 h-5 text-orange-600 self-center shrink-0" />
            <span className="text-2xl sm:text-3xl font-black text-black">
              {dinnerAvailableCount}
            </span>
            <span className="text-xs sm:text-sm font-black text-orange-600">Expected</span>
          </div>
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-600 mt-2 pt-2 border-t border-black/10 font-semibold">
            <span>Registered: <strong className="text-black">{totalRegistered}</strong></span>
            <span className="text-red-600 font-black">
              Opted Out: {dinnerNotAvailableCount}
            </span>
          </div>
        </div>
      </div>

      {/* Meal-Wise Attendance Summary (Required user request) */}
      <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
            <span>Meal-Wise Attendance Summary</span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-yellow-400 text-black border border-black/20">
              Opt-out Model
            </span>
          </h3>
          <span className="text-xs text-zinc-600 font-semibold">
            Available = Total Registered ({totalRegistered}) − Not Available
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-yellow-100 text-black uppercase text-[11px] font-black tracking-wider border-b-2 border-yellow-300">
              <tr>
                <th className="py-2.5 px-3 sm:px-4">Meal</th>
                <th className="py-2.5 px-3 sm:px-4">Total Registered</th>
                <th className="py-2.5 px-3 sm:px-4 text-black">Available (Expected)</th>
                <th className="py-2.5 px-3 sm:px-4 text-red-600">Not Available (Opted Out)</th>
                <th className="py-2.5 px-3 sm:px-4">Attendance Rate</th>
                <th className="py-2.5 px-3 sm:px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              <tr className="hover:bg-yellow-50/60">
                <td className="py-2.5 px-3 sm:px-4 font-black text-black flex items-center gap-1.5">
                  <span>🍳</span> Breakfast
                </td>
                <td className="py-2.5 px-3 sm:px-4 font-bold text-zinc-800">{totalRegistered}</td>
                <td className="py-2.5 px-3 sm:px-4 font-black text-black">{breakfastAvailableCount}</td>
                <td className="py-2.5 px-3 sm:px-4 font-black text-red-600">{breakfastNotAvailableCount}</td>
                <td className="py-2.5 px-3 sm:px-4 font-bold text-zinc-800">
                  {totalRegistered > 0 ? Math.round((breakfastAvailableCount / totalRegistered) * 100) : 0}%
                </td>
                <td className="py-2.5 px-3 sm:px-4">
                  {checkMealDeadline('breakfast', selectedDate).isClosed ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-black text-white">Closed</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-yellow-400 text-black border border-black/20">Open</span>
                  )}
                </td>
              </tr>
              <tr className="hover:bg-yellow-50/60">
                <td className="py-2.5 px-3 sm:px-4 font-black text-black flex items-center gap-1.5">
                  <span>🍛</span> Lunch
                </td>
                <td className="py-2.5 px-3 sm:px-4 font-bold text-zinc-800">{totalRegistered}</td>
                <td className="py-2.5 px-3 sm:px-4 font-black text-black">{lunchAvailableCount}</td>
                <td className="py-2.5 px-3 sm:px-4 font-black text-red-600">{lunchNotAvailableCount}</td>
                <td className="py-2.5 px-3 sm:px-4 font-bold text-zinc-800">
                  {totalRegistered > 0 ? Math.round((lunchAvailableCount / totalRegistered) * 100) : 0}%
                </td>
                <td className="py-2.5 px-3 sm:px-4">
                  {checkMealDeadline('lunch', selectedDate).isClosed ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-black text-white">Closed</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-yellow-400 text-black border border-black/20">Open</span>
                  )}
                </td>
              </tr>
              <tr className="hover:bg-yellow-50/60">
                <td className="py-2.5 px-3 sm:px-4 font-black text-black flex items-center gap-1.5">
                  <span>🍽️</span> Dinner
                </td>
                <td className="py-2.5 px-3 sm:px-4 font-bold text-zinc-800">{totalRegistered}</td>
                <td className="py-2.5 px-3 sm:px-4 font-black text-black">{dinnerAvailableCount}</td>
                <td className="py-2.5 px-3 sm:px-4 font-black text-red-600">{dinnerNotAvailableCount}</td>
                <td className="py-2.5 px-3 sm:px-4 font-bold text-zinc-800">
                  {totalRegistered > 0 ? Math.round((dinnerAvailableCount / totalRegistered) * 100) : 0}%
                </td>
                <td className="py-2.5 px-3 sm:px-4">
                  {checkMealDeadline('dinner', selectedDate).isClosed ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-black text-white">Closed</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-yellow-400 text-black border border-black/20">Open</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Attendance List Table (Section 3 & 12) */}
      <div className="bg-white rounded-2xl border-2 border-black/10 shadow-sm overflow-hidden">
        {/* Table Header & Quick Filter Tabs */}
        <div className="p-3.5 sm:p-5 border-b-2 border-black/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-black">
                Student Attendance Records
              </h3>
              <p className="text-xs text-zinc-600 font-semibold">
                All students available by default • {studentRows.length} registered students
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-manager-search"
                type="text"
                placeholder="Search student or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-base sm:text-xs bg-white border-2 border-black/20 rounded-xl text-black font-semibold focus:outline-hidden focus:border-red-600"
              />
            </div>
          </div>

          {/* Quick Filter Tabs: All vs List of Not Available Students */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setActiveFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeFilterTab === 'all'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-zinc-100 text-black hover:bg-zinc-200 border border-black/10'
              }`}
            >
              All Students ({totalRegistered})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('not_available_any')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeFilterTab === 'not_available_any'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-300'
              }`}
            >
              List of Not Available ({anyNotAvailableCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('not_available_breakfast')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeFilterTab === 'not_available_breakfast'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-black hover:bg-zinc-200 border border-black/10'
              }`}
            >
              🍳 Not Available: Breakfast ({breakfastNotAvailableCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('not_available_lunch')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeFilterTab === 'not_available_lunch'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-black hover:bg-zinc-200 border border-black/10'
              }`}
            >
              🍛 Not Available: Lunch ({lunchNotAvailableCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('not_available_dinner')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeFilterTab === 'not_available_dinner'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-black hover:bg-zinc-200 border border-black/10'
              }`}
            >
              🍽️ Not Available: Dinner ({dinnerNotAvailableCount})
            </button>
          </div>
        </div>

        {/* Mobile Cards (Phone Ratio Optimized) */}
        <div className="block sm:hidden divide-y divide-zinc-200">
          {filteredRows.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 font-bold">
              No students found matching "{searchQuery}"
            </div>
          ) : (
            filteredRows.map(({ student, record }) => (
              <div key={student.id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-black">{student.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">
                      {student.studentId || 'No ID'}
                    </div>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-yellow-100 text-black border border-yellow-300">
                    Room {student.roomNumber || '-'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  <div className="bg-zinc-50 p-2 rounded-xl border border-black/10 flex flex-col items-center gap-1 text-center">
                    <span className="text-[11px] font-black text-black uppercase">🍳 B'fast</span>
                    {renderStatusIcon(record.breakfast, 'breakfast')}
                  </div>
                  <div className="bg-zinc-50 p-2 rounded-xl border border-black/10 flex flex-col items-center gap-1 text-center">
                    <span className="text-[11px] font-black text-black uppercase">🍛 Lunch</span>
                    {renderStatusIcon(record.lunch, 'lunch')}
                  </div>
                  <div className="bg-zinc-50 p-2 rounded-xl border border-black/10 flex flex-col items-center gap-1 text-center">
                    <span className="text-[11px] font-black text-black uppercase">🍽️ Dinner</span>
                    {renderStatusIcon(record.dinner, 'dinner')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-yellow-100 text-black uppercase text-[11px] font-black tracking-wider border-b-2 border-yellow-300">
              <tr>
                <th className="py-3 px-4 sm:px-6">Student</th>
                <th className="py-3 px-3 sm:px-4">Room</th>
                <th className="py-3 px-3 sm:px-4">Breakfast</th>
                <th className="py-3 px-3 sm:px-4">Lunch</th>
                <th className="py-3 px-3 sm:px-4">Dinner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 font-bold">
                    No students found matching "{searchQuery}"
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ student, record }) => (
                  <tr key={student.id} className="hover:bg-yellow-50/60 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-black">
                      <div>
                        <div className="font-black text-black">{student.name}</div>
                        <div className="text-xs text-zinc-500 font-mono">
                          {student.studentId || 'No ID'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-black font-bold">
                      {student.roomNumber || '-'}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4">
                      {renderStatusIcon(record.breakfast, 'breakfast')}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4">
                      {renderStatusIcon(record.lunch, 'lunch')}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4">
                      {renderStatusIcon(record.dinner, 'dinner')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-zinc-100 border-t-2 border-black/10 text-xs text-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-1.5 font-bold">
          <span>Showing {filteredRows.length} students</span>
          <span className="font-black text-black">
            Legend: 🟨 Available &nbsp;|&nbsp; 🟥 Not Available &nbsp;|&nbsp; 🔒 Closed
          </span>
        </div>
      </div>
    </main>
  );
};
