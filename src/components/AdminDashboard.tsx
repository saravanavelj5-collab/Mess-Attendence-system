import React, { useState, useEffect } from 'react';
import { UserProfile, AttendanceRecord } from '../types';
import {
  getAllUsers,
  saveUser,
  deleteUserById,
  subscribeToDailyAttendance,
  subscribeToUsers,
  matchStudentAttendance,
} from '../lib/attendanceService';
import { getISTTime, getTomorrowISTDateString, checkMealDeadline } from '../lib/timeUtils';
import {
  Users,
  UserPlus,
  Shield,
  ChefHat,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  X,
  Plus,
  MinusCircle,
  Lock,
} from 'lucide-react';

interface AdminDashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab, setActiveTab }) => {
  const ist = getISTTime();
  const todayStr = ist.dateString;
  const tomorrowStr = getTomorrowISTDateString();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);

  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<UserProfile | null>(null);

  // Form states
  const [studentForm, setStudentForm] = useState({
    name: '',
    studentId: '',
    email: '',
    roomNumber: '',
    department: '',
  });

  const [managerForm, setManagerForm] = useState({
    name: '',
    email: '',
  });

  // Real-time users subscription
  useEffect(() => {
    let isMounted = true;
    const unsub = subscribeToUsers((uList) => {
      if (isMounted) setUsers(uList);
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Real-time attendance subscription for selected date
  useEffect(() => {
    let isMounted = true;
    const unsub = subscribeToDailyAttendance(selectedDate, (records) => {
      if (isMounted) setAttendanceList(records);
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [selectedDate]);

  const students = users.filter((u) => u.role === 'student');
  const managers = users.filter((u) => u.role === 'mess_manager');

  // Match each student with attendance for selectedDate
  const studentAttendanceRows: { student: UserProfile; record: AttendanceRecord }[] = students.map((student) => {
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

  // Include any extra attendance records not in students list
  const matchedIds = new Set(studentAttendanceRows.map((r) => r.record.id));
  const unmatched = attendanceList.filter((a) => !matchedIds.has(a.id));
  unmatched.forEach((extra) => {
    studentAttendanceRows.push({
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

  // Meal counts for selectedDate: Opt-out logic (Available = Total - Not Available)
  const totalRegisteredCount = studentAttendanceRows.length;
  const breakfastNotAvailableCount = studentAttendanceRows.filter((r) => r.record.breakfast === 'not_available').length;
  const breakfastCount = Math.max(0, totalRegisteredCount - breakfastNotAvailableCount);

  const lunchNotAvailableCount = studentAttendanceRows.filter((r) => r.record.lunch === 'not_available').length;
  const lunchCount = Math.max(0, totalRegisteredCount - lunchNotAvailableCount);

  const dinnerNotAvailableCount = studentAttendanceRows.filter((r) => r.record.dinner === 'not_available').length;
  const dinnerCount = Math.max(0, totalRegisteredCount - dinnerNotAvailableCount);

  // Filter attendance rows for table
  const filteredAttendanceRows = studentAttendanceRows.filter(({ student }) => {
    const q = attendanceSearch.toLowerCase().trim();
    return (
      !q ||
      student.name.toLowerCase().includes(q) ||
      (student.studentId && student.studentId.toLowerCase().includes(q)) ||
      (student.roomNumber && student.roomNumber.toLowerCase().includes(q)) ||
      (student.department && student.department.toLowerCase().includes(q))
    );
  });

  // Cell status badge renderer for opt-out system
  const renderStatusBadge = (status: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
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
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-yellow-400 text-black border border-black/20 shadow-xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
        <span>Available (Default)</span>
        {deadline.isClosed && <Lock className="w-3 h-3 text-black/70 ml-0.5" />}
      </span>
    );
  };

  const loadUsers = async () => {
    const list = await getAllUsers();
    setUsers(list);
  };

  // Handlers for Students
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      name: '',
      studentId: `STU${100 + students.length + 1}`,
      email: '',
      roomNumber: '',
      department: 'Engineering',
    });
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (student: UserProfile) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      studentId: student.studentId || '',
      email: student.email,
      roomNumber: student.roomNumber || '',
      department: student.department || '',
    });
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name.trim() || !studentForm.email.trim()) return;

    const studentToSave: UserProfile = {
      id: editingStudent ? editingStudent.id : `stu_${Date.now()}`,
      name: studentForm.name.trim(),
      studentId: studentForm.studentId.trim().toUpperCase(),
      email: studentForm.email.trim().toLowerCase(),
      roomNumber: studentForm.roomNumber.trim(),
      department: studentForm.department.trim(),
      role: 'student',
      createdAt: editingStudent?.createdAt || new Date().toISOString(),
    };

    await saveUser(studentToSave);
    await loadUsers();
    setIsStudentModalOpen(false);
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete student "${name}"?`)) {
      await deleteUserById(id);
      await loadUsers();
    }
  };

  // Handlers for Mess Managers
  const handleOpenAddManager = () => {
    setEditingManager(null);
    setManagerForm({ name: '', email: '' });
    setIsManagerModalOpen(true);
  };

  const handleOpenEditManager = (manager: UserProfile) => {
    setEditingManager(manager);
    setManagerForm({ name: manager.name, email: manager.email });
    setIsManagerModalOpen(true);
  };

  const handleSaveManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerForm.name.trim() || !managerForm.email.trim()) return;

    const managerToSave: UserProfile = {
      id: editingManager ? editingManager.id : `mgr_${Date.now()}`,
      name: managerForm.name.trim(),
      email: managerForm.email.trim().toLowerCase(),
      role: 'mess_manager',
      createdAt: editingManager?.createdAt || new Date().toISOString(),
    };

    await saveUser(managerToSave);
    await loadUsers();
    setIsManagerModalOpen(false);
  };

  const handleDeleteManager = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete Mess Manager "${name}"?`)) {
      await deleteUserById(id);
      await loadUsers();
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.studentId && s.studentId.toLowerCase().includes(q)) ||
      (s.roomNumber && s.roomNumber.toLowerCase().includes(q)) ||
      (s.department && s.department.toLowerCase().includes(q))
    );
  });

  return (
    <main className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Title & Date Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-black/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-wider font-black text-red-600 mb-0.5">
            <Shield className="w-3.5 h-3.5 text-red-600 shrink-0" />
            ADMIN DASHBOARD
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
            Hostel Mess Administration
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-zinc-600 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 shrink-0" />
            <span>
              {selectedDate === todayStr ? `Today: ${ist.formattedDate}` : `Selected Date: ${selectedDate}`}
            </span>
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-yellow-100/70 p-1.5 rounded-xl border-2 border-yellow-300 self-stretch sm:self-auto justify-center">
          <button
            id="btn-admin-date-today"
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
            id="btn-admin-date-tomorrow"
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
            id="input-admin-custom-date"
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

      {/* OVERVIEW / ATTENDANCE STATS */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-black uppercase tracking-wider">
            Attendance Overview ({selectedDate === todayStr ? 'Today' : selectedDate === tomorrowStr ? 'Tomorrow' : selectedDate})
          </h3>
          <span className="text-xs font-semibold text-zinc-600">
            Out of {students.length} registered students
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl sm:text-3xl">🍳</span>
              <span className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-950 border border-orange-300">
                Closes 12:00 AM
              </span>
            </div>
            <div className="text-xs font-black text-red-600 uppercase tracking-wider">Breakfast</div>
            <div className="text-2xl font-black text-black mt-1">
              {breakfastCount} <span className="text-xs sm:text-sm font-black text-orange-600">Expected</span>
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-600 mt-2 pt-2 border-t border-black/10 font-semibold">
              <span>Total: <strong className="text-black">{totalRegisteredCount}</strong></span>
              <span className="text-red-600 font-black">Opted Out: {breakfastNotAvailableCount}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl sm:text-3xl">🍛</span>
              <span className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-950 border border-orange-300">
                Closes 7:00 AM
              </span>
            </div>
            <div className="text-xs font-black text-red-600 uppercase tracking-wider">Lunch</div>
            <div className="text-2xl font-black text-black mt-1">
              {lunchCount} <span className="text-xs sm:text-sm font-black text-orange-600">Expected</span>
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-600 mt-2 pt-2 border-t border-black/10 font-semibold">
              <span>Total: <strong className="text-black">{totalRegisteredCount}</strong></span>
              <span className="text-red-600 font-black">Opted Out: {lunchNotAvailableCount}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl sm:text-3xl">🍽️</span>
              <span className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-950 border border-orange-300">
                Closes 12:00 PM
              </span>
            </div>
            <div className="text-xs font-black text-red-600 uppercase tracking-wider">Dinner</div>
            <div className="text-2xl font-black text-black mt-1">
              {dinnerCount} <span className="text-xs sm:text-sm font-black text-orange-600">Expected</span>
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-600 mt-2 pt-2 border-t border-black/10 font-semibold">
              <span>Total: <strong className="text-black">{totalRegisteredCount}</strong></span>
              <span className="text-red-600 font-black">Opted Out: {dinnerNotAvailableCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: MANAGE STUDENTS (Section 4 & 13) */}
      {(activeTab === 'dashboard' || activeTab === 'students') && (
        <div className="bg-white rounded-2xl border-2 border-black/10 shadow-sm overflow-hidden">
          {/* Header & Add Button */}
          <div className="p-3.5 sm:p-5 border-b-2 border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-black shrink-0" />
                <h3 className="text-base sm:text-lg font-black text-black">Manage Students</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-yellow-100 text-black border border-yellow-300">
                  {students.length}
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-medium mt-0.5">
                Add, edit, or remove hostel residents
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-base sm:text-xs bg-white border-2 border-black/20 rounded-xl text-black font-semibold focus:outline-hidden focus:border-red-600"
                />
              </div>

              <button
                id="btn-add-student"
                type="button"
                onClick={handleOpenAddStudent}
                className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shrink-0 shadow-md"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>+ Add Student</span>
              </button>
            </div>
          </div>

          {/* Students Mobile Cards (Phone View) */}
          <div className="block sm:hidden divide-y divide-zinc-200">
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 font-bold">
                No students found.
              </div>
            ) : (
              filteredStudents.map((s) => (
                <div key={s.id} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-black">{s.name}</div>
                      <div className="text-xs text-zinc-500 font-mono">
                        {s.studentId || 'No Roll'} • Room {s.roomNumber || '-'}
                      </div>
                      <div className="text-xs text-zinc-600 font-medium mt-0.5">
                        {s.department || 'General'} • <span className="text-zinc-500">{s.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditStudent(s)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 text-black bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded-xl transition-colors cursor-pointer"
                        title="Edit student"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(s.id, s.name)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
                        title="Delete student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Students Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-yellow-100 text-black uppercase text-[11px] font-black tracking-wider border-b-2 border-yellow-300">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Student Name</th>
                  <th className="py-3 px-3">Student ID</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Room</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400 font-bold text-xs">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-yellow-50/60 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-bold text-black">
                        {s.name}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-zinc-700 font-bold">
                        {s.studentId || '-'}
                      </td>
                      <td className="py-3.5 px-3 text-zinc-700">{s.email}</td>
                      <td className="py-3.5 px-3 text-black font-bold">
                        {s.roomNumber || '-'}
                      </td>
                      <td className="py-3.5 px-3 text-zinc-700">{s.department || '-'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudent(s)}
                            className="p-1.5 text-black hover:bg-yellow-200 rounded-md transition-colors cursor-pointer"
                            title="Edit student"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(s.id, s.name)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: MANAGE MESS MANAGERS (Section 4 & 13) */}
      {(activeTab === 'dashboard' || activeTab === 'managers') && (
        <div className="bg-white rounded-2xl border-2 border-black/10 shadow-sm overflow-hidden">
          <div className="p-3.5 sm:p-5 border-b-2 border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-600 shrink-0" />
                <h3 className="text-base sm:text-lg font-black text-black">Manage Mess Managers</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-yellow-100 text-black border border-yellow-300">
                  {managers.length}
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-medium mt-0.5">
                Kitchen supervisors responsible for meal counts
              </p>
            </div>

            <button
              id="btn-add-manager"
              type="button"
              onClick={handleOpenAddManager}
              className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer self-start sm:self-auto shadow-md"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Add Mess Manager</span>
            </button>
          </div>

          {/* Managers Mobile Cards (Phone View) */}
          <div className="block sm:hidden divide-y divide-zinc-200">
            {managers.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400 font-bold">
                No mess managers assigned.
              </div>
            ) : (
              managers.map((m) => (
                <div key={m.id} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-black">{m.name}</div>
                      <div className="text-xs text-zinc-600 font-medium mt-0.5">{m.email}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-orange-100 text-orange-950 border border-orange-300">
                        Mess Manager
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditManager(m)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 text-black bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded-xl transition-colors cursor-pointer"
                        title="Edit Manager"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteManager(m.id, m.name)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
                        title="Delete Manager"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Managers Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-yellow-100 text-black uppercase text-[11px] font-black tracking-wider border-b-2 border-yellow-300">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Manager Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {managers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-400 font-bold text-xs">
                      No mess managers assigned.
                    </td>
                  </tr>
                ) : (
                  managers.map((m) => (
                    <tr key={m.id} className="hover:bg-yellow-50/60 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-bold text-black">
                        {m.name}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700">{m.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-xs font-black bg-orange-100 text-orange-950 border border-orange-300">
                          Mess Manager
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditManager(m)}
                            className="p-1.5 text-black hover:bg-yellow-200 rounded-md transition-colors cursor-pointer"
                            title="Edit Manager"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteManager(m.id, m.name)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Manager"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: VIEW ATTENDANCE (Section 4 & 13) */}
      {(activeTab === 'attendance') && (
        <div className="space-y-4">
          {/* Top Available Counts Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl sm:text-3xl" role="img" aria-label="Breakfast">🍳</span>
                <span className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-950 border border-orange-300">
                  Closes 12:00 AM
                </span>
              </div>
              <div className="text-xs font-black text-red-600 uppercase tracking-wider">Breakfast Available</div>
              <div className="text-2xl sm:text-3xl font-black text-black mt-1.5 flex items-baseline gap-2">
                <Users className="w-5 h-5 text-orange-600 self-center shrink-0" />
                <span>{breakfastCount}</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-600">Students</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl sm:text-3xl" role="img" aria-label="Lunch">🍛</span>
                <span className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-950 border border-orange-300">
                  Closes 7:00 AM
                </span>
              </div>
              <div className="text-xs font-black text-red-600 uppercase tracking-wider">Lunch Available</div>
              <div className="text-2xl sm:text-3xl font-black text-black mt-1.5 flex items-baseline gap-2">
                <Users className="w-5 h-5 text-orange-600 self-center shrink-0" />
                <span>{lunchCount}</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-600">Students</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl sm:text-3xl" role="img" aria-label="Dinner">🍽️</span>
                <span className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-950 border border-orange-300">
                  Closes 12:00 PM
                </span>
              </div>
              <div className="text-xs font-black text-red-600 uppercase tracking-wider">Dinner Available</div>
              <div className="text-2xl sm:text-3xl font-black text-black mt-1.5 flex items-baseline gap-2">
                <Users className="w-5 h-5 text-orange-600 self-center shrink-0" />
                <span>{dinnerCount}</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-600">Students</span>
              </div>
            </div>
          </div>

          {/* Detailed Student Attendance Table */}
          <div className="bg-white rounded-2xl border-2 border-black/10 shadow-sm overflow-hidden">
            {/* Table Header with Search and Filter */}
            <div className="p-3.5 sm:p-5 border-b-2 border-black/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black">
                    Student Attendance Roster
                  </h3>
                  <p className="text-xs text-zinc-600 font-medium">
                    Live meal availability records for {selectedDate} ({studentAttendanceRows.length} students)
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-admin-attendance-search"
                    type="text"
                    placeholder="Search student, roll, or room..."
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-base sm:text-xs bg-white border-2 border-black/20 rounded-xl text-black font-semibold focus:outline-hidden focus:border-red-600"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Cards (Phone Ratio Optimized) */}
            <div className="block sm:hidden divide-y divide-zinc-200">
              {filteredAttendanceRows.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 font-bold">
                  No attendance records found matching "{attendanceSearch}"
                </div>
              ) : (
                filteredAttendanceRows.map(({ student, record }) => (
                  <div key={student.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-black">{student.name}</div>
                        <div className="text-xs text-zinc-500 font-mono">
                          {student.studentId || 'No ID'} • {student.department || 'General'}
                        </div>
                      </div>
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-yellow-100 text-black border border-yellow-300">
                        Room {student.roomNumber || '-'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                      <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200 flex flex-col items-center gap-1 text-center">
                        <span className="text-[11px] font-black text-zinc-700 uppercase">🍳 B'fast</span>
                        {renderStatusBadge(record.breakfast, 'breakfast')}
                      </div>
                      <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200 flex flex-col items-center gap-1 text-center">
                        <span className="text-[11px] font-black text-zinc-700 uppercase">🍛 Lunch</span>
                        {renderStatusBadge(record.lunch, 'lunch')}
                      </div>
                      <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200 flex flex-col items-center gap-1 text-center">
                        <span className="text-[11px] font-black text-zinc-700 uppercase">🍽️ Dinner</span>
                        {renderStatusBadge(record.dinner, 'dinner')}
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
                    <th className="py-3 px-3 sm:px-4">Department</th>
                    <th className="py-3 px-3 sm:px-4">Breakfast</th>
                    <th className="py-3 px-3 sm:px-4">Lunch</th>
                    <th className="py-3 px-3 sm:px-4">Dinner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredAttendanceRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400 font-bold">
                        No students found matching "{attendanceSearch}"
                      </td>
                    </tr>
                  ) : (
                    filteredAttendanceRows.map(({ student, record }) => (
                      <tr key={student.id} className="hover:bg-yellow-50/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-medium text-black">
                          <div>
                            <div className="font-black text-black">{student.name}</div>
                            <div className="text-xs text-zinc-500 font-medium">
                              {student.studentId || 'No ID'}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-black font-bold">
                          {student.roomNumber || '-'}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-zinc-700">
                          {student.department || '-'}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4">
                          {renderStatusBadge(record.breakfast, 'breakfast')}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4">
                          {renderStatusBadge(record.lunch, 'lunch')}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4">
                          {renderStatusBadge(record.dinner, 'dinner')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT STUDENT */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border-2 border-black animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black/10">
              <h3 className="text-base font-black text-black">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="text-zinc-500 hover:text-black p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3 mt-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-black mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saravanavel J"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-base sm:text-xs bg-white border-2 border-black/20 rounded-xl text-black font-semibold focus:outline-hidden focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-black mb-1">Student Roll *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ES24AM46"
                    value={studentForm.studentId}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, studentId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-base sm:text-xs bg-white border-2 border-black/20 rounded-xl text-black font-semibold focus:outline-hidden focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-black mb-1">Room NO</label>
                  <input
                    type="text"
                    placeholder="e.g. 007"
                    value={studentForm.roomNumber}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, roomNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 text-base sm:text-xs bg-white border-2 border-black/20 rounded-xl text-black font-semibold focus:outline-hidden focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. saravanavelj5@gmail.com"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-base sm:text-xs bg-white border-2 border-black/20 rounded-xl text-black font-semibold focus:outline-hidden focus:border-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. AI&ML"
                  value={studentForm.department}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, department: e.target.value })
                  }
                  className="w-full px-3 py-2 text-base sm:text-xs bg-white border-2 border-black/20 rounded-xl text-black font-semibold focus:outline-hidden focus:border-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-black/10">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-bold text-black bg-zinc-100 hover:bg-zinc-200 border border-black/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingStudent ? 'Save Changes' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MESS MANAGER */}
      {isManagerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border-2 border-black animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black/10">
              <h3 className="text-base font-black text-black">
                {editingManager ? 'Edit Mess Manager' : 'Add Mess Manager'}
              </h3>
              <button
                type="button"
                onClick={() => setIsManagerModalOpen(false)}
                className="text-zinc-500 hover:text-black p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManager} className="space-y-3 mt-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-black mb-1">Manager Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={managerForm.name}
                  onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-base sm:text-xs bg-white border-2 border-black/20 rounded-xl text-black font-semibold focus:outline-hidden focus:border-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. manager@hostelmess.edu"
                  value={managerForm.email}
                  onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-base sm:text-xs bg-white border-2 border-black/20 rounded-xl text-black font-semibold focus:outline-hidden focus:border-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-black/10">
                <button
                  type="button"
                  onClick={() => setIsManagerModalOpen(false)}
                  className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-bold text-black bg-zinc-100 hover:bg-zinc-200 border border-black/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingManager ? 'Save Changes' : 'Create Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
