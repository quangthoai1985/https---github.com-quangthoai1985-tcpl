
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Download, File as FileIcon, ThumbsDown, ThumbsUp, XCircle, AlertTriangle, Eye, MessageSquareQuote, UploadCloud, X, Clock, Award, Undo2, CornerDownRight } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useData } from "@/context/DataContext";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/layout/page-header";
import type { Assessment, IndicatorResult } from '@/lib/data';
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function FileUploadComponent() {
    const [files, setFiles] = React.useState<File[]>([]);

    return (
        <div className="grid gap-2">
            <Label>Hồ sơ minh chứng bổ sung</Label>
            <div className="w-full relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-4 text-center hover:border-primary transition-colors">
                <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                    Kéo và thả tệp, hoặc <span className="font-semibold text-primary">nhấn để chọn</span>
                </p>
                <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </div>
            {files.length > 0 && (
                 <div className="space-y-2 mt-2">
                    {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                            <div className="flex items-center gap-2 truncate">
                                <FileIcon className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiles(files.filter(f => f.name !== file.name))}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                 </div>
            )}
        </div>
    );
}

export default function AssessmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { role, units, assessments, updateAssessments, criteria, currentUser } = useData();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | undefined>(() => assessments.find((a) => a.id === id));
  const [communeExplanation, setCommuneExplanation] = useState(assessment?.communeExplanation || "");
  const [previewFile, setPreviewFile] = useState<{name: string, url: string} | null>(null);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  // State to hold admin notes for each indicator
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>(() => {
    const initialNotes: Record<string, string> = {};
    if (assessment?.assessmentData) {
        for (const indicatorId in assessment.assessmentData) {
            initialNotes[indicatorId] = assessment.assessmentData[indicatorId].adminNote || '';
        }
    }
    return initialNotes;
  });

  useEffect(() => {
    const currentAssessment = assessments.find((a) => a.id === id);
    setAssessment(currentAssessment);
    if (currentAssessment?.assessmentData) {
        const initialNotes: Record<string, string> = {};
        for (const indicatorId in currentAssessment.assessmentData) {
            initialNotes[indicatorId] = currentAssessment.assessmentData[indicatorId].adminNote || '';
        }
        setAdminNotes(initialNotes);
    }
  }, [assessments, id]);
  
  const handleAdminNoteChange = (indicatorId: string, text: string) => {
    setAdminNotes(prev => ({ ...prev, [indicatorId]: text }));
  }

  const getUnitName = (unitId: string | undefined) => {
    if (!unitId) return "Không xác định";
    return units.find(u => u.id === unitId)?.name || "Không xác định";
  }

  if (!assessment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Không tìm thấy</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Không tìm thấy hồ sơ đánh giá với ID này.</p>
        </CardContent>
      </Card>
    );
  }
  
  const assessmentUnitName = getUnitName(assessment.communeId);

  const handleApprove = async () => {
    const updatedAssessment = { ...assessment, status: 'achieved_standard' as const, approvalDate: new Date().toLocaleDateString('vi-VN'), approverId: currentUser?.id };
    await updateAssessments(assessments.map(a => a.id === id ? updatedAssessment : a));
    
    toast({
      title: "Phê duyệt thành công!",
      description: `Đã công nhận ${assessmentUnitName} đạt chuẩn.`,
      className: "bg-green-100 border-green-400 text-green-800",
    });
    router.push('/admin/reviews');
  };

  const handleReject = async () => {
    const updatedAssessment = { ...assessment, status: 'rejected' as const, rejectionReason: "", communeExplanation: "" };
    await updateAssessments(assessments.map(a => a.id === id ? updatedAssessment : a));
    
    toast({
      title: "Đã từ chối hồ sơ",
      description: `Hồ sơ của ${assessmentUnitName} đã được ghi nhận là "Không đạt chuẩn".`,
      variant: "destructive",
    });
    setIsRejectDialogOpen(false);
    router.push('/admin/reviews');
  };
  
  const handleResubmit = async () => {
      const updatedAssessment = { ...assessment, status: 'pending_review' as const, communeExplanation };
      await updateAssessments(assessments.map(a => a.id === id ? updatedAssessment : a));
      toast({
        title: "Gửi lại thành công",
        description: "Hồ sơ của bạn đã được gửi lại để xem xét."
      });
      router.push('/dashboard');
  }

  const getIndicatorResult = (indicatorId: string): IndicatorResult => {
    if (!assessment?.assessmentData || !assessment.assessmentData[indicatorId]) {
      // Return a default/empty state if no data is found for this indicator
      return { value: 'Chưa chấm', note: 'Chưa có giải trình.', files: [], status: 'pending' };
    }
    return assessment.assessmentData[indicatorId];
  };
  
   const handleReturnForRevision = async () => {
        // Add admin notes to the assessment data before saving
        const assessmentDataWithNotes = { ...assessment.assessmentData };
        for (const indicatorId in adminNotes) {
            if (assessmentDataWithNotes[indicatorId]) {
                assessmentDataWithNotes[indicatorId].adminNote = adminNotes[indicatorId];
            } else {
                 assessmentDataWithNotes[indicatorId] = { 
                    value: null, 
                    note: '', 
                    files: [], 
                    status: 'pending', 
                    adminNote: adminNotes[indicatorId]
                };
            }
        }
        
        const updatedAssessment = { 
            ...assessment, 
            status: 'rejected' as const, // The status for a returned file is 'rejected'
            rejectionReason: '', // General reason is removed. Specific notes are in assessmentData.
            communeExplanation: '',
            assessmentData: assessmentDataWithNotes,
        };
        
        await updateAssessments(assessments.map((a) => (a.id === id ? updatedAssessment : a)));

        toast({
            title: 'Đã trả lại hồ sơ',
            description: `Đã gửi yêu cầu bổ sung cho ${assessmentUnitName}.`,
        });
        
        setIsReturnDialogOpen(false);
        router.push('/admin/reviews');
    };

  const renderResultValue = (result: IndicatorResult) => {
    if (result.isTasked === false) {
      return <Badge variant="secondary">Không được giao nhiệm vụ</Badge>;
    }

    const { value } = result;

    if (typeof value === 'boolean') {
      return <Badge variant={value ? 'default' : 'destructive'} className={value ? 'bg-green-600' : ''}>{value ? 'Đạt' : 'Không đạt'}</Badge>;
    }
    
    if (typeof value === 'number') {
      return <Badge variant="outline">{`${value}%`}</Badge>;
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const selectedOptions = Object.entries(value)
            .filter(([, isChecked]) => isChecked)
            .map(([option]) => option);

        if (selectedOptions.length === 0) {
            return <p className="text-sm text-muted-foreground">Không có lựa chọn nào.</p>;
        }

        return (
            <ul className="list-disc pl-5 space-y-1">
                {selectedOptions.map((opt, i) => <li key={i} className="text-sm">{opt}</li>)}
            </ul>
        )
    }

    if (value) {
      return <Badge variant="outline">{String(value)}</Badge>;
    }
    
    return <Badge variant="secondary">Chưa có dữ liệu</Badge>;
  };


  const isActionDisabled = assessment.status === 'achieved_standard' || (role === 'admin' && assessment.status === 'rejected' && !assessment.communeExplanation);
  const isRejectedByAdmin = assessment.status === 'rejected';

  return (
    <>
    <PageHeader title="Chi tiết Hồ sơ Đánh giá" description={`Đơn vị: ${assessmentUnitName} | Ngày nộp: ${assessment.submissionDate}`}/>
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1"></div>
            <Badge
              variant={
                assessment.status === 'achieved_standard'
                  ? 'default'
                  : assessment.status === 'rejected'
                  ? 'destructive'
                  : 'secondary'
              }
              className={assessment.status === 'achieved_standard' ? 'bg-blue-600' : ''}
            >
              {assessment.status === 'achieved_standard' && <Award className="mr-2 h-4 w-4" />}
              {assessment.status === 'rejected' && <XCircle className="mr-2 h-4 w-4" />}
              {assessment.status === 'pending_review' && <Clock className="mr-2 h-4 w-4" />}
              {assessment.status === 'achieved_standard' ? 'Đạt chuẩn' :
               assessment.status === 'rejected' ? 'Không đạt chuẩn / Bị trả lại' :
               assessment.status === 'pending_review' ? 'Chờ duyệt' :
               'Bản nháp'
              }
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(assessment.status === 'rejected' || (assessment.status === 'pending_review' && assessment.rejectionReason)) && (
            <Card className="mb-6 bg-destructive/10 border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle /> Lý do từ chối / Trả lại</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{assessment.rejectionReason}</p>
                </CardContent>
            </Card>
          )}

          {role === 'admin' && assessment.communeExplanation && (
              <Card className="mb-6 bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800"><MessageSquareQuote /> Giải trình từ xã</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-blue-900">{assessment.communeExplanation}</p>
                </CardContent>
              </Card>
          )}

          <Separator className="mb-6" />
          <Accordion type="multiple" defaultValue={criteria.map(c => c.id)} className="w-full">
            {criteria.map((criterion, index) => (
              <AccordionItem value={criterion.id} key={criterion.id}>
                <AccordionTrigger className="text-lg font-headline hover:no-underline">
                  Tiêu chí {index + 1}: {criterion.name.replace(`Tiêu chí ${index + 1}: `, '')}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pl-8 pr-4">
                    {criterion.indicators.map(indicator => {
                      const renderIndicatorContent = (ind: typeof indicator | (typeof indicator.subIndicators)[0], isSub: boolean) => {
                        const result = getIndicatorResult(ind.id);
                        const adminNote = adminNotes[ind.id] || '';
                        
                        return (
                          <div key={ind.id} className={cn("grid gap-4 p-4 rounded-lg bg-card border shadow-sm", isSub && "relative pl-6 pt-4 mt-2")}>
                              {isSub && <CornerDownRight className="absolute -left-3 top-5 h-5 w-5 text-muted-foreground"/>}
                              <h4 className="font-semibold">{ind.name}</h4>
                               <>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1 font-medium text-muted-foreground">Kết quả tự chấm:</div>
                                    <div className="md:col-span-2 font-semibold">
                                        {renderResultValue(result)}
                                    </div>
                                  </div>
        
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1 font-medium text-muted-foreground">Giải trình ban đầu:</div>
                                    <p className="md:col-span-2 text-sm">{result.note || "Không có giải trình."}</p>
                                  </div>
        
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1 font-medium text-muted-foreground">Minh chứng ban đầu:</div>
                                    <div className="md:col-span-2">
                                      {result.files.length > 0 ? (
                                        <div className="space-y-2">
                                          {result.files.map((file: {name: string, url: string}, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                                              <div className="flex items-center gap-2 truncate">
                                                <FileIcon className="h-4 w-4 flex-shrink-0" />
                                                <span className="truncate">{file.name}</span>
                                              </div>
                                              <div className="flex items-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewFile(file)}>
                                                  <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(file.url, '_blank')}><Download className="h-4 w-4" /></Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">Không có tệp đính kèm.</p>
                                      )}
                                    </div>
                                  </div>
                                </>

                                { (role === 'admin' || (role === 'commune_staff' && isRejectedByAdmin)) &&
                                  <div className="mt-4 p-4 border-t border-dashed border-amber-500 bg-amber-50/50 rounded-b-lg grid gap-4">
                                     {role === 'admin' ? (
                                        <>
                                            <Label htmlFor={`admin-note-${ind.id}`} className="font-semibold text-amber-800">Ghi chú của Admin cho chỉ tiêu này</Label>
                                            <Textarea id={`admin-note-${ind.id}`} 
                                                placeholder="Nhập ghi chú, yêu cầu chỉnh sửa..."
                                                value={adminNote}
                                                onChange={(e) => handleAdminNoteChange(ind.id, e.target.value)}
                                            />
                                        </>
                                     ) : (
                                        <>
                                            <Label className="font-semibold text-amber-800">Ghi chú của Admin:</Label>
                                            {result.adminNote ? <p className="text-sm text-amber-900 whitespace-pre-wrap">{result.adminNote}</p> : <p className="text-sm text-muted-foreground">Không có ghi chú.</p>}
                                        </>
                                     )}
                                  </div>
                                }
                          </div>
                        )
                      }
                      
                      if (!indicator.subIndicators || indicator.subIndicators.length === 0) {
                          return renderIndicatorContent(indicator, false);
                      }
                      return (
                         <div key={indicator.id} className="grid gap-4 p-4 rounded-lg bg-card border shadow-sm">
                             <h4 className="font-semibold">{indicator.name}</h4>
                             <div className="pl-6 border-l-2 border-dashed space-y-4">
                                {indicator.subIndicators.map(sub => renderIndicatorContent(sub, true))}
                             </div>
                         </div>
                      );

                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {role === 'admin' && (assessment.status === 'pending_review' || (assessment.status === 'rejected' && !!assessment.communeExplanation)) && (
            <>
                <Separator className="my-6" />
                <div className="grid gap-4">
                    <h3 className="text-lg font-headline">Thẩm định và Ra quyết định</h3>
                </div>
            </>
          )}

          {role === 'commune_staff' && isRejectedByAdmin && (
              <div className="mt-6 p-4 border-t grid gap-4">
                  <h3 className="text-lg font-headline">Giải trình chung và Bổ sung hồ sơ</h3>
                  <div className="grid gap-2">
                      <Label htmlFor="communeExplanation" className="text-sm font-medium">Nội dung giải trình chung</Label>
                      <Textarea id="communeExplanation" placeholder="Giải trình chung về các nội dung đã khắc phục và bổ sung theo yêu cầu của Admin..." value={communeExplanation} onChange={(e) => setCommuneExplanation(e.target.value)} />
                  </div>
                  <FileUploadComponent />
              </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
            
            {role === 'admin' && assessment.status === 'pending_review' &&(
              <>
                <Button variant="destructive" onClick={() => setIsRejectDialogOpen(true)} disabled={isActionDisabled}><ThumbsDown className="mr-2 h-4 w-4" />Từ chối (Không đạt)</Button>
                <Button 
                    variant="outline" 
                    className="text-amber-600 border-amber-500 hover:bg-amber-50 hover:text-amber-700"
                    onClick={() => setIsReturnDialogOpen(true)}
                    disabled={isActionDisabled}
                >
                    <Undo2 className="mr-2 h-4 w-4" /> Trả lại
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleApprove} disabled={isActionDisabled}><Award className="mr-2 h-4 w-4" />Phê duyệt (Đạt chuẩn)</Button>
              </>
            )}

             {role === 'admin' && assessment.status === 'rejected' && assessment.communeExplanation && (
                 <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleApprove}><Award className="mr-2 h-4 w-4" />Phê duyệt lại (Đạt chuẩn)</Button>
            )}
            
            {role === 'commune_staff' && assessment.status === 'rejected' && (
                <>
                    <Button variant="outline">Lưu nháp giải trình</Button>
                    <Button onClick={handleResubmit}>Gửi lại đánh giá</Button>
                </>
            )}
        </CardFooter>
      </Card>
    </div>

    <AlertDialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận trả lại hồ sơ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Hành động này sẽ trả lại hồ sơ cho <strong>{assessmentUnitName}</strong> để chỉnh sửa và bổ sung. Các ghi chú chi tiết bạn đã nhập sẽ được lưu lại và gửi cho họ.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleReturnForRevision}
                    className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
                >
                    Xác nhận Trả lại
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận Từ chối (Không Đạt)?</AlertDialogTitle>
                <AlertDialogDescription>
                    Hành động này sẽ đánh dấu hồ sơ của <strong>{assessmentUnitName}</strong> là "Không đạt chuẩn" trong kỳ đánh giá này. Đây là quyết định cuối cùng và không thể yêu cầu xã gửi lại.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleReject}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Xác nhận Không Đạt
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Xem trước: {previewFile?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 px-6 pb-6 h-full">
                {previewFile && (
                   <iframe 
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url)}&embedded=true`} 
                        className="w-full h-full border rounded-md" 
                        title={previewFile.name}
                    ></iframe>
                )}
            </div>
            <DialogFooter className="p-6 pt-0 border-t">
                <Button variant="secondary" onClick={() => window.open(previewFile?.url, '_blank')}><Download className="mr-2 h-4 w-4"/> Tải xuống</Button>
                <Button variant="outline" onClick={() => setPreviewFile(null)}>Đóng</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
