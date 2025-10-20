
export type AssessmentStatus = 'achieved' | 'not-achieved' | 'pending';
export type FileWithStatus = (File | {
    name: string, 
    url: string,
    signatureStatus?: 'validating' | 'valid' | 'invalid' | 'error',
    signatureError?: string,
    contentCheckStatus?: 'passed' | 'failed' | 'not_checked',
    contentCheckIssues?: string[]
});

export type IndicatorValue = {
    isTasked?: boolean | null;
    value: any;
    files: FileWithStatus[];
    filesPerDocument?: { [documentIndex: number]: FileWithStatus[] };
    note: string;
    status: AssessmentStatus;
    adminNote?: string;
    communeNote?: string;
    statusByAdmin?: 'approved' | 'rejected' | 'pending';
    
    // Thêm trường này để lưu chi tiết văn bản do xã nhập khi admin chọn 'quantity'
    communeDefinedDocuments?: {
        name: string;
        issueDate: string;
        excerpt: string;
        issuanceDeadlineDays: number;
    }[] | null; // Allow null to be compatible with Firestore

    // NEW FIELDS FOR N-of-M RULE
    contentResults?: { 
        [contentId: string]: { 
            value: any, 
            files: FileWithStatus[], 
            status: 'achieved' | 'not-achieved' | 'pending', 
            note?: string 
        } 
    };
    meta?: { 
        metCount?: number, 
        totalCount?: number, 
        computedAt?: string 
    };
};
export type AssessmentValues = Record<string, IndicatorValue>;
