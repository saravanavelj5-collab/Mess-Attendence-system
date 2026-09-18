import { MealType } from '../types';

export interface ISTTimeInfo {
  dateString: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "Friday, September 5, 2026"
  formattedShortDate: string; // e.g. "Sep 5, 2026"
  timeString: string; // e.g. "06:45:20 AM"
  hours: number; // 0 - 23 in IST
  minutes: number; // 0 - 59 in IST
  seconds: number;
  timestamp: number;
}

// Global offset for optional testing/simulation
let simulatedOffsetMs = 0;

export function setSimulatedTimeOffset(offsetMs: number) {
  simulatedOffsetMs = offsetMs;
}

export function getSimulatedTimeOffset(): number {
  return simulatedOffsetMs;
}

/**
 * Gets the current time in Asia/Kolkata (IST, UTC+5:30)
 */
export function getISTTime(customDate?: Date): ISTTimeInfo {
  const baseTime = customDate ? customDate.getTime() : Date.now() + simulatedOffsetMs;
  const now = new Date(baseTime);

  // Format in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hourStr = getPart('hour');
  const minStr = getPart('minute');
  const secStr = getPart('second');

  const hours = parseInt(hourStr, 10);
  const minutes = parseInt(minStr, 10);
  const seconds = parseInt(secStr, 10);

  const dateString = `${year}-${month}-${day}`;

  // Long readable format: "September 5, 2026"
  const readableFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const shortFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Time in 12-hour format with AM/PM
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return {
    dateString,
    formattedDate: readableFormatter.format(now),
    formattedShortDate: shortFormatter.format(now),
    timeString: timeFormatter.format(now),
    hours,
    minutes,
    seconds,
    timestamp: now.getTime(),
  };
}

/**
 * Gets tomorrow's date string in YYYY-MM-DD IST
 */
