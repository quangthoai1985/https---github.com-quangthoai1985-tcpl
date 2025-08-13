
'use client';

import { Button } from '@/components/ui/button';
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
import { recentAssessments } from '@/lib/data';
import { Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ReviewAssessmentsPage() {
  const getAssessmentsByStatus = (status: string) => {
    if (status === 'all') return recentAssessments;
    return recentAssessments.filter((assessment) => assessment.status === status);
  };
  
  const statusMap: { [key: string]: { text: string; icon: React.ComponentType<any>; badge: "default" | "secondary" | "destructive", className?: string } } = {
    'Đã duyệt': { text: 'Đã duyệt', icon: CheckCircle, badge: 'default', className: 'bg-green-600' },
    'Chờ duyệt': { text: 'Chờ duyệt', icon: Clock, badge: 'secondary' },
    'Bị từ chối': { text: 'Bị từ chối', icon: XCircle, badge: 'destructive' },
  };


  const AssessmentTable = ({ status }: { status: string }) => {
    const assessments = getAssessmentsByStatus(status);
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên xã</TableHead>
            <TableHead className="hidden md:table-cell">Ngày nộp</TableHead>
            <TableHead className="hidden lg:table-cell">Trạng thái</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assessments.length > 0 ? (
            assessments.map((assessment) => {
               const statusInfo = statusMap[assessment.status];
               return (
                  <TableRow key={assessment.id}>
                    <TableCell>
                      <div className="font-medium">{assessment.communeName}</div>
                      <div className="text-sm text-muted-foreground">
                        {assessment.districtName}, {assessment.provinceName}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {assessment.submissionDate}
                    </TableCell>
                     <TableCell className="hidden lg:table-cell">
                        <Badge variant={statusInfo.badge} className={statusInfo.className}>
                            <statusInfo.icon className="mr-2 h-4 w-4" />
                            {assessment.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/reviews/${assessment.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
               );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                Không có hồ sơ nào trong mục này.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duyệt hồ sơ đánh giá</CardTitle>
        <CardDescription>
          Xem xét và phê duyệt các hồ sơ đánh giá do các xã gửi lên.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
            <TabsTrigger value="approved">Đã duyệt</TabsTrigger>
            <TabsTrigger value="rejected">Bị từ chối</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <AssessmentTable status="Chờ duyệt" />
          </TabsContent>
          <TabsContent value="approved">
            <AssessmentTable status="Đã duyệt" />
          </TabsContent>
          <TabsContent value="rejected">
             <AssessmentTable status="Bị từ chối" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
