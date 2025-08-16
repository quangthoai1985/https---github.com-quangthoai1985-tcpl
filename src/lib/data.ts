

// Types based on Firestore data structure
export type Role = 'admin' | 'commune_staff';

export type User = {
  id: string; // Corresponds to Firebase Auth UID
  username: string;
  displayName: string;
  role: Role;
  communeId: string; // Should be empty for admin roles
};

export type Unit = {
  id: string;
  name: string;
  type: 'province' | 'district' | 'commune';
  parentId: string | null; // To build hierarchy
  address?: string;
  headquarters?: string;
};

export type Criterion = {
  id: string;
  name: string;
  description: string;
  indicators: Indicator[];
};

export type Indicator = {
  id: string;
  name: string;
  description: string;
  standardLevel: string;
  inputType: 'number' | 'text' | 'boolean' | 'select';
  calculationFormula: string | null;
  evidenceRequirement: string;
};

export type AssessmentPeriod = {
    id: string;
    name: string;
    startDate: string; // Should ideally be a timestamp
    endDate: string;   // Should ideally be a timestamp
    isActive: boolean;
};

export type Assessment = {
  id: string;
  communeId: string;
  assessmentPeriodId: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  submissionDate?: string; // Should be a timestamp, optional until submitted
  approvalDate?: string;   // Optional
  approverId?: string;     // Optional
  rejectionReason?: string; // Optional
  communeExplanation?: string; // Optional for resubmission
  submittedBy?: string; // User ID
};

export type Document = {
  id: string;
  name: string;
  number: string;
  issueDate: string;
  excerpt: string;
};


// Mock Data moved to scripts/seed-firestore.ts
// This file now only contains type definitions.

export const progressData = [
  { name: 'Tuần 1', 'Số lượng': 5 },
  { name: 'Tuần 2', 'Số lượng': 12 },
  { name: 'Tuần 3', 'Số lượng': 9 },
  { name: 'Tuần 4', 'Số lượng': 15 },
  { name: 'Tuần 5', 'Số lượng': 13 },
  { name: 'Tuần 6', 'Số lượng': 20 },
];

// Mock notifications
export const communeNotifications = [
    { id: 'N001', title: 'Hồ sơ của bạn đã được duyệt', time: '5 phút trước', read: false },
    { id: 'N002', title: 'Hồ sơ của bạn đã bị từ chối, vui lòng kiểm tra và gửi lại.', time: '1 giờ trước', read: false },
    { id: 'N003', title: 'Nhắc nhở: Sắp đến hạn nộp hồ sơ đánh giá.', time: 'Hôm qua', read: true },
];

export const adminNotifications = [
    { id: 'N001', title: 'Xã An Khánh vừa gửi hồ sơ đánh giá.', time: '15 phút trước', read: false },
    { id: 'N002', title: 'Xã Tân Triều vừa cập nhật hồ sơ bị từ chối.', time: '2 giờ trước', read: false },
];

export const guidanceDocuments: Document[] = [];
export const users: User[] = [];
export const units: Unit[] = [];
export const assessments: Assessment[] = [];
export const assessmentPeriods: AssessmentPeriod[] = [];
export const criteria: Criterion[] = [];
