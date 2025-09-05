
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
import { MoreHorizontal, PlusCircle, CornerDownRight, Info } from 'lucide-react';
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
import type { Criterion, Indicator, SubIndicator } from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// ====================================================================
// SPECIAL FORM FOR CRITERION 1
// ====================================================================
function Criterion1Form({ criterion, onSave, onCancel }: { criterion: Criterion, onSave: (c: Criterion) => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState<Criterion>(criterion);

  const handleSharedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const numericValue = value === '' ? undefined : Number(value);
    setFormData(prev => ({ ...prev, [id]: numericValue }));
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setFormData(prev => ({ ...prev, effectiveDate: e.target.value }));
  }

  const handleIndicatorChange = (indicatorId: string, field: 'description' | 'standardLevel', value: string) => {
      setFormData(prev => ({
          ...prev,
          indicators: prev.indicators.map(ind => 
              ind.id === indicatorId ? { ...ind, [field]: value } : ind
          )
      }));
  }
  
  const getIndicator = (id: string) => formData.indicators.find(i => i.id === id);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cấu hình chi tiết cho: {criterion.name}</DialogTitle>
        <DialogDescription>
          Thiết lập các thông số chung cho Tiêu chí 1 và các yêu cầu cụ thể cho từng chỉ tiêu con.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
        <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600"/>
            <AlertTitle className="text-blue-800">Cấu hình chung</AlertTitle>
            <AlertDescription className="text-blue-900">
                Các thông số này sẽ được áp dụng chung cho tất cả các chỉ tiêu 1.1, 1.2, và 1.3.
            </AlertDescription>
        </Alert>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="assignedDocumentsCount" className="text-right">Số lượng VBQPPL được giao</Label>
          <Input id="assignedDocumentsCount" type="number" value={formData.assignedDocumentsCount || ''} onChange={handleSharedChange} className="col-span-3" placeholder="Ví dụ: 5"/>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="issuanceDeadlineDays" className="text-right">Thời hạn ban hành (ngày)</Label>
          <Input id="issuanceDeadlineDays" type="number" value={formData.issuanceDeadlineDays || ''} onChange={handleSharedChange} className="col-span-3" placeholder="Ví dụ: 30"/>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="effectiveDate" className="text-right">Ngày bắt đầu áp dụng</Label>
          <Input id="effectiveDate" type="text" value={formData.effectiveDate || ''} onChange={handleDateChange} className="col-span-3" placeholder="DD/MM/YYYY"/>
        </div>

        <Separator className="my-4"/>

        {/* --- Indicator 1.1 --- */}
        <div className="grid gap-4 p-4 rounded-md border">
            <h4 className="font-semibold">Chỉ tiêu 1.1: {getIndicator('TC1_CT1')?.name}</h4>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="desc-1.1" className="text-right pt-2">Mô tả yêu cầu</Label>
              <Textarea id="desc-1.1" value={getIndicator('TC1_CT1')?.description || ''} onChange={(e) => handleIndicatorChange('TC1_CT1', 'description', e.target.value)} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="std-1.1" className="text-right">Yêu cầu tỷ lệ đạt (%)</Label>
              <Input id="std-1.1" type="number" value={getIndicator('TC1_CT1')?.standardLevel || ''} onChange={(e) => handleIndicatorChange('TC1_CT1', 'standardLevel', e.target.value)} className="col-span-3" placeholder="Mặc định: 100"/>
            </div>
        </div>
        
         {/* --- Indicator 1.2 --- */}
        <div className="grid gap-4 p-4 rounded-md border">
            <h4 className="font-semibold">Chỉ tiêu 1.2: {getIndicator('TC1_CT2')?.name}</h4>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="desc-1.2" className="text-right pt-2">Mô tả yêu cầu</Label>
              <Textarea id="desc-1.2" value={getIndicator('TC1_CT2')?.description || ''} onChange={(e) => handleIndicatorChange('TC1_CT2', 'description', e.target.value)} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="std-1.2" className="text-right">Yêu cầu tỷ lệ minh chứng (%)</Label>
              <Input id="std-1.2" type="number" value={getIndicator('TC1_CT2')?.standardLevel || ''} onChange={(e) => handleIndicatorChange('TC1_CT2', 'standardLevel', e.target.value)} className="col-span-3" placeholder="Mặc định: 100"/>
            </div>
        </div>
        
        {/* --- Indicator 1.3 --- */}
        <div className="grid gap-4 p-4 rounded-md border">
            <h4 className="font-semibold">Chỉ tiêu 1.3: {getIndicator('TC1_CT3')?.name}</h4>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="desc-1.3" className="text-right pt-2">Mô tả yêu cầu</Label>
              <Textarea id="desc-1.3" value={getIndicator('TC1_CT3')?.description || ''} onChange={(e) => handleIndicatorChange('TC1_CT3', 'description', e.target.value)} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="std-1.3" className="text-right">Yêu cầu tỷ lệ minh chứng (%)</Label>
              <Input id="std-1.3" type="number" value={getIndicator('TC1_CT3')?.standardLevel || ''} onChange={(e) => handleIndicatorChange('TC1_CT3', 'standardLevel', e.target.value)} className="col-span-3" placeholder="Mặc định: 100"/>
            </div>
        </div>

      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button type="submit" onClick={() => onSave(formData)}>Lưu thay đổi</Button>
      </DialogFooter>
    </>
  );
}


