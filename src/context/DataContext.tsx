'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
    type User,
    type Unit,
    type AssessmentPeriod,
    type Assessment,
    type Role,
    type Criterion,
    type Document as AppDocument,
    type LoginConfig
} from '@/lib/data';
import { initializeApp, getApp, getApps, FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch, type Firestore, deleteDoc, getDoc } from 'firebase/firestore'; // Import 'getDoc'
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

// Helper function to initialize Firebase services safely on the client-side
const getFirebaseServices = () => {
    if (typeof window === 'undefined') {
        return { app: null, db: null, auth: null, storage: null };
    }
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);
    return { app, db, auth, storage };
};

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
  deleteAssessment: (assessmentId: string) => Promise<void>;
  criteria: Criterion[];
  updateCriteria: (newCriteria: Criterion[]) => Promise<void>;
  guidanceDocuments: AppDocument[];
  updateGuidanceDocuments: (newDocs: AppDocument[]) => Promise<void>;
  loginConfig: LoginConfig | null;
  updateLoginConfig: (newConfig: LoginConfig) => Promise<void>;
  role: Role | null;
  currentUser: User | null;
  notifications: Notification[];
  markNotificationAsRead: (notificationId: string) => void;
  setLoginInfo: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  storage: FirebaseStorage | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
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
  const [loginConfig, setLoginConfig] = useState<LoginConfig | null>(null);

  const [role, setRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const services = getFirebaseServices();
    if (services.db) setDb(services.db);
    if (services.auth) setAuth(services.auth);
    if (services.storage) setStorage(services.storage);
  }, []);

  const getUnitName = (unitId: string, allUnits: Unit[]) => {
      return allUnits.find(u => u.id === unitId)?.name || 'Không xác định';
  }

  // ... (Hàm generateNotifications của bạn không thay đổi, giữ nguyên)
  const generateNotifications = (user: User | null, allAssessments: Assessment[], allUnits: Unit[]) => {
      if (!user) return [];
      
      const generated: Notification[] = [];
      const sortedAssessments = [...allAssessments].sort((a,b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

      if (user.role === 'admin') {
          sortedAssessments.forEach(assessment => {
              if (assessment.status === 'submitted') {
                  const communeName = getUnitName(assessment.communeId, allUnits);
                  generated.push({
                      id: `admin-notif-${assessment.id}`,
                      title: `${communeName} vừa gửi hồ sơ đánh giá.`,
                      time: `Ngày ${new Date(assessment.submittedAt!).toLocaleDateString('vi-VN')}`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}`
                  });
              }
          });

      } else { // commune
          const userAssessments = sortedAssessments.filter(a => a.communeId === user.communeId);
          userAssessments.forEach(assessment => {
              if (assessment.status === 'approved') {
                  generated.push({
                      id: `commune-approved-${assessment.id}`,
                      title: `Hồ sơ của bạn đã được duyệt.`,
                      time: `Ngày ${new Date(assessment.submittedAt!).toLocaleDateString('vi-VN')}`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}` // Link to view the approved version
                  });
              }
               if (assessment.status === 'rejected') {
                  generated.push({
                      id: `commune-rejected-${assessment.id}`,
                      title: `Hồ sơ của bạn đã bị từ chối.`,
                      time: `Ngày ${new Date(assessment.submittedAt!).toLocaleDateString('vi-VN')}`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}` // Link to view the feedback
                  });
              }
          });
      }

      return generated.slice(0, 10);
  };

  const fetchPrivateData = useCallback(async (loggedInUser: User) => {
    if (!db) return;
    try {
        const commonPromises = [
            getDocs(collection(db, 'units')),
            getDocs(collection(db, 'assessmentPeriods')),
            getDocs(collection(db, 'assessments')),
            getDocs(collection(db, 'criteria')),
            getDocs(collection(db, 'guidanceDocuments')),
        ];

        const [
            unitsSnapshot,
            periodsSnapshot,
            assessmentsSnapshot,
            criteriaSnapshot,
            documentsSnapshot,
        ] = await Promise.all(commonPromises);

        const fetchedUnits = unitsSnapshot.docs.map(d => d.data() as Unit);
        const fetchedAssessments = assessmentsSnapshot.docs.map(d => d.data() as Assessment);
        
        setUnits(fetchedUnits);
        setAssessmentPeriods(periodsSnapshot.docs.map(d => d.data() as AssessmentPeriod));
        setAssessments(fetchedAssessments);
        setCriteria(criteriaSnapshot.docs.map(d => d.data() as Criterion).sort((a, b) => a.order - b.order));
        setGuidanceDocuments(documentsSnapshot.docs.map(d => d.data() as AppDocument));

        if (loggedInUser.role === 'admin') {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            setUsers(usersSnapshot.docs.map(d => d.data() as User));
        } else {
            setUsers([]);
        }
        
        setNotifications(generateNotifications(loggedInUser, fetchedAssessments, fetchedUnits));
    } catch (error) {
        console.error("Error fetching private data:", error);
    }
}, [db]);

  useEffect(() => {
    const fetchPublicData = async () => {
        if (!db) return;
        try {
            const configDocRef = doc(db, 'configurations', 'loginPage');
            const configDocSnap = await getDoc(configDocRef);
            if (configDocSnap.exists()) {
                setLoginConfig(configDocSnap.data() as LoginConfig);
            } else {
                setLoginConfig(null);
            }
        } catch (error) {
            console.error("Error fetching public data:", error);
        }
    };
    fetchPublicData();
  }, [db]);

  useEffect(() => {
    if (!auth || !db) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const loggedInUser = userDocSnap.data() as User;
              setCurrentUser(loggedInUser);
              setRole(loggedInUser.role);
              await fetchPrivateData(loggedInUser);
            } else {
              await signOut(auth);
            }
        } catch(e) {
             await signOut(auth);
        }
      } else {
        setCurrentUser(null);
        setRole(null);
        setUsers([]); setUnits([]); setAssessments([]); setAssessmentPeriods([]); setCriteria([]); setGuidanceDocuments([]); setNotifications([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db, fetchPrivateData]);

  const setLoginInfo = async (email: string, password: string): Promise<boolean> => {
    if (!auth) return false;
    setLoading(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return !!userCredential.user;
    } catch(e) {
        setLoading(false);
        return false;
    } 
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  // ====================================================================
  // FIXED UPDATER FUNCTION
  // ====================================================================
  const createFirestoreUpdater = <T extends {id: string}>(
    collectionName: string,
    stateUpdater: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    return async (dataToUpdate: T[]) => {
      if (!db) return;
      setLoading(true);
      const batch = writeBatch(db);
      
      // Only add set/update operations to the batch. No more deletions.
      dataToUpdate.forEach(item => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item, { merge: true }); // Use merge: true to avoid overwriting fields unintentionally
      });
      
      await batch.commit();
      // Manually refresh all data from server to ensure consistency
      await refreshData();
      setLoading(false);
    };
  };

  const updateLoginConfig = async (newConfig: LoginConfig) => {
      if (!db) return;
      setLoading(true);
      const docRef = doc(db, 'configurations', 'loginPage');
      await setDoc(docRef, newConfig, { merge: true });
      setLoginConfig(prevConfig => ({...prevConfig, ...newConfig}));
      setLoading(false);
  }

  const deleteAssessment = async (assessmentId: string) => {
      if (!db) return;
      setLoading(true);
      await deleteDoc(doc(db, 'assessments', assessmentId));
      await refreshData(); // Refresh to get the latest state
      setLoading(false);
  };

  const refreshData = useCallback(async () => {
      if (!auth?.currentUser || !db) return;
      setLoading(true);
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
          await fetchPrivateData(userDocSnap.data() as User);
      } else {
          await logout();
      }
      setLoading(false);
  }, [auth, db, fetchPrivateData]);
  
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prevNotifications => 
        prevNotifications.map(n => n.id === notificationId ? { ...n, read: true } : n)
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
        deleteAssessment,
        criteria, updateCriteria,
        guidanceDocuments, updateGuidanceDocuments,
        loginConfig, updateLoginConfig,
        role,
        currentUser, 
        notifications,
        markNotificationAsRead,
        setLoginInfo,
        logout,
        storage,
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