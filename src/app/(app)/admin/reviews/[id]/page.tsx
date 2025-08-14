
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { criteria } from "@/lib/data";
import { CheckCircle, Download, File as FileIcon, ThumbsDown, ThumbsUp, XCircle, AlertTriangle, Eye, MessageSquareQuote, UploadCloud, X, Clock } from "lucide-react";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useData } from "@/context/DataContext";
import { Input } from "@/components/ui/input";

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

  const { role, units, assessments, setAssessments } = useData();
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState(() => assessments.find((a) => a.id === id));
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(assessment?.rejectionReason || "");
  const [communeExplanation, setCommuneExplanation] = useState(assessment?.communeExplanation || "");
  const [previewFile, setPreviewFile] = useState<{name: string, url: string} | null>(null);

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
  
  const assessmentUnitName = getUnitName(assessment.unitId);

  const handleApprove = () => {
    const updatedAssessment = { ...assessment, status: 'approved' as const };
    setAssessments(prev => prev.map(a => a.id === id ? updatedAssessment : a));
    setAssessment(updatedAssessment);
    
    toast({
      title: "Phê duyệt thành công!",
      description: `Hồ sơ của ${assessmentUnitName} đã được phê duyệt.`,
      className: "bg-green-100 border-green-400 text-green-800",
    });
  };

  const handleReject = () => {
     if (!rejectionReason.trim()) {
        toast({
            title: "Lỗi",
            description: "Vui lòng nhập lý do từ chối.",
            variant: "destructive"
        });
        return;
    }
    const updatedAssessment = { ...assessment, status: 'rejected' as const, rejectionReason: rejectionReason, communeExplanation: "" };
    setAssessments(prev => prev.map(a => a.id === id ? updatedAssessment : a));
    setAssessment(updatedAssessment);
    
    toast({
      title: "Đã từ chối hồ sơ",
      description: `Hồ sơ của ${assessmentUnitName} đã bị từ chối.`,
      variant: "destructive",
    });
    setIsRejectDialogOpen(false);
  };
  
  const handleResubmit = () => {
      // In a real app, you would collect all explanations and new files.
      // For this demo, we just update the status.
      const updatedAssessment = { ...assessment, status: 'pending_review' as const, communeExplanation: "Đã giải trình và bổ sung minh chứng." };
      setAssessments(prev => prev.map(a => a.id === id ? updatedAssessment : a));
      setAssessment(updatedAssessment);
      toast({
        title: "Gửi lại thành công",
        description: "Hồ sơ của bạn đã được gửi lại để xem xét."
      });
      router.push('/dashboard');
  }


  const getIndicatorResult = (indicatorId: string) => {
    // Mock data for demonstration
    const results: { [key: string]: any } = {
      'CT1.1': { value: true, note: 'Đã công khai đầy đủ trên cổng thông tin điện tử.', files: [{name: 'quyet-dinh-cong-khai.pdf', url: 'https://placehold.co/800x1100.png?text=Quyet+Dinh'}] },
      'CT1.2': { value: '95%', note: 'Tỷ lệ trả lời đúng hạn cao, còn một vài trường hợp chậm do chờ xác minh.', files: [] },
      'CT2.1': { value: ['check1'], note: 'Giao diện chưa thân thiện trên di động.', files: [{name: 'bao-cao-ha-tang.docx', url: 'https://placehold.co/800x1100.png?text=Bao+Cao'}] },
      'CT2.2': { value: false, note: 'Hệ thống loa đã cũ, cần nâng cấp.', files: [] },
      'CT3.1': { value: true, note: 'Tổ chức họp định kỳ, có biên bản đầy đủ.', files: [{name: 'bien-ban-hop-quy-2.pdf', url: 'https://placehold.co/800x1100.png?text=Bien+Ban'}, {name: 'hinh-anh-doi-thoai.jpg', url: 'https://placehold.co/800x600.png?text=Hinh+Anh'}]},
      'CT3.2': { value: '75%', note: 'Một số vụ việc phức tạp chưa hoà giải thành công, cần tập huấn thêm cho hoà giải viên.', files: [{name: 'bao-cao-hoa-giai.xlsx', url: 'https://placehold.co/800x1100.png?text=Bao+Cao+Hoa+Giai'}]},
    };
    return results[indicatorId] || { value: 'N/A', note: '', files: [] };
  };

   const isActionDisabled = assessment.status === 'approved' || (role === 'admin' && assessment.status === 'rejected' && !assessment.communeExplanation);

  return (
    <>
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Chi tiết Hồ sơ đánh giá</CardTitle>
              <CardDescription>
                Đơn vị: {assessmentUnitName} - Ngày nộp: {assessment.submissionDate}
              </CardDescription>
            </div>
            <Badge
              variant={
                assessment.status === 'approved'
                  ? 'default'
                  : assessment.status === 'rejected'
                  ? 'destructive'
                  : 'secondary'
              }
              className={assessment.status === 'approved' ? 'bg-green-600' : ''}
            >
              {assessment.status === 'approved' && <CheckCircle className="mr-2 h-4 w-4" />}
              {assessment.status === 'rejected' && <XCircle className="mr-2 h-4 w-4" />}
              {assessment.status === 'pending_review' && <Clock className="mr-2 h-4 w-4" />}
              {assessment.status === 'approved' ? 'Đã duyệt' :
               assessment.status === 'rejected' ? 'Bị từ chối' :
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
                    <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle /> Lý do từ chối chung</CardTitle>
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
                      const result = getIndicatorResult(indicator.id);
                      const isNotMet = (indicator.inputType === 'boolean' && result.value === false);

                      return (
                        <div key={indicator.id} className="grid gap-4 p-4 rounded-lg bg-card border shadow-sm">
                          <h4 className="font-semibold">{indicator.name}</h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1 font-medium text-muted-foreground">Kết quả tự chấm:</div>
                            <div className="md:col-span-2 font-semibold">
                              {indicator.inputType === 'boolean' && (
                                <Badge variant={result.value ? 'default' : 'destructive'} className={result.value ? 'bg-green-600' : ''}>
                                  {result.value ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                                  {result.value ? 'Đạt' : 'Không đạt'}
                                </Badge>
                              )}
                              {indicator.inputType !== 'boolean' && <span className="font-bold text-primary">{result.value}</span>}
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
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Không có tệp đính kèm.</p>
                              )}
                            </div>
                          </div>
                          
                          {role === 'commune_staff' && assessment.status === 'rejected' && isNotMet && (
                              <div className="mt-4 p-4 border-t border-dashed border-amber-500 bg-amber-50/50 rounded-b-lg grid gap-4">
                                  <h5 className="font-semibold text-amber-800">Giải trình và Bổ sung cho chỉ tiêu này</h5>
                                  <div className="grid gap-2">
                                      <Label htmlFor={`explanation-${indicator.id}`} className="text-sm">Nội dung giải trình</Label>
                                      <Textarea id={`explanation-${indicator.id}`} placeholder="Giải trình về lý do chưa đạt và các biện pháp khắc phục..." />
                                  </div>
                                  <FileUploadComponent />
                              </div>
                          )}

                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {role === 'admin' && (assessment.status === 'pending_review' || assessment.status === 'rejected') && (
            <>
                <Separator className="my-6" />
                <div className="grid gap-4">
                    <h3 className="text-lg font-headline">Thẩm định và Phê duyệt</h3>
                    <div className="grid gap-2">
                         <Label htmlFor="review-notes" className="font-medium">Ghi chú/Lý do từ chối chung (nếu có)</Label>
                        <Textarea id="review-notes" placeholder="Nhập lý do từ chối chung hoặc các ý kiến thẩm định của bạn..." onChange={(e) => setRejectionReason(e.target.value)} defaultValue={rejectionReason} />
                    </div>
                </div>
            </>
          )}

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
            {role === 'admin' && assessment.status === 'pending_review' &&(
              <>
                <Button variant="destructive" onClick={() => setIsRejectDialogOpen(true)} disabled={isActionDisabled}><ThumbsDown className="mr-2 h-4 w-4" />Từ chối</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={isActionDisabled}><ThumbsUp className="mr-2 h-4 w-4" />Phê duyệt</Button>
              </>
            )}
             {role === 'admin' && assessment.status === 'rejected' && assessment.communeExplanation && (
                 <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}><ThumbsUp className="mr-2 h-4 w-4" />Phê duyệt lại</Button>
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

    <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive"/>
                    Xác nhận từ chối hồ sơ
                </DialogTitle>
                <DialogDescription>
                    Bạn có chắc chắn muốn từ chối hồ sơ của <strong>{assessmentUnitName}</strong>? Các ghi chú bạn đã nhập sẽ được lưu lại làm lý do. Hành động này sẽ thông báo cho đơn vị.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="rejection-reason" className="font-medium">Xem lại Lý do từ chối</Label>
                <Textarea
                    id="rejection-reason"
                    placeholder="Ví dụ: Hồ sơ minh chứng cho Tiêu chí 2.1 không hợp lệ, yêu cầu bổ sung..."
                    className="mt-2"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Hủy</Button>
                <Button variant="destructive" onClick={handleReject}>Xác nhận từ chối</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Xem trước: {previewFile?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 relative">
                {previewFile && (
                    <Image 
                        src={previewFile.url}
                        alt={`Xem trước ${previewFile.name}`}
                        fill
                        style={{ objectFit: 'contain' }}
                        data-ai-hint="document preview"
                    />
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewFile(null)}>Đóng</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    </>
  );
}
