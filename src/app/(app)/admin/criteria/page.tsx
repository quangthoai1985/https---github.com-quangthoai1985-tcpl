
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { criteria } from '@/lib/data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CriteriaManagementPage() {
  const getIndicatorTypeLabel = (type: string) => {
    switch (type) {
      case 'Boolean':
        return 'Đạt/Không đạt';
      case 'Percentage':
        return 'Tỷ lệ %';
      case 'Numeric':
        return 'Số lượng';
      case 'Checklist':
        return 'Danh mục kiểm tra';
      default:
        return 'Không xác định';
    }
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bộ Tiêu chí Đánh giá</CardTitle>
            <CardDescription>
              Quản lý các tiêu chí và chỉ tiêu để đánh giá xã đạt chuẩn tiếp cận
              pháp luật.
            </CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm Tiêu chí mới
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={criteria.map((c) => c.id)} className="w-full">
          {criteria.map((criterion, index) => (
            <AccordionItem value={criterion.id} key={criterion.id}>
              <div className="flex items-center justify-between pr-4 hover:bg-muted/50 rounded-lg">
                <AccordionTrigger className="text-lg font-headline hover:no-underline flex-1 px-4 py-0">
                    <span>
                      Tiêu chí {index + 1}: {criterion.name.replace(`Tiêu chí ${index + 1}: `, '')}
                    </span>
                </AccordionTrigger>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <Badge variant="secondary" className="mr-4">
                    {criterion.indicators.length} chỉ tiêu
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                      <DropdownMenuItem>Sửa tiêu chí</DropdownMenuItem>
                      <DropdownMenuItem>Thêm chỉ tiêu</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Xóa tiêu chí
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <AccordionContent>
                <div className="space-y-4 pl-8 pr-4">
                  {criterion.indicators.map((indicator) => (
                    <div
                      key={indicator.id}
                      className="flex items-center justify-between rounded-md border bg-card p-4 shadow-sm"
                    >
                      <div>
                        <p className="font-semibold">{indicator.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Loại: {getIndicatorTypeLabel(indicator.type)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          <DropdownMenuItem>Sửa chỉ tiêu</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Xóa chỉ tiêu
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
