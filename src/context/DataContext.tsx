
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { users as initialUsers, units as initialUnits, assessmentPeriods as initialAssessmentPeriods } from '@/lib/data';

type Unit = {
  id: string;
  name: string;
};

type User = {
  id: string;
  name: string;
  email: string;
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

interface DataContextType {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  units: Unit[];
  setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
  assessmentPeriods: AssessmentPeriod[];
  setAssessmentPeriods: React.Dispatch<React.SetStateAction<AssessmentPeriod[]>>;
  role: Role;
  setRole: React.Dispatch<React.SetStateAction<Role>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [assessmentPeriods, setAssessmentPeriods] = useState<AssessmentPeriod[]>(initialAssessmentPeriods);
  const [role, setRole] = useState<Role>('admin');

  return (
    <DataContext.Provider value={{ users, setUsers, units, setUnits, assessmentPeriods, setAssessmentPeriods, role, setRole }}>
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

    