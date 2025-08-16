
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
    progressData as initialProgressData,
    adminNotifications as initialAdminNotifications,
    communeNotifications as initialCommuneNotifications,
    type User,
    type Unit,
    type AssessmentPeriod,
    type Assessment,
    type Role,
    type Criterion,
    type Document
} from '@/lib/data';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Your web app's Firebase configuration will be populated here by the backend
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);


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
  criteria: Criterion[];
  setCriteria: React.Dispatch<React.SetStateAction<Criterion[]>>;
  guidanceDocuments: Document[];
  setGuidanceDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  role: Role | null;
  setRole: React.Dispatch<React.SetStateAction<Role | null>>;
  currentUser: User | null;
  setLoginInfo: (username: string) => boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [assessmentPeriods, setAssessmentPeriods] = useState<AssessmentPeriod[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [guidanceDocuments, setGuidanceDocuments] = useState<Document[]>([]);

  const [role, setRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (firebaseConfig.apiKey === "...") {
          console.warn("Firebase config is not set. Using local mock data. Run the seed script and configure your firebaseConfig object in DataContext.tsx");
          // You might want to load mock data here for local development without firebase
          setLoading(false);
          return;
      }
      try {
        const [
          usersSnapshot,
          unitsSnapshot,
          periodsSnapshot,
          assessmentsSnapshot,
          criteriaSnapshot,
          documentsSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'units')),
          getDocs(collection(db, 'assessmentPeriods')),
          getDocs(collection(db, 'assessments')),
          getDocs(collection(db, 'criteria')),
          getDocs(collection(db, 'guidanceDocuments')),
        ]);

        setUsers(usersSnapshot.docs.map(doc => doc.data() as User));
        setUnits(unitsSnapshot.docs.map(doc => doc.data() as Unit));
        setAssessmentPeriods(periodsSnapshot.docs.map(doc => doc.data() as AssessmentPeriod));
        setAssessments(assessmentsSnapshot.docs.map(doc => doc.data() as Assessment));
        setCriteria(criteriaSnapshot.docs.map(doc => doc.data() as Criterion));
        setGuidanceDocuments(documentsSnapshot.docs.map(doc => doc.data() as Document));
        
      } catch (error) {
        console.error("Error fetching data from Firestore:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
    <DataContext.Provider value={{ 
        loading, 
        users, setUsers, 
        units, setUnits, 
        assessmentPeriods, setAssessmentPeriods, 
        assessments, setAssessments, 
        criteria, setCriteria,
        guidanceDocuments, setGuidanceDocuments,
        role, setRole, 
        currentUser, setLoginInfo 
    }}>
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
