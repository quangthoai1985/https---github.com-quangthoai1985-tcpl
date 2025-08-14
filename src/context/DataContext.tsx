
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { users as initialUsers, units as initialUnits, assessmentPeriods as initialAssessmentPeriods, recentAssessments as initialRecentAssessments } from '@/lib/data';

type Unit = {
  id: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  username: string;
  unitId: string;
  role: string;
};

type Role = 'admin' | 'commune';

type AssessmentPeriod = {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'Active' | 'Inactive';
};

type Assessment = {
  id: string;
  unitId: string;
  submissionDate: string;
  status: 'Chờ duyệt' | 'Đã duyệt' | 'Bị từ chối';
  rejectionReason?: string;
  communeExplanation?: string;
  submittedBy?: string;
  assessmentPeriodId: string;
};

interface DataContextType {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  units: Unit[];
  setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
  assessmentPeriods: AssessmentPeriod[];
  setAssessmentPeriods: React.Dispatch<React.SetStateAction<AssessmentPeriod[]>>;
  recentAssessments: Assessment[];
  setRecentAssessments: React.Dispatch<React.SetStateAction<Assessment[]>>;
  role: Role;
  setRole: React.Dispatch<React.SetStateAction<Role>>;
  currentUser: User | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [assessmentPeriods, setAssessmentPeriods] = useState<AssessmentPeriod[]>(initialAssessmentPeriods);
  const [recentAssessments, setRecentAssessments] = useState<Assessment[]>(initialRecentAssessments);
  const [role, setRole] = useState<Role>('admin');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // This logic simulates fetching the logged-in user based on the role.
    // In a real app, this would come from an authentication context.
    if (role === 'admin') {
      setCurrentUser(users.find(u => u.role === 'Cán bộ Tỉnh') || null);
    } else {
      setCurrentUser(users.find(u => u.role === 'Cán bộ Xã') || null);
    }
  }, [role, users]);

  return (
    <DataContext.Provider value={{ users, setUsers, units, setUnits, assessmentPeriods, setAssessmentPeriods, recentAssessments, setRecentAssessments, role, setRole, currentUser }}>
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
