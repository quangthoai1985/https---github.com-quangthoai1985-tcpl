
import * as XLSX from 'xlsx';
import type { Unit, User, UnitAndUserImport } from './data';


// ===== UNIFIED UNIT AND USER IMPORT =====

const unitAndUserTemplateData = [
    { 
        unitId: 'XA_MYDINH_1', 
        unitName: 'Phường Mỹ Đình 1', 
        unitParentId: 'QUAN_NTL', 
        unitAddress: 'Mỹ Đình 1, Nam Từ Liêm, Hà Nội',
        unitHeadquarters: 'Số 1 Nguyễn Cơ Thạch',
        userEmail: 'mydinh1@hanoi.gov.vn', 
        userPassword: 'Password123!', 
        userDisplayName: 'Nguyễn Văn A'
    },
    { 
        unitId: 'XA_TAYMO', 
        unitName: 'Phường Tây Mỗ', 
        unitParentId: 'QUAN_NTL', 
        unitAddress: 'Tây Mỗ, Nam Từ Liêm, Hà Nội',
        unitHeadquarters: 'Số 1 đường 70',
        userEmail: 'taymo@hanoi.gov.vn', 
        userPassword: 'Password123!', 
        userDisplayName: 'Trần Thị B'
    },
];

export const downloadUnitAndUserTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(unitAndUserTemplateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ImportDonViVaNguoiDung");
    XLSX.writeFile(workbook, "Mau_Import_DonVi_NguoiDung.xlsx");
};

export const readUnitsAndUsersFromExcel = (file: File): Promise<UnitAndUserImport[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<any>(worksheet);

                const importData: UnitAndUserImport[] = json.map(row => {
                    if (!row.unitId || !row.unitName || !row.userEmail || !row.userPassword || !row.userDisplayName) {
                        throw new Error('Các cột unitId, unitName, userEmail, userPassword, userDisplayName là bắt buộc.');
                    }
                    return {
                        unitId: String(row.unitId),
                        unitName: String(row.unitName),
                        unitParentId: row.unitParentId ? String(row.unitParentId) : null,
                        unitAddress: row.unitAddress ? String(row.unitAddress) : '',
                        unitHeadquarters: row.unitHeadquarters ? String(row.unitHeadquarters) : '',
                        userEmail: String(row.userEmail),
                        userPassword: String(row.userPassword),
                        userDisplayName: String(row.userDisplayName),
                    }
                });

                resolve(importData);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
    });
};
