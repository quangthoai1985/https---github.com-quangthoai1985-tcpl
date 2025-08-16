
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
    users as initialUsers, 
    units as initialUnits, 
    assessmentPeriods as initialAssessmentPeriods, 
    assessments as initialAssessments,
    type User,
    type Unit,
    type AssessmentPeriod,
    type Assessment,
    type Role
} from '@/lib/data';

interface DataContextType {
  loading: boolean;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  units: Unit[];
  setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
  assessmentPeriods: AssessmentPeriod[];
  setAssessmentPeriods: React.Dispatch<React.SetStateAction<AssessmentPeriod[]>>;
  assessments: Assessment[];
  setAssessments: React.Dispatch<React.SetStateAction<Assessment[]>>;
  role: Role | null;
  setRole: React.Dispatch<React.SetStateAction<Role | null>>;
  currentUser: User | null;
  setLoginInfo: (username: string) => boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [assessmentPeriods, setAssessmentPeriods] = useState<AssessmentPeriod[]>(initialAssessmentPeriods);
  const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments);
  const [role, setRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // In a real app, this is where you would fetch data from your backend (e.g., Firestore)
    // For now, we'll just simulate a loading delay with the initial mock data.
    const timer = setTimeout(() => {
        setUsers(initialUsers);
        setUnits(initialUnits);
        setAssessmentPeriods(initialAssessmentPeriods);
        setAssessments(initialAssessments);
        setLoading(false);
    }, 500); // Simulate network latency

    return () => clearTimeout(timer);
  }, []);

  // This function simulates the login process
  const setLoginInfo = (username: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      setCurrentUser(user);
      setRole(user.role);
      // In a real app, you would store the session token here
      return true;
    }
    // Logout / handle error
    setCurrentUser(null);
    setRole(null);
    return false;
  };

  return (
    <DataContext.Provider value={{ loading, users, setUsers, units, setUnits, assessmentPeriods, setAssessmentPeriods, assessments, setAssessments, role, setRole, currentUser, setLoginInfo }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
