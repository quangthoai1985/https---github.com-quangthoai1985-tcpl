
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
  Loader2,
  Undo2,
  Award,
  FileX,
  Send,
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
import React, { useState, useMemo } from 'react';
import PageHeader from '@/components/layout/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Assessment, Unit, Criterion, IndicatorResult } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';

const countTotalIndicators = (criteria: Criterion[]): number => {
    return criteria.reduce((total, criterion) => {
        return total + criterion.indicators.reduce((indicatorTotal, indicator) => {
            if (indicator.subIndicators && indicator.subIndicators.length > 0) {
                return indicatorTotal + indicator.subIndicators.length;
            }
            return indicatorTotal + 1;
        }, 0);
    }, 0);
};

const calculateProgress = (assessmentData: Record<string, IndicatorResult> | undefined, totalIndicators: number): number => {
    if (!assessmentData || totalIndicators === 0) {
        return 0;
    }
    
    // Đếm số chỉ tiêu đã có giá trị hoặc được đánh dấu là không thực hiện
    const assessedCount = Object.values(assessmentData).filter(result => 
        result.isTasked === false || (result.value !== null && result.value !== undefined && result.value !== '')
    ).length;
    
    return Math.round((assessedCount / totalIndicators) * 100);
};

const AdminDashboard = () => {
    const { units, assessments, assessmentPeriods } = useData();
    const [selectedPeriod, setSelectedPeriod] = React.useState<string | undefined>(assessmentPeriods.find(p => p.isActive)?.id);

    const {
        totalCommunes,
        totalRegisteredCommunes,
        achievedCount,
        notAchievedCount,
        notRegisteredCount,
        assessmentStatusChartData,
        chartConfig,
        progressData,
    } = React.useMemo(() => {
        const allCommuneUnits = units.filter(u => u.type === 'commune');
        const totalCommunes = allCommuneUnits.length;
        
        const periodAssessments = selectedPeriod 
            ? assessments.filter(a => a.assessmentPeriodId === selectedPeriod)
            : [];
        
        const registeredCommuneIds = new Set(periodAssessments.map(a => a.communeId));
        const totalRegisteredCommunes = registeredCommuneIds.size;
        
        const achievedCount = periodAssessments.filter(a => a.assessmentStatus === 'achieved_standard').length;
        const notAchievedCount = periodAssessments.filter(a => a.assessmentStatus === 'rejected').length;
        const pendingReviewCount = periodAssessments.filter(a => a.assessmentStatus === 'pending_review').length;
        const returnedForRevisionCount = periodAssessments.filter(a => a.assessmentStatus === 'returned_for_revision').length;

        const notRegisteredCount = allCommuneUnits.length - totalRegisteredCommunes;


        const chartData = [
            { name: 'Đạt chuẩn', value: achievedCount, fill: 'hsl(var(--chart-2))' },
            { name: 'Chờ duyệt', value: pendingReviewCount, fill: 'hsl(var(--chart-3))' },
            { name: 'Không đạt chuẩn', value: notAchievedCount, fill: 'hsl(var(--chart-4))' },
            { name: 'Yêu cầu Bổ sung', value: returnedForRevisionCount, fill: 'hsl(var(--chart-5))' },
            { name: 'Chưa đăng ký', value: notRegisteredCount, fill: 'hsl(var(--muted))' },
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
          { name: 'Tuần 1', 'Số lượng': Math.max(0, Math.floor(totalRegisteredCommunes * 0.1) - 1) },
          { name: 'Tuần 2', 'Số lượng': Math.max(0, Math.floor(totalRegisteredCommunes * 0.3) - 2) },
          { name: 'Tuần 3', 'Số lượng': Math.max(0, Math.floor(totalRegisteredCommunes * 0.6) - 5) },
          { name: 'Tuần 4', 'Số lượng': totalRegisteredCommunes },
        ];


        return {
            totalCommunes,
            totalRegisteredCommunes,
            achievedCount,
            notAchievedCount,
            notRegisteredCount,
            assessmentStatusChartData,
            chartConfig,
            progressData,
        };

    }, [selectedPeriod, assessments, units]);

    const kpiCards = [
      { 
        title: "Tổng số xã", 
        value: totalCommunes, 
        icon: Users, 
        color: "bg-blue-500",
        link: "/admin/units"
      },
      { 
        title: "Đạt chuẩn TCPL", 
        value: achievedCount,
        total: totalRegisteredCommunes,
        icon: Award, 
        color: "bg-green-500",
        link: "/admin/reviews?tab=achieved_standard"
      },
      { 
        title: "Không đạt chuẩn TCPL", 
        value: notAchievedCount,
        total: totalRegisteredCommunes,
        icon: AlertTriangle, 
        color: "bg-red-500",
        link: "/admin/reviews?tab=rejected"
      },
      { 
        title: "Chưa đăng ký", 
        value: notRegisteredCount, 
        icon: FileX, 
        color: "bg-gray-500",
        link: "/admin/registrations?tab=unregistered"
      },
    ];

    const getUnitName = (communeId?: string) => {
        if (!communeId) return 'Không xác định';
        return units.find(u => u.id === communeId)?.name || 'Không xác định';
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
          const hasRatio = card.total !== undefined && card.total > 0;
          const percentage = hasRatio ? Math.round((card.value / card.total!) * 100) : 0;
          
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
                    <div className="flex items-baseline gap-2">
                        <div className="text-4xl font-bold">{card.value}</div>
                        {hasRatio && (
                            <span className="text-lg font-medium text-white/80">/ {card.total}</span>
                        )}
                    </div>
                     {hasRatio && (
                        <p className="text-xs text-white/80 pt-1">
                            Chiếm {percentage}% tổng số đã đăng ký
                        </p>
                    )}
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
                {assessments.filter(a => a.assessmentStatus === 'pending_review' && a.assessmentPeriodId === selectedPeriod).length > 0 ? 
                  assessments.filter(a => a.assessmentStatus === 'pending_review' && a.assessmentPeriodId === selectedPeriod).map((assessment) => (
                      <TableRow key={assessment.id} className="hover:bg-muted/50">
                          <TableCell>
                          <div className="font-medium">{getUnitName(assessment.communeId)}</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{assessment.assessmentSubmissionDate}</TableCell>
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
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Không có hồ sơ nào đang chờ duyệt.
                      </TableCell>
                    </TableRow>
                  )
                }
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
    </>
)};

const CommuneDashboard = () => {
    const { storage, assessments, currentUser, assessmentPeriods, updateAssessments, deleteAssessment, criteria } = useData();
    const { toast } = useToast();
    const [registrationFile, setRegistrationFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    const activePeriod = assessmentPeriods.find(p => p.isActive);
    const myAssessment = activePeriod && currentUser 
        ? assessments.find(a => a.assessmentPeriodId === activePeriod.id && a.communeId === currentUser.communeId) 
        : undefined;

    const totalIndicators = useMemo(() => countTotalIndicators(criteria), [criteria]);

    const uploadFileAndGetURL = async (periodId: string, communeId: string, file: File): Promise<string> => {
        if (!storage) throw new Error("Firebase Storage is not initialized.");
        const filePath = `hoso/${communeId}/registration/${periodId}/${file.name}`;
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
                registrationStatus: 'pending',
                assessmentStatus: 'not_started',
                registrationSubmissionDate: new Date().toLocaleDateString('vi-VN'),
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
                registrationStatus: 'pending',
                registrationFormUrl: fileUrl,
                registrationRejectionReason: '',
                registrationSubmissionDate: new Date().toLocaleDateString('vi-VN'),
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

    const handleWithdraw = async () => {
        if (!myAssessment) return;
        setIsWithdrawing(true);
        try {
            await deleteAssessment(myAssessment.id);
            toast({ title: "Thành công", description: "Đã thu hồi đơn đăng ký. Bạn có thể nộp lại đơn mới." });
        } catch (error) {
            console.error("Withdrawal error:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể thu hồi đơn đăng ký.' });
        } finally {
            setIsWithdrawing(false);
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
    const canStartAssessment = myAssessment?.registrationStatus === 'approved';
    const isRegistrationRejected = myAssessment?.registrationStatus === 'rejected';
    const isPendingRegistration = myAssessment?.registrationStatus === 'pending';
    const isAssessmentReturned = myAssessment?.assessmentStatus === 'returned_for_revision';

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
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {isSubmitting ? 'Đang gửi...' : 'Gửi đăng ký'}
                            </Button>
                        </>
                    )}
                </div>
            );
        }

        const statusMap = {
            pending: { text: 'Chờ duyệt đăng ký', icon: FileClock, className: 'bg-amber-500' },
            approved: { text: 'Đã duyệt đăng ký', icon: CheckCircle, className: 'bg-green-500' },
            rejected: { text: 'Đăng ký bị từ chối', icon: XCircle, className: 'bg-red-500' },
        };
        
        const currentStatus = myAssessment.registrationStatus;
        const statusInfo = statusMap[currentStatus as keyof typeof statusMap];

        if (statusInfo) {
             return (
                <div className='p-4 border rounded-lg space-y-4'>
                    <h3 className='font-semibold text-lg'>Bước 1: Đăng ký tham gia</h3>
                    <p className="font-semibold">Trạng thái đăng ký:</p>
                    <div className="flex items-center justify-between">
                        <Badge className={`${statusInfo.className} text-white`}>
                           <statusInfo.icon className="mr-2 h-4 w-4" />
                           {statusInfo.text}
                        </Badge>
                        {isPendingRegistration && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Undo2 className="mr-2 h-4 w-4" /> Thu hồi & Chỉnh sửa
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Xác nhận thu hồi?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Hành động này sẽ thu hồi đơn đăng ký đã gửi. Bạn sẽ có thể tải lên một đơn mới và gửi lại.
                                            Admin sẽ không thể duyệt đơn đã thu hồi.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleWithdraw} disabled={isWithdrawing} className="bg-destructive hover:bg-destructive/90">
                                            {isWithdrawing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                            Xác nhận thu hồi
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
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
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        {isSubmitting ? 'Đang gửi lại...' : 'Gửi lại'}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            );
        }
        
        return null;
    };


    const AssessmentButton = () => {
        const assessmentNotStarted = myAssessment?.assessmentStatus === 'not_started' || myAssessment?.assessmentStatus === 'draft' || myAssessment?.assessmentStatus === 'returned_for_revision';
        const buttonText = canStartAssessment && assessmentNotStarted ? 'Thực hiện Tự đánh giá' : 'Xem lại hồ sơ';
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

                    {isAssessmentReturned && (
                         <div className={`p-4 border rounded-lg bg-amber-50 border-amber-300`}>
                            <h3 className='font-semibold text-lg text-amber-800'>Thông báo: Yêu cầu bổ sung/chỉnh sửa</h3>
                             <Alert variant="destructive" className="mt-2 border-amber-400 text-amber-900 [&>svg]:text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle className="text-amber-800">Ghi chú từ Admin:</AlertTitle>
                                <AlertDescription>
                                    Hồ sơ của bạn đã được trả lại. Vui lòng xem chi tiết các ghi chú của Admin trong trang Tự đánh giá và gửi lại.
                                </AlertDescription>
                            </Alert>
                             <Button className='mt-4' asChild>
                                <Link href={`/admin/reviews/${myAssessment?.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Chỉnh sửa & Gửi lại hồ sơ
                                </Link>
                            </Button>
                        </div>
                    )}


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
                                <TableHead>Ngày nộp ĐK</TableHead>
                                <TableHead>Tiến độ</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {(assessments.filter(a => a.communeId === currentUser?.communeId) || []).length > 0 ? (assessments.filter(a => a.communeId === currentUser?.communeId) || []).map(assessment => {
                               if (!assessment) return null;
                               
                               const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
                                    'achieved_standard': { text: 'Đạt chuẩn', icon: Award, badge: 'default', className: 'bg-blue-600' },
                                    'pending_review': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary', className: 'bg-amber-500' },
                                    'returned_for_revision': { text: 'Yêu cầu Bổ sung', icon: Undo2, badge: 'destructive', className: 'bg-amber-600' },
                                    'rejected': { text: 'Không đạt', icon: XCircle, badge: 'destructive' },
                                    'draft': { text: 'Đang tự đánh giá', icon: Edit, badge: 'secondary' },
                                    'not_started': { text: 'ĐK đã duyệt', icon: UserCheck, badge: 'default', className: 'bg-green-500' },
                               };

                               const getLink = () => {
                                   if (assessment.assessmentStatus === 'draft' || assessment.assessmentStatus === 'not_started' || assessment.assessmentStatus === 'returned_for_revision') {
                                       return '/commune/assessments';
                                   }
                                   return `/admin/reviews/${assessment.id}`;
                               }
                               
                               const getButtonText = () => {
                                   if (assessment.assessmentStatus === 'returned_for_revision') return 'Giải trình & Gửi lại';
                                   if (assessment.assessmentStatus === 'draft' || assessment.assessmentStatus === 'not_started') return 'Tiếp tục chấm điểm';
                                   return 'Xem chi tiết kết quả';
                               }
                               
                               const progress = calculateProgress(assessment.assessmentData, totalIndicators);
                               const showProgress = assessment.assessmentStatus === 'draft' || assessment.assessmentStatus === 'not_started';
                               const statusInfo = statusMap[assessment.assessmentStatus] || { text: 'Không rõ', icon: Eye, badge: 'secondary' };

                               return (
                                    <TableRow key={assessment.id}>
                                        <TableCell className="font-medium">{getPeriodName(assessment.assessmentPeriodId)}</TableCell>
                                        <TableCell>{assessment.registrationSubmissionDate || 'Chưa nộp'}</TableCell>
                                        <TableCell>
                                            {showProgress ? (
                                                <div className="flex items-center gap-2">
                                                    <Progress value={progress} className="w-[80px] h-2" />
                                                    <span className="text-xs text-muted-foreground">{progress}%</span>
                                                </div>
                                            ) : (
                                                <Badge variant={statusInfo.badge} className={`${statusInfo.className} text-white`}>
                                                    <statusInfo.icon className="mr-2 h-4 w-4" />
                                                    {statusInfo.text}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="outline" size="sm" asChild>
                                                <Link href={getLink()}>
                                                  <Eye className="mr-2 h-4 w-4" />{getButtonText()}
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
