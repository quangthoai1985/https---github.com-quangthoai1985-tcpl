
'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, CheckCircle, Clock, Download, Eye, FileUp, UploadCloud, Loader2, X } from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import { useData } from '@/context/DataContext';
import { useToast } from '@/hooks/use-toast';
import type { Assessment, Unit } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';


function UploadDecision({ assessment, onUploadSuccess }: { assessment: Assessment, onUploadSuccess: (assessmentId: string, fileUrl: string) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { storage } = useData();
    const { toast } = useToast();

    const handleUpload = async () => {
        if (!file || !storage) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn một tệp để tải lên.' });
            return;
        }
        setIsUploading(true);
        try {
            const filePath = `hoso/${assessment.communeId}/announcements/${assessment.assessmentPeriodId}/${file.name}`;
            const storageRef = ref(storage, filePath);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            onUploadSuccess(assessment.id, downloadURL);
            toast({ title: 'Thành công', description: 'Đã tải lên quyết định công nhận.' });
            setFile(null);
        } catch (error) {
            console.error("Upload error:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tải lên tệp.' });
        } finally {
            setIsUploading(false);
        }
    }
    
    return (
        <div className="flex items-center gap-2">
            <div className='flex-grow'>
                <Input id={`file-${assessment.id}`} type="file" className="h-9 text-xs" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} disabled={isUploading} />
                 <p className="text-xs text-muted-foreground mt-1">Các tệp được chấp nhận: Ảnh, Video, Word, Excel, PDF. Dung lượng tối đa: 5MB.</p>
            </div>
            <Button size="sm" onClick={handleUpload} disabled={!file || isUploading}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4" />}
            </Button>
        </div>
    )
}

export default function AnnouncementPage() {
    const { units, assessmentPeriods, assessments, updateAssessments } = useData();
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>(
        assessmentPeriods.find((p) => p.isActive)?.id
    );

    const getUnitName = (communeId: string) => {
        return units.find((u) => u.id === communeId)?.name || 'Không xác định';
    };

    const handleUploadSuccess = async (assessmentId: string, fileUrl: string) => {
        const assessmentToUpdate = assessments.find(a => a.id === assessmentId);
        if (!assessmentToUpdate) return;
        
        const updatedAssessment: Assessment = {
            ...assessmentToUpdate,
            announcementDecisionUrl: fileUrl,
            announcementDate: new Date().toLocaleDateString('vi-VN'),
        };

        await updateAssessments(assessments.map(a => a.id === assessmentId ? updatedAssessment : a));
    };

    const communesToAnnounce = useMemo(() => {
        if (!selectedPeriodId) return [];
        return assessments.filter(
            (a) => a.assessmentPeriodId === selectedPeriodId && a.assessmentStatus === 'achieved_standard'
        );
    }, [selectedPeriodId, assessments]);

    return (
        <>
            <PageHeader
                title="Công bố Kết quả"
                description="Tải lên và quản lý quyết định công nhận cho các xã đã đạt chuẩn tiếp cận pháp luật."
            />
            <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-primary">
                            <Award className="h-8 w-8" />
                            Danh sách các xã đạt chuẩn
                        </CardTitle>
                        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Chọn đợt đánh giá" />
                            </SelectTrigger>
                            <SelectContent>
                                {assessmentPeriods.map((period) => (
                                    <SelectItem key={period.id} value={period.id}>
                                        {period.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <CardDescription>
                        Các xã được liệt kê dưới đây đã được hệ thống đánh giá là "Đạt chuẩn". Vui lòng tải lên quyết định công nhận chính thức từ UBND tỉnh.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">Tên đơn vị (Xã)</TableHead>
                                <TableHead>Ngày đạt chuẩn (Hệ thống)</TableHead>
                                <TableHead>Trạng thái công bố</TableHead>
                                <TableHead className="text-right w-[35%]">Quyết định của UBND tỉnh</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {communesToAnnounce.length > 0 ? (
                                communesToAnnounce.map((assessment) => (
                                    <TableRow key={assessment.id} className="hover:bg-green-50/50">
                                        <TableCell className="font-medium text-base">{getUnitName(assessment.communeId)}</TableCell>
                                        <TableCell>{assessment.approvalDate}</TableCell>
                                        <TableCell>
                                            {assessment.announcementDecisionUrl ? (
                                                <Badge variant="default" className="bg-green-600 text-white">
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Đã công bố ({assessment.announcementDate})
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-amber-500 text-white">
                                                    <Clock className="mr-2 h-4 w-4" />
                                                    Chờ quyết định
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {assessment.announcementDecisionUrl ? (
                                                <Button variant="outline" asChild>
                                                    <a href={assessment.announcementDecisionUrl} target="_blank" rel="noopener noreferrer">
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Xem Quyết định
                                                    </a>
                                                </Button>
                                            ) : (
                                                <UploadDecision assessment={assessment} onUploadSuccess={handleUploadSuccess} />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Không có xã nào đạt chuẩn trong đợt này.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
