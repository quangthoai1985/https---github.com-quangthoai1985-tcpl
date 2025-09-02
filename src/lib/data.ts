

// Define a structure for how the self-assessment data for each indicator will be stored.
export type IndicatorResult = {
    isTasked?: boolean;
    value: any;
    files: { name: string, url: string }[];
    note: string;
    status: 'achieved' | 'not-achieved' | 'pending';
    adminNote?: string; // Ghi chú của admin cho từng chỉ tiêu
    statusByAdmin?: 'approved' | 'rejected' | 'pending'; // Trạng thái admin duyệt cho từng chỉ tiêu
};


// Types based on Firestore data structure
export type Role = 'admin' | 'commune_staff';

export type User = {
  id: string; // Corresponds to Firebase Auth UID
  username: string;
  displayName: string;
  phoneNumber?: string; // Add new field
  role: Role;
  communeId: string;
};

export type Unit = {
  id: string;
  name: string;
  type: 'province' | 'district' | 'commune';
  parentId: string | null; // To build hierarchy
  address?: string;
  headquarters?: string;
};

export type SubIndicator = {
  id: string;
  name: string;
  description: string;
  standardLevel: string;
  inputType: 'number' | 'text' | 'boolean' | 'select';
  calculationFormula: string | null;
  evidenceRequirement: string;
};

export type Indicator = {
  id: string;
  name: string;
  description: string;
  // An indicator might not have its own evaluation fields if it's just a container for sub-indicators.
  // For simplicity, we keep them but they can be optional or ignored in the UI if subIndicators exist.
  standardLevel: string;
  inputType: 'number' | 'text' | 'boolean' | 'select';
  calculationFormula: string | null;
  evidenceRequirement: string;
  subIndicators: SubIndicator[];
};


export type Criterion = {
  id:string;
  name: string;
  description: string;
  indicators: Indicator[];
};

export type AssessmentPeriod = {
    id: string;
    name: string;
    startDate: string; // Should ideally be a timestamp
    endDate: string;   // Should ideally be a timestamp
    isActive: boolean;
    registrationDeadline?: string; // New field
    totalIndicators?: number; // Total indicators for this period
};

export type Assessment = {
  id: string;
  communeId: string;
  assessmentPeriodId: string;
  status: 'draft' | 'pending_review' | 'rejected' | 'pending_registration' | 'registration_approved' | 'registration_rejected' | 'achieved_standard';
  submissionDate?: string; // Should be a timestamp, optional until submitted
  approvalDate?: string;   // Optional
  approverId?: string;     // Optional
  rejectionReason?: string; // Optional
  communeExplanation?: string; // Optional for resubmission
  submittedBy?: string; // User ID
  registrationFormUrl?: string; // URL to the uploaded registration form
  registrationRejectionReason?: string;
  assessmentData?: Record<string, IndicatorResult>; // Holds all self-assessment data
  achievementDate?: string; // Date when standard was achieved
  recognizerId?: string; // User ID of who recognized the achievement
};

export type Document = {
  id: string;
  name: string;
  number: string;
  issueDate: string;
  excerpt: string;
  fileUrl?: string; // Add a field for the download URL
};

// Type for the combined Unit and User import from Excel
export type UnitAndUserImport = {
    unitId: string;
    unitName: string;
    unitParentId: string | null;
    unitAddress?: string;
    unitHeadquarters?: string;
    userEmail: string;
    userPassword: string;
    userDisplayName: string;
};

export type LoginConfig = {
    id: 'loginPage'; // Singleton document
    backgroundColor?: string;
    backgroundImageUrl?: string;
    logoUrl?: string;
    logoWidth?: number;
    logoHeight?: number;
    backgroundImageWidth?: number;
    backgroundImageHeight?: number;
};


// This file now only contains type definitions.
// Mock data has been removed or replaced with dynamic logic.

export const progressData = [
  { name: 'Tuần 1', 'Số lượng': 5 },
  { name: 'Tuần 2', 'Số lượng': 12 },
  { name: 'Tuần 3', 'Số lượng': 9 },
  { name: 'Tuần 4', 'Số lượng': 15 },
  { name: 'Tuần 5', 'Số lượng': 13 },
  { name: 'Tuần 6', 'Số lượng': 20 },
];
