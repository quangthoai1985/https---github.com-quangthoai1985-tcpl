// File: functions/src/index.ts

import { onDocumentWritten, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as forge from 'node-forge';
import { addDays, parse } from 'date-fns';

admin.initializeApp();
const db = admin.firestore();

// ===== CÁC HÀM CŨ (syncUserClaims, onAssessmentFileDeleted, parseAssessmentPath...) GIỮ NGUYÊN =====
// ... (Giữ nguyên toàn bộ nội dung của các hàm này)

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

function parseAssessmentPath(filePath: string): { communeId: string; periodId: string; indicatorId: string; docIndex: number } | null {
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

export const onAssessmentFileDeleted = onDocumentUpdated("assessments/{assessmentId}", async (event) => {
    const dataBefore = event.data?.before.data();
    const dataAfter = event.data?.after.data();
    if (!dataBefore || !dataAfter) return null;
    const filesBefore = collectAllFileUrls(dataBefore.assessmentData);
    const filesAfter = collectAllFileUrls(dataAfter.assessmentData);
    const deletionPromises: Promise<any>[] = [];
    const storage = admin.storage();
    for (const fileUrl of filesBefore) {
        if (!filesAfter.has(fileUrl) && fileUrl.includes('firebasestorage.googleapis.com')) {
            try {
                const fileRef = storage.refFromURL(fileUrl);
                deletionPromises.push(fileRef.delete().catch(err => {
                    if (err.code !== 404) logger.error(`Failed to delete file ${fileUrl}:`, err);
                }));
            } catch (error) {
                logger.error(`Error creating ref for deletion: ${fileUrl}`, error);
            }
        }
    }
    if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);
    }
    return null;
});

// ===== HÀM TRÍCH XUẤT CHỮ KÝ (PHIÊN BẢN CUỐI CÙNG) =====
const extractSignature = (pdfBuffer: Buffer): string | null => {
    const pdfString = pdfBuffer.toString('binary');
    const signatureRegex = /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\][^<]*\/Contents\s*<([^>]+)>/;
    const match = pdfString.match(signatureRegex);

    if (match && match[1]) {
        logger.info("Successfully extracted signature using regex.");
        return match[1].replace(/\s/g, '');
    } else {
        logger.warn("Could not find signature block using regex.");
        return null;
    }
};

// ===== CLOUD FUNCTION XỬ LÝ CHÍNH (PHIÊN BẢN HOÀN THIỆN) =====
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
                    logger.info(`File ${fileName} not found in Firestore. Creating new entry.`);
                    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(filePath)}?alt=media`;
                    fileToUpdate = { name: fileName, url: downloadURL };
                    fileList.push(fileToUpdate);
                }
                
                fileToUpdate.signatureStatus = fileStatus;
                if (reason) fileToUpdate.signatureError = reason; else delete fileToUpdate.signatureError;

                filesPerDocument[docIndex] = fileList;
                indicatorResult.filesPerDocument = filesPerDocument;

                const criterionDoc = await transaction.get(db.collection('criteria').doc('TC01'));
                const assignedCount = criterionDoc.data()?.assignedDocumentsCount || 0;
                
                const allFiles = Object.values(indicatorResult.filesPerDocument).flat();
                const allFilesUploaded = allFiles.length >= assignedCount;
                const allSignaturesValid = allFiles.every((f: any) => f.signatureStatus === 'valid');
                const quantityMet = Number(indicatorResult.value) >= assignedCount;

                if (quantityMet && allFilesUploaded && allSignaturesValid) {
                    indicatorResult.status = 'achieved';
                } else if (indicatorResult.status !== 'pending') {
                    // Chỉ chuyển sang not-achieved nếu đã có một trạng thái khác pending
                    // Điều này tránh trường hợp hệ thống tự động đánh "không đạt" chỉ vì người dùng chưa nhập liệu
                }

                transaction.set(assessmentRef, { assessmentData: { [indicatorId]: indicatorResult } }, { merge: true });
            });
             logger.info(`Transaction successful for file: ${fileName}`);
        } catch (error) {
            logger.error("Transaction to update file status failed: ", error);
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
        
        const signedData = p7 as any;
        if (!signedData.signers || signedData.signers.length === 0) throw new Error("Không tìm thấy thông tin người ký.");
        if (!signedData.certificates || signedData.certificates.length === 0) throw new Error("Không tìm thấy chứng thư số.");

        const signer = signedData.signers[0];
        const signingTime = signer.signingTime;
        if (!signingTime) throw new Error("Không tìm thấy thời gian ký (signingTime).");

        const isValid = new Date(signingTime) <= deadline;
        const status = isValid ? "valid" : "invalid";
        const reason = isValid ? undefined : `Ký sau thời hạn (${deadline.toLocaleDateString('vi-VN')})`;

        await updateAssessmentFileStatus(status, reason);

        logger.info(`Successfully processed signature for ${fileName}. Status: ${status}`);

    } catch (error: any) {
        logger.error(`Error processing ${filePath}:`, error);
        await updateAssessmentFileStatus('error', error.message);
    }
    return null;
});
