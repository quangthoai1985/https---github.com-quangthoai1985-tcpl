

// Define a structure for how the self-assessment data for each indicator will be stored.
export type IndicatorResult = {
    isTasked?: boolean | null;
    value: any;
    files: { 
        name: string, 
        url?: string,
        signatureStatus?: 'validating' | 'valid' | 'invalid' | 'error';
        signatureError?: string;
        contentCheckStatus?: 'passed' | 'failed' | 'not_checked';
        contentCheckIssues?: string[];
    }[];
    filesPerDocument?: { [documentIndex: number]: { 
        name: string, 
        url?: string,
        signatureStatus?: 'validating' | 'valid' | 'invalid' | 'error';
        signatureError?: string;
        contentCheckStatus?: 'passed' | 'failed' | 'not_checked';
        contentCheckIssues?: string[];
    }[] };
    note: string;
    status: 'achieved' | 'not-achieved' | 'pending';
    adminNote?: string; // Ghi chú của admin cho từng chỉ tiêu
    communeNote?: string; // Nội dung giải trình của xã cho từng chỉ tiêu
    statusByAdmin?: 'approved' | 'rejected' | 'pending'; // Trạng thái admin duyệt cho từng chỉ tiêu
    
    // Thêm trường này để lưu chi tiết văn bản do xã nhập khi admin chọn 'quantity'
    communeDefinedDocuments?: {
        name: string;
        issueDate: string;
        excerpt: string;
        issuanceDeadlineDays: number;
    }[] | null; // Allow null to be compatible with Firestore
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

export type Indicator = {
  id: string;
  name: string;
  description: string;
  standardLevel: string;
  inputType: 'number' | 'boolean' | 'select' | 'text' | 'percentage_ratio' | 'checkbox_group' | 'TC1_like';
  evidenceRequirement?: string;
  
  // Fields for Criterion 1 / Criterion 4 logic
  assignmentType?: 'quantity' | 'specific'; 
  assignedDocumentsCount?: number;
  documents?: {
    name: string;
    issueDate: string;
    excerpt: string;
    issuanceDeadlineDays: number;
  }[];
  originalParentIndicatorId?: string;
};


export type Criterion = {
  id:string;
  name: string;
  description: string;
  indicators: Indicator[];
  
  assignmentType?: 'quantity' | 'specific'; 

  assignedDocumentsCount?: number;
  documents?: {
    name: string;
    issueDate: string;
    excerpt: string;
    issuanceDeadlineDays: number;
  }[];
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
  
  registrationStatus: 'pending' | 'approved' | 'rejected';
  assessmentStatus: 'not_started' | 'draft' | 'pending_review' | 'returned_for_revision' | 'achieved_standard' | 'rejected';

  registrationSubmissionDate?: string;
  assessmentSubmissionDate?: string;
  approvalDate?: string;   // Date of final "achieved_standard"
  
  submittedBy?: string; // User ID
  approverId?: string;     // Optional
  
  registrationFormUrl?: string;
  registrationRejectionReason?: string;
  
  assessmentRejectionReason?: string; // Final rejection reason
  assessmentData?: Record<string, IndicatorResult>; // Holds all self-assessment data

  announcementDecisionUrl?: string;
  announcementDate?: string;
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
    userPhoneNumber?: string;
};

export type LoginConfig = {
    id: 'loginPage'; // Singleton document
    backgroundImageUrl?: string;
    primaryLogoUrl?: string;
    primaryLogoWidth?: number;
    primaryLogoHeight?: number;
    secondaryLogoUrl?: string;
    secondaryLogoWidth?: number;
    secondaryLogoHeight?: number;
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
