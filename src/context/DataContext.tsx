
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
    type User,
    type Unit,
    type AssessmentPeriod,
    type Assessment,
    type Role,
    type Criterion,
    type Document as AppDocument
} from '@/lib/data';
import { initializeApp, getApp, getApps, FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch, type Firestore } from 'firebase/firestore';
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
  updateUsers: (newUsers: User[]) => Promise<void>;
  units: Unit[];
  updateUnits: (newUnits: Unit[]) => Promise<void>;
  assessmentPeriods: AssessmentPeriod[];
  updateAssessmentPeriods: (newPeriods: AssessmentPeriod[]) => Promise<void>;
  assessments: Assessment[];
  updateAssessments: (newAssessments: Assessment[]) => Promise<void>;
  criteria: Criterion[];
  updateCriteria: (newCriteria: Criterion[]) => Promise<void>;
  guidanceDocuments: AppDocument[];
  updateGuidanceDocuments: (newDocs: AppDocument[]) => Promise<void>;
  role: Role | null;
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
  const [guidanceDocuments, setGuidanceDocuments] = useState<AppDocument[]>([]);

  const [role, setRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchData = async () => {
      if (!db) return;
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

        setUnits(unitsSnapshot.docs.map(d => d.data() as Unit));
        setAssessmentPeriods(periodsSnapshot.docs.map(d => d.data() as AssessmentPeriod));
        setAssessments(assessmentsSnapshot.docs.map(d => d.data() as Assessment));
        setCriteria(criteriaSnapshot.docs.map(d => d.data() as Criterion));
        setGuidanceDocuments(documentsSnapshot.docs.map(d => d.data() as AppDocument));
        setUsers(usersSnapshot.docs.map(d => d.data() as User));
        
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
            const allUsers = usersSnapshot.docs.map(doc => ({ ...doc.data()} as User));
            
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
      setCurrentUser(null);
      setRole(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
        setLoading(false);
    }
  };

  const createFirestoreUpdater = <T extends {id: string}>(
    collectionName: string,
    stateUpdater: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    return async (newData: T[]) => {
      if (!db) return;
      const batch = writeBatch(db);
      
      const currentStateSnapshot = await getDocs(collection(db, collectionName));
      const currentStateIds = new Set(currentStateSnapshot.docs.map(d => d.id));
      const newStateIds = new Set(newData.map(item => item.id));

      // Add or update documents
      newData.forEach(item => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item);
      });

      // Delete documents that are not in the new data
      currentStateIds.forEach(id => {
        if (!newStateIds.has(id)) {
          const docRef = doc(db, collectionName, id);
          batch.delete(docRef);
        }
      });
      
      await batch.commit();
      stateUpdater(newData);
    };
  };

  const updateUsers = createFirestoreUpdater('users', setUsers);
  const updateUnits = createFirestoreUpdater('units', setUnits);
  const updateAssessmentPeriods = createFirestoreUpdater('assessmentPeriods', setAssessmentPeriods);
  const updateAssessments = createFirestoreUpdater('assessments', setAssessments);
  const updateCriteria = createFirestoreUpdater('criteria', setCriteria);
  const updateGuidanceDocuments = createFirestoreUpdater('guidanceDocuments', setGuidanceDocuments);


  return (
    <DataContext.Provider value={{ 
        loading, 
        users, updateUsers, 
        units, updateUnits, 
        assessmentPeriods, updateAssessmentPeriods, 
        assessments, updateAssessments, 
        criteria, updateCriteria,
        guidanceDocuments, updateGuidanceDocuments,
        role,
        currentUser, 
        setLoginInfo,
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
