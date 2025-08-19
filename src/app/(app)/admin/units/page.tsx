
'use client';

import React from 'react';
import {
  MoreHorizontal,
  PlusCircle,
  Upload,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useData } from '@/context/DataContext';
import PageHeader from '@/components/layout/page-header';
import type { Unit, UnitAndUserImport } from '@/lib/data';
import { downloadUnitAndUserTemplate, readUnitsAndUsersFromExcel } from '@/lib/excelUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { importUnitsAndUsers } from '@/actions/userActions';


function UnitForm({ unit, onSave, onCancel }: { unit: Partial<Unit>, onSave: (unit: Partial<Unit>) => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState(unit);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{unit.id ? 'Chỉnh sửa đơn vị' : 'Tạo đơn vị mới'}</DialogTitle>
        <DialogDescription>
          {unit.id ? 'Cập nhật thông tin đơn vị.' : 'Điền thông tin để tạo đơn vị mới.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Tên đơn vị</Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="address" className="text-right">Địa chỉ</Label>
          <Input id="address" value={formData.address || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="headquarters" className="text-right">Trụ sở hiện nay</Label>
          <Input id="headquarters" value={formData.headquarters || ''} onChange={handleChange} className="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button type="submit" onClick={() => onSave(formData)}>{unit.id ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
      </DialogFooter>
    </>
  );
}

function ImportDialog({ onImport, onCancel }: { onImport: (data: UnitAndUserImport[]) => void, onCancel: () => void }) {
    const [file, setFile] = React.useState<File | null>(null);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const handleImportClick = async () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn một file Excel.' });
            return;
        }

        try {
            const data = await readUnitsAndUsersFromExcel(file);
            onImport(data);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Lỗi đọc file', description: 'Không thể xử lý file Excel. Vui lòng kiểm tra định dạng và thử lại.' });
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>Import danh sách Đơn vị & Người dùng</DialogTitle>
                <DialogDescription>
                    Tải lên file Excel chứa danh sách các đơn vị và tài khoản người dùng tương ứng.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Alert>
                    <AlertTitle>Định dạng file Excel</AlertTitle>
                    <AlertDescription>
                        File phải chứa các cột: <strong>unitId, unitName, unitParentId, userEmail, userPassword, userDisplayName</strong>, và các cột thông tin đơn vị khác.
                    </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={downloadUnitAndUserTemplate}>Tải file mẫu</Button>
                <div className="grid gap-2">
                    <Label htmlFor="excel-file">Chọn file Excel</Label>
                    <Input id="excel-file" type="file" onChange={handleFileChange} accept=".xlsx, .xls" />
                </div>
                 {file && <p className="text-sm text-muted-foreground">Đã chọn file: {file.name}</p>}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Hủy</Button>
                <Button onClick={handleImportClick} disabled={!file}>Bắt đầu Import</Button>
            </DialogFooter>
        </>
    );
}


export default function UnitManagementPage() {
    const { units, updateUnits, refreshData } = useData();
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isImportOpen, setIsImportOpen] = React.useState(false);
    const [editingUnit, setEditingUnit] = React.useState<Partial<Unit> | null>(null);
    const [deletingUnit, setDeletingUnit] = React.useState<Unit | null>(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const { toast } = useToast();

    // Filter to show only commune-level units
    const communeUnits = units
        .filter(unit => unit.type === 'commune' && unit.name.toLowerCase().includes(searchTerm.toLowerCase()));


    const handleNew = () => {
        setEditingUnit({});
        setIsFormOpen(true);
    }
    
    const handleEdit = (unit: Unit) => {
        setEditingUnit(unit);
        setIsFormOpen(true);
    };

    const handleDelete = (unit: Unit) => {
        setDeletingUnit(unit);
    };

    const confirmDelete = async () => {
        if (deletingUnit) {
            // TODO: Add logic to delete associated users or handle them.
            // For now, it only deletes the unit from the 'units' collection.
            await updateUnits(units.filter(u => u.id !== deletingUnit.id));
            toast({
                title: "Thành công!",
                description: `Đã xóa đơn vị "${deletingUnit.name}".`,
            });
            setDeletingUnit(null);
        }
    };

    const handleSave = async (unitToSave: Partial<Unit>) => {
        if (unitToSave.id) {
            await updateUnits(units.map(u => u.id === unitToSave.id ? { ...u, ...unitToSave } as Unit : u));
             toast({ title: "Thành công!", description: "Đã cập nhật thông tin đơn vị."});
        } else {
            const newUnit = {
                ...unitToSave,
                id: `DVI${String(Date.now()).slice(-6)}`,
                name: unitToSave.name || '',
                type: 'commune', // Default type, should be improved
                parentId: '', // Should be improved
                address: unitToSave.address || '',
                headquarters: unitToSave.headquarters || '',
            } as Unit;
            await updateUnits([...units, newUnit]);
            toast({ title: "Thành công!", description: "Đã tạo đơn vị mới."});
        }
        setIsFormOpen(false);
        setEditingUnit(null);
    }

    const handleCancel = () => {
        setIsFormOpen(false);
        setEditingUnit(null);
    }
    
    const handleImport = async (data: UnitAndUserImport[]) => {
        setIsImportOpen(false);
        toast({ title: "Đang tiến hành import...", description: `Hệ thống đang xử lý ${data.length} dòng.` });

        const result = await importUnitsAndUsers(data);
        
        if (result.successCount > 0) {
             toast({
                title: "Import thành công!",
                description: `Đã thêm ${result.successCount} đơn vị và người dùng mới.`,
            });
        }
        if (result.errorCount > 0) {
            // Join all errors with a line break for better readability in the toast
            const errorDetails = result.errors.join('\n');
            toast({
                variant: 'destructive',
                title: `Import có lỗi! (${result.errorCount} dòng thất bại)`,
                description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white whitespace-pre-wrap">{errorDetails}</code></pre>,
                duration: 20000, // Increase duration for readability
            });
             console.error("Import errors:", result.errors);
        }

        await refreshData();
    }


  return (
    <>
    <PageHeader title="Quản lý Đơn vị" description="Quản lý danh sách các đơn vị cấp xã trong hệ thống."/>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="relative flex-1 md:grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm đơn vị..."
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                </Button>
                <Button onClick={handleNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm Đơn vị
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên đơn vị</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead>Trụ sở hiện nay</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {communeUnits.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">{unit.name}</TableCell>
                <TableCell>{unit.address}</TableCell>
                <TableCell>{unit.headquarters}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEdit(unit)}>Sửa</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(unit)} className="text-destructive">
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Hiển thị <strong>{communeUnits.length}</strong> trên <strong>{units.filter(u => u.type === 'commune').length}</strong> đơn vị
        </div>
      </CardFooter>
    </Card>

    <Dialog open={isFormOpen} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
    }}>
      <DialogContent>
        {editingUnit && <UnitForm unit={editingUnit} onSave={handleSave} onCancel={handleCancel} />}
      </DialogContent>
    </Dialog>

    <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
            <ImportDialog onImport={handleImport} onCancel={() => setIsImportOpen(false)} />
        </DialogContent>
    </Dialog>

    <AlertDialog open={!!deletingUnit} onOpenChange={(open) => !open && setDeletingUnit(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                <AlertDialogDescription>
                    Bạn có chắc chắn muốn xóa đơn vị <strong>{deletingUnit?.name}</strong>?
                    Hành động này không thể hoàn tác.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingUnit(null)}>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Xác nhận Xóa</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
