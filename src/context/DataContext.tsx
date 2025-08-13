
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { users as initialUsers, units as initialUnits } from '@/lib/data';

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

interface DataContextType {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  units: Unit[];
  setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [units, setUnits] = useState<Unit[]>(initialUnits);

  return (
    <DataContext.Provider value={{ users, setUsers, units, setUnits }}>
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
