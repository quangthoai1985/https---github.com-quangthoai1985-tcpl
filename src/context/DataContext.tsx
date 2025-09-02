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
      const sortedAssessments = [...allAssessments].sort((a,b) => (b.submissionDate || '').localeCompare(a.submissionDate || ''));

      if (user.role === 'admin') {
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

  const fetchPrivateData = useCallback(async (loggedInUser: User) => {
    if (!db) return;
    console.log("Fetching private data for logged in user:", loggedInUser.role);
    try {
        // Tạo một mảng các promise để lấy dữ liệu chung
        const commonPromises = [
            getDocs(collection(db, 'units')),
            getDocs(collection(db, 'assessmentPeriods')),
            getDocs(collection(db, 'assessments')),
            getDocs(collection(db, 'criteria')),
            getDocs(collection(db, 'guidanceDocuments')),
        ];

        // Chạy các promise chung trước
        const [
            unitsSnapshot,
            periodsSnapshot,
            assessmentsSnapshot,
            criteriaSnapshot,
            documentsSnapshot,
        ] = await Promise.all(commonPromises);

        const fetchedUnits = unitsSnapshot.docs.map(d => d.data() as Unit);
        const fetchedAssessments = assessmentsSnapshot.docs.map(d => d.data() as Assessment);

        // Cập nhật state cho dữ liệu chung
        setUnits(fetchedUnits);
        setAssessmentPeriods(periodsSnapshot.docs.map(d => d.data() as AssessmentPeriod));
        setAssessments(fetchedAssessments);
        setCriteria(criteriaSnapshot.docs.map(d => d.data() as Criterion));
        setGuidanceDocuments(documentsSnapshot.docs.map(d => d.data() as AppDocument));

        // ✅ LOGIC QUAN TRỌNG: Chỉ lấy danh sách users nếu là admin
        if (loggedInUser.role === 'admin') {
            console.log("User is admin, fetching all users...");
            const usersSnapshot = await getDocs(collection(db, 'users'));
            setUsers(usersSnapshot.docs.map(d => d.data() as User));
        } else {
            // Nếu không phải admin, đặt danh sách users là một mảng rỗng
            setUsers([]);
        }
        
        // Tạo thông báo sau khi đã có đủ dữ liệu cần thiết
        setNotifications(generateNotifications(loggedInUser, fetchedAssessments, fetchedUnits));
        console.log("Private data fetched successfully.");

    } catch (error) {
        console.error("Error fetching private data:", error);
        // Có lỗi xảy ra, đảm bảo các state đều rỗng để tránh hiển thị dữ liệu cũ
        setUsers([]);
        setUnits([]);
        setAssessments([]);
        // ... reset các state khác nếu cần
    }
}, [db]); // Bỏ generateNotifications khỏi dependencies nếu nó không thay đổi

  // ✅ BƯỚC 1: Tải dữ liệu CÔNG KHAI ngay khi có 'db'.
  // Chạy độc lập và không phụ thuộc vào trạng thái đăng nhập.
  useEffect(() => {
    const fetchPublicData = async () => {
        if (!db) return;
        console.log("Fetching public data (login config)...");
        try {
            // Tối ưu: Đọc trực tiếp document thay vì cả collection
            const configDocRef = doc(db, 'configurations', 'loginPage');
            const configDocSnap = await getDoc(configDocRef);
            
            if (configDocSnap.exists()) {
                setLoginConfig(configDocSnap.data() as LoginConfig);
                console.log("Public data fetched successfully.");
            } else {
                console.log("No login config found.");
                setLoginConfig(null);
            }
        } catch (error) {
            console.error("Error fetching public data:", error);
        }
    };
    fetchPublicData();
  }, [db]);


  // ✅ BƯỚC 2: Lắng nghe trạng thái đăng nhập và chỉ tải dữ liệu RIÊNG TƯ KHI CẦN.
  useEffect(() => {
    if (!auth || !db) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        // Người dùng đã đăng nhập
        try {
            // ✅ SỬA LỖI: Đọc trực tiếp document của người dùng bằng UID, không quét cả collection.
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const loggedInUser = userDocSnap.data() as User;
              setCurrentUser(loggedInUser);
              setRole(loggedInUser.role);
              
              // Chỉ tải dữ liệu riêng tư sau khi đã xác nhận được người dùng
              await fetchPrivateData(loggedInUser);
            } else {
              // Trường hợp hiếm: có auth user nhưng không có profile trong Firestore
              console.error("User profile not found in Firestore for uid:", firebaseUser.uid);
              await signOut(auth); // Đăng xuất người dùng
            }
        } catch(e) {
             console.error("Error fetching user profile:", e);
             await signOut(auth);
        }

      } else {
        // Người dùng đã đăng xuất hoặc chưa đăng nhập
        setCurrentUser(null);
        setRole(null);
        // Dọn dẹp state chứa dữ liệu nhạy cảm
        setUsers([]);
        setUnits([]);
        setAssessments([]);
        setAssessmentPeriods([]);
        setCriteria([]);
        setGuidanceDocuments([]);
        setNotifications([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db, fetchPrivateData]); // Bỏ fetchPublicData khỏi dependencies

  const setLoginInfo = async (email: string, password: string): Promise<boolean> => {
    if (!auth) return false;
    setLoading(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Listener onAuthStateChanged sẽ tự động xử lý việc tải dữ liệu sau khi đăng nhập thành công
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
      // Listener onAuthStateChanged sẽ tự động dọn dẹp state
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const createFirestoreUpdater = <T extends {id: string}>(
    collectionName: string,
    stateUpdater: React.Dispatch<React.SetStateAction<T[]>>
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
      stateUpdater(newData);
      await refreshData();
      setLoading(false);
    };
  };

  const updateLoginConfig = async (newConfig: LoginConfig) => {
      if (!db) return;
      setLoading(true);
      const docRef = doc(db, 'configurations', 'loginPage');
      await setDoc(docRef, newConfig, { merge: true });
      // Cập nhật lại state cục bộ để UI thay đổi ngay lập tức
      setLoginConfig(prevConfig => ({...prevConfig, ...newConfig}));
      setLoading(false);
  }

  const deleteAssessment = async (assessmentId: string) => {
      if (!db) return;
      setLoading(true);
      try {
          await deleteDoc(doc(db, 'assessments', assessmentId));
          setAssessments(prev => prev.filter(a => a.id !== assessmentId));
      } catch (error) {
          console.error("Error deleting assessment:", error);
          throw error;
      } finally {
          setLoading(false);
      }
  };

  // refreshData được đơn giản hóa, vì onAuthStateChanged đã xử lý logic chính
  const refreshData = useCallback(async () => {
      if (!auth?.currentUser || !db) {
        console.log("User not logged in or DB not ready, skipping refresh.");
        return;
      }
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