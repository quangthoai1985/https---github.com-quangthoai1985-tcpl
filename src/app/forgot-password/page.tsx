
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
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import React from 'react';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would trigger an API call to send a reset link
    toast({
        title: "Thành công!",
        description: "Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được một liên kết đặt lại mật khẩu.",
    });
    router.push('/');
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <Card className="mx-auto w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
           <div className="mb-4 flex justify-center">
            <Image src="https://placehold.co/64x64.png" alt="Logo" width={64} height={64} data-ai-hint="logo"/>
          </div>
          <CardTitle className="text-2xl font-headline">Quên mật khẩu</CardTitle>
          <CardDescription>
            Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                required
              />
            </div>
            <Button type="submit" className="w-full">
                Gửi liên kết
            </Button>
             <Button variant="outline" className="w-full" asChild>
                <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Quay lại Đăng nhập</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
