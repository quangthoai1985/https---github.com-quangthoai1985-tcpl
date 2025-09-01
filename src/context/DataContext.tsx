
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
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
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Hardcoded Firebase configuration from user
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCj0H_a8O7znR_M1bFim9Lzt5MfnsptxH4",
  authDomain: "chuan-tiep-can-pl.firebaseapp.com",
  projectId: "chuan-tiep-can-pl",
  storageBucket: "chuan-tiep-can-pl.firebasestorage.app",
  messagingSenderId: "851876581009",
  appId: "1:851876581009:web:60bfbcc40055f76f607930"
};

// =================== START OF FIXED CODE ===================

// Helper function to initialize Firebase services safely on the client-side (for Next.js SSR)
const getFirebaseServices = () => {
    // If we're on the server, return nulls to avoid errors
    if (typeof window === 'undefined') {
        return { app: null, db: null, auth: null, storage: null };
    }

    // If we're on the client, initialize Firebase
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);
    
    return { app, db, auth, storage };
};

// =================== END OF FIXED CODE =====================

// Define a type for our dynamic notifications
export type Notification = {
  id: string;
  title: string;
  time: string;
  read: boolean;
  link: string;
};

interface DataContextType {
  loading: boolean;
  refreshData: () => Promise<void>;
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
  notifications: Notification[];
  markNotificationAsRead: (notificationId: string) => void;
  setLoginInfo: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  storage: FirebaseStorage | null; // Can be null during server-side rendering
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  // States for Firebase services, initialized to null
  const [db, setDb] = useState<Firestore | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [storage, setStorage] = useState<FirebaseStorage | null>(null);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [assessmentPeriods, setAssessmentPeriods] = useState<AssessmentPeriod[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [guidanceDocuments, setGuidanceDocuments] = useState<AppDocument[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [role, setRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // This effect runs only on the client-side after mounting
  useEffect(() => {
    const services = getFirebaseServices();
    if (services.db) setDb(services.db);
    if (services.auth) setAuth(services.auth);
    if (services.storage) setStorage(services.storage);
  }, []);

  const getUnitName = (unitId: string, allUnits: Unit[]) => {
      return allUnits.find(u => u.id === unitId)?.name || 'Không xác định';
  }

  const generateNotifications = (user: User | null, allAssessments: Assessment[], allUnits: Unit[]) => {
      if (!user) return [];
      
      const generated: Notification[] = [];
      const sortedAssessments = [...allAssessments].sort((a,b) => (b.submissionDate || '').localeCompare(a.submissionDate || ''));

      if (user.role === 'admin') {
          // Notifications for Admin
          sortedAssessments.forEach(assessment => {
              if (assessment.status === 'pending_registration') {
                  const communeName = getUnitName(assessment.communeId, allUnits);
                  generated.push({
                      id: `admin-notif-reg-${assessment.id}`,
                      title: `${communeName} vừa gửi yêu cầu đăng ký.`,
                      time: `Ngày ${assessment.submissionDate}`,
                      read: false,
                      link: `/admin/registrations?tab=pending`
                  });
              }
              if (assessment.status === 'pending_review') {
                  const communeName = getUnitName(assessment.communeId, allUnits);
                  generated.push({
                      id: `admin-notif-${assessment.id}`,
                      title: `${communeName} vừa gửi hồ sơ đánh giá.`,
                      time: `Ngày ${assessment.submissionDate}`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}`
                  });
              }
              if (assessment.status === 'rejected' && assessment.communeExplanation) {
                   const communeName = getUnitName(assessment.communeId, allUnits);
                   generated.push({
                      id: `admin-resubmit-notif-${assessment.id}`,
                      title: `${communeName} vừa gửi lại hồ sơ sau khi bị từ chối.`,
                      time: `Ngày ${assessment.submissionDate}`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}`
                  });
              }
          });

      } else { // commune_staff
          const userAssessments = sortedAssessments.filter(a => a.communeId === user.communeId);
          userAssessments.forEach(assessment => {
              if (assessment.status === 'registration_approved') {
                  generated.push({
                      id: `commune-reg-approved-${assessment.id}`,
                      title: `Đăng ký của bạn đã được duyệt.`,
                      time: `Bây giờ bạn có thể bắt đầu tự đánh giá.`,
                      read: false,
                      link: `/commune/assessments`
                  });
              }
               if (assessment.status === 'registration_rejected') {
                  generated.push({
                      id: `commune-reg-rejected-${assessment.id}`,
                      title: `Đăng ký của bạn đã bị từ chối/bị trả lại.`,
                      time: `Vui lòng xem chi tiết và gửi lại.`,
                      read: false,
                      link: `/dashboard`
                  });
              }
              if (assessment.status === 'approved') {
                  generated.push({
                      id: `commune-approved-${assessment.id}`,
                      title: `Hồ sơ của bạn đã được duyệt.`,
                      time: `Ngày ${assessment.approvalDate}`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}`
                  });
              }
               if (assessment.status === 'rejected') {
                  generated.push({
                      id: `commune-rejected-${assessment.id}`,
                      title: `Hồ sơ của bạn đã bị từ chối.`,
                      time: `Ngày ${assessment.submissionDate}`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}`
                  });
              }
          });
      }

      return generated.slice(0, 10);
  };

  const fetchData = useCallback(async (loggedInUser: User | null) => {
      if (!db) return;
      try {
        console.log("Fetching all data from Firestore...");
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
        
        const fetchedUnits = unitsSnapshot.docs.map(d => d.data() as Unit);
        const fetchedAssessments = assessmentsSnapshot.docs.map(d => d.data() as Assessment);

        setUnits(fetchedUnits);
        setAssessmentPeriods(periodsSnapshot.docs.map(d => d.data() as AssessmentPeriod));
        setAssessments(fetchedAssessments);
        setCriteria(criteriaSnapshot.docs.map(d => d.data() as Criterion));
        setGuidanceDocuments(documentsSnapshot.docs.map(d => d.data() as AppDocument));
        setUsers(usersSnapshot.docs.map(d => d.data() as User));
        
        if (loggedInUser) {
           setNotifications(generateNotifications(loggedInUser, fetchedAssessments, fetchedUnits));
        }

        console.log("Data fetched successfully.");
        
      } catch (error) {
        console.error("Error fetching data from Firestore:", error);
      }
    }, [db]); // Add db as a dependency

  useEffect(() => {
    if (!auth || !db) return; // Wait for services to be initialized
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser && firebaseUser.email) {
        // ======================= THÊM ĐOẠN CODE NÀY VÀO =======================
        const idTokenResult = await firebaseUser.getIdTokenResult(true); // true = force refresh
        console.log("%c USER TOKEN CLAIMS:", "color: blue; font-size: 16px;", idTokenResult.claims);
        // =========================================================================
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const allUsers = usersSnapshot.docs.map(doc => ({ ...doc.data()} as User));
            
            const loggedInUser = allUsers.find(u => u.username.toLowerCase() === firebaseUser.email!.toLowerCase());

            if (loggedInUser) {
              setCurrentUser(loggedInUser);
              setRole(loggedInUser.role);
              await fetchData(loggedInUser);
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
  }, [auth, db, fetchData]); // Add auth and db as dependencies

  const setLoginInfo = async (email: string, password: string): Promise<boolean> => {
    if (!auth) return false; // Safety check
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
    if (!auth) return; // Safety check
    setLoading(true);
    try {
      await signOut(auth);
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
      if (!db) return; // Safety check
      setLoading(true);
      const batch = writeBatch(db);
      
      const currentStateSnapshot = await getDocs(collection(db, collectionName));
      const currentStateIds = new Set(currentStateSnapshot.docs.map(d => d.id));
      const newStateIds = new Set(newData.map(item => item.id));

      newData.forEach(item => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item);
      });

      currentStateIds.forEach(id => {
        if (!newStateIds.has(id)) {
          const docRef = doc(db, collectionName, id);
          batch.delete(docRef);
        }
      });
      
      await batch.commit();
      stateUpdater(newData);
      await refreshData();
      setLoading(false);
    };
  };

  const refreshData = useCallback(async () => {
      if (!auth || !db) {
        console.log("Auth or DB not initialized, skipping refresh.");
        return;
      }
      if (auth.currentUser) {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const allUsers = usersSnapshot.docs.map(d => d.data() as User);
          const loggedInUser = allUsers.find(u => u.username.toLowerCase() === auth.currentUser?.email?.toLowerCase());
          if (loggedInUser) {
              await fetchData(loggedInUser);
          }
      } else {
          await fetchData(null);
      }
  }, [auth, db, fetchData]); // Add auth and db as dependencies
  
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prevNotifications => 
        prevNotifications.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
        )
    );
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
        refreshData,
        users, updateUsers, 
        units, updateUnits, 
        assessmentPeriods, updateAssessmentPeriods, 
        assessments, updateAssessments, 
        criteria, updateCriteria,
        guidanceDocuments, updateGuidanceDocuments,
        role,
        currentUser, 
        notifications,
        markNotificationAsRead,
        setLoginInfo,
        logout,
        storage, // This is now the state variable, which is guaranteed to be initialized on the client
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
