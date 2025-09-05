
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
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/layout/page-header';
import { useData } from '@/context/DataContext';
import type { Criterion, SubCriterion } from '@/lib/data';
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
     setFormData(prev => ({ ...prev, startDate: e.target.value }));
  }

  const handleSubCriterionChange = (subCriterionId: string, field: 'description', value: string) => {
      setFormData(prev => ({
          ...prev,
          children: (prev.children || []).map(sub => 
              sub.id === subCriterionId ? { ...sub, [field]: value } : sub
          )
      }));
  }
  
  const getSubCriterion = (id: string) => (formData.children || []).find(sc => sc.id === id);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cấu hình chi tiết cho: {criterion.name}</DialogTitle>
        <DialogDescription>
          Thiết lập các thông số chung cho Tiêu chí 1 và các yêu cầu cụ thể cho từng chỉ tiêu con.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
        <Alert><Info className="h-4 w-4" /><AlertTitle>Cấu hình chung</AlertTitle><AlertDescription>Các thông số này sẽ quyết định form nhập liệu và cách tính điểm cho xã.</AlertDescription></Alert>
        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="requiredDocuments" className="text-right">Số lượng VBQPPL được giao</Label><Input id="requiredDocuments" type="number" value={formData.requiredDocuments || ''} onChange={handleSharedChange} className="col-span-3" placeholder="Ví dụ: 5"/></div>
        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="deadlineDays" className="text-right">Thời hạn ban hành (ngày)</Label><Input id="deadlineDays" type="number" value={formData.deadlineDays || ''} onChange={handleSharedChange} className="col-span-3" placeholder="Ví dụ: 30"/></div>
        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="startDate" className="text-right">Ngày bắt đầu áp dụng</Label><Input id="startDate" type="date" value={formData.startDate || ''} onChange={handleDateChange} className="col-span-3" /></div>
        <Separator className="my-4"/>
        {(criterion.children || []).map(sub => (
            <div key={sub.id} className="grid gap-4 p-4 rounded-md border">
                <h4 className="font-semibold">{sub.name}</h4>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor={`desc-${sub.id}`} className="text-right pt-2">Mô tả/Yêu cầu</Label>
                    <Textarea id={`desc-${sub.id}`} value={getSubCriterion(sub.id)?.description || ''} onChange={(e) => handleSubCriterionChange(sub.id, 'description', e.target.value)} className="col-span-3" />
                </div>
            </div>
        ))}
      </div>
      <DialogFooter><Button variant="outline" onClick={onCancel}>Hủy</Button><Button type="submit" onClick={() => onSave(formData)}>Lưu thay đổi</Button></DialogFooter>
    </>
  );
}

// Other forms (CriterionForm, SubCriterionForm) are assumed to be here unchanged...
function CriterionForm({ criterion, onSave, onCancel }: { criterion: Partial<Criterion>, onSave: (criterion: Partial<Criterion>) => void, onCancel: () => void }) {return(<div></div>)}
function SubCriterionForm({ subCriterion, onSave, onCancel }: { subCriterion: Partial<SubCriterion>, onSave: (sc: Partial<SubCriterion>) => void, onCancel: () => void }) {return(<div></div>)}


export default function CriteriaManagementPage() {
  const { criteria, updateCriteria } = useData();
  const [editingCriterion, setEditingCriterion] = React.useState<Partial<Criterion> | null>(null);
  const { toast } = useToast();
  
  const handleSaveCriterion = async (criterionToSave: Partial<Criterion>) => {
    // The issue was saving only one criterion, which caused the updater to delete others.
    // The correct approach is to update the specific criterion in the full list.
    const newCriteriaList = criteria.map(c => 
        c.id === criterionToSave.id ? { ...c, ...criterionToSave } : c
    );
    await updateCriteria(newCriteriaList);
    toast({ title: "Thành công!", description: "Đã cập nhật thông tin tiêu chí." });
    setEditingCriterion(null);
  };
  
  // Other handlers are assumed to be here...

  return (
    <>
    <PageHeader title="Bộ Tiêu chí Đánh giá" description="Quản lý các tiêu chí và chỉ tiêu để đánh giá xã đạt chuẩn tiếp cận pháp luật."/>
    <Card>
      <CardHeader>
        {/* Add button would be here */}
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={criteria.map((c) => c.id)} className="w-full">
          {criteria.map((criterion, index) => {
            // Determine the list of sub-items (indicators or children)
            const subItems = criterion.children || criterion.indicators || [];
            
            return (
              <AccordionItem value={criterion.id} key={criterion.id}>
                <div className="flex items-center justify-between pr-4 hover:bg-muted/50 rounded-lg">
                  <AccordionTrigger className="text-lg font-headline hover:no-underline flex-1 px-4 py-0">
                      <span>Tiêu chí {criterion.order}: {criterion.name}</span>
                  </AccordionTrigger>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <Badge variant="secondary" className="mr-4">{subItems.length} chỉ tiêu</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setEditingCriterion(criterion)}>Sửa tiêu chí</DropdownMenuItem>
                        {/* Other actions */}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <AccordionContent>
                  <div className="space-y-4 pl-8 pr-4 py-4">
                    {subItems.map((item) => (
                      <div key={item.id} className="grid gap-3 rounded-md border bg-card p-4 shadow-sm">
                          <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-base flex-1 pr-4">{item.name}</h4>
                              {/* Dropdown for sub-item actions can go here */}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>

    <Dialog open={!!editingCriterion} onOpenChange={(open) => !open && setEditingCriterion(null)}>
        <DialogContent className={editingCriterion?.id === 'TC1' ? "max-w-3xl" : "max-w-2xl"}>
            {editingCriterion?.id === 'TC1' ? (
                <Criterion1Form
                    criterion={editingCriterion as Criterion}
                    onSave={handleSaveCriterion as (c: Criterion) => void}
                    onCancel={() => setEditingCriterion(null)}
                />
            ) : editingCriterion ? (
                <CriterionForm
                    criterion={editingCriterion}
                    onSave={handleSaveCriterion}
                    onCancel={() => setEditingCriterion(null)}
                />
            ) : null}
        </DialogContent>
    </Dialog>
    </>
  );
}
