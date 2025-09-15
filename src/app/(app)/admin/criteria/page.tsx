

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
import { MoreHorizontal, PlusCircle, CornerDownRight, Info, Calendar as CalendarIcon, Save } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


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

function Criterion1Config({ criterion, onSave }: { criterion: Criterion, onSave: (criterion: Criterion) => void }) {
    const [formData, setFormData] = React.useState<Criterion>(criterion);
    const { toast } = useToast();

    const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = e.target.value === '' ? 0 : Number(e.target.value);
        const newCount = Math.max(0, count);

        setFormData(prev => {
            const currentDocuments = prev.documents || [];
            const newDocuments = Array.from({ length: newCount }, (_, i) => {
                return currentDocuments[i] || { name: '', issueDate: '', excerpt: '', issuanceDeadlineDays: 30 };
            });
            return {
                ...prev,
                assignedDocumentsCount: newCount,
                documents: newDocuments
            };
        });
    };
    
    const handleDocumentChange = (index: number, field: 'name' | 'issueDate' | 'excerpt' | 'issuanceDeadlineDays', value: string | number) => {
        setFormData(prev => {
            const newDocuments = [...(prev.documents || [])];
            if (newDocuments[index]) {
                (newDocuments[index] as any)[field] = value;
            }
            return { ...prev, documents: newDocuments };
        });
    };
    
    const handleSave = () => {
        onSave(formData);
        toast({ title: "Thành công!", description: "Đã lưu cấu hình cho Tiêu chí 1."});
    }

    const handleTypeChange = (value: 'quantity' | 'specific') => {
        setFormData(prev => {
            const newFormData = { ...prev, assignmentType: value };
    
            if (value === 'specific') {
                // Khi chuyển lại sang "Giao cụ thể", tái tạo các form dựa trên số lượng hiện có.
                const count = prev.assignedDocumentsCount || 0;
                const currentDocuments = prev.documents || [];
                newFormData.documents = Array.from({ length: count }, (_, i) => {
                    return currentDocuments[i] || { name: '', issueDate: '', excerpt: '', issuanceDeadlineDays: 30 };
                });
            } else {
                // Khi chuyển sang "Giao theo số lượng", không cần mảng documents chi tiết.
                newFormData.documents = []; 
            }
            
            return newFormData;
        });
    };


    return (
        <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-200 mb-6 space-y-6">
            <h4 className='font-semibold text-primary'>Cấu hình đặc biệt: Giao nhiệm vụ ban hành VBQPPL</h4>
            
            <RadioGroup 
                value={formData.assignmentType || 'specific'} 
                onValueChange={handleTypeChange}
                className="my-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
                <Label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-100 has-[:checked]:border-primary">
                    <RadioGroupItem value="specific" id="r-specific" />
                    Giao nhiệm vụ cụ thể
                </Label>
                <Label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-100 has-[:checked]:border-primary">
                    <RadioGroupItem value="quantity" id="r-quantity" />
                    Giao theo số lượng
                </Label>
            </RadioGroup>

            {/* TRƯỜNG HỢP GIAO CỤ THỂ */}
            {(!formData.assignmentType || formData.assignmentType === 'specific') && (
                <>
                    <div className="grid gap-2">
                        <Label htmlFor="assignedDocumentsCount">Số lượng VBQPPL được giao</Label>
                        <Input id="assignedDocumentsCount" type="number" value={formData.assignedDocumentsCount || ''} onChange={handleCountChange} placeholder="Ví dụ: 5" className="w-48"/>
                        <p className="text-sm text-muted-foreground">Nhập số lượng văn bản để hệ thống tạo ra các trường tương ứng bên dưới.</p>
                    </div>
                    
                    {(formData.documents || []).length > 0 && (
                        <div className="space-y-4 pt-4 border-t">
                            <h5 className="font-medium">Chi tiết các văn bản được giao</h5>
                            {formData.documents?.map((doc, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-10 gap-x-4 gap-y-3 items-start p-3 border rounded-md bg-orange-50 border-orange-300">
                                    <div className="md:col-span-1 flex items-center justify-center pt-2">
                                        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-orange-200 text-orange-800 font-bold text-sm border border-orange-400">
                                            {index + 1}
                                        </div>
                                    </div>
                                    <div className="md:col-span-9 grid gap-1.5">
                                        <Label htmlFor={`doc-name-${index}`} className="text-xs font-semibold text-destructive">Tên văn bản QPPL</Label>
                                        <Input id={`doc-name-${index}`} value={doc.name} onChange={(e) => handleDocumentChange(index, 'name', e.target.value)} placeholder={`Ví dụ: Nghị quyết về việc...`} />
                                    </div>
                                    <div className="md:col-span-1"></div>
                                    <div className="md:col-span-9 grid gap-1.5">
                                        <Label htmlFor={`doc-excerpt-${index}`} className="text-xs font-semibold text-destructive">Trích yếu nội dung</Label>
                                        <Input id={`doc-excerpt-${index}`} value={doc.excerpt} onChange={(e) => handleDocumentChange(index, 'excerpt', e.target.value)} placeholder={`Tóm tắt ngắn gọn nội dung chính...`} />
                                    </div>
                                    <div className="md:col-span-1"></div>
                                    <div className="md:col-span-5 grid gap-1.5">
                                        <Label htmlFor={`doc-issuedate-${index}`} className="text-xs font-semibold text-destructive">Ngày ban hành</Label>
                                        <Input id={`doc-issuedate-${index}`} value={doc.issueDate} onChange={(e) => handleDocumentChange(index, 'issueDate', e.target.value)} placeholder={`DD/MM/YYYY`} />
                                    </div>
                                    <div className="md:col-span-4 grid gap-1.5">
                                        <Label htmlFor={`doc-deadline-${index}`} className="text-xs font-semibold text-destructive">Thời hạn ban hành (ngày)</Label>
                                        <Input id={`doc-deadline-${index}`} type="number" value={doc.issuanceDeadlineDays} onChange={(e) => handleDocumentChange(index, 'issuanceDeadlineDays', Number(e.target.value))} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* TRƯỜNG HỢP GIAO THEO SỐ LƯỢNG */}
            {formData.assignmentType === 'quantity' && (
                <div className="grid gap-2">
                    <Label htmlFor="assignedDocumentsCountQty">Số lượng VBQPPL được giao ban hành trong năm</Label>
                    <Input id="assignedDocumentsCountQty" type="number" value={formData.assignedDocumentsCount || ''} onChange={handleCountChange} placeholder="Ví dụ: 5" className="w-48"/>
                    <p className="text-sm text-muted-foreground">Nhập số lượng văn bản được giao. Để trống nếu muốn xã tự nhập số lượng.</p>
                </div>
            )}

            <div className="flex justify-end mt-4">
                <Button onClick={handleSave} size="sm">
                    <Save className="mr-2 h-4 w-4"/>
                    Lưu Cấu hình Tiêu chí 1
                </Button>
            </div>
        </div>
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
          <Input id="standardLevel" value={formData.standardLevel || ''} onChange={handleChange} className="col-span-3" placeholder="Ví dụ: '>=2', 'Đạt', '100%'"/>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="inputType" className="text-right">Loại dữ liệu đầu vào</Label>
          <Select value={(formData as Indicator).inputType} onValueChange={handleSelectChange}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Chọn loại dữ liệu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boolean">Lựa chọn Đạt/Không đạt</SelectItem>
              <SelectItem value="select">Lựa chọn nhiều mục</SelectItem>
              <SelectItem value="number">Nhập liệu số</SelectItem>
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
                      <DropdownMenuItem onClick={() => handleAddIndicator(criterion.id)}>Thêm chỉ tiêu</DropdownMenuItem>
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
                      
                        <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md">
                           <div className="flex items-start gap-2 text-blue-800">
                               <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                               <div>
                                  <p className="text-sm">{indicator.description}</p>
                                  <p className="text-sm mt-2"><strong>Yêu cầu đạt chuẩn: </strong><span className="font-semibold">{indicator.standardLevel}</span></p>
                               </div>
                           </div>
                        </div>
                        
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
                                    <div className="p-3 bg-blue-50/50 border-l-4 border-blue-300 rounded-r-md">
                                       <div className="flex items-start gap-2 text-blue-800">
                                           <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                                           <div>
                                              <p className="text-sm">{sub.description}</p>
                                              <p className="text-sm mt-2"><strong>Yêu cầu đạt chuẩn: </strong><span className="font-semibold">{sub.standardLevel}</span></p>
                                           </div>
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm mt-2">
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


    

    
