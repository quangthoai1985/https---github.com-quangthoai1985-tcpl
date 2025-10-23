

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
  CardHeader,
} from '@/components/ui/card';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/layout/page-header';
import { useData } from '@/context/DataContext';
import type { Criterion, Indicator } from '@/lib/data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import Criterion1Config from './Criterion1Config';
import CT4Content1Config from './CT4Content1Config';


function CriterionForm({ criterion, onSave, onCancel }: { criterion: Partial<Criterion>, onSave: (criterion: Partial<Criterion>) => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState(criterion);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{criterion.id ? 'Chỉnh sửa tiêu chí' : 'Tạo tiêu chí mới'}</DialogTitle>
        <DialogDescription>
          {criterion.id ? 'Cập nhật thông tin chi tiết cho tiêu chí này.' : 'Điền thông tin để tạo tiêu chí mới.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Tên tiêu chí</Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" />
        </div>
         <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="description" className="text-right pt-2">Mô tả</Label>
          <Textarea id="description" value={formData.description || ''} onChange={handleChange} className="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button type="submit" onClick={() => onSave(formData)}>{criterion.id ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
      </DialogFooter>
    </>
  );
}

function IndicatorForm({ indicator, onSave, onCancel }: { indicator: Partial<Indicator>, onSave: (indicator: Partial<Indicator>) => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState(indicator as Indicator);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  return (
    <>
      <DialogHeader>
        <DialogTitle>{indicator.id ? `Chỉnh sửa chỉ tiêu` : `Tạo chỉ tiêu mới`}</DialogTitle>
        <DialogDescription>
          {indicator.id ? `Cập nhật thông tin chi tiết cho chỉ tiêu này.` : `Điền thông tin để tạo chỉ tiêu mới.`}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="name" className="text-right pt-2">Tên</Label>
          <Textarea id="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" />
        </div>
        
        {/* Thêm các ô input này vào IndicatorForm */}
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="description" className="text-right pt-2">Mô tả</Label>
          <Textarea id="description" value={formData.description || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="inputType" className="text-right">Loại dữ liệu</Label>
            <Select value={formData.inputType || 'boolean'} onValueChange={(value) => setFormData(prev => ({ ...prev, inputType: value as any}))}>
                <SelectTrigger id="inputType" className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="boolean">Lựa chọn Đạt/Không đạt</SelectItem>
                    <SelectItem value="number">Nhập liệu số</SelectItem>
                    <SelectItem value="select">Lựa chọn nhiều mục</SelectItem>
                    <SelectItem value="text">Nhập liệu văn bản</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="standardLevel" className="text-right">Yêu cầu đạt chuẩn</Label>
            <Input id="standardLevel" value={formData.standardLevel || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="evidenceRequirement" className="text-right pt-2">Yêu cầu hồ sơ minh chứng</Label>
            <Textarea id="evidenceRequirement" value={formData.evidenceRequirement || ''} onChange={handleChange} className="col-span-3" placeholder="Ví dụ: Quyết định, Kế hoạch, Báo cáo..."/>
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
  const { criteria, updateCriteria } = useData();
  const [editingCriterion, setEditingCriterion] = React.useState<Partial<Criterion> | null>(null);
  const [addingCriterion, setAddingCriterion] = React.useState<boolean>(false);
  const [editingIndicator, setEditingIndicator] = React.useState<{criterionId: string, indicator: Partial<Indicator>} | null>(null);
  const [addingIndicatorTo, setAddingIndicatorTo] = React.useState<string | null>(null);

  const { toast } = useToast();
  
  const handleEditCriterion = (criterion: Criterion) => {
    setEditingCriterion(criterion);
  };

  const handleCancelEditCriterion = () => { 
      setEditingCriterion(null); 
      setAddingCriterion(false); 
  }

  const handleSaveCriterion = async (criterionToSave: Partial<Criterion>) => {
    if (criterionToSave.id) {
        await updateCriteria(
            criteria.map(c => 
                c.id === criterionToSave.id ? { ...c, ...criterionToSave } as Criterion : c
            )
        );
        toast({ title: "Thành công!", description: "Đã cập nhật thông tin tiêu chí."});
    } else {
        const newCriterion: Criterion = {
            id: `TC${Date.now().toString().slice(-6)}`,
            name: criterionToSave.name || "Tiêu chí mới",
            description: criterionToSave.description || "",
            indicators: []
        };
        await updateCriteria([...criteria, newCriterion]);
        toast({ title: "Thành công!", description: "Đã thêm tiêu chí mới." });
    }
    handleCancelEditCriterion();
  };
  
  const handleAddIndicator = (criterionId: string) => setAddingIndicatorTo(criterionId);
  const handleEditIndicator = (criterionId: string, indicator: Indicator) => setEditingIndicator({ criterionId, indicator });
  const handleCancelEditIndicator = () => { setEditingIndicator(null); setAddingIndicatorTo(null); };

  const handleSaveIndicator = async (indicatorToSave: Partial<Indicator>) => {
    let newCriteria: Criterion[] = [];

    if (editingIndicator) { // Editing existing indicator
      newCriteria = criteria.map(c => {
        if (c.id === editingIndicator.criterionId) {
          return {
            ...c,
            indicators: c.indicators.map(i => 
                i.id === indicatorToSave.id ? 
                { ...i, ...indicatorToSave } as Indicator // Cập nhật đơn giản
                : i 
            )
          }
        }
        return c;
      });
      toast({ title: "Thành công!", description: "Đã cập nhật thông tin chỉ tiêu."});
    } else if (addingIndicatorTo) { // Adding new indicator
       const newIndicator: Indicator = {
        id: `CT${Date.now().toString().slice(-6)}`,
        name: indicatorToSave.name || "Chỉ tiêu mới",
        description: indicatorToSave.description || "", // Thêm lại
        standardLevel: indicatorToSave.standardLevel || "", // Thêm lại
        inputType: indicatorToSave.inputType || "boolean", // Thêm lại
        evidenceRequirement: indicatorToSave.evidenceRequirement || "", // Thêm lại
    };

      newCriteria = criteria.map(c => {
        if (c.id === addingIndicatorTo) {
          return {
            ...c,
            indicators: [...c.indicators, newIndicator]
          }
        }
        return c;
      });
      toast({ title: "Thành công!", description: "Đã thêm chỉ tiêu mới." });
    }

    if (newCriteria.length > 0) {
        await updateCriteria(newCriteria);
    }
    handleCancelEditIndicator();
  };

  return (
    <>
    <PageHeader title="Bộ Tiêu chí Đánh giá" description="Quản lý các tiêu chí và chỉ tiêu để đánh giá xã đạt chuẩn tiếp cận pháp luật."/>
    <Card>
      <CardHeader>
        {/* The "Add New Criterion" button has been removed as per the user's request. */}
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
                <div className="flex items-center gap-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Badge variant="secondary" className="mr-4">
                    {criterion.indicators?.length ?? 0} chỉ tiêu
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEditCriterion(criterion)}>Sửa tiêu chí</DropdownMenuItem>
                      {/* "Add Indicator" option removed as per request */}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Xóa tiêu chí
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <AccordionContent>
                <div className="space-y-4 pl-8 pr-4 py-4">
                  {index === 0 && (
                      <Criterion1Config 
                          criterion={criterion} 
                          onSave={(updatedCriterion) => updateCriteria(criteria.map(c => c.id === updatedCriterion.id ? updatedCriterion : c))} 
                      />
                  )}
                  {(criterion.indicators ?? []).map((indicator) => (
                    <React.Fragment key={indicator.id}>
                        {/* Luôn render dòng hiển thị chỉ tiêu thông thường */}
                        <div
                          className="grid gap-3 rounded-md border bg-card p-4 shadow-sm"
                        >
                            <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-base flex-1 pr-4">{indicator.name}</h4>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className='h-8 w-8 flex-shrink-0'>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleEditIndicator(criterion.id, indicator)}>Sửa chỉ tiêu</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive">
                                        Xóa chỉ tiêu
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
            
                        {/* CHỈ RENDER KHUNG CẤU HÌNH NẾU ĐÂY LÀ CHỈ TIÊU 4 */}
                        {indicator.id === 'CT033278' && (
                            <CT4Content1Config
                                criterion={criterion}
                                onSave={(updatedCriterion) => updateCriteria(criteria.map(c => c.id === updatedCriterion.id ? updatedCriterion : c))}
                            />
                        )}
                    </React.Fragment>
                ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>

    <Dialog open={addingCriterion || !!editingCriterion} onOpenChange={(open) => !open && handleCancelEditCriterion()}>
      <DialogContent>
        {(addingCriterion || editingCriterion) && (
          <CriterionForm
            criterion={editingCriterion || {}}
            onSave={handleSaveCriterion}
            onCancel={handleCancelEditCriterion}
          />
        )}
      </DialogContent>
    </Dialog>
    
    <Dialog open={!!editingIndicator || !!addingIndicatorTo} onOpenChange={(open) => !open && handleCancelEditIndicator()}>
        <DialogContent className="max-w-3xl">
            {(editingIndicator || addingIndicatorTo) && (
                <IndicatorForm 
                    indicator={editingIndicator?.indicator || {}}
                    onSave={handleSaveIndicator}
                    onCancel={handleCancelEditIndicator}
                />
            )}
        </DialogContent>
    </Dialog>
    </>
  );
}
