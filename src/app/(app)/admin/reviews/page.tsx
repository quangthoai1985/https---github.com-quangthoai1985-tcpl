
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
import { Eye, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

export default function ReviewAssessmentsPage() {
  const pendingAssessments = recentAssessments.filter(
    (assessment) => assessment.status === 'Chờ duyệt'
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duyệt hồ sơ đánh giá</CardTitle>
        <CardDescription>
          Xem xét và phê duyệt các hồ sơ đánh giá do các xã gửi lên.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên xã</TableHead>
              <TableHead className="hidden md:table-cell">Ngày nộp</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingAssessments.length > 0 ? (
              pendingAssessments.map((assessment) => (
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
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/reviews/${assessment.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Xem chi tiết
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  Không có hồ sơ nào chờ duyệt.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
