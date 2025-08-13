'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { criteria } from "@/lib/data";
import { UploadCloud, File as FileIcon, X } from "lucide-react";
import React from "react";

function FileUploadComponent() {
    const [files, setFiles] = React.useState<File[]>([]);

    return (
        <div className="grid gap-2">
            <Label>Hồ sơ minh chứng</Label>
            <div className="w-full relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                    Kéo và thả tệp vào đây, hoặc <span className="font-semibold text-primary">nhấn để chọn tệp</span>
                </p>
                <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </div>
            {files.length > 0 && (
                 <div className="space-y-2">
                    <p className="text-sm font-medium">Tệp đã tải lên:</p>
                    {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                            <div className="flex items-center gap-2">
                                <FileIcon className="h-4 w-4" />
                                <span>{file.name}</span>
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


export default function SelfAssessmentPage() {
  return (
    <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Tự chấm điểm và đánh giá</CardTitle>
                <CardDescription>Kỳ đánh giá 6 tháng đầu năm 2024. Vui lòng hoàn thành trước ngày 30/07/2024.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {criteria.map((criterion) => (
                        <AccordionItem value={criterion.id} key={criterion.id}>
                            <AccordionTrigger className="font-headline text-lg">{criterion.name}</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-8 pl-4 border-l-2 border-primary/20 ml-2">
                                    {criterion.indicators.map(indicator => (
                                        <div key={indicator.id} className="grid gap-4 p-4 rounded-lg bg-card shadow-sm border">
                                            <h4 className="font-semibold">{indicator.name}</h4>
                                            
                                            {indicator.type === 'Boolean' && (
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox id={`${indicator.id}-checkbox`} />
                                                    <Label htmlFor={`${indicator.id}-checkbox`}>Đạt</Label>
                                                </div>
                                            )}

                                            {indicator.type === 'Percentage' && (
                                                <div className="grid gap-2">
                                                    <Label htmlFor={`${indicator.id}-input`}>Tỷ lệ (%)</Label>
                                                    <Input id={`${indicator.id}-input`} type="number" placeholder="Nhập tỷ lệ đạt được" />
                                                </div>
                                            )}

                                            {indicator.type === 'Numeric' && (
                                                <div className="grid gap-2">
                                                    <Label htmlFor={`${indicator.id}-input`}>Số lượng</Label>
                                                    <Input id={`${indicator.id}-input`} type="number" placeholder="Nhập số lượng" />
                                                </div>
                                            )}

                                            {indicator.type === 'Checklist' && (
                                                <div className="grid gap-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id={`${indicator.id}-check1`} />
                                                        <Label htmlFor={`${indicator.id}-check1`}>Có giao diện thân thiện</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id={`${indicator.id}-check2`} />
                                                        <Label htmlFor={`${indicator.id}-check2`}>Cập nhật thông tin thường xuyên</Label>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid gap-2">
                                                <Label htmlFor={`${indicator.id}-notes`}>Ghi chú/Giải trình</Label>
                                                <Textarea id={`${indicator.id}-notes`} placeholder="Thêm ghi chú nếu cần..." />
                                            </div>

                                            <FileUploadComponent />
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline">Lưu nháp</Button>
                <Button>Gửi đánh giá</Button>
            </CardFooter>
        </Card>
    </div>
  );
}
