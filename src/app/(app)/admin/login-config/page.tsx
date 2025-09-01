
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/DataContext';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/page-header';
import type { LoginConfig } from '@/lib/data';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function LoginConfigPage() {
    const { loginConfig, updateLoginConfig, storage } = useData();
    const { toast } = useToast();

    const [config, setConfig] = useState<Partial<LoginConfig>>({});
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bgImageFile, setBgImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (loginConfig) {
            setConfig(loginConfig);
        }
    }, [loginConfig]);

    const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setter(e.target.files[0]);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setConfig(prev => ({ ...prev, [id]: id.includes('Width') || id.includes('Height') ? Number(value) : value }));
    }

    const handleSave = async () => {
        if (!storage) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Dịch vụ lưu trữ chưa sẵn sàng.' });
            return;
        }
        setIsSubmitting(true);
        
        let updatedConfig = { ...config };

        try {
            if (logoFile) {
                const filePath = `config/logo/${logoFile.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, logoFile);
                const downloadURL = await getDownloadURL(snapshot.ref);
                updatedConfig.logoUrl = downloadURL;
                toast({ title: 'Thành công', description: 'Đã tải lên logo mới.' });
            }

            if (bgImageFile) {
                const filePath = `config/background/${bgImageFile.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, bgImageFile);
                const downloadURL = await getDownloadURL(snapshot.ref);
                updatedConfig.backgroundImageUrl = downloadURL;
                toast({ title: 'Thành công', description: 'Đã tải lên ảnh nền mới.' });
            }
            
            await updateLoginConfig(updatedConfig as LoginConfig);
            toast({ title: 'Thành công!', description: 'Đã lưu cấu hình trang đăng nhập.' });

        } catch (error) {
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
                <Card>
                    <CardHeader>
                        <CardTitle>Cài đặt chung</CardTitle>
                        <CardDescription>Thay đổi màu sắc và các thông số cơ bản.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="backgroundColor">Mã màu nền (Hex)</Label>
                            <div className='flex items-center gap-2'>
                                <Input 
                                    id="backgroundColor"
                                    type="color"
                                    value={config.backgroundColor || '#ffffff'}
                                    onChange={handleInputChange}
                                    className='p-1 h-10 w-12'
                                />
                                <Input 
                                    type="text"
                                    value={config.backgroundColor || ''}
                                    onChange={handleInputChange}
                                    placeholder="#F8F9FA"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Logo</CardTitle>
                        <CardDescription>Tải lên logo và điều chỉnh kích thước hiển thị trên form đăng nhập.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="logoFile">Tải lên logo mới</Label>
                            <Input id="logoFile" type="file" accept="image/*" onChange={handleFileChange(setLogoFile)} />
                            {logoFile && <p className='text-sm text-muted-foreground'>Tệp mới: {logoFile.name}</p>}
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="logoWidth">Chiều rộng (px)</Label>
                                <Input id="logoWidth" type="number" value={config.logoWidth || 100} onChange={handleInputChange}/>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="logoHeight">Chiều cao (px)</Label>
                                <Input id="logoHeight" type="number" value={config.logoHeight || 100} onChange={handleInputChange}/>
                            </div>
                        </div>
                         {config.logoUrl && (
                            <div>
                                <Label>Logo hiện tại</Label>
                                <div className='mt-2 p-4 border rounded-md flex justify-center bg-muted'>
                                    <Image src={config.logoUrl} alt="logo" width={config.logoWidth || 100} height={config.logoHeight || 100} />
                                </div>
                            </div>
                         )}
                    </CardContent>
                </Card>

                 <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Ảnh nền</CardTitle>
                        <CardDescription>Tải lên ảnh nền cho cột bên trái của trang đăng nhập.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="bgImageFile">Tải lên ảnh nền mới</Label>
                            <Input id="bgImageFile" type="file" accept="image/*" onChange={handleFileChange(setBgImageFile)} />
                             {bgImageFile && <p className='text-sm text-muted-foreground'>Tệp mới: {bgImageFile.name}</p>}
                        </div>

                        {config.backgroundImageUrl && (
                            <div>
                                <Label>Ảnh nền hiện tại</Label>
                                <div className='mt-2 p-4 border rounded-md flex justify-center bg-muted'>
                                    <div className='relative w-full h-48'>
                                        <Image src={config.backgroundImageUrl} alt="background" layout='fill' objectFit='contain' />
                                    </div>
                                </div>
                            </div>
                         )}
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
