// File: functions/src/index.ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import { PDFDocument, PDFDict, PDFName } from 'pdf-lib';
import { addDays, parse } from 'date-fns';

admin.initializeApp();
const db = admin.firestore();

// =================================================================================================
// TYPE DEFINITIONS
// =================================================================================================
type SignatureStatus = 'valid' | 'invalid' | 'error' | 'validating';

// =================================================================================================
// HELPER FUNCTIONS
// =================================================================================================

function parseAssessmentPath(filePath: string): { communeId: string; periodId: string; indicatorId: string; docIndex: number } | null {
    const parts = filePath.split('/');
    if (parts.length === 7 && parts[0] === 'hoso' && parts[2] === 'evidence') {
        const docIndex = parseInt(parts[5], 10);
        if (!isNaN(docIndex)) {
            return { communeId: parts[1], periodId: parts[3], indicatorId: parts[4], docIndex };
        }
    }
    return null;
}

function parsePdfDate(raw: string): Date | null {
    if (!raw || !raw.startsWith('D:')) return null;
    try {
        const dateString = raw.substring(2, 16); // D:YYYYMMDDHHmmss
        const year = parseInt(dateString.substring(0, 4), 10);
        const month = parseInt(dateString.substring(4, 6), 10) - 1;
        const day = parseInt(dateString.substring(6, 8), 10);
        const hour = parseInt(dateString.substring(8, 10), 10);
        const minute = parseInt(dateString.substring(10, 12), 10);
        const second = parseInt(dateString.substring(12, 14), 10);
        return new Date(year, month, day, hour, minute, second);
    } catch (e) {
        logger.error("Failed to parse PDF date string:", raw, e);
        return null;
    }
}

async function extractSignatureInfo(pdfBuffer: Buffer): Promise<{ name: string | null; signDate: Date | null }[]> {
    const signatures: { name: string | null; signDate: Date | null }[] = [];
    try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, { updateMetadata: false });
        const acroForm = pdfDoc.getForm();
        const fields = acroForm.getFields();

        for (const field of fields) {
            const fieldType = field.acroField.FT()?.toString();
            if (fieldType === '/Sig') {
                const sigDict = field.acroField.V();
                if (sigDict instanceof PDFDict) {
                    const nameRaw = sigDict.get(PDFName.of('Name'))?.toString();
                    const signDateRaw = sigDict.get(PDFName.of('M'))?.toString();
                    
                    const name = nameRaw ? nameRaw.substring(1, nameRaw.length - 1) : null;
                    const signDate = signDateRaw ? parsePdfDate(signDateRaw.substring(1, signDateRaw.length - 1)) : null;

                    if (signDate) {
                         signatures.push({ name, signDate });
                    }
                }
            }
        }
    } catch (error) {
        logger.error("Error extracting signature with pdf-lib:", error);
    }
    return signatures;
}

function collectAllFileUrls(assessmentData: any): Set<string> {
    const urls = new Set<string>();
    if (!assessmentData || typeof assessmentData !== 'object') return urls;
    for (const indicatorId in assessmentData) {
        const indicator = assessmentData[indicatorId];
        if (indicator?.filesPerDocument && typeof indicator.filesPerDocument === 'object') {
            for (const docIndex in indicator.filesPerDocument) {
                const fileList = indicator.filesPerDocument[docIndex];
                if (Array.isArray(fileList)) {
                    fileList.forEach((file: { url: string }) => {
                        if (file?.url) urls.add(file.url);
                    });
                }
            }
        }
    }
    return urls;
}

// =================================================================================================
// CLOUD FUNCTIONS
// =================================================================================================

