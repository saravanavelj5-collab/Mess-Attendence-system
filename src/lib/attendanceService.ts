import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, AttendanceRecord, MealType, MealStatus } from '../types';
import { INITIAL_USERS, getInitialAttendance } from './initialData';
import { checkMealDeadline, getISTTime } from './timeUtils';

const USERS_COLLECTION = 'users';
const ATTENDANCE_COLLECTION = 'attendance';

// Local storage fallback keys for offline / instant load
const LOCAL_USERS_KEY = 'hostel_mess_users';
const LOCAL_ATTENDANCE_KEY = 'hostel_mess_attendance';

function getLocalUsers(): UserProfile[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return INITIAL_USERS;
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

function setLocalUsers(users: UserProfile[]) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage quota or sandbox restrictions safely
  }
}

function getLocalAttendance(): AttendanceRecord[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return getInitialAttendance();
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    return raw ? JSON.parse(raw) : getInitialAttendance();
  } catch {
    return getInitialAttendance();
  }
}

function setLocalAttendance(records: AttendanceRecord[]) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota or sandbox restrictions safely
  }
}

/**
 * Initialize Firestore data if empty
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    if (usersSnap.empty) {
      console.log('Seeding initial users to Firestore...');
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, USERS_COLLECTION, u.id), u);
      }
    }

    const today = getISTTime().dateString;
    const attSnap = await getDocs(collection(db, ATTENDANCE_COLLECTION));
    if (attSnap.empty) {
      console.log('Seeding initial attendance to Firestore...');
      const samples = getInitialAttendance(today);
      for (const a of samples) {
        await setDoc(doc(db, ATTENDANCE_COLLECTION, a.id), a);
      }
    }
  } catch (err) {
    console.warn('Could not seed Firestore (might be offline, using local store):', err);
    // Ensure local store is populated
    if (typeof window !== 'undefined' && window.localStorage) {
      if (!localStorage.getItem(LOCAL_USERS_KEY)) {
        setLocalUsers(INITIAL_USERS);
      }
      if (!localStorage.getItem(LOCAL_ATTENDANCE_KEY)) {
        setLocalAttendance(getInitialAttendance());
      }
    }
  }
}

/**
 * Fetch all users
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    if (snap.empty) {
      return getLocalUsers();
    }
    const list: UserProfile[] = [];
    snap.forEach((d) => list.push(d.data() as UserProfile));
    setLocalUsers(list);
    return list;
  } catch (err) {
    console.warn('Using local users:', err);
    return getLocalUsers();
  }
}

/**
 * Subscribe to Users collection
 */
export function subscribeToUsers(
  callback: (users: UserProfile[]) => void,
  onError?: (err: unknown) => void
): () => void {
  try {
    return onSnapshot(
      collection(db, USERS_COLLECTION),
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => list.push(d.data() as UserProfile));
        if (list.length > 0) {
          setLocalUsers(list);
          callback(list);
        } else {
          callback(getLocalUsers());
        }
      },
      (error) => {
        console.warn('Users snapshot error, falling back to local:', error);
        callback(getLocalUsers());
        if (onError) onError(error);
      }
    );
  } catch {
    callback(getLocalUsers());
    return () => {};
  }
}

/**
 * Save / Update User Profile
 */
export async function saveUser(user: UserProfile): Promise<void> {
  // Update local
  const current = getLocalUsers();
  const existingIdx = current.findIndex((u) => u.id === user.id);
  if (existingIdx >= 0) {
    current[existingIdx] = user;
  } else {
    current.push(user);
  }
  setLocalUsers(current);

  // Update Firestore
  try {
    await setDoc(doc(db, USERS_COLLECTION, user.id), user, { merge: true });
  } catch (error) {
    console.warn('Firestore user save failed, kept locally:', error);
  }
}

/**
 * Delete User
 */
export async function deleteUserById(userId: string): Promise<void> {
  const current = getLocalUsers().filter((u) => u.id !== userId);
  setLocalUsers(current);

  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  } catch (error) {
    console.warn('Firestore user delete failed:', error);
  }
}

/**
 * Match a student user profile with their attendance record safely across ID variations,
 * roll numbers, document prefixes, and casing.
 */
