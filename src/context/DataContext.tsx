
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
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

// Your web app's Firebase configuration is populated here by the backend
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
  logout: () => void;
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
      if (firebaseConfig.apiKey === "...") {
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
      if (firebaseUser) {
        // User is signed in. Fetch user profile from Firestore.
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setCurrentUser(userData);
          setRole(userData.role);
          await fetchData(); // Fetch other data after user is confirmed
        } else {
          // User profile doesn't exist in Firestore. Handle appropriately.
          console.error("User profile not found in Firestore.");
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
        // In a real app, the username would be an email. We'll add a dummy domain.
        const userCredential = await signInWithEmailAndPassword(auth, `${email}@example.com`, password);
        // onAuthStateChanged will handle the rest.
        return !!userCredential.user;
    } catch(e) {
        console.error("Login Error: ", e);
        return false;
    } finally {
        setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will clear user state.
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
