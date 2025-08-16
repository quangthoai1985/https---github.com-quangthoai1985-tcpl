
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
import { initializeApp, getApp, getApps, FirebaseOptions } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// Your web app's Firebase configuration is populated here by the backend
const firebaseConfig: FirebaseOptions = {
  apiKey: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY : undefined,
  authDomain: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : undefined,
  projectId: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID : undefined,
  storageBucket: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : undefined,
  messagingSenderId: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : undefined,
  appId: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID : undefined,
  measurementId: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID : undefined,
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);


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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser && firebaseUser.email) {
        // User is signed in. Fetch user profile from Firestore.
        // We assume the Firestore document ID for a user is their username (without domain).
        // This is a temporary solution for this specific app structure.
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
              // User profile doesn't exist in Firestore. Handle appropriately.
              console.error("User profile not found in Firestore for username:", username);
              await signOut(auth); // Sign out the user if their profile is missing.
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
        // User is signed out.
        setCurrentUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // This function handles the login process via Firebase Auth
  const setLoginInfo = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the rest (fetching user doc, setting state, etc.)
        return !!userCredential.user;
    } catch(e) {
        console.error("Login Error: ", e);
        setLoading(false);
        return false;
    } 
    // No need for finally setLoading(false), onAuthStateChanged handles it.
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will clear user state and trigger re-render.
      // Reset all data states to initial
      setUsers([]);
      setUnits([]);
      setAssessmentPeriods([]);
      setAssessments([]);
      setCriteria([]);
      setGuidanceDocuments([]);
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      // Loading is set to false by onAuthStateChanged after sign-out completes
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
