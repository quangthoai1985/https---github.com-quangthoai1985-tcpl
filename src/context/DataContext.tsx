
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
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [assessmentPeriods, setAssessmentPeriods] = useState<AssessmentPeriod[]>(initialAssessmentPeriods);
  const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments);
  const [role, setRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // This function simulates the login process
  const setLoginInfo = (username: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      setCurrentUser(user);
      setRole(user.role);
      return true;
    }
    // Logout / handle error
    setCurrentUser(null);
    setRole(null);
    return false;
  };

  useEffect(() => {
    // On page load or refresh, if a role is set, try to find the corresponding user.
    // This is a simplified persistence logic. In a real app, you'd use session/local storage or a token.
    if (role && !currentUser) {
        // This logic is simplified. In a real app, you wouldn't just find the first user with a role.
        const userToRestore = users.find(u => u.role === role);
        if (userToRestore) {
            setCurrentUser(userToRestore);
        } else {
            // If no user matches the role, reset
            setRole(null);
        }
    } else if (!role && currentUser) {
        // If role is cleared, clear current user
        setCurrentUser(null);
    }
  }, [role, users, currentUser]);

  return (
    <DataContext.Provider value={{ users, setUsers, units, setUnits, assessmentPeriods, setAssessmentPeriods, assessments, setAssessments, role, setRole, currentUser, setLoginInfo }}>
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
