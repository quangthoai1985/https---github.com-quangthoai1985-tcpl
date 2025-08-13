
'use client';

import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { criteria as initialCriteria } from '@/lib/data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';


type Indicator = {
  id: string;
  name: string;
  type: 'Boolean' | 'Percentage' | 'Numeric' | 'Checklist';
};

type Criterion = {
  id: string;
  name: string;
  indicators: Indicator[];
};

function IndicatorForm({ indicator, onSave, onCancel }: { indicator: Partial<Indicator>, onSave: (indicator: Partial<Indicator>) => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState(indicator);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, type: value as Indicator['type'] }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{indicator.id ? 'Chỉnh sửa chỉ tiêu' : 'Tạo chỉ tiêu mới'}</DialogTitle>
        <DialogDescription>
          {indicator.id ? 'Cập nhật thông tin chi tiết cho chỉ tiêu này.' : 'Điền thông tin để tạo chỉ tiêu mới.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Tên chỉ tiêu</Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">Loại chỉ tiêu</Label>
          <Select value={formData.type} onValueChange={handleSelectChange}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Chọn loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Boolean">Đạt/Không đạt</SelectItem>
              <SelectItem value="Percentage">Tỷ lệ %</SelectItem>
              <SelectItem value="Numeric">Số lượng</SelectItem>
              <SelectItem value="Checklist">Danh mục kiểm tra</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button type="submit" onClick={() => onSave(formData)}>{indicator.id ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
      </DialogFooter>
    </>
  );
}


export default function CriteriaManagementPage() {
  const [criteria, setCriteria] = React.useState<Criterion[]>(initialCriteria);
  const [editingIndicator, setEditingIndicator] = React.useState<{criterionId: string, indicator: Partial<Indicator>} | null>(null);
  const { toast } = useToast();

  const getIndicatorTypeLabel = (type: string) => {
    switch (type) {
      case 'Boolean':
        return 'Đạt/Không đạt';
      case 'Percentage':
        return 'Tỷ lệ %';
      case 'Numeric':
        return 'Số lượng';
      case 'Checklist':
        return 'Danh mục kiểm tra';
      default:
        return 'Không xác định';
    }
  };

  const handleEditIndicator = (criterionId: string, indicator: Indicator) => {
    setEditingIndicator({ criterionId, indicator });
  };
  
  const handleCancelEdit = () => {
    setEditingIndicator(null);
  };

  const handleSaveIndicator = (indicatorToSave: Partial<Indicator>) => {
    if (editingIndicator) {
      setCriteria(prevCriteria => 
        prevCriteria.map(c => {
          if (c.id === editingIndicator.criterionId) {
            return {
              ...c,
              indicators: c.indicators.map(i => i.id === indicatorToSave.id ? { ...i, ...indicatorToSave } as Indicator : i)
            }
          }
          return c;
        })
      );
      toast({ title: "Thành công!", description: "Đã cập nhật thông tin chỉ tiêu."});
      setEditingIndicator(null);
    }
  };


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bộ Tiêu chí Đánh giá</CardTitle>
            <CardDescription>
              Quản lý các tiêu chí và chỉ tiêu để đánh giá xã đạt chuẩn tiếp cận
              pháp luật.
            </CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm Tiêu chí mới
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={criteria.map((c) => c.id)} className="w-full">
          {criteria.map((criterion, index) => (
            <AccordionItem value={criterion.id} key={criterion.id}>
              <div className="flex items-center justify-between pr-4 hover:bg-muted/50 rounded-lg">
                <AccordionTrigger className="text-lg font-headline hover:no-underline flex-1 px-4 py-0">
                    <span>
                      Tiêu chí {index + 1}: {criterion.name.replace(`Tiêu chí ${index + 1}: `, '')}
                    </span>
                </AccordionTrigger>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <Badge variant="secondary" className="mr-4">
                    {criterion.indicators.length} chỉ tiêu
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                      <DropdownMenuItem>Sửa tiêu chí</DropdownMenuItem>
                      <DropdownMenuItem>Thêm chỉ tiêu</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Xóa tiêu chí
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <AccordionContent>
                <div className="space-y-4 pl-8 pr-4">
                  {criterion.indicators.map((indicator) => (
                    <div
                      key={indicator.id}
                      className="flex items-center justify-between rounded-md border bg-card p-4 shadow-sm"
                    >
                      <div>
                        <p className="font-semibold">{indicator.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Loại: {getIndicatorTypeLabel(indicator.type)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditIndicator(criterion.id, indicator)}>Sửa chỉ tiêu</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Xóa chỉ tiêu
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>

    <Dialog open={!!editingIndicator} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent>
            {editingIndicator && (
                <IndicatorForm 
                    indicator={editingIndicator.indicator}
                    onSave={handleSaveIndicator}
                    onCancel={handleCancelEdit}
                />
            )}
        </DialogContent>
    </Dialog>
    </>
  );
}