export function matchStudentAttendance(
  student: UserProfile,
  attendanceList: AttendanceRecord[]
): AttendanceRecord | undefined {
  if (!student || !attendanceList || attendanceList.length === 0) return undefined;

  const sId = (student.studentId || '').trim().toLowerCase();
  const uId = (student.id || '').trim().toLowerCase();
  const email = (student.email || '').trim().toLowerCase();
  const name = (student.name || '').trim().toLowerCase();

  return attendanceList.find((a) => {
    const aStudentId = (a.studentId || '').trim().toLowerCase();
    const aName = (a.studentName || '').trim().toLowerCase();
    const aId = (a.id || '').trim().toLowerCase();

    // Direct match with studentId (Roll No)
    if (sId && aStudentId === sId) return true;

    // Direct match with user id
    if (uId && aStudentId === uId) return true;

    // Doc ID prefix match (e.g. STU101_2026-09-10 or stu_saravanavel_2026-09-10)
    if (sId && aId.startsWith(`${sId}_`)) return true;
    if (uId && aId.startsWith(`${uId}_`)) return true;

    // Name match fallback
    if (name && aName === name) return true;

    return false;
  });
}

/**
 * Subscribe to Attendance for a specific date with real-time Firestore
 * and instant local broadcast synchronization.
 */
