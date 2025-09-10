// File: functions/src/index.ts

import { onDocumentWritten, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as forge from 'node-forge';
import { addDays, parse } from 'date-fns';

admin.initializeApp();
const db = admin.firestore();

// =================================================================================================
// HELPER FUNCTIONS (HÀM PHỤ TRỢ)
// =================================================================================================

function parseAssessmentPath(filePath: string): { communeId: string; periodId: string; indicatorId: string; docIndex: number } | null {
    // Path structure: hoso/{communeId}/evidence/{periodId}/{indicatorId}/{docIndex}/{fileName}
    const parts = filePath.split('/');
    if (parts.length === 7 && parts[0] === 'hoso' && parts[2] === 'evidence') {
         const docIndex = parseInt(parts[5], 10);
         if (!isNaN(docIndex)) {
            return {
                communeId: parts[1], 
                periodId: parts[3],
                indicatorId: parts[4],
                docIndex: docIndex
            };
        }
    }
    return null;
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

const extractSignature = (pdfBuffer: Buffer): string | null => {
    const pdfString = pdfBuffer.toString('binary');
    const signatureRegex = /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\][^<]*\/Contents\s*<([^>]+)>/;
    const match = pdfString.match(signatureRegex);
    if (match && match[1]) {
        logger.info("Successfully extracted signature using regex.");
        return match[1].replace(/\s/g, '');
    }
    logger.warn("Could not find signature block using regex.");
    return null;
};


// =================================================================================================
// CLOUD FUNCTIONS
// =================================================================================================

export const syncUserClaims = onDocumentWritten("users/{userId}", async (event) => {
    if (!event.data?.after.exists) { return; }
    const userData = event.data.after.data();
    const userId = event.params.userId;
    if (!userData) { return; }
    const claimsToSet: { [key: string]: any } = {};
    if (userData.role) { claimsToSet.role = userData.role; }
    if (userData.communeId) { claimsToSet.communeId = userData.communeId; }
    try {
        await admin.auth().setCustomUserClaims(userId, claimsToSet);
    } catch (error) {
        logger.error(`Error updating custom claims for user ${userId}:`, error);
    }
    return;
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
    const bucket = admin.storage().bucket(); // Lấy bucket mặc định

    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes('firebasestorage.googleapis.com')) {
            try {
                // **SỬA LỖI**: Phân tích URL để lấy đúng đường dẫn file trong Storage
                const url = new URL(fileUrl);
                const decodedPath = decodeURIComponent(url.pathname);
                const filePathInBucket = decodedPath.substring(decodedPath.indexOf('/o/') + 3);

                if (filePathInBucket) {
                    logger.log(`Attempting to delete file from path: ${filePathInBucket}`);
                    const fileRef = bucket.file(filePathInBucket);
                    deletionPromises.push(fileRef.delete().catch((err: any) => { // Thêm kiểu 'any' cho err
                        if (err.code === 404) {
                             logger.warn(`Attempted to delete ${filePathInBucket}, but it was not found.`);
                        } else {
                            logger.error(`Failed to delete file ${filePathInBucket}:`, err);
                        }
                    }));
                }
            } catch (error) {
                 logger.error(`Error processing URL for deletion: ${fileUrl}`, error);
            }
        }
    }

    if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
        logger.info(`Successfully processed ${deletionPromises.length} potential file deletion(s).`);
    }

    return null;
});

