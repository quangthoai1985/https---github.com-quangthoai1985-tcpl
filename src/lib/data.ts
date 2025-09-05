// src/lib/data.ts

// Existing interfaces...

export interface Criterion {
  id: string;
  name: string;
  order: number;
  // Các trường mới cho nghiệp vụ của Tiêu chí 1
  // Dùng `?` (optional) để các tiêu chí khác không bị ảnh hưởng
  requiredDocuments?: number; // Số lượng VBQPPL được giao
  deadlineDays?: number; // Thời hạn ban hành (ngày)
  startDate?: string; // Ngày bắt đầu áp dụng (lưu dưới dạng ISO string)
  children?: SubCriterion[];
}

export interface SubCriterion {
  id: string;
  name: string;
  order: number;
  description: string;
  // Giữ nguyên cấu trúc của chỉ tiêu con
}

// Other existing interfaces...
export interface Commune {
  id: string;
  name: string;
  district: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'commune' | 'reviewer';
  communeId?: string;
  communeName?: string;
}

export interface AssessmentPeriod {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
}

export interface Assessment {
    id: string;
    communeId: string;
    communeName: string;
    assessmentPeriodId: string;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    submittedAt?: string;
    data: AssessmentData;
}

export interface AssessmentData {
    [criterionId: string]: {
        [subCriterionId: string]: {
            // Cấu trúc cũ, sẽ được điều chỉnh ở bước sau
            score: number;
            completionRate: number;
            evidence: EvidenceFile[];
            // Cấu trúc mới sẽ thêm vào đây
            notApplicable?: boolean; // Cho checkbox "Không được giao nhiệm vụ"
            actualDocuments?: number; // Số VB thực tế ban hành
        };
    };
}

export interface EvidenceFile {
    name: string;
    url: string;
}
