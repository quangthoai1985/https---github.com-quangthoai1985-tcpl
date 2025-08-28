"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUserClaims = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// This function automatically runs whenever a document in the 'users' collection
// is created or updated. Using the v2 SDK syntax.
exports.syncUserClaims = (0, firestore_1.onDocumentWritten)("users/{userId}", async (event) => {
    var _a;
    // If the document is deleted, do nothing.
    if (!((_a = event.data) === null || _a === void 0 ? void 0 : _a.after.exists)) {
        console.log(`User document ${event.params.userId} deleted. No action taken.`);
        return null;
    }
    // Lấy dữ liệu từ document sau khi có sự kiện write.
    const userData = event.data.after.data();
    const userId = event.params.userId; // This is the user's Auth UID
    // === THÊM BƯỚC KIỂM TRA QUAN TRỌNG Ở ĐÂY ===
    // Kiểm tra xem userData có thực sự tồn tại và không phải undefined không.
    if (!userData) {
        console.log(`User document ${userId} exists, but has no data. No action taken.`);
        return null;
    }
    // Từ dòng này trở đi, TypeScript hiểu rằng 'userData' chắc chắn có dữ liệu.
    // Lỗi "possibly 'undefined'" sẽ biến mất.
    const role = userData.role;
    const communeId = userData.communeId;
    // Check that the data exists before setting claims.
    if (role) {
        try {
            const claimsToSet = { role };
            if (communeId) {
                claimsToSet.communeId = communeId;
            }
            console.log(`Updating claims for user ${userId}:`, claimsToSet);
            // Attach the role and communeId to the user's token.
            await admin.auth().setCustomUserClaims(userId, claimsToSet);
            console.log(`Successfully updated claims for user ${userId}`);
            return null;
        }
        catch (error) {
            console.error("Error updating custom claims:", error);
            return null;
        }
    }
    console.log(`User ${userId} has no role to set.`);
    return null;
});
//# sourceMappingURL=index.js.map