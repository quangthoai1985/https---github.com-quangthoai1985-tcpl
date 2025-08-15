
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
import React from 'react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPageContent() {
  const { setLoginInfo } = useData();
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (setLoginInfo(username)) {
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: "Đăng nhập thất bại",
        description: "Tên đăng nhập hoặc mật khẩu không chính xác.",
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <Card className="mx-auto w-full max-w-sm shadow-2xl">
         <div className="flex justify-center p-6">
            <Image src="https://placehold.co/80x80.png" alt="Logo" width={80} height={80} data-ai-hint="logo" />
        </div>
        <CardHeader className="text-center pt-0">
          <CardTitle className="text-2xl font-headline leading-snug">
            ĐÁNH GIÁ CHUẨN TIẾP CẬN PHÁP LUẬT
          </CardTitle>
          <CardDescription>
            Đăng nhập vào tài khoản của bạn để tiếp tục
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nhập tên đăng nhập"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Mật khẩu</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2 pt-2">
              <Button type="submit" className="w-full">
                Đăng nhập
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
