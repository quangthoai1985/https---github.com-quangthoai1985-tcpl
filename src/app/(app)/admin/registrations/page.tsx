
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
  Eye,
  FileX,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  Undo2,
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
    users,
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
  
  const [actionTarget, setActionTarget] = useState<{assessment: Assessment, type: 'reject' | 'return'} | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);
  
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
    assessmentId: string,
    newStatus: 'approved' | 'rejected' | 'pending',
    reason?: string
  ) => {
    const assessmentToUpdate = assessments.find(a => a.id === assessmentId);
    if (!assessmentToUpdate) return;
    
    const updatedAssessment: Assessment = { 
      ...assessmentToUpdate, 
      registrationStatus: newStatus,
      registrationRejectionReason: newStatus === 'rejected' ? reason : '',
      // When admin approves registration, set the assessment status to 'not_started'
      assessmentStatus: newStatus === 'approved' ? 'not_started' : assessmentToUpdate.assessmentStatus,
    };
    
    await updateAssessments(
      assessments.map((a) => (a.id === assessmentId ? updatedAssessment : a))
    );

    let actionText = '';
    if (newStatus === 'approved') actionText = 'phê duyệt';
    else if (newStatus === 'rejected') actionText = 'từ chối';
    else if (newStatus === 'pending') actionText = 'hoàn tác về chờ duyệt';
    

    toast({
      title: 'Cập nhật thành công',
      description: `Đã ${actionText} đăng ký của ${getUnitInfo(updatedAssessment.communeId).name}.`,
    });
    
    if(actionTarget) {
      setActionTarget(null);
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
      (a) => a.registrationStatus === 'pending'
    );
    const approvedRegistrations = periodAssessments.filter(
      (a) => a.registrationStatus === 'approved'
    );
    const rejectedRegistrations = periodAssessments.filter(
      (a) => a.registrationStatus === 'rejected'
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
            <TableHead>Tên cán bộ</TableHead>
            <TableHead>Số điện thoại</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item) => {
              const isAssessment = 'communeId' in item;
              const communeId = isAssessment ? item.communeId : item.id;
              const unitInfo = getUnitInfo(communeId);
              const responsibleUser = users.find(u => u.communeId === communeId);

              let statusInfo;
              if(type === 'unregistered') {
                  statusInfo = { text: 'Chưa đăng ký', icon: FileX, className: 'bg-gray-400' };
              } else {
                  const assessment = item as Assessment;
                   const statusMap = {
                    pending: { text: 'Chờ duyệt', icon: Clock, className: 'bg-amber-500' },
                    approved: { text: 'Đã duyệt', icon: CheckCircle, className: 'bg-green-500' },
                    rejected: { text: 'Bị từ chối', icon: XCircle, className: 'bg-red-500' },
                  };
                  statusInfo = statusMap[assessment.registrationStatus as keyof typeof statusMap];
              }

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{unitInfo.name}</TableCell>
                  <TableCell>{responsibleUser?.displayName || 'N/A'}</TableCell>
                  <TableCell>{responsibleUser?.phoneNumber || 'N/A'}</TableCell>
                  <TableCell>
                    {statusInfo && (
                       <Badge className={`${statusInfo.className} text-white`}>
                        <statusInfo.icon className="mr-2 h-4 w-4" />
                        {statusInfo.text}
                       </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                     {isAssessment && (item as Assessment).registrationFormUrl && (
                       <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewFile({ name: `Đơn của ${unitInfo.name}`, url: (item as Assessment).registrationFormUrl! })}
                        >
                          <Eye className="mr-2 h-4 w-4" /> Xem đơn
                        </Button>
                    )}
                    {type === 'pending' && isAssessment && (
                      <>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => setActionTarget({ assessment: item as Assessment, type: 'reject'})}
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" /> Từ chối
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                           onClick={() => handleUpdateStatus(item.id, 'approved')}
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" /> Phê duyệt
                        </Button>
                      </>
                    )}
                    {type === 'approved' && isAssessment && (
                       <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdateStatus(item.id, 'pending')}
                        >
                          <Undo2 className="mr-2 h-4 w-4" /> Hoàn tác
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
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
      
      <Dialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lý do từ chối đăng ký</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do. Đơn vị <strong>{getUnitInfo(actionTarget?.assessment.communeId || '').name}</strong> sẽ thấy lý do này.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="rejectionReason">Lý do</Label>
            <Textarea 
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ví dụ: Đơn đăng ký thiếu chữ ký của lãnh đạo..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)}>Hủy</Button>
            <Button 
              variant="destructive" 
              disabled={!rejectionReason.trim()}
              onClick={() => handleUpdateStatus(actionTarget!.assessment.id, 'rejected', rejectionReason)}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

    