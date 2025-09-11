
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/DataContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/page-header';
import type { LoginConfig } from '@/lib/data';
import { getDownloadURL, ref, uploadBytes, listAll, deleteObject, StorageReference } from 'firebase/storage';
import { Loader2, Trash2, UploadCloud, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ImageAsset {
    url: string;
    ref: StorageReference;
}

function ImagePicker({ triggerButton, onSelect, storagePath }: { triggerButton: React.ReactNode, onSelect: (url: string) => void, storagePath: string }) {
    const { storage } = useData();
    const { toast } = useToast();
    const [assets, setAssets] = useState<ImageAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deletingAsset, setDeletingAsset] = useState<ImageAsset | null>(null);

    const fetchAssets = useCallback(async () => {
        if (!storage) return;
        setIsLoading(true);
        try {
            const folderRef = ref(storage, storagePath);
            const res = await listAll(folderRef);
            const assetPromises = res.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return { url, ref: itemRef };
            });
            const fetchedAssets = await Promise.all(assetPromises);
            setAssets(fetchedAssets);
        } catch (error) {
            console.error("Error fetching assets:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tải danh sách ảnh.' });
        } finally {
            setIsLoading(false);
        }
    }, [storage, storagePath, toast]);

    useEffect(() => {
        if (isDialogOpen) {
            fetchAssets();
        }
    }, [isDialogOpen, fetchAssets]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !storage) return;
        
        setIsUploading(true);
        try {
            const filePath = `${storagePath}/${file.name}`;
            const storageRef = ref(storage, filePath);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            toast({ title: 'Thành công', description: 'Đã tải lên ảnh mới.' });
            onSelect(downloadURL);
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Upload error:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tải lên tệp.' });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDelete = async () => {
        if (!deletingAsset) return;
        try {
            await deleteObject(deletingAsset.ref);
            toast({ title: 'Đã xóa', description: `Đã xóa ảnh ${deletingAsset.ref.name}` });
            setAssets(prev => prev.filter(a => a.url !== deletingAsset.url));
            setDeletingAsset(null);
        } catch (error) {
             console.error("Delete error:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể xóa tệp.' });
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Chọn hoặc tải lên ảnh</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full pr-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                {assets.map(asset => (
                                    <div key={asset.url} className="relative group aspect-square">
                                        <Image src={asset.url} alt="asset" fill objectFit="cover" className="rounded-md border" />
                                        <div 
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md"
                                            onClick={() => { onSelect(asset.url); setIsDialogOpen(false); }}
                                        >
                                            <CheckCircle className="h-10 w-10 text-white" />
                                        </div>
                                         <Button 
                                            variant="destructive" size="icon"
                                            className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => setDeletingAsset(asset)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <label className="relative flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-md cursor-pointer hover:bg-muted transition-colors">
                                     <UploadCloud className="h-10 w-10 text-muted-foreground" />
                                     <span className="mt-2 text-sm text-center text-muted-foreground">Tải ảnh mới</span>
                                     <Input type="file" className="absolute inset-0 opacity-0 w-full h-full" accept="image/*" onChange={handleFileChange} disabled={isUploading}/>
                                     {isUploading && <Loader2 className="absolute h-6 w-6 animate-spin"/>}
                                </label>
                            </div>
                        )}
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Đóng</Button>
                </DialogFooter>
            </DialogContent>
            
             <AlertDialog open={!!deletingAsset} onOpenChange={(open) => !open && setDeletingAsset(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa ảnh này khỏi Storage không? Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    )
}


export default function LoginConfigPage() {
    const { loginConfig, updateLoginConfig, storage } = useData();
    const { toast } = useToast();

    const [config, setConfig] = useState<Partial<LoginConfig>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (loginConfig) {
            setConfig(loginConfig);
        }
    }, [loginConfig]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setConfig(prev => ({ ...prev, [id]: value ? Number(value) : undefined }));
    }
    
    const handleImageSelect = (field: 'primaryLogoUrl' | 'secondaryLogoUrl' | 'backgroundImageUrl') => (url: string) => {
        setConfig(prev => ({ ...prev, [field]: url}));
    }

    const handleSave = async () => {
        if (!storage) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Dịch vụ lưu trữ chưa sẵn sàng.' });
            return;
        }
        setIsSubmitting(true);
        
        try {
            await updateLoginConfig(config as LoginConfig);
            toast({ title: 'Thành công!', description: 'Đã lưu cấu hình trang đăng nhập.' });
        } catch (error: any) {
            console.error("Error saving login config:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể lưu cấu hình.' });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <>
            <PageHeader title="Cấu hình trang đăng nhập" description="Tùy chỉnh giao diện của trang đăng nhập cho toàn hệ thống." />

            <div className="grid gap-6 md:grid-cols-2">
                
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Logo</CardTitle>
                        <CardDescription>Tải lên logo chính (Bộ Tư pháp) và logo phụ (Tỉnh An Giang), điều chỉnh kích thước hiển thị.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {/* Primary Logo */}
                            <div className="grid gap-4">
                                <Label className='font-semibold'>Logo chính</Label>
                                <div className='mt-2 p-4 border rounded-md min-h-[124px] flex justify-center items-center bg-muted'>
                                    {config.primaryLogoUrl ? (
                                        <Image src={config.primaryLogoUrl} alt="logo" width={config.primaryLogoWidth || 100} height={config.primaryLogoHeight || 100} />
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Chưa có logo chính</p>
                                    )}
                                </div>
                                <ImagePicker 
                                    triggerButton={<Button variant="outline" className="mt-2">Thay đổi Logo chính</Button>}
                                    onSelect={handleImageSelect('primaryLogoUrl')}
                                    storagePath="config/logo"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="primaryLogoWidth">Chiều rộng (px)</Label>
                                        <Input id="primaryLogoWidth" type="number" value={config.primaryLogoWidth || ''} onChange={handleInputChange}/>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="primaryLogoHeight">Chiều cao (px)</Label>
                                        <Input id="primaryLogoHeight" type="number" value={config.primaryLogoHeight || ''} onChange={handleInputChange}/>
                                    </div>
                                </div>
                            </div>
                             {/* Secondary Logo */}
                             <div className="grid gap-4">
                                <Label className='font-semibold'>Logo phụ</Label>
                                <div className='mt-2 p-4 border rounded-md min-h-[124px] flex justify-center items-center bg-muted'>
                                    {config.secondaryLogoUrl ? (
                                        <Image src={config.secondaryLogoUrl} alt="logo" width={config.secondaryLogoWidth || 100} height={config.secondaryLogoHeight || 100} />
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Chưa có logo phụ</p>
                                    )}
                                </div>
                                <ImagePicker 
                                    triggerButton={<Button variant="outline" className="mt-2">Thay đổi Logo phụ</Button>}
                                    onSelect={handleImageSelect('secondaryLogoUrl')}
                                    storagePath="config/logo_secondary"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="secondaryLogoWidth">Chiều rộng (px)</Label>
                                        <Input id="secondaryLogoWidth" type="number" value={config.secondaryLogoWidth || ''} onChange={handleInputChange}/>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="secondaryLogoHeight">Chiều cao (px)</Label>
                                        <Input id="secondaryLogoHeight" type="number" value={config.secondaryLogoHeight || ''} onChange={handleInputChange}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Ảnh nền</CardTitle>
                        <CardDescription>Tải lên hoặc chọn ảnh nền sẽ hiển thị toàn trang.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label>Ảnh nền hiện tại</Label>
                            <div className='mt-2 p-4 border rounded-md flex justify-center items-center bg-muted min-h-[208px]'>
                                {config.backgroundImageUrl ? (
                                    <div className='relative w-full h-48'>
                                        <Image src={config.backgroundImageUrl} alt="background" fill objectFit='contain' />
                                    </div>
                                ) : (
                                     <p className="text-sm text-muted-foreground">Chưa có ảnh nền</p>
                                )}
                            </div>
                             <ImagePicker 
                                triggerButton={<Button variant="outline" className="mt-2">Thay đổi Ảnh nền</Button>}
                                onSelect={handleImageSelect('backgroundImageUrl')}
                                storagePath="config/background"
                            />
                        </div>
                    </CardContent>
                </Card>

                 <div className="md:col-span-2 flex justify-end">
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lưu thay đổi
                    </Button>
                </div>
            </div>
        </>
    );
}

    
