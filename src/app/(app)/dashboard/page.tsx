
'use client';
import {
  Users,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  FilePenLine,
  ArrowRight,
  Edit,
  FileClock,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import { Pie, PieChart, Cell, ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import React, { useState } from 'react';
import PageHeader from '@/components/layout/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Assessment, Unit } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';


const AdminDashboard = () => {
    const { units, assessments, assessmentPeriods } = useData();
    const [selectedPeriod, setSelectedPeriod] = React.useState<string | undefined>(assessmentPeriods.find(p => p.isActive)?.id);

    const {
        periodAssessments,
        totalCommunes,
        pendingReviewCount,
        approvedCount,
        rejectedCount,
        pendingRegistrationCount,
        assessmentStatusChartData,
        chartConfig,
        progressData,
    } = React.useMemo(() => {
        const allCommuneUnits = units.filter(u => u.type === 'commune');
        const totalCommunes = allCommuneUnits.length;
        
        const periodAssessments = selectedPeriod 
            ? assessments.filter(a => a.assessmentPeriodId === selectedPeriod)
            : [];
        
        const sentCommuneIds = new Set(periodAssessments.map(a => a.communeId));
        
        const pendingReviewCount = periodAssessments.filter(a => a.status === 'pending_review').length;
        const approvedCount = periodAssessments.filter(a => a.status === 'approved').length;
        const rejectedCount = periodAssessments.filter(a => a.status === 'rejected').length;
        const pendingRegistrationCount = periodAssessments.filter(a => a.status === 'pending_registration').length;

        const notYetRegisteredCount = totalCommunes - sentCommuneIds.size;

        const chartData = [
            { name: 'Đã duyệt', value: approvedCount, fill: 'hsl(var(--chart-2))' },
            { name: 'Chờ duyệt', value: pendingReviewCount, fill: 'hsl(var(--chart-3))' },
            { name: 'Bị từ chối', value: rejectedCount, fill: 'hsl(var(--chart-4))' },
            { name: 'Chưa đăng ký', value: notYetRegisteredCount, fill: 'hsl(var(--muted))' },
            { name: 'Chờ duyệt ĐK', value: pendingRegistrationCount, fill: 'hsl(var(--chart-1))' },
        ];
        
        const assessmentStatusChartData = chartData.filter(d => d.value > 0);
        
        const chartConfig: any = {};
        assessmentStatusChartData.forEach(item => {
            chartConfig[item.name] = {
                label: item.name,
                color: item.fill,
            };
        });

        // Mock progress data for now, as we don't have time-series data
        const progressData = [
          { name: 'Tuần 1', 'Số lượng': Math.max(0, Math.floor(sentCommuneIds.size * 0.1) - 1) },
          { name: 'Tuần 2', 'Số lượng': Math.max(0, Math.floor(sentCommuneIds.size * 0.3) - 2) },
          { name: 'Tuần 3', 'Số lượng': Math.max(0, Math.floor(sentCommuneIds.size * 0.6) - 5) },
          { name: 'Tuần 4', 'Số lượng': sentCommuneIds.size },
        ];


        return {
            periodAssessments,
            totalCommunes,
            pendingReviewCount,
            approvedCount,
            rejectedCount,
            pendingRegistrationCount,
            assessmentStatusChartData,
            chartConfig,
            progressData,
        };

    }, [selectedPeriod, assessments, units]);


    const kpiCards = [
      { 
        title: "Tổng số xã", 
        value: totalCommunes.toString(), 
        icon: Users, 
        color: "bg-gray-500",
        link: "/admin/units"
      },
      { 
        title: "Chờ duyệt ĐK", 
        value: pendingRegistrationCount.toString(), 
        icon: UserCheck, 
        color: "bg-blue-500",
        link: "/admin/registrations?tab=pending"
      },
      { 
        title: "Chờ duyệt HS", 
        value: pendingReviewCount.toString(), 
        icon: FileClock, 
        color: "bg-amber-500",
        link: "/admin/reviews"
      },
      { 
        title: "Đã duyệt", 
        value: approvedCount.toString(), 
        icon: ThumbsUp, 
        color: "bg-emerald-500",
        link: "/admin/reviews"
      },
    ];

    const getUnitName = (communeId?: string) => {
        if (!communeId) return { communeName: 'Không xác định', districtName: '', provinceName: '' };
        
        const unit = units.find(u => u.id === communeId);
        if (!unit) return { communeName: 'Không xác định', districtName: '', provinceName: '' };
        
        if (unit.type === 'province') {
            return { communeName: unit.name, districtName: '', provinceName: '' };
        }
        
        const district = units.find(u => u.id === unit.parentId);
        if (!district) return { communeName: unit.name, districtName: 'Không xác định', provinceName: '' };
        
        const province = units.find(u => u.id === district.parentId);

        return {
            communeName: unit.name,
            districtName: district?.name || '',
            provinceName: province?.name || '',
        }
    }


    return (
    <>
    <div className="flex items-center justify-between">
        <PageHeader title="Tổng quan" description="Xem các chỉ số và hoạt động tổng thể của hệ thống." />
         <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Chọn đợt đánh giá" />
            </SelectTrigger>
            <SelectContent>
                {assessmentPeriods.map(period => (
                    <SelectItem key={period.id} value={period.id}>{period.name}</SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>
    </div>
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link href={card.link} key={index}>
              <Card className={`${card.color} text-white shadow-lg transition-transform transform hover:scale-102`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className="h-5 w-5" />
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Đánh giá các xã ({assessmentPeriods.find(p=>p.id===selectedPeriod)?.name || 'Tất cả'})</CardTitle>
            <CardDescription>Phân bố trạng thái của các hồ sơ trong đợt được chọn.</CardDescription>
          </CardHeader>
           <CardContent className="flex items-center justify-center">
            <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square h-[300px]"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                        data={assessmentStatusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        strokeWidth={5}
                    >
                        {assessmentStatusChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} className="stroke-background hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"/>
                        ))}
                    </Pie>
                     <ChartLegend
                        content={<ChartLegendContent nameKey="name" />}
                        className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                    />
                    </PieChart>
                </ResponsiveContainer>
             </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Tiến độ nộp hồ sơ</CardTitle>
             <CardDescription>Số lượng hồ sơ nộp theo thời gian (dữ liệu giả định).</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }}/>
                        <YAxis tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                border: '1px solid hsl(var(--border))'
                            }}
                        />
                        <Line type="monotone" dataKey="Số lượng" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Đánh giá chờ duyệt gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Xã</TableHead>
                  <TableHead className="hidden font-semibold md:table-cell">Ngày gửi</TableHead>
                  <TableHead className="hidden font-semibold lg:table-cell">Người gửi</TableHead>
                  <TableHead className="font-semibold">Trạng thái</TableHead>
                  <TableHead><span className="sr-only">Hành động</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodAssessments.filter(a => a.status === 'pending_review').map((assessment) => {
                    const unitInfo = getUnitName(assessment.communeId);
                    return (
                        <TableRow key={assessment.id} className="hover:bg-muted/50">
                            <TableCell>
                            <div className="font-medium">{unitInfo.communeName}</div>
                            <div className="text-sm text-muted-foreground">
                                {unitInfo.districtName}, {unitInfo.provinceName}
                            </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{assessment.submissionDate}</TableCell>
                            <TableCell className="hidden lg:table-cell">{assessment.submittedBy}</TableCell>
                            <TableCell>
                            <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">Chờ duyệt</Badge>
                            </TableCell>
                            <TableCell>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/reviews/${assessment.id}`}>Xem chi tiết</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
    </>
)};

const CommuneDashboard = () => {
    const { storage, assessments, currentUser, assessmentPeriods, updateAssessments } = useData();
    const { toast } = useToast();
    const [registrationFile, setRegistrationFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activePeriod = assessmentPeriods.find(p => p.isActive);
    const myAssessment = activePeriod && currentUser 
        ? assessments.find(a => a.assessmentPeriodId === activePeriod.id && a.communeId === currentUser.communeId) 
        : undefined;

    const uploadFileAndGetURL = async (periodId: string, communeId: string, file: File): Promise<string> => {
        const filePath = `assessments/${periodId}/${communeId}/registration/${file.name}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const handleRegister = async () => {
        if (!activePeriod || !currentUser || !registrationFile) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn tệp đơn đăng ký.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const fileUrl = await uploadFileAndGetURL(activePeriod.id, currentUser.communeId, registrationFile);
            
            const assessmentId = `assess_${activePeriod.id}_${currentUser.communeId}`;
            const newAssessment: Assessment = {
                id: assessmentId,
                assessmentPeriodId: activePeriod.id,
                communeId: currentUser.communeId,
                status: 'pending_registration',
                submissionDate: new Date().toLocaleDateString('vi-VN'),
                submittedBy: currentUser.id,
                registrationFormUrl: fileUrl,
            };

            await updateAssessments([...assessments, newAssessment]);
            toast({ title: 'Thành công', description: 'Đã gửi đơn đăng ký. Vui lòng chờ Admin duyệt.' });
        } catch (error) {
            console.error("File upload error: ", error);
            toast({ variant: 'destructive', title: 'Lỗi tải tệp', description: 'Đã xảy ra lỗi khi tải tệp lên. Vui lòng kiểm tra lại quy tắc bảo mật của Storage và thử lại.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleResubmit = async () => {
        if (!myAssessment || !registrationFile || !activePeriod) {
             toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn tệp đơn đăng ký mới.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const fileUrl = await uploadFileAndGetURL(activePeriod.id, myAssessment.communeId, registrationFile);
            
            const updatedAssessment: Assessment = {
                ...myAssessment,
                status: 'pending_registration',
                registrationFormUrl: fileUrl,
                registrationRejectionReason: '',
                submissionDate: new Date().toLocaleDateString('vi-VN'),
            };

            await updateAssessments(assessments.map(a => a.id === myAssessment.id ? updatedAssessment : a));
            toast({ title: 'Thành công', description: 'Đã gửi lại đơn đăng ký. Vui lòng chờ Admin duyệt.' });
        } catch (error) {
            console.error("File re-upload error: ", error);
            toast({ variant: 'destructive', title: 'Lỗi tải tệp', description: 'Đã xảy ra lỗi khi tải tệp lên. Vui lòng thử lại.' });
        } finally {
            setIsSubmitting(false);
        }
    };


    const getPeriodName = (periodId: string) => {
        return assessmentPeriods.find(p => p.id === periodId)?.name || 'Không xác định';
    }

    const isRegistrationDeadlinePassed = () => {
        if (!activePeriod?.registrationDeadline) return false;
        // Basic DD/MM/YYYY to Date conversion
        const parts = activePeriod.registrationDeadline.split('/');
        if (parts.length !== 3) return false;
        const deadline = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        deadline.setHours(23, 59, 59, 999); // Set to end of day
        return new Date() > deadline;
    };

    const deadlinePassed = isRegistrationDeadlinePassed();
    const canStartAssessment = myAssessment?.status === 'registration_approved';
    const isRegistrationRejected = myAssessment?.status === 'registration_rejected';

    const renderRegistrationStatus = () => {
        if (!myAssessment) {
             return (
                 <div className={`space-y-4 p-4 border rounded-lg ${deadlinePassed ? 'bg-muted' : ''}`}>
                    <h3 className='font-semibold text-lg'>Bước 1: Đăng ký tham gia</h3>
                    {deadlinePassed ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Đã hết hạn đăng ký!</AlertTitle>
                            <AlertDescription>
                                Đã qua thời hạn đăng ký cho kỳ đánh giá này ({activePeriod?.registrationDeadline}). Vui lòng liên hệ Admin để biết thêm chi tiết.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <>
                            <p className='text-sm text-muted-foreground'>Bạn cần tải lên đơn đăng ký (file văn bản hoặc PDF) để Admin phê duyệt trước khi có thể bắt đầu tự đánh giá.</p>
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Input id="registration-file" type="file" onChange={(e) => setRegistrationFile(e.target.files ? e.target.files[0] : null)} disabled={isSubmitting} />
                            </div>
                            <Button onClick={handleRegister} disabled={!registrationFile || isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePenLine className="mr-2 h-4 w-4" />}
                                {isSubmitting ? 'Đang gửi...' : 'Gửi đăng ký'}
                            </Button>
                        </>
                    )}
                </div>
            );
        }

        const statusMap = {
            pending_registration: { text: 'Chờ duyệt đăng ký', icon: FileClock, className: 'bg-amber-500' },
            registration_approved: { text: 'Đã duyệt đăng ký', icon: CheckCircle, className: 'bg-green-500' },
            registration_rejected: { text: 'Đăng ký bị từ chối', icon: XCircle, className: 'bg-red-500' },
        };
        
        const currentStatus = myAssessment.status;
        let statusInfo = null;

        if (Object.prototype.hasOwnProperty.call(statusMap, currentStatus)) {
            statusInfo = statusMap[currentStatus as keyof typeof statusMap];
        }


        if (statusInfo) {
             return (
                <div className='p-4 border rounded-lg space-y-4'>
                    <h3 className='font-semibold text-lg'>Bước 1: Đăng ký tham gia</h3>
                    <p className="font-semibold">Trạng thái đăng ký:</p>
                    <div className="flex items-center gap-4 mt-2">
                        <Badge className={`${statusInfo.className} text-white`}>
                           <statusInfo.icon className="mr-2 h-4 w-4" />
                           {statusInfo.text}
                        </Badge>
                    </div>
                     {(isRegistrationRejected) && (
                        <>
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Lý do từ chối:</AlertTitle>
                                <AlertDescription>
                                    {myAssessment.registrationRejectionReason || "Không có lý do cụ thể."}
                                </AlertDescription>
                            </Alert>
                            {!deadlinePassed && (
                                <div className="pt-4 border-t border-dashed">
                                    <h4 className="font-medium">Gửi lại đơn đăng ký:</h4>
                                    <p className='text-sm text-muted-foreground'>Vui lòng tải lên đơn đăng ký đã được chỉnh sửa/bổ sung.</p>
                                    <div className="grid w-full max-w-sm items-center gap-1.5 mt-2">
                                        <Input id="registration-file-resubmit" type="file" onChange={(e) => setRegistrationFile(e.target.files ? e.target.files[0] : null)} disabled={isSubmitting} />
                                    </div>
                                    <Button onClick={handleResubmit} disabled={!registrationFile || isSubmitting} className='mt-2'>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePenLine className="mr-2 h-4 w-4" />}
                                        {isSubmitting ? 'Đang gửi lại...' : 'Gửi lại'}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            );
        }
        
        // This handles statuses beyond the registration phase ('pending_review', 'approved', 'rejected', 'draft')
        // We can just show the registration was approved.
        if (myAssessment.status) {
            return (
                <div className='p-4 border rounded-lg space-y-4'>
                    <h3 className='font-semibold text-lg'>Bước 1: Đăng ký tham gia</h3>
                    <p className="font-semibold">Trạng thái đăng ký:</p>
                    <div className="flex items-center gap-4 mt-2">
                         <Badge className="bg-green-500 text-white">
                           <CheckCircle className="mr-2 h-4 w-4" />
                           Đã duyệt đăng ký
                        </Badge>
                    </div>
                </div>
            )
        }
        
        return null;
    };


    const AssessmentButton = () => {
        const buttonText = canStartAssessment ? 'Thực hiện Tự đánh giá' : 'Chưa thể tự đánh giá';
        const button = (
            <Button className='mt-4' disabled={!canStartAssessment}>
                {buttonText} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        );

        if (canStartAssessment) {
            return <Link href="/commune/assessments">{button}</Link>;
        }
        return button;
    };


    return (
        <>
        <PageHeader title="Đăng ký & Theo dõi" description="Thực hiện đăng ký tham gia và theo dõi tiến độ hồ sơ đánh giá với Sở Tư pháp."/>
        <div className="flex flex-col gap-6">
            {activePeriod ? (
            <Card>
                <CardHeader>
                    <CardTitle>Kỳ đánh giá: {activePeriod.name}</CardTitle>
                    <CardDescription>
                        Hạn chót đăng ký: {activePeriod.registrationDeadline || 'Chưa có'}. Hạn nộp hồ sơ: {activePeriod.endDate}.
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                    {renderRegistrationStatus()}
                    
                    <div className={`p-4 border rounded-lg ${!canStartAssessment && 'bg-muted opacity-60'}`}>
                         <h3 className='font-semibold text-lg'>Bước 2: Tự đánh giá</h3>
                         <p className='text-sm text-muted-foreground mt-1'>Sau khi đăng ký được duyệt, bạn có thể bắt đầu tự đánh giá theo bộ tiêu chí.</p>
                         <AssessmentButton />
                    </div>

                </CardContent>
            </Card>
            ) : (
             <Card>
                <CardHeader>
                    <CardTitle>Thông báo</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Hiện tại không có kỳ đánh giá nào đang hoạt động. Vui lòng chờ Admin khởi tạo.</p>
                </CardContent>
            </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Lịch sử các đợt đánh giá</CardTitle>
                    <CardDescription>
                        Theo dõi trạng thái các hồ sơ đánh giá bạn đã gửi.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kỳ đánh giá</TableHead>
                                <TableHead>Ngày nộp</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {(assessments.filter(a => a.communeId === currentUser?.communeId) || []).length > 0 ? (assessments.filter(a => a.communeId === currentUser?.communeId) || []).map(assessment => {
                               if (!assessment) return null;
                               
                               const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
                                    'approved': { text: 'Đã duyệt', icon: CheckCircle, badge: 'default', className: 'bg-emerald-500' },
                                    'pending_review': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary', className: 'bg-amber-500' },
                                    'rejected': { text: 'Bị từ chối', icon: XCircle, badge: 'destructive', className: 'bg-red-500' },
                                    'draft': { text: 'Bản nháp', icon: Edit, badge: 'secondary' },
                                    'pending_registration': { text: 'Chờ duyệt ĐK', icon: FileClock, badge: 'secondary', className: 'bg-blue-500' },
                                    'registration_approved': { text: 'ĐK đã duyệt', icon: UserCheck, badge: 'default', className: 'bg-green-500' },
                                    'registration_rejected': { text: 'ĐK bị từ chối', icon: XCircle, badge: 'destructive', className: 'bg-red-500' },
                                };
                               const statusInfo = statusMap[assessment.status] || { text: 'Không rõ', icon: Eye, badge: 'secondary' };

                               return (
                                    <TableRow key={assessment.id}>
                                        <TableCell className="font-medium">{getPeriodName(assessment.assessmentPeriodId)}</TableCell>
                                        <TableCell>{assessment.submissionDate || 'Chưa nộp'}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusInfo.badge} className={`${statusInfo.className} text-white`}>
                                                <statusInfo.icon className="mr-2 h-4 w-4" />
                                                {statusInfo.text}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="outline" size="sm" asChild>
                                                <Link href={assessment.status === 'registration_approved' ? '/commune/assessments' : `/admin/reviews/${assessment.id}`}>
                                                  {assessment.status === 'rejected' ? 
                                                    <><Edit className="mr-2 h-4 w-4" />Giải trình & Gửi lại</> : 
                                                    (assessment.status === 'draft' || assessment.status === 'registration_approved') ?
                                                    <><Edit className="mr-2 h-4 w-4" />Tiếp tục chấm điểm</> :
                                                    <><Eye className="mr-2 h-4 w-4" />Xem chi tiết</>
                                                  }
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                               )
                           }) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">Chưa có hồ sơ đánh giá nào.</TableCell>
                            </TableRow>
                           )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        </>
    );
};


export default function DashboardPage() {
  const { role } = useData();

  return (
    <div className="flex flex-1 flex-col gap-4">
      {role === 'admin' ? <AdminDashboard /> : <CommuneDashboard />}
    </div>
  );
}