// ====================================================================
// REGULAR FORMS
// ====================================================================

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

function IndicatorForm({ indicator, onSave, onCancel, isSubIndicator = false }: { indicator: Partial<Indicator | SubIndicator>, onSave: (indicator: Partial<Indicator | SubIndicator>) => void, onCancel: () => void, isSubIndicator?: boolean }) {
  const [formData, setFormData] = React.useState(indicator);
  const title = isSubIndicator ? 'chỉ tiêu con' : 'chỉ tiêu';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, inputType: value as Indicator['inputType'] }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{indicator.id ? `Chỉnh sửa ${title}` : `Tạo ${title} mới`}</DialogTitle>
        <DialogDescription>
          {indicator.id ? `Cập nhật thông tin chi tiết cho ${title} này.` : `Điền thông tin để tạo ${title} mới.`}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="name" className="text-right pt-2">Tên</Label>
          <Textarea id="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="description" className="text-right pt-2">Mô tả</Label>
          <Textarea id="description" value={formData.description || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="standardLevel" className="text-right">Mức độ đạt chuẩn</Label>
          <Input id="standardLevel" value={formData.standardLevel || ''} onChange={handleChange} className="col-span-3" placeholder="Ví dụ: '100%', '>=85%', 'Đạt'"/>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="inputType" className="text-right">Loại dữ liệu đầu vào</Label>
          <Select value={(formData as Indicator).inputType} onValueChange={handleSelectChange}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Chọn loại dữ liệu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boolean">Lựa chọn Đạt/Không đạt</SelectItem>
              <SelectItem value="number">Nhập liệu Số</SelectItem>
              <SelectItem value="select">Lựa chọn Nhiều đáp án</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="evidenceRequirement" className="text-right pt-2">Yêu cầu hồ sơ minh chứng</Label>
          <Textarea id="evidenceRequirement" value={(formData as Indicator).evidenceRequirement || ''} onChange={handleChange} className="col-span-3" />
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
  
  const [editingSubIndicator, setEditingSubIndicator] = React.useState<{criterionId: string, indicatorId: string, subIndicator: Partial<SubIndicator>} | null>(null);
  const [addingSubIndicatorTo, setAddingSubIndicatorTo] = React.useState<{criterionId: string, indicatorId: string} | null>(null);

  const { toast } = useToast();
  
  const handleEditCriterion = (criterion: Criterion) => setEditingCriterion(criterion);
  const handleCancelEditCriterion = () => { setEditingCriterion(null); setAddingCriterion(false); }

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
    setEditingCriterion(null);
    setAddingCriterion(false);
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
            indicators: c.indicators.map(i => i.id === indicatorToSave.id ? { ...i, ...indicatorToSave } as Indicator : i)
          }
        }
        return c;
      });
      toast({ title: "Thành công!", description: "Đã cập nhật thông tin chỉ tiêu."});
    } else if (addingIndicatorTo) { // Adding new indicator
       const newIndicator: Indicator = {
        id: `CT${Date.now().toString().slice(-6)}`,
        name: indicatorToSave.name || "Chỉ tiêu mới",
        description: indicatorToSave.description || "",
        standardLevel: indicatorToSave.standardLevel || "",
        inputType: indicatorToSave.inputType || "boolean",
        evidenceRequirement: indicatorToSave.evidenceRequirement || "",
        subIndicators: []
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
  
  const handleAddSubIndicator = (criterionId: string, indicatorId: string) => setAddingSubIndicatorTo({criterionId, indicatorId});
  const handleEditSubIndicator = (criterionId: string, indicatorId: string, subIndicator: SubIndicator) => setEditingSubIndicator({criterionId, indicatorId, subIndicator});
  const handleCancelEditSubIndicator = () => { setEditingSubIndicator(null); setAddingSubIndicatorTo(null); };

  const handleSaveSubIndicator = async (subIndicatorToSave: Partial<SubIndicator>) => {
      let newCriteria: Criterion[] = [];
      
      if (editingSubIndicator) { // Editing existing sub-indicator
        newCriteria = criteria.map(c => {
            if (c.id === editingSubIndicator.criterionId) {
                return {
                    ...c,
                    indicators: c.indicators.map(i => {
                        if (i.id === editingSubIndicator.indicatorId) {
                            return {
                                ...i,
                                subIndicators: (i.subIndicators || []).map(si => si.id === subIndicatorToSave.id ? { ...si, ...subIndicatorToSave} as SubIndicator : si)
                            }
                        }
                        return i;
                    })
                }
            }
            return c;
        });
        toast({ title: "Thành công!", description: "Đã cập nhật chỉ tiêu con."});

      } else if (addingSubIndicatorTo) { // Adding new sub-indicator
        const newSubIndicator: SubIndicator = {
            id: `CTC${Date.now().toString().slice(-6)}`,
            name: subIndicatorToSave.name || "Chỉ tiêu con mới",
            description: subIndicatorToSave.description || "",
            standardLevel: subIndicatorToSave.standardLevel || "",
            inputType: (subIndicatorToSave as Indicator).inputType || "boolean",
            evidenceRequirement: (subIndicatorToSave as Indicator).evidenceRequirement || "",
        };

        newCriteria = criteria.map(c => {
            if (c.id === addingSubIndicatorTo.criterionId) {
                return {
                    ...c,
                    indicators: c.indicators.map(i => {
                        if (i.id === addingSubIndicatorTo.indicatorId) {
                            return { ...i, subIndicators: [...(i.subIndicators || []), newSubIndicator] };
                        }
                        return i;
                    })
                };
            }
            return c;
        });
        toast({ title: "Thành công!", description: "Đã thêm chỉ tiêu con mới." });
      }

      if (newCriteria.length > 0) {
          await updateCriteria(newCriteria);
      }
      handleCancelEditSubIndicator();
  }


  return (
    <>
    <PageHeader title="Bộ Tiêu chí Đánh giá" description="Quản lý các tiêu chí và chỉ tiêu để đánh giá xã đạt chuẩn tiếp cận pháp luật."/>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-end">
          <Button onClick={() => setAddingCriterion(true)}>
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
                <div className="flex items-center gap-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
                      <DropdownMenuItem onClick={() => handleEditCriterion(criterion)}>Sửa tiêu chí</DropdownMenuItem>
                      {criterion.id !== 'TC1' && (
                        <DropdownMenuItem onClick={() => handleAddIndicator(criterion.id)}>Thêm chỉ tiêu</DropdownMenuItem>
                      )}
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
                  {criterion.indicators.map((indicator) => (
                    <div
                      key={indicator.id}
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
                                <DropdownMenuItem onClick={() => handleAddSubIndicator(criterion.id, indicator.id)}>Thêm chỉ tiêu con</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                    Xóa chỉ tiêu
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      
                        <p className="text-sm text-muted-foreground">{indicator.description}</p>
                        
                        <div className="mt-4 pl-6 space-y-4 border-l-2 border-dashed">
                            {(indicator.subIndicators || []).map(sub => (
                                <div key={sub.id} className="grid gap-3 rounded-md border bg-card p-4 shadow-sm relative">
                                    <CornerDownRight className="absolute -left-9 top-6 h-5 w-5 text-muted-foreground"/>
                                    <div className="flex justify-between items-start">
                                        <h5 className="font-semibold text-base flex-1 pr-4">{sub.name}</h5>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className='h-8 w-8 flex-shrink-0'>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleEditSubIndicator(criterion.id, indicator.id, sub)}>Sửa chỉ tiêu con</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive">
                                                Xóa chỉ tiêu con
                                            </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{sub.description}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                        <div><strong>Mức độ đạt chuẩn:</strong> <Badge variant="outline">{sub.standardLevel}</Badge></div>
                                        <div><strong>Loại dữ liệu:</strong> <Badge variant="outline">{sub.inputType}</Badge></div>
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Yêu cầu hồ sơ minh chứng:</p>
                                        <p className="text-sm text-muted-foreground">{sub.evidenceRequirement}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>

    <Dialog open={addingCriterion || (!!editingCriterion && editingCriterion.id !== 'TC1')} onOpenChange={(open) => !open && handleCancelEditCriterion()}>
      <DialogContent>
        {(addingCriterion || (editingCriterion && editingCriterion.id !== 'TC1')) && (
          <CriterionForm
            criterion={editingCriterion || {}}
            onSave={handleSaveCriterion}
            onCancel={handleCancelEditCriterion}
          />
        )}
      </DialogContent>
    </Dialog>

    <Dialog open={!!editingCriterion && editingCriterion.id === 'TC1'} onOpenChange={(open) => !open && handleCancelEditCriterion()}>
        <DialogContent className="max-w-3xl">
            {editingCriterion && editingCriterion.id === 'TC1' && (
                <Criterion1Form
                    criterion={editingCriterion as Criterion}
                    onSave={handleSaveCriterion as (c: Criterion) => void}
                    onCancel={handleCancelEditCriterion}
                />
            )}
        </DialogContent>
    </Dialog>

    <Dialog open={!!editingIndicator || !!addingIndicatorTo} onOpenChange={(open) => !open && handleCancelEditIndicator()}>
        <DialogContent className="max-w-2xl">
            {(editingIndicator || addingIndicatorTo) && (
                <IndicatorForm 
                    indicator={editingIndicator?.indicator || {}}
                    onSave={handleSaveIndicator}
                    onCancel={handleCancelEditIndicator}
                />
            )}
        </DialogContent>
    </Dialog>
    
    <Dialog open={!!editingSubIndicator || !!addingSubIndicatorTo} onOpenChange={(open) => !open && handleCancelEditSubIndicator()}>
        <DialogContent className="max-w-2xl">
            {(editingSubIndicator || addingSubIndicatorTo) && (
                <IndicatorForm 
                    indicator={editingSubIndicator?.subIndicator || {}}
                    onSave={handleSaveSubIndicator}
                    onCancel={handleCancelEditSubIndicator}
                    isSubIndicator={true}
                />
            )}
        </DialogContent>
    </Dialog>

    </>
  );
}
