
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
import { Textarea } from '@/components/ui/textarea';


type Indicator = {
  id: string;
  name: string;
  description: string;
  standardLevel: string;
  inputType: 'number' | 'text' | 'boolean' | 'select';
  calculationFormula: string | null;
  evidenceRequirement: string;
};

type Criterion = {
  id: string;
  name: string;
  indicators: Indicator[];
};

function CriterionForm({ criterion, onSave, onCancel }: { criterion: Partial<Criterion>, onSave: (criterion: Partial<Criterion>) => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState(criterion);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button type="submit" onClick={() => onSave(formData)}>{criterion.id ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
      </DialogFooter>
    </>
  );
}

function IndicatorForm({ indicator, onSave, onCancel }: { indicator: Partial<Indicator>, onSave: (indicator: Partial<Indicator>) => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState(indicator);

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
        <DialogTitle>{indicator.id ? 'Chỉnh sửa chỉ tiêu' : 'Tạo chỉ tiêu mới'}</DialogTitle>
        <DialogDescription>
          {indicator.id ? 'Cập nhật thông tin chi tiết cho chỉ tiêu này.' : 'Điền thông tin để tạo chỉ tiêu mới.'}
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
          <Select value={formData.inputType} onValueChange={handleSelectChange}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Chọn loại dữ liệu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Văn bản</SelectItem>
              <SelectItem value="number">Số</SelectItem>
              <SelectItem value="boolean">Đúng/Sai</SelectItem>
              <SelectItem value="select">Lựa chọn</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="calculationFormula" className="text-right">Công thức tính (nếu có)</Label>
          <Input id="calculationFormula" value={formData.calculationFormula || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="evidenceRequirement" className="text-right pt-2">Yêu cầu hồ sơ minh chứng</Label>
          <Textarea id="evidenceRequirement" value={formData.evidenceRequirement || ''} onChange={handleChange} className="col-span-3" />
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

  const handleSaveCriterion = (criterionToSave: Partial<Criterion>) => {
    if (criterionToSave.id) {
        setCriteria(prevCriteria => 
            prevCriteria.map(c => 
                c.id === criterionToSave.id ? { ...c, ...criterionToSave } as Criterion : c
            )
        );
        toast({ title: "Thành công!", description: "Đã cập nhật thông tin tiêu chí."});
    } else {
        const newCriterion: Criterion = {
            id: `TC${Math.random().toString(36).substring(2, 9)}`,
            name: criterionToSave.name || "Tiêu chí mới",
            indicators: []
        };
        setCriteria(prevCriteria => [...prevCriteria, newCriterion]);
        toast({ title: "Thành công!", description: "Đã thêm tiêu chí mới." });
    }
    setEditingCriterion(null);
    setAddingCriterion(false);
  };

  const handleEditIndicator = (criterionId: string, indicator: Indicator) => {
    setEditingIndicator({ criterionId, indicator });
  };
  
  const handleCancelEditIndicator = () => {
    setEditingIndicator(null);
    setAddingIndicatorTo(null);
  };

  const handleSaveIndicator = (indicatorToSave: Partial<Indicator>) => {
    if (editingIndicator) { // Editing existing indicator
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
    } else if (addingIndicatorTo) { // Adding new indicator
       const newIndicator: Indicator = {
        id: `CT${Math.random().toString(36).substring(2, 9)}`,
        name: indicatorToSave.name || "Chỉ tiêu mới",
        description: indicatorToSave.description || "",
        standardLevel: indicatorToSave.standardLevel || "",
        inputType: indicatorToSave.inputType || "text",
        calculationFormula: indicatorToSave.calculationFormula || null,
        evidenceRequirement: indicatorToSave.evidenceRequirement || "",
      };

      setCriteria(prevCriteria => 
        prevCriteria.map(c => {
          if (c.id === addingIndicatorTo) {
            return {
              ...c,
              indicators: [...c.indicators, newIndicator]
            }
          }
          return c;
        })
      );
      toast({ title: "Thành công!", description: "Đã thêm chỉ tiêu mới." });
      setAddingIndicatorTo(null);
    }
  };

  const handleAddIndicator = (criterionId: string) => {
    setAddingIndicatorTo(criterionId);
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
                                <DropdownMenuItem className="text-destructive">
                                    Xóa chỉ tiêu
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      
                        <p className="text-sm text-muted-foreground">{indicator.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div><strong>Mức độ đạt chuẩn:</strong> <Badge variant="outline">{indicator.standardLevel}</Badge></div>
                            <div><strong>Loại dữ liệu:</strong> <Badge variant="outline">{indicator.inputType}</Badge></div>
                            {indicator.calculationFormula && <div><strong>Công thức tính:</strong> <code className="text-xs bg-muted p-1 rounded">{indicator.calculationFormula}</code></div>}
                        </div>
                        
                        <div>
                            <p className="font-medium text-sm">Yêu cầu hồ sơ minh chứng:</p>
                            <p className="text-sm text-muted-foreground">{indicator.evidenceRequirement}</p>
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

    </>
  );
}
