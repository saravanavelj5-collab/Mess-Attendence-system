export type Role = 'student' | 'mess_manager' | 'admin';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export type MealStatus = 'available' | 'not_available' | 'not_submitted';

export interface UserProfile {
  id: string; // Auth UID or Unique ID
  name: string;
  email: string;
  role: Role;
  studentId?: string;
  roomNumber?: string;
  department?: string;
  createdAt?: string;
}

export interface AttendanceRecord {
  id: string; // Typically `${studentId}_${date}`
  studentId: string;
  studentName: string;
  roomNumber?: string;
  department?: string;
  date: string; // YYYY-MM-DD
  breakfast: MealStatus;
  lunch: MealStatus;
  dinner: MealStatus;
  updatedAt: string;
}

export interface MealConfig {
  type: MealType;
  name: string;
  icon: string;
  deadlineDisplay: string;
  closingHourIST: number;
  closingMinuteIST: number;
}
