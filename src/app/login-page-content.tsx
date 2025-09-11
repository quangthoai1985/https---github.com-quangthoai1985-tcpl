
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
    if (!loading && currentUser) {
        router.push('/dashboard');
    }
  }, [currentUser, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await setLoginInfo(email, password);
    if (success) {
      // The useEffect above will handle the redirect
    } else {
      toast({
        variant: 'destructive',
        title: "Đăng nhập thất bại",
        description: "Email hoặc mật khẩu không chính xác.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const {
    backgroundImageUrl,
    primaryLogoUrl = "/logo.png",
    primaryLogoWidth = 100,
    primaryLogoHeight = 100,
    secondaryLogoUrl,
    secondaryLogoWidth = 100,
    secondaryLogoHeight = 100,
  } = loginConfig || {};


  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 relative">
        {backgroundImageUrl && (
            <Image
                src={backgroundImageUrl}
                alt="Background"
                layout="fill"
                objectFit="cover"
                className="z-0"
                data-ai-hint="login background"
            />
        )}
        <div className="absolute inset-0 bg-black/30 z-10"/>

        <Card className="w-full max-w-md z-20 bg-background/80 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center">
                <div className="flex justify-center items-center gap-4 p-6">
                    <Image 
                        src={primaryLogoUrl} 
                        alt="Logo Bộ Tư pháp" 
                        width={primaryLogoWidth} 
                        height={primaryLogoHeight} 
                        data-ai-hint="application logo"
                    />
                    {secondaryLogoUrl && (
                       <Image 
                            src={secondaryLogoUrl} 
                            alt="Logo Tỉnh An Giang" 
                            width={secondaryLogoWidth} 
                            height={secondaryLogoHeight} 
                            data-ai-hint="secondary logo"
                        />
                    )}
                </div>
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