export function getTomorrowISTDateString(): string {
  const currentIST = getISTTime();
  const [y, m, d] = currentIST.dateString.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  dateObj.setUTCDate(dateObj.getUTCDate() + 1);
  const ny = dateObj.getUTCFullYear();
  const nm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export interface MealDeadlineStatus {
  isClosed: boolean;
  closingTimeLabel: string;
  reason: string;
  deadlineDisplay: string;
  timeRemaining?: string;
}

/**
 * Evaluates whether attendance is closed for a specific meal on a given date in IST.
 * 
 * Rules:
 * - Past dates: ALWAYS CLOSED.
 * - Future dates (> todayIST): ALWAYS OPEN (closes on that date at the meal deadline).
 * - Today's date (=== todayIST):
 *   - Breakfast: Closes at 12:00 AM (00:00:00 IST). (For today's breakfast, closes at start of today).
 *   - Lunch: Closes at 7:00 AM (07:00:00 IST).
 *   - Dinner: Closes at 12:00 PM (12:00:00 IST).
 */
export function checkMealDeadline(meal: MealType, targetDateStr: string): MealDeadlineStatus {
  const ist = getISTTime();
  const todayStr = ist.dateString;

  const labels = {
    breakfast: '12:00 AM (Midnight)',
    lunch: '7:00 AM',
    dinner: '12:00 PM (Noon)',
  };

  const deadlineDisplay = labels[meal];

  // Case 1: Past date
  if (targetDateStr < todayStr) {
    return {
      isClosed: true,
      closingTimeLabel: deadlineDisplay,
      reason: 'Date has passed',
      deadlineDisplay,
    };
  }

  // Case 2: Future date
  if (targetDateStr > todayStr) {
    return {
      isClosed: false,
      closingTimeLabel: deadlineDisplay,
      reason: 'Open for upcoming date',
      deadlineDisplay,
    };
  }

  // Case 3: Target date is TODAY
  const currentHour = ist.hours;
  const currentMinute = ist.minutes;

  if (meal === 'breakfast') {
    // Closes at 12:00 AM (Midnight). Once 00:00 of today has arrived, today's breakfast is closed.
    return {
      isClosed: true,
      closingTimeLabel: '12:00 AM (Midnight)',
      reason: 'Closed at 12:00 AM Midnight',
      deadlineDisplay,
    };
  }

  if (meal === 'lunch') {
    // Closes at 7:00 AM
    const isPast7AM = currentHour > 7 || (currentHour === 7 && currentMinute >= 0);
    if (isPast7AM) {
      return {
        isClosed: true,
        closingTimeLabel: '7:00 AM',
        reason: 'Closed at 7:00 AM',
        deadlineDisplay,
      };
    }
    // Calculate remaining
    const remainingMinutes = (6 - currentHour) * 60 + (60 - currentMinute);
    const hrs = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    return {
      isClosed: false,
      closingTimeLabel: '7:00 AM',
      reason: `Closes in ${hrs > 0 ? `${hrs}h ` : ''}${mins}m`,
      deadlineDisplay,
      timeRemaining: `${hrs > 0 ? `${hrs}h ` : ''}${mins}m remaining`,
    };
  }

  if (meal === 'dinner') {
    // Closes at 12:00 PM (Noon)
    const isPast12PM = currentHour >= 12;
    if (isPast12PM) {
      return {
        isClosed: true,
        closingTimeLabel: '12:00 PM (Noon)',
        reason: 'Closed at 12:00 PM Noon',
        deadlineDisplay,
      };
    }
    const remainingMinutes = (11 - currentHour) * 60 + (60 - currentMinute);
    const hrs = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    return {
      isClosed: false,
      closingTimeLabel: '12:00 PM (Noon)',
      reason: `Closes in ${hrs > 0 ? `${hrs}h ` : ''}${mins}m`,
      deadlineDisplay,
      timeRemaining: `${hrs > 0 ? `${hrs}h ` : ''}${mins}m remaining`,
    };
  }

  return {
    isClosed: false,
    closingTimeLabel: deadlineDisplay,
    reason: 'Open',
    deadlineDisplay,
  };
}

export interface MealCountdownInfo {
  meal: MealType;
  deadlineLabel: string;
  deadlineTimeIST: string;
  deadlineTimestamp: number; // UTC ms
  isClosed: boolean;
  totalSecondsRemaining: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedCountdown: string; // e.g. "02h 45m 12s"
  progressPercent: number; // 0 (start) to 100 (cutoff reached)
  statusText: string;
}

/**
 * Calculates the exact UTC millisecond timestamp when attendance for a meal closes.
 */
export function getMealDeadlineTimestamp(meal: MealType, targetDateStr: string): number {
  const [y, m, d] = targetDateStr.split('-').map(Number);
  let hourIST = 0;
  if (meal === 'breakfast') hourIST = 0; // 00:00:00 IST
  else if (meal === 'lunch') hourIST = 7; // 07:00:00 IST
  else if (meal === 'dinner') hourIST = 12; // 12:00:00 IST

  // IST is UTC + 5:30 -> UTC timestamp is targetDate at hourIST minus 5.5 hours
  return Date.UTC(y, m - 1, d, hourIST, 0, 0) - (5.5 * 3600 * 1000);
}

/**
 * Gets live ticking countdown metrics for a specific meal on a date.
 */
export function getMealCountdown(meal: MealType, targetDateStr: string): MealCountdownInfo {
  const ist = getISTTime();
  const currentTimestamp = ist.timestamp;
  const deadlineTimestamp = getMealDeadlineTimestamp(meal, targetDateStr);
  const diffMs = deadlineTimestamp - currentTimestamp;

  const labels = {
    breakfast: '12:00 AM (Midnight)',
    lunch: '7:00 AM',
    dinner: '12:00 PM (Noon)',
  };
  const deadlineDisplay = labels[meal];

  if (diffMs <= 0) {
    return {
      meal,
      deadlineLabel: deadlineDisplay,
      deadlineTimeIST: deadlineDisplay,
      deadlineTimestamp,
      isClosed: true,
      totalSecondsRemaining: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedCountdown: '00:00:00',
      progressPercent: 100,
      statusText: `Closed at ${deadlineDisplay}`,
    };
  }

  const totalSecondsRemaining = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSecondsRemaining / 3600);
  const minutes = Math.floor((totalSecondsRemaining % 3600) / 60);
  const seconds = totalSecondsRemaining % 60;

  // Compute progress bar percentage based on sensible window before deadline
  // Breakfast: 24-hr window leading to midnight
  // Lunch: 7-hr window from 00:00 to 07:00
  // Dinner: 5-hr window from 07:00 to 12:00
  let windowDurationMs = 24 * 3600 * 1000;
  if (meal === 'lunch') windowDurationMs = 7 * 3600 * 1000;
  if (meal === 'dinner') windowDurationMs = 5 * 3600 * 1000;

  const elapsedMs = Math.max(0, windowDurationMs - diffMs);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / windowDurationMs) * 100)));

  const formattedCountdown = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

  return {
    meal,
    deadlineLabel: deadlineDisplay,
    deadlineTimeIST: deadlineDisplay,
    deadlineTimestamp,
    isClosed: false,
    totalSecondsRemaining,
    hours,
    minutes,
    seconds,
    formattedCountdown,
    progressPercent,
    statusText: `Closes in ${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`,
  };
}

