'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";
import React from "react";

export default function ProfilePage() {
    const { users, setUsers } = useData();
    // In a real app, you'd get the current logged-in user's ID from an auth context.
    // For this demo, we'll assume we're editing the first admin user.
    const currentUser = users.find(u => u.role === 'Cán bộ Tỉnh');
    const { units } = useData();
    const { toast } = useToast();

    const [name, setName] = React.useState(currentUser?.name || '');

    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentUser) {
            const updatedUser = { ...currentUser, name };
            setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
            toast({
                title: "Thành công!",
                description: "Thông tin cá nhân của bạn đã được cập nhật.",
            });
        }
    };
    
    const getUnitName = (unitId: string) => {
        return units.find(u => u.id === unitId)?.name || "Không xác định";
    }

    if (!currentUser) {
        return <p>Đang tải thông tin người dùng...</p>
    }

    return (
        <div className="grid gap-6">
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Thông tin cá nhân</CardTitle>
                    <CardDescription>
                        Quản lý thông tin tài khoản của bạn.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProfileUpdate} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Họ và tên</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={currentUser.email} disabled />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="unit">Đơn vị</Label>
                            <Input id="unit" value={getUnitName(currentUser.unitId)} disabled />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit">Cập nhật hồ sơ</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="max-w-2xl">
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
    );
}
