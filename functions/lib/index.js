"use strict";
// File: functions/src/index.ts
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
exports.syncUserClaims = (0, firestore_1.onDocumentWritten)("users/{userId}", async (event) => {
    var _a;
    // Trường hợp document bị xóa, không làm gì cả
    if (!((_a = event.data) === null || _a === void 0 ? void 0 : _a.after.exists)) {
        console.log(`User document ${event.params.userId} deleted. Removing claims.`);
        // Tùy chọn: Xóa claims khi user bị xóa khỏi Firestore
        // await admin.auth().setCustomUserClaims(event.params.userId, null);
        return null;
    }
    const userData = event.data.after.data();
    const userId = event.params.userId;
    if (!userData) {
        console.log(`User document ${userId} has no data. No action taken.`);
        return null;
    }
    // === PHẦN SỬA LỖI QUAN TRỌNG NHẤT ===
    // Tạo một đối tượng claims trống để thêm các giá trị hợp lệ vào
    const claimsToSet = {};
    // Chỉ thêm 'role' vào claims nếu nó tồn tại trong userData
    if (userData.role) {
        claimsToSet.role = userData.role;
    }
    // Chỉ thêm 'communeId' vào claims nếu nó tồn tại trong userData
    if (userData.communeId) {
        claimsToSet.communeId = userData.communeId;
    }
    // =====================================
    try {
        console.log(`Updating claims for user ${userId}:`, claimsToSet);
        await admin.auth().setCustomUserClaims(userId, claimsToSet);
        console.log(`Successfully updated claims for user ${userId}`);
    }
    catch (error) {
        console.error(`Error updating custom claims for user ${userId}:`, error);
    }
    return null;
});
//# sourceMappingURL=index.js.map