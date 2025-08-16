
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

// Hardcoded Firebase configuration from user
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCj0H_a8O7znR_M1bFim9Lzt5MfnsptxH4",
  authDomain: "chuan-tiep-can-pl.firebaseapp.com",
  projectId: "chuan-tiep-can-pl",
  storageBucket: "chuan-tiep-can-pl.appspot.com",
  messagingSenderId: "851876581009",
  appId: "1:851876581009:web:60bfbcc40055f76f607930"
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

if (typeof window !== 'undefined') {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
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

  const fetchData = async () => {
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
    };

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser && firebaseUser.email) {
        
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const allUsers = usersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            
            // Extract username from email to match against Firestore data
            const usernameFromEmail = firebaseUser.email.split('@')[0];
            const loggedInUser = allUsers.find(u => u.username.toLowerCase() === usernameFromEmail.toLowerCase());

            if (loggedInUser) {
              setCurrentUser(loggedInUser);
              setRole(loggedInUser.role);
              await fetchData();
            } else {
              console.error("User profile not found in Firestore for email:", firebaseUser.email);
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
        // onAuthStateChanged will handle the rest, so we just return success.
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
      // Clear all local data on logout
      setUsers([]);
      setUnits([]);
      setAssessmentPeriods([]);
      setAssessments([]);
      setCriteria([]);
      setGuidanceDocuments([]);
      setCurrentUser(null);
      setRole(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
        setLoading(false);
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
