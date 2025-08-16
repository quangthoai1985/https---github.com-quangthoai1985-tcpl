
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
    type User,
    type Unit,
    type AssessmentPeriod,
    type Assessment,
    type Role,
    type Criterion,
    type Document
} from '@/lib/data';
import { initializeApp, getApp, getApps, FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, type Firestore } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser, type Auth } from 'firebase/auth';

// Your web app's Firebase configuration is populated here by the backend
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// We will initialize these lazily
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

if (typeof window !== 'undefined' && !getApps().length) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} else if (typeof window !== 'undefined') {
    app = getApp();
    db = getFirestore(app);
    auth = getAuth(app);
}


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
  setLoginInfo: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
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

  // This function fetches all initial data from Firestore.
  const fetchData = async () => {
      // Don't set loading to true here, as auth state change will handle it.
      if (!firebaseConfig.apiKey) {
          console.warn("Firebase config is not set. Cannot fetch from Firestore.");
          setLoading(false);
          return;
      }
      try {
        const [
          unitsSnapshot,
          periodsSnapshot,
          assessmentsSnapshot,
          criteriaSnapshot,
          documentsSnapshot,
          usersSnapshot
        ] = await Promise.all([
          getDocs(collection(db, 'units')),
          getDocs(collection(db, 'assessmentPeriods')),
          getDocs(collection(db, 'assessments')),
          getDocs(collection(db, 'criteria')),
          getDocs(collection(db, 'guidanceDocuments')),
          getDocs(collection(db, 'users')),
        ]);

        setUnits(unitsSnapshot.docs.map(doc => doc.data() as Unit));
        setAssessmentPeriods(periodsSnapshot.docs.map(doc => doc.data() as AssessmentPeriod));
        setAssessments(assessmentsSnapshot.docs.map(doc => doc.data() as Assessment));
        setCriteria(criteriaSnapshot.docs.map(doc => doc.data() as Criterion));
        setGuidanceDocuments(documentsSnapshot.docs.map(doc => doc.data() as Document));
        setUsers(usersSnapshot.docs.map(doc => doc.data() as User));
        
      } catch (error) {
        console.error("Error fetching data from Firestore:", error);
      }
      // Loading is handled by onAuthStateChanged
    };

  useEffect(() => {
    if (!auth) return; // Don't run if auth is not initialized
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser && firebaseUser.email) {
        const username = firebaseUser.email.split('@')[0];
        
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const allUsers = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            const loggedInUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

            if (loggedInUser) {
              setCurrentUser(loggedInUser);
              setRole(loggedInUser.role);
              await fetchData(); // Fetch all other app data
            } else {
              console.error("User profile not found in Firestore for username:", username);
              await signOut(auth);
              setCurrentUser(null);
              setRole(null);
            }
        } catch(e) {
             console.error("Error fetching user profile:", e);
             await signOut(auth);
             setCurrentUser(null);
             setRole(null);
        }

      } else {
        setCurrentUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setLoginInfo = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return !!userCredential.user;
    } catch(e) {
        console.error("Login Error: ", e);
        setLoading(false);
        return false;
    } 
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUsers([]);
      setUnits([]);
      setAssessmentPeriods([]);
      setAssessments([]);
      setCriteria([]);
      setGuidanceDocuments([]);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
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
        currentUser, setLoginInfo,
        logout
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
