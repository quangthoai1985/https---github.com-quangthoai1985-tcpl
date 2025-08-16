
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
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPageContent() {
  const { setLoginInfo, loading, currentUser } = useData();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  
  React.useEffect(() => {
    if (currentUser) {
        router.push('/dashboard');
    }
  }, [currentUser, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await setLoginInfo(email, password);
    if (success) {
      // router.push('/dashboard') is handled by the useEffect now
    } else {
      toast({
        variant: 'destructive',
        title: "Đăng nhập thất bại",
        description: "Email hoặc mật khẩu không chính xác.",
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <Card className="mx-auto w-full max-w-sm shadow-2xl">
         <div className="flex justify-center p-6">
            <Image src="/logo.png" alt="Logo Bộ Tư pháp" width={100} height={100} data-ai-hint="application logo"/>
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@angiang.gov.vn"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
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
                disabled={loading}
              />
            </div>
            <div className="grid gap-2 pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Đăng nhập
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
