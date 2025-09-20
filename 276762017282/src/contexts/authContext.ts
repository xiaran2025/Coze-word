import { createContext } from "react";
import { User } from '@/types';
export const AuthContext = createContext({
  isAuthenticated: false,
  currentUser: null as User | null,
  userType: 'teacher' as 'teacher' | 'student',
  login: (username: string, password: string, userType: 'teacher' | 'student') => false,
  logout: () => {},
  updateUser: (user: User) => {},
});