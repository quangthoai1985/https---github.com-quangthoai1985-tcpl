
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
import { Download, MoreHorizontal, PlusCircle, Search, Eye, Trash2, Edit } from 'lucide-react';
import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/context/DataContext';
import PageHeader from '@/components/layout/page-header';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import type { Document as AppDocument } from '@/lib/data';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


function DocumentForm({ document, onSave, onCancel, isSubmitting }: { document: Partial<AppDocument>, onSave: (doc: Partial<AppDocument>, file?: File | null) => void, onCancel: () => void, isSubmitting: boolean }) {
  const [formData, setFormData] = React.useState(document);
  const [file, setFile] = React.useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setFile(e.target.files[0]);
      }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{document.id ? 'Chỉnh sửa văn bản' : 'Thêm văn bản mới'}</DialogTitle>
        <DialogDescription>
          Điền thông tin và tải lên tệp văn bản đính kèm.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Tên văn bản</Label>
          <Input id="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="number" className="text-right">Số/Ký hiệu</Label>
          <Input id="number" value={formData.number || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="issueDate" className="text-right">Ngày ban hành</Label>
          <Input id="issueDate" value={formData.issueDate || ''} onChange={handleChange} className="col-span-3" placeholder="DD/MM/YYYY"/>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="excerpt" className="text-right">Trích yếu</Label>
          <Input id="excerpt" value={formData.excerpt || ''} onChange={handleChange} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">Tệp đính kèm</Label>
            <div className="col-span-3">
              <Input id="file" type="file" onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground mt-1">Dung lượng tối đa: 5MB.</p>
            </div>
        </div>
        {file && <p className="text-sm text-muted-foreground text-right col-span-4">Tệp mới: {file.name}</p>}
        {formData.fileUrl && !file && <p className="text-sm text-muted-foreground text-right col-span-4">Tệp hiện tại: {decodeURIComponent(formData.fileUrl.split('%2F').pop()?.split('?')[0] || '')}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Hủy</Button>
        <Button type="submit" onClick={() => onSave(formData, file)} disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu văn bản"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function DocumentsPage() {
    const { guidanceDocuments, updateGuidanceDocuments, storage, role } = useData();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingDocument, setEditingDocument] = useState<Partial<AppDocument> | null>(null);
    const [deletingDocument, setDeletingDocument] = useState<AppDocument | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);
    const { toast } = useToast();

    const isAdmin = role === 'admin';

    const handleNew = () => {
        setEditingDocument({});
        setIsFormOpen(true);
    };

    const handleEdit = (doc: AppDocument) => {
        setEditingDocument(doc);
        setIsFormOpen(true);
    };

    const handleDelete = (doc: AppDocument) => {
        setDeletingDocument(doc);
    };
    
    const confirmDelete = async () => {
        if (!deletingDocument || !storage) return;

        // **FIX**: Security Check
        if (!isAdmin) {
            toast({ variant: 'destructive', title: "Lỗi!", description: "Bạn không có quyền thực hiện hành động này." });
            setDeletingDocument(null);
            return;
        }
        
        setIsSubmitting(true);
        try {
            // Delete file from storage if it exists
            if (deletingDocument.fileUrl) {
                // We need to get the reference from the full URL.
                // Firebase SDK v9+ can do this directly.
                const fileRef = ref(storage, deletingDocument.fileUrl);
                await deleteObject(fileRef);
                toast({ title: "Thành công", description: "Đã xóa tệp đính kèm khỏi Storage." });
            }

            // Delete document from Firestore
            await updateGuidanceDocuments(guidanceDocuments.filter(d => d.id !== deletingDocument.id));
            toast({ title: "Thành công!", description: `Đã xóa văn bản "${deletingDocument.name}".` });

        } catch (error: any) {
            // If file doesn't exist, we can ignore the error and still delete the document entry
            if (error.code === 'storage/object-not-found') {
                console.warn("File to delete was not found in Storage, proceeding to delete from Firestore.");
                await updateGuidanceDocuments(guidanceDocuments.filter(d => d.id !== deletingDocument.id));
                toast({ title: "Thành công!", description: `Đã xóa văn bản "${deletingDocument.name}" (không tìm thấy tệp đính kèm).` });
            } else {
                console.error("Error deleting document:", error);
                toast({ variant: 'destructive', title: "Lỗi!", description: "Không thể xóa văn bản. Kiểm tra lại quyền hạn của bạn." });
            }
        } finally {
            setDeletingDocument(null);
            setIsSubmitting(false);
        }
    };

    const handleSave = async (docData: Partial<AppDocument>, file: File | null | undefined) => {
        if (!storage) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Dịch vụ lưu trữ chưa sẵn sàng.'});
            return;
        }

        // **FIX**: Security Check
        if (!isAdmin) {
            toast({ variant: 'destructive', title: "Lỗi!", description: "Bạn không có quyền thực hiện hành động này." });
            return;
        }

        setIsSubmitting(true);
        const docId = docData.id || `DOC${Date.now()}`;
        let updatedDoc = { ...docData, id: docId };

        try {
            if (file) {
                toast({ title: 'Đang tải tệp lên...'});
                // **FIX**: Create a structured and secure file path
                const filePath = `guidance_documents/${docId}/${file.name}`;
                const storageRef = ref(storage, filePath);
                
                // Delete old file if editing and a new file is uploaded
                if (docData.id && docData.fileUrl) {
                    try {
                        const oldFileRef = ref(storage, docData.fileUrl);
                        await deleteObject(oldFileRef);
                    } catch (error: any) {
                       if (error.code !== 'storage/object-not-found') {
                           console.warn("Could not delete old file, it might not exist:", error);
                       }
                    }
                }
                
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                updatedDoc.fileUrl = downloadURL;
            }

            if (docData.id) { // This is an update
                await updateGuidanceDocuments(guidanceDocuments.map(d => d.id === updatedDoc.id ? updatedDoc as AppDocument : d));
                toast({ title: "Thành công!", description: "Đã cập nhật văn bản."});
            } else { // This is a new document
                const newDoc: AppDocument = {
                    ...updatedDoc,
                    name: updatedDoc.name || 'Văn bản không tên',
                    number: updatedDoc.number || '',
                    issueDate: updatedDoc.issueDate || '',
                    excerpt: updatedDoc.excerpt || '',
                };
                await updateGuidanceDocuments([...guidanceDocuments, newDoc]);
                toast({ title: "Thành công!", description: "Đã thêm văn bản mới."});
            }

            setIsFormOpen(false);
            setEditingDocument(null);
        } catch(error) {
            console.error("Error saving document:", error);
            toast({ variant: 'destructive', title: "Lỗi!", description: "Đã xảy ra lỗi. Vui lòng kiểm tra Security Rules và thử lại."});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCancel = () => {
        setIsFormOpen(false);
        setEditingDocument(null);
    }
    
    const handleDownload = (fileUrl: string, fileName: string) => {
        window.open(fileUrl, '_blank');
    }

    const filteredDocuments = guidanceDocuments.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <>
    <PageHeader title="Văn bản Hướng dẫn" description="Tra cứu, quản lý các văn bản pháp luật, quyết định, công văn liên quan."/>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="relative flex-1 md:grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm theo tên, số, trích yếu..."
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {isAdmin && (
                <Button onClick={handleNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm văn bản
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số, ký hiệu</TableHead>
              <TableHead>Tên văn bản</TableHead>
              <TableHead>Ngày ban hành</TableHead>
              <TableHead>Trích yếu</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.number}</TableCell>
                <TableCell>{doc.name}</TableCell>
                <TableCell>{doc.issueDate}</TableCell>
                <TableCell>{doc.excerpt}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
<DropdownMenuContent align="end">
  <DropdownMenuLabel>Hành động</DropdownMenuLabel>
  
  {/* Kiểm tra xem văn bản có file đính kèm không */}
  {doc.fileUrl ? (
    <>
      <DropdownMenuItem onClick={() => setPreviewFile({name: doc.name, url: doc.fileUrl!})}>
          <Eye className="mr-2 h-4 w-4" /> Xem trước
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleDownload(doc.fileUrl!, doc.name)}>
         <Download className="mr-2 h-4 w-4" /> Tải về
      </DropdownMenuItem>
    </>
  ) : (
    // Nếu không có file, hiển thị thông báo
    <DropdownMenuItem disabled>Không có tệp đính kèm</DropdownMenuItem>
  )}

  {/* Chỉ Admin mới thấy các hành động quản trị */}
  {isAdmin && (
    <>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleEdit(doc)}>
            <Edit className="mr-2 h-4 w-4" /> Sửa
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Xóa
        </DropdownMenuItem>
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
    
    <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
            {editingDocument && <DocumentForm document={editingDocument} onSave={handleSave} onCancel={handleCancel} isSubmitting={isSubmitting} />}
        </DialogContent>
    </Dialog>
    
    <AlertDialog open={!!deletingDocument} onOpenChange={(open) => !open && setDeletingDocument(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                <AlertDialogDescription>
                    Bạn có chắc chắn muốn xóa văn bản <strong>{deletingDocument?.name}</strong>?
                    Hành động này sẽ xóa cả tệp đính kèm và không thể hoàn tác.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingDocument(null)}>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                    {isSubmitting ? "Đang xóa..." : "Xác nhận Xóa"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

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

    