
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { criteria, recentAssessments } from "@/lib/data";
import { CheckCircle, Download, File as FileIcon, ThumbsDown, ThumbsUp, XCircle, AlertTriangle, Eye } from "lucide-react";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id;
  const { toast } = useToast();
  // In a real app, you would fetch this from a server and use state management.
  const [assessment, setAssessment] = useState(recentAssessments.find((a) => a.id === id));
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewFile, setPreviewFile] = useState<{name: string, url: string} | null>(null);

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

  const handleApprove = () => {
    // In a real app, this would be an API call.
    const updatedAssessment = { ...assessment, status: 'Đã duyệt' };
    const index = recentAssessments.findIndex(a => a.id === id);
    if(index !== -1) recentAssessments[index] = updatedAssessment;
    setAssessment(updatedAssessment);
    
    toast({
      title: "Phê duyệt thành công!",
      description: `Hồ sơ của ${assessment.communeName} đã được phê duyệt.`,
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
    // In a real app, this would be an API call.
    const updatedAssessment = { ...assessment, status: 'Bị từ chối' };
    const index = recentAssessments.findIndex(a => a.id === id);
    if(index !== -1) recentAssessments[index] = updatedAssessment;
    setAssessment(updatedAssessment);

    console.log("Rejection Reason:", rejectionReason); // For demonstration
    
    toast({
      title: "Đã từ chối hồ sơ",
      description: `Hồ sơ của ${assessment.communeName} đã bị từ chối.`,
      variant: "destructive",
    });
    setIsRejectDialogOpen(false);
    setRejectionReason("");
  };


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

   const isActionDisabled = assessment.status === 'Đã duyệt' || assessment.status === 'Bị từ chối';

  return (
    <>
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Chi tiết Hồ sơ đánh giá</CardTitle>
              <CardDescription>
                Xã: {assessment.communeName} - Ngày nộp: {assessment.submissionDate}
              </CardDescription>
            </div>
            <Badge
              variant={
                assessment.status === 'Đã duyệt'
                  ? 'default'
                  : assessment.status === 'Bị từ chối'
                  ? 'destructive'
                  : 'secondary'
              }
              className={assessment.status === 'Đã duyệt' ? 'bg-green-600' : ''}
            >
              {assessment.status === 'Đã duyệt' && <CheckCircle className="mr-2 h-4 w-4" />}
              {assessment.status === 'Bị từ chối' && <XCircle className="mr-2 h-4 w-4" />}
              {assessment.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
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
                              {indicator.inputType === 'number' && <span className="font-bold text-primary">{result.value}</span>}
                               {indicator.inputType === 'select' && <span className="font-bold text-primary">Có</span>}

                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1 font-medium text-muted-foreground">Giải trình:</div>
                            <p className="md:col-span-2 text-sm">{result.note || "Không có giải trình."}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1 font-medium text-muted-foreground">Minh chứng:</div>
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
                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {assessment.status === 'Chờ duyệt' && (
            <>
                <Separator className="my-6" />
                <div className="grid gap-4">
                    <h3 className="text-lg font-headline">Thẩm định và Phê duyệt</h3>
                    <div className="grid gap-2">
                         <label htmlFor="review-notes" className="font-medium">Ghi chú thẩm định (nếu có)</label>
                        <Textarea id="review-notes" placeholder="Nhập ý kiến thẩm định của bạn..." />
                    </div>
                </div>
            </>
          )}

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
            <Button variant="destructive" onClick={() => setIsRejectDialogOpen(true)} disabled={isActionDisabled}><ThumbsDown className="mr-2 h-4 w-4" />Từ chối</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={isActionDisabled}><ThumbsUp className="mr-2 h-4 w-4" />Phê duyệt</Button>
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
                    Bạn có chắc chắn muốn từ chối hồ sơ của <strong>{assessment.communeName}</strong>? Vui lòng cung cấp lý do từ chối. Hành động này sẽ thông báo cho đơn vị.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="rejection-reason" className="font-medium">Lý do từ chối</Label>
                <Textarea
                    id="rejection-reason"
                    placeholder="Ví dụ: Hồ sơ minh chứng cho Tiêu chí 2.1 không hợp lệ, yêu cầu bổ sung..."
                    className="mt-2"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
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
