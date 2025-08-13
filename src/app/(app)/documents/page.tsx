
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
import { guidanceDocuments } from '@/lib/data';
import { Download, FileText } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Văn bản Hướng dẫn</CardTitle>
        <CardDescription>
          Danh sách các văn bản pháp luật, hướng dẫn liên quan đến công tác đánh giá.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số hiệu</TableHead>
              <TableHead>Tên văn bản</TableHead>
              <TableHead className="hidden md:table-cell">Ngày ban hành</TableHead>
              <TableHead className="text-right">Tải về</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guidanceDocuments.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="font-medium">{doc.number}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{doc.name}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {doc.issueDate}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="icon" asChild>
                    <a href="#" download>
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Tải về</span>
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
