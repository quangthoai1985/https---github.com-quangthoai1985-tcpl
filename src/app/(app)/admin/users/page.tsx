
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/context/DataContext';

type User = {
  id: string;
  name: string;
  email: string;
  unitId: string;
  role: string;
};

function UserForm({ user, onSave, onCancel }: { user: Partial<User>, onSave: (user: Partial<User>) => void, onCancel: () => void }) {
  const [formData, setFormData] = React.useState(user);
  const { units } = useData();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleSelectChange = (id: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
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
              <Label htmlFor="unitId" className="text-right">Đơn vị</Label>
              <Select value={formData.unitId} onValueChange={handleSelectChange('unitId')}>
                  <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Chọn đơn vị" />
                  </SelectTrigger>
                  <SelectContent>
                      {units.map(unit => (
                          <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Vai trò</Label>
              <Select value={formData.role} onValueChange={handleSelectChange('role')}>
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
  const { units } = useData();
  const getUnitName = (unitId: string) => {
    return units.find(u => u.id === unitId)?.name || 'Không xác định';
  }
  
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
                  {getUnitName(user.unitId)}
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

function ResetPasswordForm({ user, onSave, onCancel }: { user: User, onSave: (password: string) => void, onCancel: () => void }) {
    const [password, setPassword] = React.useState('');

    return (
         <>
            <DialogHeader>
                <DialogTitle>Đặt lại mật khẩu cho {user.name}</DialogTitle>
                <DialogDescription>
                    Nhập mật khẩu mới cho người dùng. Họ sẽ có thể đăng nhập bằng mật khẩu này.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-password" className="text-right">
                        Mật khẩu mới
                    </Label>
                    <Input 
                        id="new-password" 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="col-span-3"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Hủy</Button>
                <Button type="submit" onClick={() => onSave(password)}>Lưu mật khẩu mới</Button>
            </DialogFooter>
        </>
    )
}

export default function UserManagementPage() {
  const { users, setUsers } = useData();
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
  
  const handleSavePassword = (password: string) => {
    if (resettingUser) {
        // In a real app, this would trigger an API call to update the user's password.
        // For now, we'll just show a success toast.
        toast({
            title: "Thành công!",
            description: `Đã đặt lại mật khẩu cho ${resettingUser.name}.`,
        });
        console.log(`Password for ${resettingUser.email} set to: ${password}`);
        setResettingUser(null);
    }
  };

  const handleSaveUser = (userToSave: Partial<User>) => {
    if (userToSave.id) {
      setUsers(users.map(u => u.id === userToSave.id ? {...u, ...userToSave} as User : u));
       toast({ title: "Thành công!", description: "Đã cập nhật thông tin người dùng."});
    } else {
      // Add new user logic
      const newUser = {
        ...userToSave,
        id: `USR${String(users.length + 1).padStart(3, '0')}`,
        email: userToSave.email || '',
        name: userToSave.name || '',
        unitId: userToSave.unitId || '',
        role: userToSave.role || 'Cán bộ Xã',
      } as User;
      setUsers([...users, newUser]);
       toast({ title: "Thành công!", description: "Đã tạo người dùng mới."});
    }
    setEditingUser(null);
    setIsNewUserDialogOpen(false);
  }

  const handleCancel = () => {
    setEditingUser(null);
    setIsNewUserDialogOpen(false);
  }
  
  const adminUsers = users.filter(u => u.role === 'Cán bộ Tỉnh');
  const communeUsers = users.filter(u => u.role === 'Cán bộ Xã');

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
        <UserTable users={users} onEdit={handleEdit} onResetPassword={handleResetPassword} />
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

    {/* Reset Password Dialog */}
    <Dialog open={!!resettingUser} onOpenChange={(open) => !open && setResettingUser(null)}>
        <DialogContent>
            {resettingUser && (
                <ResetPasswordForm 
                    user={resettingUser} 
                    onSave={handleSavePassword}
                    onCancel={() => setResettingUser(null)} 
                />
            )}
        </DialogContent>
    </Dialog>

    </>
  );
}
