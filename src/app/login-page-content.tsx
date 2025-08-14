
'use client';

import Link from 'next/link';
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

export default function LoginPageContent() {
  const { setRole } = useData();
  const router = useRouter();

  const handleLogin = (role: 'admin' | 'commune') => {
    setRole(role);
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <Card className="mx-auto w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Image src="https://placehold.co/64x64.png" alt="Logo" width={64} height={64} data-ai-hint="logo" />
          </div>
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
                placeholder="admin"
                required
                defaultValue="admin"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Mật khẩu</Label>
              </div>
              <Input id="password" type="password" required defaultValue="123" />
            </div>
            <div className="grid gap-2">
              <Button onClick={() => handleLogin('admin')} className="w-full">
                Đăng nhập với tư cách Admin
              </Button>
              <Button onClick={() => handleLogin('commune')} variant="outline" className="w-full">
                Đăng nhập với tư cách Cán bộ Xã
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
