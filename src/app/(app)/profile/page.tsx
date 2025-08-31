
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import PageHeader from "@/components/layout/page-header";
import { updateUser } from "@/actions/userActions";
import type { User } from "@/lib/data";

export default function ProfilePage() {
    const { currentUser, units, refreshData } = useData();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [displayName, setDisplayName] = React.useState(currentUser?.displayName || '');
    const [phoneNumber, setPhoneNumber] = React.useState(currentUser?.phoneNumber || '');
    
    React.useEffect(() => {
        if (currentUser) {
            setDisplayName(currentUser.displayName);
            setPhoneNumber(currentUser.phoneNumber || '');
        }
    }, [currentUser]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsSubmitting(true);

        const updatedUser: User = { ...currentUser, displayName, phoneNumber };

        const result = await updateUser(updatedUser);

        if (result.success) {
            toast({
                title: "Thành công!",
                description: "Thông tin cá nhân của bạn đã được cập nhật.",
            });
            await refreshData();
        } else {
             toast({
                variant: 'destructive',
                title: "Lỗi!",
                description: result.error || "Không thể cập nhật hồ sơ.",
            });
        }
        setIsSubmitting(false);
    };
    
    const getUnitName = (unitId?: string) => {
        if (!unitId) return "Không xác định";
        return units.find(u => u.id === unitId)?.name || "Không xác định";
    }

    if (!currentUser) {
        return <p>Đang tải thông tin người dùng...</p>
    }

    return (
        <>
        <PageHeader title="Hồ sơ cá nhân" description="Quản lý thông tin tài khoản và bảo mật."/>
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Thông tin cá nhân</CardTitle>
                    <CardDescription>
                        Cập nhật thông tin hiển thị của bạn.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProfileUpdate} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="displayName">Họ và tên</Label>
                            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="username">Tên đăng nhập</Label>
                            <Input id="username" type="text" value={currentUser.username} disabled />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phoneNumber">Số điện thoại</Label>
                            <Input id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="unit">Đơn vị</Label>
                            <Input id="unit" value={getUnitName(currentUser.communeId)} disabled />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật hồ sơ'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Đổi mật khẩu</CardTitle>
                    <CardDescription>
                        Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
                            <Input id="current-password" type="password" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">Mật khẩu mới</Label>
                            <Input id="new-password" type="password" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
                            <Input id="confirm-password" type="password" />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit">Lưu thay đổi</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
        </>
    );
}
