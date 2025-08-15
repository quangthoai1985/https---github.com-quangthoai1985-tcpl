
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
import { useData } from '@/context/DataContext';
import { Switch } from '@/components/ui/switch';
import type { AssessmentPeriod } from '@/lib/data';
import PageHeader from '@/components/layout/page-header';

function PeriodForm({ period, onSave, onCancel }: { period: Partial<AssessmentPeriod>, onSave: (p: Partial<AssessmentPeriod>) => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState(period);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{period.id ? 'Chỉnh sửa đợt đánh giá' : 'Tạo đợt đánh giá mới'}</DialogTitle>
        <DialogDescription>
          {period.id ? 'Cập nhật thông tin cho đợt đánh giá này.' : 'Điền thông tin để tạo đợt đánh giá mới.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Tên đợt đánh giá</Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="startDate" className="text-right">Ngày bắt đầu</Label>
          <Input id="startDate" value={formData.startDate || ''} onChange={handleChange} className="col-span-3" placeholder="DD/MM/YYYY" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="endDate" className="text-right">Ngày kết thúc</Label>
          <Input id="endDate" value={formData.endDate || ''} onChange={handleChange} className="col-span-3" placeholder="DD/MM/YYYY" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button type="submit" onClick={() => onSave(formData)}>{period.id ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
      </DialogFooter>
    </>
  );
}


export default function AssessmentPeriodPage() {
    const { assessmentPeriods, setAssessmentPeriods } = useData();
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingPeriod, setEditingPeriod] = React.useState<Partial<AssessmentPeriod> | null>(null);
    const { toast } = useToast();

    const handleNew = () => {
        setEditingPeriod({});
        setIsFormOpen(true);
    }
    
    const handleEdit = (period: AssessmentPeriod) => {
        setEditingPeriod(period);
        setIsFormOpen(true);
    };

    const handleSave = (periodToSave: Partial<AssessmentPeriod>) => {
        if (periodToSave.id) {
            setAssessmentPeriods(prev => prev.map(p => p.id === periodToSave.id ? { ...p, ...periodToSave } as AssessmentPeriod : p));
            toast({ title: "Thành công!", description: "Đã cập nhật thông tin đợt đánh giá."});
        } else {
            const newPeriod = {
                id: `DOT${String(assessmentPeriods.length + 1).padStart(3, '0')}`,
                name: periodToSave.name || '',
                startDate: periodToSave.startDate || '',
                endDate: periodToSave.endDate || '',
                isActive: false,
            } as AssessmentPeriod;
            setAssessmentPeriods(prev => [...prev, newPeriod]);
            toast({ title: "Thành công!", description: "Đã tạo đợt đánh giá mới."});
        }
        setIsFormOpen(false);
        setEditingPeriod(null);
    }

    const handleCancel = () => {
        setIsFormOpen(false);
        setEditingPeriod(null);
    }
    
    const handleStatusToggle = (periodId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        
        // Ensure only one period is active at a time
        setAssessmentPeriods(prevPeriods => {
            return prevPeriods.map(p => {
                if (p.id === periodId) {
                    return { ...p, isActive: newStatus };
                }
                // If we are activating a new period, deactivate all others.
                if (newStatus === true) {
                    return { ...p, isActive: false };
                }
                return p;
            });
        });

        toast({
            title: "Cập nhật thành công",
            description: `Đã ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} đợt đánh giá.`
        });
    }

  return (
    <>
    <PageHeader title="Quản lý Đợt đánh giá" description="Tạo và quản lý các kỳ đánh giá trong năm. Chỉ một đợt được hoạt động tại một thời điểm."/>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-end">
             <Button onClick={handleNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Thêm Đợt đánh giá
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên đợt đánh giá</TableHead>
              <TableHead>Ngày bắt đầu</TableHead>
              <TableHead>Ngày kết thúc</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Kích hoạt</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessmentPeriods.map((period) => (
              <TableRow key={period.id}>
                <TableCell className="font-medium">{period.name}</TableCell>
                <TableCell>{period.startDate}</TableCell>
                <TableCell>{period.endDate}</TableCell>
                <TableCell>
                    <Badge variant={period.isActive ? 'default' : 'secondary'} className={period.isActive ? 'bg-green-600' : ''}>
                        {period.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                    </Badge>
                </TableCell>
                <TableCell>
                    <Switch
                        checked={period.isActive}
                        onCheckedChange={() => handleStatusToggle(period.id, period.isActive)}
                    />
                </TableCell>
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
                      <DropdownMenuItem onClick={() => handleEdit(period)}>Sửa</DropdownMenuItem>
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
          Hiển thị <strong>1-{assessmentPeriods.length}</strong> trên <strong>{assessmentPeriods.length}</strong> đợt
        </div>
      </CardFooter>
    </Card>

    <Dialog open={isFormOpen} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
    }}>
      <DialogContent>
        {editingPeriod && <PeriodForm period={editingPeriod} onSave={handleSave} onCancel={handleCancel} />}
      </DialogContent>
    </Dialog>
    </>
  );
}
