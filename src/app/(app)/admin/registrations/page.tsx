
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Card,
  CardContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Clock,
  Download,
  FileX,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import { useData } from '@/context/DataContext';
import { useToast } from '@/hooks/use-toast';
import type { Assessment, Unit } from '@/lib/data';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function RegistrationManagementPage() {
  const {
    units,
    assessmentPeriods,
    assessments,
    updateAssessments,
  } = useData();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string | undefined>(
    assessmentPeriods.find((p) => p.isActive)?.id
  );
  
  const [rejectionTarget, setRejectionTarget] = useState<Assessment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const initialTab = searchParams.get('tab') || 'pending';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && TABS.some(t => t.value === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const getUnitInfo = (communeId: string) => {
    const unit = units.find((u) => u.id === communeId);
    if (!unit) return { name: 'Không xác định', parent: '' };
    const parent = units.find((u) => u.id === unit.parentId);
    return { name: unit.name, parent: parent?.name || '' };
  };

  const handleUpdateStatus = async (
    assessment: Assessment,
    newStatus: 'registration_approved' | 'registration_rejected',
    reason?: string
  ) => {
    
    const updatedAssessment = { 
      ...assessment, 
      status: newStatus,
      registrationRejectionReason: newStatus === 'registration_rejected' ? reason : ''
    };
    
    await updateAssessments(
      assessments.map((a) => (a.id === assessment.id ? updatedAssessment : a))
    );

    toast({
      title: 'Cập nhật thành công',
      description: `Đã ${newStatus === 'registration_approved' ? 'phê duyệt' : 'từ chối'} đăng ký của ${getUnitInfo(assessment.communeId).name}.`,
    });
    
    if(rejectionTarget) {
      setRejectionTarget(null);
      setRejectionReason('');
    }
  };

  const {
    unregisteredCommunes,
    pendingRegistrations,
    approvedRegistrations,
    rejectedRegistrations,
  } = useMemo(() => {
    if (!selectedPeriodId)
      return {
        unregisteredCommunes: [],
        pendingRegistrations: [],
        approvedRegistrations: [],
        rejectedRegistrations: [],
      };

    const allCommuneUnits = units.filter((u) => u.type === 'commune');
    const periodAssessments = assessments.filter(
      (a) => a.assessmentPeriodId === selectedPeriodId
    );
    const registeredCommuneIds = new Set(
      periodAssessments.map((a) => a.communeId)
    );

    const unregisteredCommunes = allCommuneUnits.filter(
      (u) => !registeredCommuneIds.has(u.id)
    );

    const pendingRegistrations = periodAssessments.filter(
      (a) => a.status === 'pending_registration'
    );
    const approvedRegistrations = periodAssessments.filter(
      (a) => a.status === 'registration_approved'
    );
    const rejectedRegistrations = periodAssessments.filter(
      (a) => a.status === 'registration_rejected'
    );

    return {
      unregisteredCommunes,
      pendingRegistrations,
      approvedRegistrations,
      rejectedRegistrations,
    };
  }, [selectedPeriodId, units, assessments]);

  const RegistrationTable = ({ data, type }: { data: (Assessment | Unit)[], type: 'pending' | 'approved' | 'rejected' | 'unregistered' }) => {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên đơn vị (Xã)</TableHead>
            <TableHead>Huyện/Thị xã</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item) => {
              const unitInfo = getUnitInfo((item as Assessment).communeId || item.id);
              let statusInfo;
              if(type === 'unregistered') {
                  statusInfo = { text: 'Chưa đăng ký', icon: FileX, className: 'bg-gray-400' };
              } else {
                  const assessment = item as Assessment;
                   const statusMap = {
                    pending_registration: { text: 'Chờ duyệt', icon: Clock, className: 'bg-amber-500' },
                    registration_approved: { text: 'Đã duyệt', icon: CheckCircle, className: 'bg-green-500' },
                    registration_rejected: { text: 'Bị từ chối', icon: XCircle, className: 'bg-red-500' },
                  };
                  statusInfo = statusMap[assessment.status as keyof typeof statusMap];
              }

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{unitInfo.name}</TableCell>
                  <TableCell>{unitInfo.parent}</TableCell>
                  <TableCell>
                    {statusInfo && (
                       <Badge className={`${statusInfo.className} text-white`}>
                        <statusInfo.icon className="mr-2 h-4 w-4" />
                        {statusInfo.text}
                       </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                     {type !== 'unregistered' && (item as Assessment).registrationFormUrl && (
                       <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open((item as Assessment).registrationFormUrl, '_blank')}
                        >
                          <Download className="mr-2 h-4 w-4" /> Xem đơn
                        </Button>
                    )}
                    {type === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => setRejectionTarget(item as Assessment)}
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" /> Từ chối
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                           onClick={() => handleUpdateStatus(item as Assessment, 'registration_approved')}
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" /> Phê duyệt
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                Không có dữ liệu.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  const TABS = [
    { value: 'pending', label: 'Chờ duyệt', data: pendingRegistrations, type: 'pending' as const },
    { value: 'approved', label: 'Đã duyệt', data: approvedRegistrations, type: 'approved' as const },
    { value: 'rejected', label: 'Bị từ chối', data: rejectedRegistrations, type: 'rejected' as const },
    { value: 'unregistered', label: 'Chưa đăng ký', data: unregisteredCommunes, type: 'unregistered' as const },
  ];

  return (
    <>
      <PageHeader
        title="Quản lý Đăng ký"
        description="Xem xét và phê duyệt các đơn đăng ký tham gia đánh giá từ các xã."
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách đăng ký</CardTitle>
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
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label} ({tab.data.length})
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                <RegistrationTable data={tab.data} type={tab.type} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={!!rejectionTarget} onOpenChange={(open) => !open && setRejectionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lý do từ chối đăng ký</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối cho đơn vị: <strong>{getUnitInfo(rejectionTarget?.communeId || '').name}</strong>. Xã sẽ thấy lý do này.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="rejectionReason">Lý do từ chối</Label>
            <Textarea 
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ví dụ: Đơn đăng ký thiếu chữ ký của lãnh đạo..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionTarget(null)}>Hủy</Button>
            <Button 
              variant="destructive" 
              disabled={!rejectionReason.trim()}
              onClick={() => handleUpdateStatus(rejectionTarget!, 'registration_rejected', rejectionReason)}
            >
              Xác nhận Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
