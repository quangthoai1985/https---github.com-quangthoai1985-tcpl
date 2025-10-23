
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
    type LoginConfig,
    type IndicatorResult,
    type Indicator,
} from '@/lib/data';
import { initializeApp, getApp, getApps, FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch, type Firestore, deleteDoc, getDoc, onSnapshot, query, where, Unsubscribe } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser, type Auth } from 'firebase/auth';
import { getStorage, ref, deleteObject, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type FirebaseFunctions } from 'firebase/functions';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCj0H_a8O7znR_M1bFim9Lzt5MfnsptxH4",
  authDomain: "chuan-tiep-can-pl.firebaseapp.com",
  projectId: "chuan-tiep-can-pl",
  storageBucket: "chuan-tiep-can-pl.firebasestorage.app",
  messagingSenderId: "851876581009",
  appId: "1:851876581009:web:60bfbcc40055f76f607930"
};

const getFirebaseServices = () => {
    if (typeof window === 'undefined') {
        return { app: null, db: null, auth: null, storage: null, functions: null };
    }
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);
    const functions = getFunctions(app);
    return { app, db, auth, storage, functions };
};

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
  updateSingleAssessment: (assessment: Assessment) => Promise<void>;
  deleteAssessment: (assessmentId: string) => Promise<void>;
  criteria: Criterion[];
  updateCriteria: (newCriteria: Criterion[]) => Promise<void>;
  guidanceDocuments: AppDocument[];
  updateGuidanceDocuments: (newDocs: AppDocument[]) => Promise<void>;
  loginConfig: LoginConfig | null;
  updateLoginConfig: (newConfig: LoginConfig) => Promise<void>;
  deleteFileByUrl: (fileUrl: string) => Promise<void>;
  role: Role | null;
  currentUser: User | null;
  notifications: Notification[];
  markNotificationAsRead: (notificationId: string) => void;
  setLoginInfo: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  storage: FirebaseStorage | null;
  functions: FirebaseFunctions | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [db, setDb] = useState<Firestore | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [storage, setStorage] = useState<FirebaseStorage | null>(null);
  const [functions, setFunctions] = useState<FirebaseFunctions | null>(null);

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
    if (services.functions) setFunctions(services.functions);
  }, []);

  const getUnitName = (unitId: string, allUnits: Unit[]) => {
      return allUnits.find(u => u.id === unitId)?.name || 'Không xác định';
  }
  
  const generateNotifications = (user: User | null, allAssessments: Assessment[], allUnits: Unit[]) => {
      if (!user) return [];
      
      const generated: Notification[] = [];
      const sortedAssessments = [...allAssessments].sort((a,b) => (b.registrationSubmissionDate || b.assessmentSubmissionDate || '').localeCompare(a.registrationSubmissionDate || a.assessmentSubmissionDate || ''));

      if (user.role === 'admin') {
          sortedAssessments.forEach(assessment => {
              if (assessment.registrationStatus === 'pending') {
                  const communeName = getUnitName(assessment.communeId, allUnits);
                  generated.push({
                      id: `admin-notif-reg-${assessment.id}`,
                      title: `${communeName} vừa gửi yêu cầu đăng ký.`,
                      time: `Ngày ${assessment.registrationSubmissionDate}`,
                      read: false,
                      link: `/admin/registrations?tab=pending`
                  });
              }
              if (assessment.assessmentStatus === 'pending_review') {
                  const communeName = getUnitName(assessment.communeId, allUnits);
                  generated.push({
                      id: `admin-notif-${assessment.id}`,
                      title: `${communeName} vừa gửi hồ sơ đánh giá.`,
                      time: `Ngày ${assessment.assessmentSubmissionDate}`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}`
                  });
              }
          });

      } else { // commune_staff
          const userAssessments = sortedAssessments.filter(a => a.communeId === user.communeId);
          userAssessments.forEach(assessment => {
              if (assessment.registrationStatus === 'approved') {
                  generated.push({
                      id: `commune-reg-approved-${assessment.id}`,
                      title: `Đăng ký của bạn đã được duyệt.`,
                      time: `Bây giờ bạn có thể bắt đầu tự đánh giá.`,
                      read: false,
                      link: `/commune/assessments`
                  });
              }
               if (assessment.registrationStatus === 'rejected') {
                  generated.push({
                      id: `commune-reg-rejected-${assessment.id}`,
                      title: `Đăng ký của bạn đã bị từ chối/bị trả lại.`,
                      time: `Vui lòng xem chi tiết và gửi lại.`,
                      read: false,
                      link: `/dashboard`
                  });
              }
              if (assessment.assessmentStatus === 'achieved_standard') {
                  generated.push({
                      id: `commune-approved-${assessment.id}`,
                      title: `Chúc mừng! Hồ sơ của bạn đã được công nhận Đạt Chuẩn.`,
                      time: `Ngày ${assessment.approvalDate}`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}`
                  });
              }
               if (assessment.assessmentStatus === 'rejected') {
                  generated.push({
                      id: `commune-rejected-${assessment.id}`,
                      title: `Rất tiếc, hồ sơ của bạn đã bị đánh giá là Không Đạt.`,
                      time: `Ngày ${assessment.approvalDate}`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}`
                  });
              }
              if (assessment.assessmentStatus === 'returned_for_revision') {
                  generated.push({
                      id: `commune-returned-${assessment.id}`,
                      title: `Hồ sơ của bạn đã được trả lại để bổ sung/chỉnh sửa.`,
                      time: `Vui lòng xem chi tiết ghi chú của Admin.`,
                      read: false,
                      link: `/admin/reviews/${assessment.id}`
                  });
              }
          });
      }

      const uniqueNotifications = Array.from(new Map(generated.map(item => [item.id, item])).values());
      return uniqueNotifications.slice(0, 15);
  };
  
  useEffect(() => {
    if (!db) return;
    const configDocRef = doc(db, 'configurations', 'loginPage');
    const unsubConfig = onSnapshot(configDocRef, (doc) => {
        if (doc.exists()) {
            setLoginConfig(doc.data() as LoginConfig);
        } else {
            setLoginConfig(null);
        }
    });

    return () => unsubConfig();
  }, [db]);


  useEffect(() => {
    if (!auth || !db) return;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        setLoading(true);
        let allUnsubs: Unsubscribe[] = [];

        if (firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            
            try {
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const loggedInUser = userDocSnap.data() as User;
                    setCurrentUser(loggedInUser);
                    setRole(loggedInUser.role);

                    const commonCollections = ['units', 'assessmentPeriods', 'criteria', 'guidanceDocuments'];
                    commonCollections.forEach(colName => {
                        const q = query(collection(db, colName));
                        let unsub;
                        switch(colName) {
                            case 'units': 
                                unsub = onSnapshot(q, (snap) => setUnits(snap.docs.map(d => d.data() as Unit))); 
                                allUnsubs.push(unsub);
                                break;
                            case 'assessmentPeriods': 
                                unsub = onSnapshot(q, (snap) => setAssessmentPeriods(snap.docs.map(d => d.data() as AssessmentPeriod)));
                                allUnsubs.push(unsub);
                                break;
                            case 'criteria': { // Bọc trong {} để tạo scope mới
                                // Lắng nghe thay đổi của collection criteria chính (chỉ chứa TC01, TC02, TC03)
                                const unsubCriteria = onSnapshot(query(collection(db, colName)), async (criteriaSnapshot) => {
                                    const criteriaPromises = criteriaSnapshot.docs.map(async (criterionDoc) => {
                                        const criterionData = criterionDoc.data() as Criterion; // Dữ liệu tiêu chí (id, name, assignmentType...)
                                        
                                        // Lấy tất cả documents từ subcollection 'indicators'
                                        const indicatorsSnapshot = await getDocs(collection(criterionDoc.ref, 'indicators'));
                                        
                                        const indicators = indicatorsSnapshot.docs.map(indicatorDoc => indicatorDoc.data() as Indicator);
                                        
                                        // Gắn mảng indicators vào dữ liệu tiêu chí
                                        return {
                                            ...criterionData,
                                            indicators: indicators.sort((a, b) => (a.order || 0) - (b.order || 0)) // Sắp xếp theo thứ tự
                                        };
                                    });
                                    
                                    // Chờ tất cả promise hoàn thành và cập nhật state criteria
                                    const fullCriteriaData = await Promise.all(criteriaPromises);
                                    setCriteria(fullCriteriaData);
                                    console.log("Updated criteria with indicators:", fullCriteriaData); // Thêm log để kiểm tra
                                    
                                }, (error) => {
                                    console.error("Error fetching criteria:", error);
                                    // Optionally set criteria to an empty array or handle the error
                                    setCriteria([]);
                                });

                                allUnsubs.push(unsubCriteria); // Thêm listener chính vào danh sách hủy
                                break;
                            } // Kết thúc scope của case
                            case 'guidanceDocuments': 
                                unsub = onSnapshot(q, (snap) => setGuidanceDocuments(snap.docs.map(d => d.data() as AppDocument))); 
                                allUnsubs.push(unsub);
                                break;
                        }
                    });

                    if (loggedInUser.role === 'admin') {
                        const usersQuery = query(collection(db, 'users'));
                        allUnsubs.push(onSnapshot(usersQuery, (snap) => setUsers(snap.docs.map(d => d.data() as User))));

                        const assessmentsQuery = query(collection(db, 'assessments'));
                        allUnsubs.push(onSnapshot(assessmentsQuery, (snap) => setAssessments(snap.docs.map(d => d.data() as Assessment))));
                    } else { 
                        setUsers([]); 
                        const assessmentsQuery = query(collection(db, 'assessments'), where("communeId", "==", loggedInUser.communeId));
                        allUnsubs.push(onSnapshot(assessmentsQuery, (snap) => setAssessments(snap.docs.map(d => d.data() as Assessment))));
                    }
                } else {
                    console.error("User profile not found, logging out.");
                    await signOut(auth);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                 await signOut(auth);
            }

        } else {
            setCurrentUser(null);
            setRole(null);
            setUsers([]);
            setAssessments([]);
            setUnits([]);
            setAssessmentPeriods([]);
            setCriteria([]);
            setGuidanceDocuments([]);
            setNotifications([]);
        }
        setLoading(false);
        
        return () => {
            allUnsubs.forEach(unsub => unsub());
        };
    });

    return () => unsubAuth();
}, [auth, db]);

  useEffect(() => {
      setNotifications(generateNotifications(currentUser, assessments, units));
  }, [currentUser, assessments, units]);


  const setLoginInfo = async (email: string, password: string): Promise<boolean> => {
    if (!auth) return false;
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
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const createFirestoreUpdater = <T extends { id: string }>(
    collectionName: string
  ) => {
    return async (newData: T[]) => {
      if (!db) return;
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
      setLoading(false);
    };
  };

  const updateSingleAssessment = async (assessment: Assessment) => {
    if (!db) return;
    const docRef = doc(db, 'assessments', assessment.id);
    await setDoc(docRef, assessment, { merge: true });
  };

  const updateLoginConfig = async (newConfig: LoginConfig) => {
      if (!db) return;
      setLoading(true);
      const docRef = doc(db, 'configurations', 'loginPage');
      await setDoc(docRef, newConfig, { merge: true });
      setLoading(false);
  }

  const deleteAssessment = async (assessmentId: string) => {
      if (!db) return;
      setLoading(true);
      try {
          await deleteDoc(doc(db, 'assessments', assessmentId));
      } catch (error) {
          console.error("Error deleting assessment:", error);
          throw error;
      } finally {
          setLoading(false);
      }
  };
  
  const deleteFileByUrl = async (fileUrl: string) => {
      if (!storage) return;
      try {
          const fileRef = ref(storage, fileUrl);
          await deleteObject(fileRef);
      } catch (error: any) {
           if (error.code !== 'storage/object-not-found') {
               console.error("Error deleting file from storage:", error);
               throw error; 
           }
            console.warn("File to delete was not found in Storage, it might have been deleted already.");
      }
  };

  const refreshData = useCallback(async () => {
      console.log("Manual refresh triggered. Data is already real-time.");
      return Promise.resolve();
  }, []);
  
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prevNotifications => 
        prevNotifications.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
        )
    );
  };

  const updateUsers = createFirestoreUpdater('users');
  const updateUnits = createFirestoreUpdater('units');
  const updateAssessmentPeriods = createFirestoreUpdater('assessmentPeriods');
  const updateAssessments = createFirestoreUpdater('assessments');
  const updateCriteria = createFirestoreUpdater('criteria');
  const updateGuidanceDocuments = createFirestoreUpdater('guidanceDocuments');

  return (
    <DataContext.Provider value={{ 
        loading, 
        refreshData,
        users, updateUsers, 
        units, updateUnits, 
        assessmentPeriods, updateAssessmentPeriods, 
        assessments, updateAssessments, 
        updateSingleAssessment,
        deleteAssessment,
        deleteFileByUrl,
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
        functions,
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
