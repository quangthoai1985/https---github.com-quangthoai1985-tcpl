
'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Criterion, Indicator } from '@/lib/data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save } from 'lucide-react';


function Criterion4Config({ criterion, onSave }: { criterion: Criterion, onSave: (criterion: Criterion) => void }) {
    const [formData, setFormData] = React.useState<Indicator>(() => criterion.indicators.find(i => i.id === 'CT033278') || {} as Indicator);
    const { toast } = useToast();

    const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = e.target.value === '' ? undefined : Number(e.target.value);
        const newCount = count !== undefined ? Math.max(0, count) : undefined;

        setFormData(prev => {
            const currentDocuments = prev.documents || [];
            const finalCount = newCount ?? 0;
            const newDocuments = Array.from({ length: finalCount }, (_, i) => {
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
        const updatedCriterion = {
            ...criterion,
            indicators: criterion.indicators.map(i => i.id === 'CT033278' ? formData : i)
        };
        onSave(updatedCriterion);
        toast({ title: "Thành công!", description: "Đã lưu cấu hình cho Chỉ tiêu 4."});
    }

    const handleTypeChange = (value: 'quantity' | 'specific') => {
        setFormData(prev => {
            const newFormData = { ...prev, assignmentType: value };
    
            if (value === 'specific') {
                const count = prev.assignedDocumentsCount || 0;
                const currentDocuments = prev.documents || [];
                newFormData.documents = Array.from({ length: count }, (_, i) => {
                    return currentDocuments[i] || { name: '', issueDate: '', excerpt: '', issuanceDeadlineDays: 30 };
                });
            } else {
                newFormData.documents = []; 
            }
            
            return newFormData;
        });
    };


    return (
        <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-200 mb-6 space-y-6">
            <h4 className='font-semibold text-primary'>Cấu hình đặc biệt: Giao nhiệm vụ cho Chỉ tiêu 4</h4>
            
            <RadioGroup 
                value={formData.assignmentType || 'specific'} 
                onValueChange={handleTypeChange}
                className="my-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
                <Label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-100 has-[:checked]:border-primary">
                    <RadioGroupItem value="specific" id="r-specific-ct4" />
                    Giao nhiệm vụ cụ thể
                </Label>
                <Label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-100 has-[:checked]:border-primary">
                    <RadioGroupItem value="quantity" id="r-quantity-ct4" />
                    Giao theo số lượng
                </Label>
            </RadioGroup>

            {/* TRƯỜNG HỢP GIAO CỤ THỂ */}
            {(!formData.assignmentType || formData.assignmentType === 'specific') && (
                <>
                    <div className="grid gap-2">
                        <Label htmlFor="assignedDocumentsCount-ct4">Số lượng văn bản được giao</Label>
                        <Input id="assignedDocumentsCount-ct4" type="number" value={formData.assignedDocumentsCount ?? ''} onChange={handleCountChange} placeholder="Ví dụ: 5" className="w-48"/>
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
                                        <Label htmlFor={`doc-name-${index}-ct4`} className="text-xs font-semibold text-destructive">Tên văn bản QPPL</Label>
                                        <Input id={`doc-name-${index}-ct4`} value={doc.name} onChange={(e) => handleDocumentChange(index, 'name', e.target.value)} placeholder={`Ví dụ: Nghị quyết về việc...`} />
                                    </div>
                                    <div className="md:col-span-1"></div>
                                    <div className="md:col-span-9 grid gap-1.5">
                                        <Label htmlFor={`doc-excerpt-${index}-ct4`} className="text-xs font-semibold text-destructive">Trích yếu nội dung</Label>
                                        <Input id={`doc-excerpt-${index}-ct4`} value={doc.excerpt} onChange={(e) => handleDocumentChange(index, 'excerpt', e.target.value)} placeholder={`Tóm tắt ngắn gọn nội dung chính...`} />
                                    </div>
                                    <div className="md:col-span-1"></div>
                                    <div className="md:col-span-5 grid gap-1.5">
                                        <Label htmlFor={`doc-issuedate-${index}-ct4`} className="text-xs font-semibold text-destructive">Ngày ban hành</Label>
                                        <Input id={`doc-issuedate-${index}-ct4`} value={doc.issueDate} onChange={(e) => handleDocumentChange(index, 'issueDate', e.target.value)} placeholder={`DD/MM/YYYY`} />
                                    </div>
                                    <div className="md:col-span-4 grid gap-1.5">
                                        <Label htmlFor={`doc-deadline-${index}-ct4`} className="text-xs font-semibold text-destructive">Thời hạn ban hành (ngày)</Label>
                                        <Input id={`doc-deadline-${index}-ct4`} type="number" value={doc.issuanceDeadlineDays} onChange={(e) => handleDocumentChange(index, 'issuanceDeadlineDays', Number(e.target.value))} />
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
                    <Label htmlFor="assignedDocumentsCountQty-ct4">Số lượng VBQPPL được giao ban hành trong năm</Label>
                    <Input id="assignedDocumentsCountQty-ct4" type="number" value={formData.assignedDocumentsCount ?? ''} onChange={handleCountChange} placeholder="Để trống hoặc nhập 0 để xã tự điền" className="w-64"/>
                    <p className="text-sm text-muted-foreground">Nhập số lượng văn bản được giao. Để trống hoặc nhập 0 nếu muốn xã tự nhập số lượng.</p>
                </div>
            )}

            <div className="flex justify-end mt-4">
                <Button onClick={handleSave} size="sm">
                    <Save className="mr-2 h-4 w-4"/>
                    Lưu Cấu hình Chỉ tiêu 4
                </Button>
            </div>
        </div>
    );
}

export default Criterion4Config;
