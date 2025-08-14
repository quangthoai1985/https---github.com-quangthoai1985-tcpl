
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { useData } from '@/context/DataContext';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/data';

export default function LoginPageContent() {
  const { setRole } = useData();
  const router = useRouter();

  const handleLogin = (role: Role) => {
    setRole(role);
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <Card className="mx-auto w-full max-w-sm shadow-2xl">
         <div className="flex justify-center p-6">
            <Image src="https://placehold.co/80x80.png" alt="Logo" width={80} height={80} data-ai-hint="logo" />
        </div>
        <CardHeader className="text-center pt-0">
          <CardTitle className="text-2xl font-headline">CHUẨN TIẾP CẬN PHÁP LUẬT</CardTitle>
          <CardDescription>
            Đăng nhập vào tài khoản của bạn để tiếp tục
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin hoặc canboxa"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Mật khẩu</Label>
              </div>
              <Input id="password" type="password" required defaultValue="123456" />
            </div>
            <div className="grid gap-2 pt-2">
              <Button onClick={() => handleLogin('admin')} className="w-full">
                Đăng nhập (Admin)
              </Button>
              <Button onClick={() => handleLogin('commune_staff')} variant="outline" className="w-full">
                Đăng nhập (Cán bộ xã)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