export const verifyPDFSignature = onObjectFinalized(async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const fileName = filePath.split('/').pop() || 'unknownfile';

    if (!contentType || !contentType.startsWith('application/pdf')) {
        return null;
    }
    const pathInfo = parseAssessmentPath(filePath);
    if (!pathInfo || !pathInfo.indicatorId.startsWith('CT1.')) {
        return null;
    }

    const { communeId, periodId, indicatorId, docIndex } = pathInfo;
    const assessmentId = `assess_${periodId}_${communeId}`;
    const assessmentRef = db.collection('assessments').doc(assessmentId);

    const updateAssessmentFileStatus = async (
        fileStatus: 'validating' | 'valid' | 'invalid' | 'error',
        reason?: string
    ) => {
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(assessmentRef);
                if (!doc.exists) {
                    logger.error(`Assessment document ${assessmentId} does not exist.`);
                    return;
                }
                const data = doc.data();
                if (!data) return;

                const assessmentData = data.assessmentData || {};
                const indicatorResult = assessmentData[indicatorId] || { filesPerDocument: {}, status: 'pending', value: 0 };
                const filesPerDocument = indicatorResult.filesPerDocument || {};
                let fileList = filesPerDocument[docIndex] || [];
                
                let fileToUpdate = fileList.find((f: any) => f.name === fileName);

                if (!fileToUpdate) {
                    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
                    fileToUpdate = { name: fileName, url: downloadURL };
                    fileList.push(fileToUpdate);
                }
                
                fileToUpdate.signatureStatus = fileStatus;
                if (reason) fileToUpdate.signatureError = reason; else delete fileToUpdate.signatureError;

                filesPerDocument[docIndex] = fileList;
                indicatorResult.filesPerDocument = filesPerDocument;
                
                const criterionDocSnap = await transaction.get(db.collection('criteria').doc('TC01'));
                const criterionData = criterionDocSnap.data();
                const assignedCount = criterionData?.assignedDocumentsCount || 0;
                
                const allFiles = Object.values(indicatorResult.filesPerDocument).flat();
                const allFilesUploaded = allFiles.length >= assignedCount;
                const allSignaturesValid = allFiles.every((f: any) => f.signatureStatus === 'valid');
                const quantityMet = Number(indicatorResult.value) >= assignedCount;

                if (quantityMet && allFilesUploaded && allSignaturesValid) {
                    indicatorResult.status = 'achieved';
                } else {
                    indicatorResult.status = 'not-achieved';
                }
                
                transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
            });
        } catch (error) {
            logger.error(`Transaction to update file status for ${fileName} failed:`, error);
        }
    };
    
    await updateAssessmentFileStatus('validating');
    
    try {
        const criterionDoc = await db.collection('criteria').doc('TC01').get();
        if (!criterionDoc.exists) throw new Error("Criterion document TC01 not found.");
        const documentConfig = criterionDoc.data()?.documents?.[docIndex];
        if (!documentConfig) throw new Error(`Document config for index ${docIndex} not found.`);
        
        const issueDate = parse(documentConfig.issueDate, 'dd/MM/yyyy', new Date());
        const deadline = addDays(issueDate, documentConfig.issuanceDeadlineDays);

        const bucket = admin.storage().bucket(fileBucket);
        const [fileBuffer] = await bucket.file(filePath).download();
        
        const signatureHex = extractSignature(fileBuffer);
        if (!signatureHex) throw new Error("Không tìm thấy khối dữ liệu chữ ký trong tệp PDF.");
        
        const p7Asn1 = forge.asn1.fromDer(forge.util.hexToBytes(signatureHex), false);
        const p7 = forge.pkcs7.messageFromAsn1(p7Asn1);
        
        const signerInfo = (p7 as any).rawCapture.signerInfo;
        if (!signerInfo) throw new Error("Không tìm thấy thông tin người ký trong chữ ký.");

        const signingTimeAttr = signerInfo.authenticatedAttributes.find(
            (attr: any) => forge.pki.oids.signingTime === attr.oid
        );
        if (!signingTimeAttr || !signingTimeAttr.value) throw new Error("Không tìm thấy thuộc tính thời gian ký.");
        
        const signingTime = forge.asn1.fromDer(signingTimeAttr.value).value[0].value;
        
        if (!p7.certificates || p7.certificates.length === 0) throw new Error("Không tìm thấy chứng thư nào trong chữ ký.");
        const signerCertificate = p7.certificates[0];
        const signerName = signerCertificate.subject.getField('CN')?.value || 'Unknown Signer';
        
        const isValid = new Date(signingTime) <= deadline;
        const status = isValid ? "valid" : "invalid";
        const reason = isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`;

        await updateAssessmentFileStatus(status, reason);
    } catch (error: any) {
        logger.error(`Error processing signature for ${filePath}:`, error);
        await updateAssessmentFileStatus('error', error.message);
    }
    return null;
});