export interface UpcomingDeadlineInfo {
  meal: MealType;
  dateString: string;
  dateLabel: string;
  label: string;
  countdown: MealCountdownInfo;
}

/**
 * Finds the immediate next upcoming meal cutoff relative to current IST time.
 */
export function getNextUpcomingDeadline(): UpcomingDeadlineInfo {
  const ist = getISTTime();
  const todayStr = ist.dateString;
  const tomorrowStr = getTomorrowISTDateString();

  // Check today's Lunch (07:00 AM)
  const todayLunchCountdown = getMealCountdown('lunch', todayStr);
  if (!todayLunchCountdown.isClosed) {
    return {
      meal: 'lunch',
      dateString: todayStr,
      dateLabel: 'Today',
      label: "Today's Lunch (7:00 AM IST)",
      countdown: todayLunchCountdown,
    };
  }

  // Check today's Dinner (12:00 PM)
  const todayDinnerCountdown = getMealCountdown('dinner', todayStr);
  if (!todayDinnerCountdown.isClosed) {
    return {
      meal: 'dinner',
      dateString: todayStr,
      dateLabel: 'Today',
      label: "Today's Dinner (12:00 PM IST)",
      countdown: todayDinnerCountdown,
    };
  }

  // Otherwise, next is Tomorrow's Breakfast (closes 12:00 AM tonight)
  const tomorrowBreakfastCountdown = getMealCountdown('breakfast', tomorrowStr);
  if (!tomorrowBreakfastCountdown.isClosed) {
    return {
      meal: 'breakfast',
      dateString: tomorrowStr,
      dateLabel: 'Tomorrow',
      label: "Tomorrow's Breakfast (12:00 AM Midnight IST)",
      countdown: tomorrowBreakfastCountdown,
    };
  }

  // Tomorrow's Lunch
  const tomorrowLunchCountdown = getMealCountdown('lunch', tomorrowStr);
  if (!tomorrowLunchCountdown.isClosed) {
    return {
      meal: 'lunch',
      dateString: tomorrowStr,
      dateLabel: 'Tomorrow',
      label: "Tomorrow's Lunch (7:00 AM IST)",
      countdown: tomorrowLunchCountdown,
    };
  }

  // Tomorrow's Dinner
  const tomorrowDinnerCountdown = getMealCountdown('dinner', tomorrowStr);
  return {
    meal: 'dinner',
    dateString: tomorrowStr,
    dateLabel: 'Tomorrow',
    label: "Tomorrow's Dinner (12:00 PM IST)",
    countdown: tomorrowDinnerCountdown,
  };
}
