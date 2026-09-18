import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AttendanceRecord, MealType, MealStatus } from '../types';
import {
  getStudentAttendance,
  markAttendance,
  submitStudentAttendanceReport,
  subscribeToDailyAttendance,
  matchStudentAttendance,
} from '../lib/attendanceService';
import {
  getISTTime,
  getTomorrowISTDateString,
  checkMealDeadline,
} from '../lib/timeUtils';
import {
  CheckCircle2,
  XCircle,
  Lock,
  Calendar,
  AlertCircle,
  Hash,
  Building,
  BookOpen,
  Mail,
  Send,
  RotateCcw,
} from 'lucide-react';

interface StudentDashboardProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getISTTime().dateString);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [submittingMeal, setSubmittingMeal] = useState<MealType | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const ist = getISTTime();
  const todayStr = ist.dateString;
  const tomorrowStr = getTomorrowISTDateString();

  // Load attendance whenever selected date changes
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    // Direct fetch first
    getStudentAttendance(currentUser, selectedDate).then((record) => {
      if (isMounted) setAttendance(record);
    });

    // Real-time listener for the selected date
    const unsub = subscribeToDailyAttendance(selectedDate, (records) => {
      if (!isMounted) return;
      const myRecord = matchStudentAttendance(currentUser, records);
      if (myRecord) {
        setAttendance(myRecord);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [currentUser, selectedDate]);

  const handleMark = async (meal: MealType, status: 'available' | 'not_available') => {
    if (!currentUser) return;

    // Check deadline client-side
    const deadlineCheck = checkMealDeadline(meal, selectedDate);
    if (deadlineCheck.isClosed) {
      setNotification({
        text: `Attendance is closed for ${meal.toUpperCase()}. (${deadlineCheck.reason})`,
        type: 'error',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setSubmittingMeal(meal);
    try {
      const res = await markAttendance(currentUser, selectedDate, meal, status);
      if (res.success && res.record) {
        setAttendance(res.record);
        setNotification({
          text:
            status === 'not_available'
              ? `Marked as NOT AVAILABLE for ${meal.toUpperCase()}. You won't be counted for this meal.`
              : `Marked as AVAILABLE for ${meal.toUpperCase()}.`,
          type: 'success',
        });
      } else {
        setNotification({ text: res.message, type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setNotification({ text: 'Failed to update attendance', type: 'error' });
    } finally {
      setSubmittingMeal(null);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleSubmitReport = async () => {
    if (!currentUser) return;

    setIsSubmittingReport(true);
    try {
      const currentB = attendance?.breakfast === 'not_available' ? 'not_available' : 'available';
      const currentL = attendance?.lunch === 'not_available' ? 'not_available' : 'available';
      const currentD = attendance?.dinner === 'not_available' ? 'not_available' : 'available';

      const res = await submitStudentAttendanceReport(currentUser, selectedDate, {
        breakfast: currentB,
        lunch: currentL,
        dinner: currentD,
      });

      if (res.success && res.record) {
        setAttendance(res.record);
        setNotification({
          text: `Attendance report saved for ${selectedDate === todayStr ? 'Today' : selectedDate}!`,
          type: 'success',
        });
      } else {
        setNotification({ text: res.message, type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setNotification({ text: 'Failed to submit attendance report. Please try again.', type: 'error' });
    } finally {
      setIsSubmittingReport(false);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  // Helper to determine if meal is opted-out
  const isMealNotAvailable = (meal: MealType): boolean => {
    if (!attendance) return false;
    return attendance[meal] === 'not_available';
  };

  // If activeTab is profile, show student profile view
  if (activeTab === 'profile') {
    return (
      <main className="max-w-2xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-8">
          <div className="flex items-center gap-3.5 sm:gap-4 border-b border-slate-100 pb-4 sm:pb-6 mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl sm:text-2xl font-bold shrink-0">
              {currentUser?.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">{currentUser?.name}</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Hostel Resident Student</p>
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-4">
            <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2.5 sm:gap-3 text-slate-600">
                <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Student Roll</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                {currentUser?.studentId || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2.5 sm:gap-3 text-slate-600">
                <Building className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Room NO</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                {currentUser?.roomNumber || 'Not assigned'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2.5 sm:gap-3 text-slate-600">
                <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Department</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                {currentUser?.department || 'General'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2.5 sm:gap-3 text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Email</span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate max-w-[180px] sm:max-w-none text-right">
                {currentUser?.email}
              </span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Meal configurations matching prompt
  const meals: {
    type: MealType;
    name: string;
    emoji: string;
    deadlineText: string;
  }[] = [
    {
      type: 'breakfast',
      name: 'Breakfast',
      emoji: '🍳',
      deadlineText: '12:00 AM (Midnight)',
    },
    {
      type: 'lunch',
      name: 'Lunch',
      emoji: '🍛',
      deadlineText: '7:00 AM',
    },
    {
      type: 'dinner',
      name: 'Dinner',
      emoji: '🍽️',
      deadlineText: '12:00 PM (Noon)',
    },
  ];

  return (
    <main className="max-w-2xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 sm:gap-3 transition-all ${
            notification.type === 'success'
              ? 'bg-yellow-100 text-black border-2 border-yellow-400 shadow-xs'
              : 'bg-red-50 text-red-900 border-2 border-red-300 shadow-xs'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Greeting & Date Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-black/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="text-[11px] sm:text-xs uppercase tracking-wider font-black text-red-600 mb-0.5">
            HOSTEL MESS • ATTENDANCE SYSTEM
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-black tracking-tight">
            Welcome, {currentUser?.name} 👋
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-zinc-600 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 shrink-0" />
            <span>
              {selectedDate === todayStr ? ist.formattedDate : `Tomorrow, ${selectedDate}`}
            </span>
          </p>
        </div>

        {/* Date Selector: Today / Tomorrow */}
        <div className="flex items-center gap-1 bg-yellow-100/70 p-1 rounded-xl border-2 border-yellow-300 self-stretch sm:self-auto justify-center">
          <button
            id="btn-date-today"
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all ${
              selectedDate === todayStr
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-black hover:bg-yellow-200'
            }`}
          >
            Today
          </button>
          <button
            id="btn-date-tomorrow"
            type="button"
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all ${
              selectedDate === tomorrowStr
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-black hover:bg-yellow-200'
            }`}
          >
            Tomorrow
          </button>
        </div>
      </div>

      {/* Info Banner explaining Opt-Out logic */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-4 text-xs sm:text-sm text-black flex items-start gap-3 shadow-xs">
        <CheckCircle2 className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-black text-black">Available by Default:</span> You are automatically counted for Breakfast, Lunch, and Dinner. You only need to take action if you are <strong className="text-red-600 font-black">NOT AVAILABLE</strong>.
        </div>
      </div>

      {/* Meals Cards List */}
      <div className="space-y-3.5 sm:space-y-5">
        {meals.map((meal) => {
          const deadline = checkMealDeadline(meal.type, selectedDate);
          const notAvailable = isMealNotAvailable(meal.type);
          const isSubmittingThis = submittingMeal === meal.type;

          return (
            <div
              key={meal.type}
              id={`meal-card-${meal.type}`}
              className={`bg-white rounded-2xl border-2 transition-all p-4 sm:p-6 shadow-sm ${
                deadline.isClosed
                  ? 'border-black/20 bg-zinc-100'
                  : notAvailable
                  ? 'border-red-500 bg-red-50/40'
                  : 'border-black/10 hover:border-black/30'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2.5 mb-3 sm:mb-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="text-2xl sm:text-3xl" role="img" aria-label={meal.name}>
                    {meal.emoji}
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-black text-black tracking-tight">
                      {meal.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-zinc-600 font-medium">
                      Attendance closes: <span className="font-black text-black">{meal.deadlineText}</span>
                    </p>
                  </div>
                </div>

                {/* Closed Lock Tag or Remaining Time */}
                {deadline.isClosed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold bg-black text-white shrink-0">
                    <Lock className="w-3 h-3 text-yellow-400" />
                    Closed
                  </span>
                ) : deadline.timeRemaining ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold bg-orange-100 text-orange-950 border border-orange-300 shrink-0">
                    {deadline.timeRemaining}
                  </span>
                ) : null}
              </div>

              {/* Status Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-black">Status:</span>
                  {notAvailable ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs sm:text-sm font-black bg-red-600 text-white border border-red-700 shadow-xs">
                      <XCircle className="w-4 h-4 text-white shrink-0" />
                      Not Available ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs sm:text-sm font-black bg-yellow-400 text-black border border-black/20 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
                      Available by Default
                    </span>
                  )}
                </div>

                {/* Sub-message */}
                {notAvailable ? (
                  <p className="text-xs sm:text-sm font-bold text-red-900 mt-2 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center gap-2">
                    <span className="text-red-600 font-bold">ℹ️</span>
                    <span>You won't be counted for this meal.</span>
                  </p>
                ) : (
                  <p className="text-xs text-zinc-600 font-medium mt-1.5">
                    You are counted as attending this meal unless you opt out before the deadline.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              {deadline.isClosed ? (
                <div className="p-3 bg-zinc-200 rounded-xl border border-black/10 flex items-center justify-between gap-2 text-black text-xs sm:text-sm font-bold">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-black shrink-0" />
                    <span>Attendance Closed</span>
                  </div>
                  <span className="text-[11px] text-zinc-600">Deadline: {meal.deadlineText}</span>
                </div>
              ) : notAvailable ? (
                /* When Not Available: Allow student to cancel/change before deadline (Secondary color Orange) */
                <div className="space-y-2">
                  <button
                    id={`btn-${meal.type}-cancel`}
                    type="button"
                    disabled={isSubmittingThis}
                    onClick={() => handleMark(meal.type, 'available')}
                    className="w-full min-h-[46px] sm:min-h-[48px] py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.99] border border-orange-600 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <RotateCcw className="w-4 h-4 text-white shrink-0" />
                    <span>Cancel (I will attend {meal.name})</span>
                  </button>
                  <p className="text-[11px] text-center text-zinc-600 font-medium">
                    You can change your status anytime before {meal.deadlineText}.
                  </p>
                </div>
              ) : (
                /* When Available: Show I'M NOT AVAILABLE button (Primary color Red) */
                <div>
                  <button
                    id={`btn-${meal.type}-not-available`}
                    type="button"
                    disabled={isSubmittingThis}
                    onClick={() => handleMark(meal.type, 'not_available')}
                    className="w-full min-h-[48px] sm:min-h-[50px] py-3 px-4 rounded-xl font-black text-xs sm:text-sm md:text-base bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white transition-all cursor-pointer select-none flex items-center justify-center gap-2 shadow-md"
                  >
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-white" />
                    <span className="tracking-wide uppercase">I'm NOT Available</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary / Report Confirmation Card */}
      <div className="bg-white rounded-2xl border-2 border-black/10 p-4 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h4 className="text-base sm:text-lg font-black text-black tracking-tight flex items-center gap-2">
              <span>Today's Meal Plan Summary</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-yellow-400 text-black border border-black/20 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                Active
              </span>
            </h4>
            <p className="text-xs text-zinc-600 font-medium mt-0.5">
              Summary for {selectedDate === todayStr ? 'Today' : `Tomorrow (${selectedDate})`}
            </p>
          </div>

          {/* Meal Status Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`px-2.5 py-1 rounded-lg font-black border transition-colors shadow-xs ${
                isMealNotAvailable('breakfast')
                  ? 'bg-red-600 text-white border-red-700'
                  : 'bg-yellow-400 text-black border-black/20'
              }`}
            >
              🍳 {isMealNotAvailable('breakfast') ? 'Skipping' : 'Attending'}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg font-black border transition-colors shadow-xs ${
                isMealNotAvailable('lunch')
                  ? 'bg-red-600 text-white border-red-700'
                  : 'bg-yellow-400 text-black border-black/20'
              }`}
            >
              🍛 {isMealNotAvailable('lunch') ? 'Skipping' : 'Attending'}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg font-black border transition-colors shadow-xs ${
                isMealNotAvailable('dinner')
                  ? 'bg-red-600 text-white border-red-700'
                  : 'bg-yellow-400 text-black border-black/20'
              }`}
            >
              🍽️ {isMealNotAvailable('dinner') ? 'Skipping' : 'Attending'}
            </span>
          </div>
        </div>

        {/* Submit Your Report Button */}
        <button
          id="btn-submit-attendance-report"
          type="button"
          disabled={isSubmittingReport}
          onClick={handleSubmitReport}
          className="w-full min-h-[48px] sm:min-h-[50px] py-3 px-6 rounded-xl font-black text-xs sm:text-sm bg-black text-white hover:bg-zinc-800 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md border-2 border-black disabled:opacity-50"
        >
          {isSubmittingReport ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving your report...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-yellow-400" />
              <span>Submit your report</span>
            </>
          )}
        </button>
      </div>
    </main>
  );
};

