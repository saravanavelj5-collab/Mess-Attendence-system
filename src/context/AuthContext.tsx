import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Role } from '../types';
import {
  getAllUsers,
  seedInitialDataIfEmpty,
  saveUser,
  subscribeToUsers,
} from '../lib/attendanceService';
import { testConnection } from '../lib/firebase';
import { INITIAL_USERS } from '../lib/initialData';

interface AuthContextType {
  currentUser: UserProfile | null;
  users: UserProfile[];
  isLoading: boolean;
  login: (emailOrId: string, roleHint?: Role) => Promise<boolean>;
  quickLogin: (userId: string) => void;
  registerStudent: (student: {
    name: string;
    studentId: string;
    email: string;
    roomNumber: string;
    department: string;
  }) => Promise<UserProfile>;
  logout: () => void;
  updateCurrentUser: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'hostel_mess_current_user';

function getStoredUser(): UserProfile | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user: UserProfile | null) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch {
    // Ignore storage quota or security restrictions safely
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUsers: () => void = () => {};

    const initialize = async () => {
      try {
        await testConnection();
        await seedInitialDataIfEmpty();
        const loadedUsers = await getAllUsers();
        setUsers(loadedUsers);

        // Check stored session
        const storedUser = getStoredUser();
        if (storedUser) {
          const matched = loadedUsers.find((u) => u.id === storedUser.id || u.email === storedUser.email);
          if (matched) {
            setCurrentUser(matched);
          } else {
            setCurrentUser(storedUser);
          }
        }

        // Subscribe to live user updates
        unsubscribeUsers = subscribeToUsers((updatedUsers) => {
          setUsers(updatedUsers);
          setCurrentUser((prev) => {
            if (!prev) return null;
            const fresh = updatedUsers.find((u) => u.id === prev.id);
            return fresh || prev;
          });
        });
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      unsubscribeUsers();
    };
  }, []);

  const login = async (emailOrId: string, roleHint?: Role): Promise<boolean> => {
    const trimmed = emailOrId.trim().toLowerCase();
    let found = users.find(
      (u) =>
        u.email.toLowerCase() === trimmed ||
        (u.studentId && u.studentId.toLowerCase() === trimmed)
    );

    if (!found && roleHint === 'student') {
      // Auto-create a student with this ID/email if not found for convenience
      const newStudent: UserProfile = {
        id: `stu_${Date.now()}`,
        name: trimmed.split('@')[0].toUpperCase(),
        email: trimmed.includes('@') ? trimmed : `${trimmed}@hostelmess.edu`,
        studentId: trimmed.toUpperCase(),
        role: 'student',
        roomNumber: 'Room-101',
        department: 'Engineering',
        createdAt: new Date().toISOString(),
      };
      await saveUser(newStudent);
      found = newStudent;
    }

    if (found) {
      setCurrentUser(found);
      setStoredUser(found);
      return true;
    }

    return false;
  };

  const quickLogin = (userId: string) => {
    const target = users.find((u) => u.id === userId) || INITIAL_USERS.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      setStoredUser(target);
    }
  };

  const registerStudent = async (data: {
    name: string;
    studentId: string;
    email: string;
    roomNumber: string;
    department: string;
  }): Promise<UserProfile> => {
    const newStudent: UserProfile = {
      id: `stu_${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim(),
      role: 'student',
      studentId: data.studentId.trim().toUpperCase(),
      roomNumber: data.roomNumber.trim(),
      department: data.department.trim(),
      createdAt: new Date().toISOString(),
    };
    await saveUser(newStudent);
    setCurrentUser(newStudent);
    setStoredUser(newStudent);
    return newStudent;
  };

  const logout = () => {
    setCurrentUser(null);
    setStoredUser(null);
  };

  const updateCurrentUser = async (profile: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated: UserProfile = { ...currentUser, ...profile };
    setCurrentUser(updated);
    setStoredUser(updated);
    await saveUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoading,
        login,
        quickLogin,
        registerStudent,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
