
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
  const { setLoginInfo, loading, currentUser, loginConfig } = useData();
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

  const bgImageUrl = loginConfig?.backgroundImageUrl || "https://picsum.photos/1200/800";
  const logoUrl = loginConfig?.logoUrl || "/logo.png";
  const logoWidth = loginConfig?.logoWidth || 100;
  const logoHeight = loginConfig?.logoHeight || 100;
  const backgroundColor = loginConfig?.backgroundColor;
  const bgImageWidth = loginConfig?.backgroundImageWidth || 1200;
  const bgImageHeight = loginConfig?.backgroundImageHeight || 800;

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="hidden bg-muted lg:flex items-center justify-center p-8" style={backgroundColor ? { backgroundColor } : {}}>
        <Image
          src={bgImageUrl}
          alt="Image"
          width={bgImageWidth}
          height={bgImageHeight}
          className="object-contain dark:brightness-[0.8]"
          data-ai-hint="login background"
        />
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
           <div className="grid gap-2 text-center">
             <div className="flex justify-center p-6">
                <Image 
                    src={logoUrl} 
                    alt="Logo Bộ Tư pháp" 
                    width={logoWidth} 
                    height={logoHeight} 
                    data-ai-hint="application logo"
                />
            </div>
            <CardHeader className="text-center pt-0">
                <h1 className="font-display-header text-[26px] uppercase tracking-wide text-header-blue whitespace-nowrap">
                    ĐÁNH GIÁ CHUẨN TIẾP CẬN PHÁP LUẬT
                </h1>
                <h2 className="font-display-subheader text-[26px] uppercase text-header-red whitespace-nowrap">
                    TỈNH AN GIANG
                </h2>
                <CardDescription className="pt-4">
                    Đăng nhập vào tài khoản của bạn để tiếp tục
                </CardDescription>
            </CardHeader>
           </div>
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
        </div>
      </div>
    </div>
  );
}