export function subscribeToDailyAttendance(
  dateStr: string,
  callback: (records: AttendanceRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  // Helper to get merged records for this date
  const getMergedForDate = (firestoreList: AttendanceRecord[] = []) => {
    const localAll = getLocalAttendance();
    const localForDate = localAll.filter((a) => a.date === dateStr);

    const map = new Map<string, AttendanceRecord>();
    // Add local records first
    localForDate.forEach((r) => map.set(r.id, r));
    // Overwrite / merge with Firestore records
    firestoreList.forEach((r) => map.set(r.id, r));

    return Array.from(map.values());
  };

  // Immediate callback with current data so UI is instantly populated
  callback(getMergedForDate());

  // Listen to local window broadcast updates
  const handleLocalUpdate = (e: Event) => {
    const custom = e as CustomEvent<{ record: AttendanceRecord; date: string }>;
    if (custom.detail && custom.detail.date === dateStr) {
      callback(getMergedForDate([custom.detail.record]));
    } else {
      callback(getMergedForDate());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('hostel_attendance_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);
  }

  let unsubFirestore: () => void = () => {};

  try {
    const q = query(collection(db, ATTENDANCE_COLLECTION), where('date', '==', dateStr));
    unsubFirestore = onSnapshot(
      q,
      (snap) => {
        const firestoreList: AttendanceRecord[] = [];
        snap.forEach((d) => firestoreList.push(d.data() as AttendanceRecord));

        const merged = getMergedForDate(firestoreList);

        // Update local cache
        const localAll = getLocalAttendance();
        const otherDates = localAll.filter((a) => a.date !== dateStr);
        setLocalAttendance([...otherDates, ...merged]);

        callback(merged);
      },
      (error) => {
        console.warn('Attendance snapshot error, using local fallback:', error);
        callback(getMergedForDate());
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Firestore subscription failed, using local:', err);
    callback(getMergedForDate());
  }

  return () => {
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('hostel_attendance_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    }
  };
}

/**
 * Get or initialize attendance for a student on a specific date
 */
export async function getStudentAttendance(
  student: UserProfile,
  dateStr: string
): Promise<AttendanceRecord> {
  const sId = student.studentId || student.id;
  const docId = `${sId}_${dateStr}`;
  try {
    const docRef = doc(db, ATTENDANCE_COLLECTION, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AttendanceRecord;
    }
  } catch (e) {
    console.warn('Firestore fetch student attendance fallback:', e);
  }

  // Check local
  const local = getLocalAttendance();
  const match = matchStudentAttendance(student, local.filter((a) => a.date === dateStr));
  if (match) return match;

  // Return new record with 'available' as the default status in the opt-out system
  return {
    id: docId,
    studentId: sId,
    studentName: student.name,
    roomNumber: student.roomNumber,
    department: student.department,
    date: dateStr,
    breakfast: 'available',
    lunch: 'available',
    dinner: 'available',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Check if a student is available for a meal in the opt-out system.
 * Any student is available by default unless explicitly marked 'not_available'.
 */
export function isStudentAvailable(status?: MealStatus): boolean {
  return status !== 'not_available';
}

/**
 * Mark student attendance for a meal
 * Enforces server/deadline security check!
 */
export async function markAttendance(
  student: UserProfile,
  dateStr: string,
  meal: MealType,
  status: 'available' | 'not_available'
): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  // CRITICAL SECURITY CHECK: Check closing deadline
  const deadline = checkMealDeadline(meal, dateStr);
  if (deadline.isClosed) {
    return {
      success: false,
      message: `Attendance is closed for ${meal.toUpperCase()}. Deadline was ${deadline.closingTimeLabel}.`,
    };
  }

  const sId = student.studentId || student.id;
  const docId = `${sId}_${dateStr}`;
  const nowIso = new Date().toISOString();

  // Retrieve current record
  const current = await getStudentAttendance(student, dateStr);
  const updatedRecord: AttendanceRecord = {
    ...current,
    id: docId,
    studentId: sId,
    studentName: student.name,
    roomNumber: student.roomNumber || '',
    department: student.department || '',
    date: dateStr,
    [meal]: status,
    updatedAt: nowIso,
  };

  // 1. Save to local storage
  const allLocal = getLocalAttendance();
  const existingIdx = allLocal.findIndex((r) => r.id === docId);
  if (existingIdx >= 0) {
    allLocal[existingIdx] = updatedRecord;
  } else {
    allLocal.push(updatedRecord);
  }
  setLocalAttendance(allLocal);

  // 2. Dispatch broadcast event for immediate local UI sync
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hostel_attendance_updated', {
        detail: { record: updatedRecord, date: dateStr },
      })
    );
  }

  // 3. Save to Firestore
  try {
    await setDoc(doc(db, ATTENDANCE_COLLECTION, docId), updatedRecord, { merge: true });
  } catch (error) {
    console.warn('Firestore attendance save failed, saved locally:', error);
  }

  return {
    success: true,
    message: `Attendance marked as ${status.replace('_', ' ').toUpperCase()}`,
    record: updatedRecord,
  };
}

/**
 * Submit full student attendance report for meals
 * Enforces deadline checks for open meals and updates Firestore and local store
 */
export async function submitStudentAttendanceReport(
  student: UserProfile,
  dateStr: string,
  mealsStatus: {
    breakfast?: MealStatus;
    lunch?: MealStatus;
    dinner?: MealStatus;
  }
): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  const current = await getStudentAttendance(student, dateStr);
  const sId = student.studentId || student.id;
  const docId = `${sId}_${dateStr}`;
  const nowIso = new Date().toISOString();

  const updatedRecord: AttendanceRecord = {
    ...current,
    id: docId,
    studentId: sId,
    studentName: student.name,
    roomNumber: student.roomNumber || '',
    department: student.department || '',
    date: dateStr,
    updatedAt: nowIso,
  };

  let updatedCount = 0;
  const mealKeys: MealType[] = ['breakfast', 'lunch', 'dinner'];
  for (const m of mealKeys) {
    const desired = mealsStatus[m];
    if (desired && desired !== 'not_submitted') {
      const deadline = checkMealDeadline(m, dateStr);
      if (!deadline.isClosed) {
        updatedRecord[m] = desired;
        updatedCount++;
      } else {
        // Keep previous status for closed meal
        updatedRecord[m] = current[m] || 'not_submitted';
      }
    }
  }

  // 1. Save to local storage
  const allLocal = getLocalAttendance();
  const existingIdx = allLocal.findIndex((r) => r.id === docId);
  if (existingIdx >= 0) {
    allLocal[existingIdx] = updatedRecord;
  } else {
    allLocal.push(updatedRecord);
  }
  setLocalAttendance(allLocal);

  // 2. Dispatch broadcast event for immediate local UI sync
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hostel_attendance_updated', {
        detail: { record: updatedRecord, date: dateStr },
      })
    );
  }

  // 3. Save to Firestore
  try {
    await setDoc(doc(db, ATTENDANCE_COLLECTION, docId), updatedRecord, { merge: true });
  } catch (error) {
    console.warn('Firestore attendance report save failed, saved locally:', error);
  }

  return {
    success: true,
    message: 'Attendance report submitted successfully!',
    record: updatedRecord,
  };
}
