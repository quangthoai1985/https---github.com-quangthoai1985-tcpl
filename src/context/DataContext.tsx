
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [assessmentPeriods, setAssessmentPeriods] = useState<AssessmentPeriod[]>(initialAssessmentPeriods);
  const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments);
  const [role, setRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // This logic simulates fetching the logged-in user based on the role.
    // In a real app, this would come from an authentication context.
    if (role === 'admin') {
      setCurrentUser(users.find(u => u.role === 'admin') || null);
    } else if (role === 'commune_staff') {
      setCurrentUser(users.find(u => u.role === 'commune_staff') || null);
    } else {
        setCurrentUser(null);
    }
  }, [role, users]);

  return (
    <DataContext.Provider value={{ users, setUsers, units, setUnits, assessmentPeriods, setAssessmentPeriods, assessments, setAssessments, role, setRole, currentUser }}>
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
