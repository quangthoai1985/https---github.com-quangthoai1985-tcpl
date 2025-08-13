'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { criteria, recentAssessments } from "@/lib/data";
import { CheckCircle, Download, File as FileIcon, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import React from "react";

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const assessment = recentAssessments.find((a) => a.id === id);

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
    )
  }

  const getIndicatorResult = (indicatorId: string) => {
    // Mock data for demonstration
    const results: {[key: string]: any} = {
      'CT1.1': { value: true, note: 'Đã công khai đầy đủ trên cổng thông tin điện tử.', files: ['quyet-dinh-cong-khai.pdf'] },
      'CT1.2': { value: '95%', note: 'Tỷ lệ trả lời đúng hạn cao, còn một vài trường hợp chậm do chờ xác minh.', files: [] },
      'CT2.1': { value: ['check1'], note: 'Giao diện chưa thân thiện trên di động.', files: ['bao-cao-ha-tang.docx'] },
      'CT2.2': { value: false, note: 'Hệ thống loa đã cũ, cần nâng cấp.', files: [] },
    };
    return results[indicatorId] || { value: 'N/A', note: '', files: [] };
  };

  return (
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
                        {assessment.status}
                      </Badge>
                </div>
            </CardHeader>
            <CardContent>
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
                                                <div className="md:col-span-1 font-medium">Kết quả tự chấm:</div>
                                                <div className="md:col-span-2">
                                                    {indicator.type === 'Boolean' && (
                                                        <Badge variant={result.value ? 'default' : 'destructive'} className={result.value ? 'bg-green-600' : ''}>
                                                            {result.value ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                                                            {result.value ? 'Đạt' : 'Không đạt'}
                                                        </Badge>
                                                    )}
                                                     {indicator.type === 'Percentage' && <span className="font-bold text-primary">{result.value}</span>}
                                                     {indicator.type === 'Numeric' && <span className="font-bold text-primary">{result.value}</span>}
                                                     {indicator.type === 'Checklist' && (
                                                        <div className="flex flex-col gap-2">
                                                            <span>- Có giao diện thân thiện: {result.value.includes('check1') ? 'Có' : 'Không'}</span>
                                                            <span>- Cập nhật thông tin thường xuyên: {result.value.includes('check2') ? 'Có' : 'Không'}</span>
                                                        </div>
                                                     )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-1 font-medium">Giải trình:</div>
                                                <p className="md:col-span-2 text-muted-foreground">{result.note || "Không có giải trình."}</p>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                 <div className="md:col-span-1 font-medium">Minh chứng:</div>
                                                 <div className="md:col-span-2">
                                                    {result.files.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {result.files.map((file: string, i: number) => (
                                                                <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <FileIcon className="h-4 w-4 flex-shrink-0" />
                                                                        <span className="truncate">{file}</span>
                                                                    </div>
                                                                    <Button variant="ghost" size="sm"><Download className="mr-2 h-4 w-4" />Tải xuống</Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-muted-foreground">Không có tệp đính kèm.</p>
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
                <Separator className="my-6" />
                <div className="grid gap-4">
                    <h3 className="text-lg font-headline">Thẩm định và Phê duyệt</h3>
                    <div className="grid gap-2">
                         <label htmlFor="review-notes" className="font-medium">Ghi chú thẩm định</label>
                        <Textarea id="review-notes" placeholder="Nhập ý kiến thẩm định của bạn..." />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="destructive"><ThumbsDown className="mr-2 h-4 w-4" />Từ chối</Button>
                <Button className="bg-green-600 hover:bg-green-700"><ThumbsUp className="mr-2 h-4 w-4" />Phê duyệt</Button>
            </CardFooter>
        </Card>
    </div>
  );
}