export const handleSignatureCheck = onObjectFinalized(async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileName = filePath.split('/').pop() || 'unknownfile';

    if (!contentType || !contentType.startsWith('application/pdf')) return null;
    
    const pathInfo = parseAssessmentPath(filePath);
    if (!pathInfo || !pathInfo.indicatorId.startsWith('CT1.')) return null;

    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);

    const updateStatus = async (status: SignatureStatus, reason?: string) => {
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(assessmentRef);
                if (!doc.exists) {
                    logger.error(`Assessment document ${assessmentId} does not exist.`);
                    return;
                }
                const data = doc.data();
                if (!data || !data.assessmentData) return;

                const assessmentData = { ...data.assessmentData };
                const indicatorResult = assessmentData[indicatorId] || { filesPerDocument: {}, status: 'pending', value: 0 };
                const filesPerDocument = indicatorResult.filesPerDocument || {};
                let fileList = filesPerDocument[docIndex] || [];
                
                let fileToUpdate = fileList.find((f: any) => f.name === fileName);

                if (!fileToUpdate) {
                    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
                    fileToUpdate = { name: fileName, url: downloadURL };
                    fileList.push(fileToUpdate);
                }
                
                fileToUpdate.signatureStatus = status;
                if (reason) fileToUpdate.signatureError = reason; else delete fileToUpdate.signatureError;

                filesPerDocument[docIndex] = fileList;
                indicatorResult.filesPerDocument = filesPerDocument;
                
                const criterionDocSnap = await transaction.get(db.collection('criteria').doc('TC01'));
                const assignedCount = criterionDocSnap.data()?.assignedDocumentsCount || 0;
                
                const allFiles = Object.values(indicatorResult.filesPerDocument).flat();
                const allFilesUploaded = allFiles.length >= assignedCount;
                const allSignaturesValid = allFiles.every((f: any) => f.signatureStatus === 'valid');
                const quantityMet = Number(indicatorResult.value) >= assignedCount;

                if (quantityMet && allFilesUploaded && allSignaturesValid) {
                    indicatorResult.status = 'achieved';
                } else if (!quantityMet || !allFilesUploaded) {
                    indicatorResult.status = 'pending';
                }
                else {
                    indicatorResult.status = 'not-achieved';
                }
                
                transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
            });
        } catch (error) {
            logger.error(`Transaction to update file status for ${fileName} failed:`, error);
        }
    };
    
    await updateStatus('validating');
    
    try {
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        if (!criterionDoc.exists) throw new Error("Criterion document TC01 not found.");
        const criterionData = criterionDoc.data();

        const assessmentDoc = await assessmentRef.get();
        if (!assessmentDoc.exists) throw new Error(`Assessment document ${assessmentId} does not exist.`);
        const assessmentData = assessmentDoc.data()?.assessmentData;

        let issueDateStr: string | undefined;
        let deadlineDays: number | undefined;

        const assignmentType = criterionData?.assignmentType || 'specific';

        if (assignmentType === 'specific') {
            const documentConfig = criterionData?.documents?.[docIndex];
            if (!documentConfig) throw new Error(`Document config (specific) for index ${docIndex} not found in criteria.`);
            issueDateStr = documentConfig.issueDate;
            deadlineDays = documentConfig.issuanceDeadlineDays;
        } else { // 'quantity'
            const communeDocumentConfig = assessmentData?.[indicatorId]?.communeDefinedDocuments?.[docIndex];
            if (!communeDocumentConfig) throw new Error(`Commune defined document config for index ${docIndex} not found in assessment.`);
            issueDateStr = communeDocumentConfig.issueDate;
            deadlineDays = communeDocumentConfig.issuanceDeadlineDays;
        }
        
        if (!issueDateStr || deadlineDays === undefined) {
            throw new Error(`Invalid date or deadline days for docIndex ${docIndex}.`);
        }

        const issueDate = parse(issueDateStr, 'dd/MM/yyyy', new Date());
        const deadline = addDays(issueDate, deadlineDays);

        const bucket = admin.storage().bucket(fileBucket);
        const [fileBuffer] = await bucket.file(filePath).download();
        
        const signatures = await extractSignatureInfo(fileBuffer);
        if (signatures.length === 0) throw new Error("Không tìm thấy thông tin chữ ký hợp lệ trong tài liệu.");

        const firstSignature = signatures[0];
        const signingTime = firstSignature.signDate;

        if (!signingTime) throw new Error("Chữ ký không chứa thông tin ngày ký hợp lệ.");
        
        const isValid = signingTime <= deadline;
        const status = isValid ? "valid" : "invalid";
        const reason = isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`;
        
        await updateStatus(status, reason);
        logger.info(`[pdf-lib SUCCESS] Processed ${fileName}. Status: ${status}`);

    } catch (error: any) {
        logger.error(`[pdf-lib ERROR] Error processing ${filePath}:`, error);
        await updateStatus('error', error.message);
    }
    return null;
});

export const onAssessmentFileDeleted = onDocumentUpdated("assessments/{assessmentId}", async (event) => {
    const dataBefore = event.data?.before.data();
    const dataAfter = event.data?.after.data();

    if (!dataBefore || !dataAfter) {
        logger.log("Document data is missing, cannot compare file lists.");
        return null;
    }

    const filesBefore = collectAllFileUrls(dataBefore.assessmentData);
    const filesAfter = collectAllFileUrls(dataAfter.assessmentData);

    const deletionPromises: Promise<any>[] = [];
    const storage = admin.storage();
    const bucket = storage.bucket();

    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes('firebasestorage.googleapis.com')) {
            logger.info(`File ${fileUrl} was removed from assessment. Queuing for deletion from Storage.`);
            try {
                const url = new URL(fileUrl);
                const filePath = decodeURIComponent(url.pathname).split('/o/')[1];
                
                if (!filePath) {
                    throw new Error("Could not extract file path from URL.");
                }

                logger.log(`Attempting to delete file from path: ${filePath}`);
                const fileRef = bucket.file(filePath);

                deletionPromises.push(fileRef.delete().catch(err => {
                    if (err.code === 404) {
                         logger.warn(`Attempted to delete ${filePath}, but it was not found. Ignoring.`);
                    } else {
                        logger.error(`Failed to delete file ${filePath}:`, err);
                    }
                }));

            } catch (error) {
                 logger.error(`Error processing URL for deletion: ${fileUrl}`, error);
            }
        }
    }

    if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        logger.info(`Successfully processed ${deletionPromises.length} potential file deletion(s).`);
    } else {
        logger.log("No files were removed in this update. No deletions necessary.");
    }

    return null;
});
