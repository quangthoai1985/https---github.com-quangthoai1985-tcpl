
import * as XLSX from 'xlsx';
import type { Unit, User } from './data';

// ===== UNIT UTILS =====

const unitTemplateData = [
    { id: 'TINH_BP', name: 'Tỉnh Bắc Giang', type: 'province', parentId: '', address: 'Bắc Giang', headquarters: 'Số 1 Hùng Vương' },
    { id: 'HUYEN_LNT', name: 'Huyện Lạng Giang', type: 'district', parentId: 'TINH_BP', address: 'Lạng Giang', headquarters: 'Thị trấn Vôi' },
    { id: 'XA_XT', name: 'Xã Xuân Hương', type: 'commune', parentId: 'HUYEN_LNT', address: 'Xuân Hương, Lạng Giang', headquarters: 'UBND xã Xuân Hương' },
];

export const downloadUnitTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(unitTemplateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachDonVi");
    XLSX.writeFile(workbook, "Mau_DonVi.xlsx");
};

export const readUnitsFromExcel = (file: File): Promise<Unit[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<any>(worksheet);

                const units: Unit[] = json.map(row => ({
                    id: row.id,
                    name: row.name,
                    type: row.type,
                    parentId: row.parentId || null,
                    address: row.address,
                    headquarters: row.headquarters
                }));

                resolve(units);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
    });
};


// ===== USER UTILS =====

const userTemplateData = [
  { username: 'nguyenvana', displayName: 'Nguyễn Văn A', role: 'commune_staff', communeId: 'XA_XT' },
  { username: 'tranvanb', displayName: 'Trần Văn B', role: 'admin', communeId: '' },
];


export const downloadUserTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(userTemplateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachNguoiDung");
    XLSX.writeFile(workbook, "Mau_NguoiDung.xlsx");
};

export const readUsersFromExcel = (file: File): Promise<User[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<any>(worksheet);
                
                const users: User[] = json.map(row => ({
                    id: '', // ID will be generated later
                    username: row.username,
                    displayName: row.displayName,
                    role: row.role,
                    communeId: row.communeId || '',
                }));

                resolve(users);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
    });
};
