
'use client';

import React from 'react';
import {
  MoreHorizontal,
  PlusCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import type { Unit } from '@/lib/data';


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


export default function UnitManagementPage() {
    const { units, setUnits } = useData();
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingUnit, setEditingUnit] = React.useState<Partial<Unit> | null>(null);
    const [deletingUnit, setDeletingUnit] = React.useState<Unit | null>(null);
    const { toast } = useToast();

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

    const confirmDelete = () => {
        if (deletingUnit) {
            setUnits(units.filter(u => u.id !== deletingUnit.id));
            toast({
                title: "Thành công!",
                description: `Đã xóa đơn vị "${deletingUnit.name}".`,
            });
            setDeletingUnit(null);
        }
    };

    const handleSave = (unitToSave: Partial<Unit>) => {
        if (unitToSave.id) {
            setUnits(units.map(u => u.id === unitToSave.id ? { ...u, ...unitToSave } as Unit : u));
             toast({ title: "Thành công!", description: "Đã cập nhật thông tin đơn vị."});
        } else {
            const newUnit = {
                ...unitToSave,
                id: `DVI${String(units.length + 1).padStart(3, '0')}`,
                name: unitToSave.name || '',
                address: unitToSave.address || '',
                headquarters: unitToSave.headquarters || '',
            } as Unit;
            setUnits([...units, newUnit]);
            toast({ title: "Thành công!", description: "Đã tạo đơn vị mới."});
        }
        setIsFormOpen(false);
        setEditingUnit(null);
    }

    const handleCancel = () => {
        setIsFormOpen(false);
        setEditingUnit(null);
    }


  return (
    <>
    <PageHeader title="Quản lý Đơn vị" description="Quản lý danh sách các đơn vị trong hệ thống."/>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-end">
             <Button onClick={handleNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Thêm Đơn vị
            </Button>
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
            {units.map((unit) => (
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
          Hiển thị <strong>1-{units.length}</strong> trên <strong>{units.length}</strong> đơn vị
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
