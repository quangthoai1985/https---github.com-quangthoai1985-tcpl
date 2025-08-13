
'use client';

import {
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { users } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type User = typeof users[0];

function UserForm({ user, onSave, onCancel }: { user: Partial<User>, onSave: (user: Partial<User>) => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState(user);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value as User['role']}));
  }

  return (
    <>
      <DialogHeader>
          <DialogTitle>{user.id ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}</DialogTitle>
          <DialogDescription>
              {user.id ? 'Cập nhật thông tin người dùng.' : 'Điền thông tin để tạo tài khoản mới cho cán bộ.'}
          </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Họ và tên</Label>
              <Input id="name" value={formData.name || ''} onChange={handleChange} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={formData.email || ''} onChange={handleChange} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit" className="text-right">Đơn vị</Label>
              <Input id="unit" value={formData.unit || ''} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Vai trò</Label>
              <Select value={formData.role} onValueChange={handleSelectChange}>
                  <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Cán bộ Tỉnh">Cán bộ Tỉnh</SelectItem>
                      <SelectItem value="Cán bộ Xã">Cán bộ Xã</SelectItem>
                  </SelectContent>
              </Select>
          </div>
      </div>
      <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Hủy</Button>
          <Button type="submit" onClick={() => onSave(formData)}>{user.id ? 'Lưu thay đổi' : 'Tạo mới'}</Button>
      </DialogFooter>
    </>
  )
}

function UserTable({ users, onEdit, onResetPassword }: { users: User[], onEdit: (user: User) => void, onResetPassword: (user: User) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Người dùng</CardTitle>
        <CardDescription>
          Quản lý người dùng trong hệ thống.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Avatar</span>
              </TableHead>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead className="hidden md:table-cell">
                Đơn vị
              </TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="hidden sm:table-cell">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://placehold.co/100x100.png?text=${user.name.charAt(0)}`} data-ai-hint="user avatar" />
                    <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                    {user.name}
                    <div className="text-sm text-muted-foreground md:hidden">
                        {user.email}
                    </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {user.unit}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(user)}>Sửa</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onResetPassword(user)}>Đặt lại mật khẩu</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Hiển thị <strong>1-{users.length}</strong> trên <strong>{users.length}</strong> người dùng
        </div>
      </CardFooter>
    </Card>
  )
}

export default function UserManagementPage() {
  const [userList, setUserList] = React.useState(users);
  const [editingUser, setEditingUser] = React.useState<Partial<User> | null>(null);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = React.useState(false);
  const [resettingUser, setResettingUser] = React.useState<User | null>(null);
  const { toast } = useToast();

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleResetPassword = (user: User) => {
    setResettingUser(user);
  };
  
  const confirmResetPassword = () => {
    if (resettingUser) {
        // In a real app, this would trigger an API call.
        // For now, we'll just show a success toast.
        toast({
            title: "Thành công!",
            description: `Đã gửi email đặt lại mật khẩu cho ${resettingUser.name}.`,
        });
        setResettingUser(null);
    }
  };

  const handleSaveUser = (userToSave: Partial<User>) => {
    if (userToSave.id) {
      setUserList(userList.map(u => u.id === userToSave.id ? {...u, ...userToSave} : u));
    } else {
      // Add new user logic
      const newUser = {
        ...userToSave,
        id: `USR${String(userList.length + 1).padStart(3, '0')}`,
        email: userToSave.email || '',
        name: userToSave.name || '',
        unit: userToSave.unit || '',
        role: userToSave.role || 'Cán bộ Xã',
      } as User;
      setUserList([...userList, newUser]);
    }
    setEditingUser(null);
    setIsNewUserDialogOpen(false);
  }

  const handleCancel = () => {
    setEditingUser(null);
    setIsNewUserDialogOpen(false);
  }
  
  const adminUsers = userList.filter(u => u.role === 'Cán bộ Tỉnh');
  const communeUsers = userList.filter(u => u.role === 'Cán bộ Xã');

  return (
    <>
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="admin">Cán bộ Tỉnh</TabsTrigger>
          <TabsTrigger value="commune">Cán bộ Xã</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm..."
              className="w-full rounded-lg bg-card pl-8 md:w-[200px] lg:w-[320px]"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Lọc
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Lọc theo vai trò</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked>
                Cán bộ Tỉnh
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Cán bộ Xã</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-10 gap-1" onClick={() => setIsNewUserDialogOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Thêm người dùng
            </span>
          </Button>
        </div>
      </div>
      <TabsContent value="all">
        <UserTable users={userList} onEdit={handleEdit} onResetPassword={handleResetPassword} />
      </TabsContent>
      <TabsContent value="admin">
        <UserTable users={adminUsers} onEdit={handleEdit} onResetPassword={handleResetPassword} />
      </TabsContent>
      <TabsContent value="commune">
        <UserTable users={communeUsers} onEdit={handleEdit} onResetPassword={handleResetPassword} />
      </TabsContent>
    </Tabs>

    {/* Add/Edit User Dialog */}
    <Dialog open={isNewUserDialogOpen || !!editingUser} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
    }}>
      <DialogContent>
        {isNewUserDialogOpen && <UserForm user={{}} onSave={handleSaveUser} onCancel={handleCancel} />}
        {editingUser && <UserForm user={editingUser} onSave={handleSaveUser} onCancel={handleCancel} />}
      </DialogContent>
    </Dialog>

    {/* Reset Password Alert Dialog */}
    <AlertDialog open={!!resettingUser} onOpenChange={(open) => !open && setResettingUser(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận đặt lại mật khẩu</AlertDialogTitle>
                <AlertDialogDescription>
                    Bạn có chắc chắn muốn đặt lại mật khẩu cho người dùng <strong>{resettingUser?.name}</strong>?
                    Hành động này sẽ gửi một email hướng dẫn đến địa chỉ {resettingUser?.email}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setResettingUser(null)}>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={confirmResetPassword}>Xác nhận</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}

    

    