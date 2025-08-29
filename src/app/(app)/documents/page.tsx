
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, MoreHorizontal, PlusCircle, Search, Eye } from 'lucide-react';
import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/page-header';
import { useData } from '@/context/DataContext';
import type { Document } from '@/lib/data';


function DocumentForm({ document: doc, onSave, onCancel }: { document: Partial<Document>, onSave: (doc: Partial<Document>) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState(doc);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  return (
    <>
      <DialogHeader>
        <DialogTitle>{doc.id ? 'Chỉnh sửa văn bản' : 'Thêm văn bản mới'}</DialogTitle>
        <DialogDescription>
          {doc.id ? 'Cập nhật thông tin cho văn bản này.' : 'Tải lên và điền thông tin cho văn bản mới.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="number" className="text-right">Số hiệu</Label>
          <Input id="number" value={formData.number || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Tên văn bản</Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="issueDate" className="text-right">Ngày ban hành</Label>
          <Input id="issueDate" value={formData.issueDate || ''} onChange={handleChange} className="col-span-3" placeholder="DD/MM/YYYY"/>
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="excerpt" className="text-right pt-2">Trích yếu</Label>
          <Textarea id="excerpt" value={formData.excerpt || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="file" className="text-right">Tệp đính kèm</Label>
          <Input id="file" type="file" className="col-span-3" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button type="submit" onClick={() => onSave(formData)}>{doc.id ? 'Lưu thay đổi' : 'Tải lên'}</Button>
      </DialogFooter>
    </>
  );
}


export default function DocumentsPage() {
  const { guidanceDocuments: documents, updateGuidanceDocuments: setDocuments, role } = useData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Partial<Document> | null>(null);
  const [previewFile, setPreviewFile] = useState<{name: string, url: string} | null>(null);
  const { toast } = useToast();

  const handleNew = () => {
    setEditingDocument({});
    setIsFormOpen(true);
  }

  const handleEdit = (doc: Document) => {
    setEditingDocument(doc);
    setIsFormOpen(true);
  }

  const handleSave = async (docToSave: Partial<Document>) => {
    if (docToSave.id) {
      await setDocuments(documents.map(d => d.id === docToSave.id ? { ...d, ...docToSave } as Document : d));
      toast({ title: "Thành công", description: "Văn bản đã được cập nhật." });
    } else {
      const newDoc: Document = {
        id: `VB${Date.now().toString().slice(-6)}`,
        name: docToSave.name || '',
        number: docToSave.number || '',
        issueDate: docToSave.issueDate || '',
        excerpt: docToSave.excerpt || '',
        // In a real app, you would handle file upload here and get the URL.
        // For now, we'll use a placeholder.
        fileUrl: "https://firebasestorage.googleapis.com/v0/b/chuan-tiep-can-pl.appspot.com/o/hoso%2FXA02%2Fregistration%2FDOT2024_2%2FDon%20dang%20ky%20tham%20gia%20danh%20gia.docx?alt=media&token=81c3c3a7-be55-46f4-a957-3f3607755869",
      };
      await setDocuments([newDoc, ...documents]);
      toast({ title: "Thành công", description: "Văn bản mới đã được thêm." });
    }
    setIsFormOpen(false);
    setEditingDocument(null);
  }

  const handleDelete = async (docId: string) => {
    await setDocuments(documents.filter(d => d.id !== docId));
    toast({ title: "Thành công", description: "Văn bản đã được xóa." });
  }

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingDocument(null);
  }
  
  const handlePreview = (doc: Document) => {
    if (doc.fileUrl) {
      setPreviewFile({ name: doc.name, url: doc.fileUrl });
    } else {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy tệp đính kèm cho văn bản này.' });
    }
  };

  const handleDownload = (doc: Document) => {
    if (doc.fileUrl) {
        window.open(doc.fileUrl, '_blank');
    } else {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy tệp đính kèm cho văn bản này.' });
    }
  };

  return (
    <>
      <PageHeader title="Văn bản Hướng dẫn" description="Danh sách các văn bản pháp luật, hướng dẫn liên quan đến công tác đánh giá."/>
      <Card>
        <CardHeader>
            <div className='flex items-center justify-between'>
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Tìm kiếm văn bản..." className="pl-8 w-64" />
                </div>
                {role === 'admin' && (
                    <Button onClick={handleNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm văn bản mới
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Số hiệu</TableHead>
                <TableHead>Tên văn bản & Trích yếu</TableHead>
                <TableHead className="hidden md:table-cell w-[150px]">Ngày ban hành</TableHead>
                <TableHead className="w-[100px] text-center">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="font-medium">{doc.number}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{doc.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">{doc.excerpt}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {doc.issueDate}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handlePreview(doc)}><Eye className="mr-2 h-4 w-4"/>Xem trước</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}><Download className="mr-2 h-4 w-4" />Tải về</DropdownMenuItem>
                        {role === 'admin' && (
                          <>
                            <DropdownMenuItem onClick={() => handleEdit(doc)}>Sửa</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="text-destructive">Xóa</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          {editingDocument && <DocumentForm document={editingDocument} onSave={handleSave} onCancel={handleCancel} />}
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
