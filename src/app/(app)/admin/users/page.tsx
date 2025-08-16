
'use client';

import {
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/context/DataContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { User } from '@/lib/data';
import PageHeader from '@/components/layout/page-header';
import { downloadUserTemplate, readUsersFromExcel } from '@/lib/excelUtils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
              <Label htmlFor="displayName" className="text-right">Họ và tên</Label>
              <Input id="displayName" value={formData.displayName || ''} onChange={handleChange} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">Tên đăng nhập</Label>
              <Input id="username" type="text" value={formData.username || ''} onChange={handleChange} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="communeId" className="text-right">Đơn vị</Label>
              <Select value={formData.communeId} onValueChange={handleSelectChange('communeId')}>
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
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="commune_staff">Cán bộ</SelectItem>
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

function ResetPasswordDialog({ user, onSave, onCancel }: { user: User, onSave: (password: string) => void, onCancel: () => void }) {
    const [password, setPassword] = React.useState('');

    return (
         <>
            <DialogHeader>
                <DialogTitle>Đặt lại mật khẩu cho {user.displayName}</DialogTitle>
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

function ImportUsersDialog({ onImport, onCancel }: { onImport: (users: User[]) => void, onCancel: () => void }) {
    const [file, setFile] = React.useState<File | null>(null);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const handleImportClick = async () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn một file Excel.' });
            return;
        }

        try {
            const newUsers = await readUsersFromExcel(file);
            onImport(newUsers);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Lỗi đọc file', description: 'Không thể xử lý file Excel. Vui lòng kiểm tra định dạng và thử lại.' });
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>Import danh sách Người dùng</DialogTitle>
                <DialogDescription>
                    Tải lên file Excel chứa danh sách người dùng. Hệ thống sẽ bỏ qua các người dùng có tên đăng nhập đã tồn tại.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <Alert>
                    <AlertTitle>Định dạng file Excel</AlertTitle>
                    <AlertDescription>
                        File phải chứa các cột: <strong>username, displayName, role, communeId</strong>.
                    </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={downloadUserTemplate}>Tải file mẫu</Button>
                <div className="grid gap-2">
                    <Label htmlFor="excel-file">Chọn file Excel</Label>
                    <Input id="excel-file" type="file" onChange={handleFileChange} accept=".xlsx, .xls" />
                </div>
                 {file && <p className="text-sm text-muted-foreground">Đã chọn file: {file.name}</p>}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Hủy</Button>
                <Button onClick={handleImportClick} disabled={!file}>Import</Button>
            </DialogFooter>
        </>
    );
}

function UserTable({ users, onEdit, onResetPassword, onDelete, onImport }: { users: User[], onEdit: (user?: User) => void, onResetPassword: (user: User) => void, onDelete: (user: User) => void, onImport: () => void }) {
  const { units } = useData();
  const getUnitName = (unitId: string) => {
    return units.find(u => u.id === unitId)?.name || 'Không xác định';
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="relative flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
            />
          </div>
          <div className='flex items-center gap-2'>
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
                  Admin
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Cán bộ</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-10 gap-1" onClick={onImport}>
              <Upload className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Import
              </span>
            </Button>
            <Button size="sm" className="h-10 gap-1" onClick={() => onEdit() }>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Thêm người dùng
              </span>
            </Button>
          </div>
        </div>
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
                    <AvatarFallback className={user.role === 'admin' ? 'bg-primary text-primary-foreground' : ''}>
                        {user.displayName.split(' ').map(n => n[0]).slice(-2).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                    {user.displayName}
                    <div className="text-sm text-muted-foreground md:hidden">
                        {user.username}
                    </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role === 'admin' ? 'Admin' : 'Cán bộ'}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {getUnitName(user.communeId)}
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
                      <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive">
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
  const { users, updateUsers } = useData();
  const [editingUser, setEditingUser] = React.useState<Partial<User> | null>(null);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [resettingUser, setResettingUser] = React.useState<User | null>(null);
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null);
  const { toast } = useToast();

  const handleEdit = (user?: User) => {
    setEditingUser(user || {});
    setIsNewUserDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
  };

  const confirmDelete = async () => {
    if (deletingUser) {
        await updateUsers(users.filter(u => u.id !== deletingUser.id));
        toast({
            title: "Thành công!",
            description: `Đã xóa người dùng "${deletingUser.displayName}".`,
        });
        setDeletingUser(null);
    }
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
            description: `Đã đặt lại mật khẩu cho ${resettingUser.displayName}.`,
        });
        console.log(`Password for ${resettingUser.username} set to: ${password}`);
        setResettingUser(null);
    }
  };

  const handleSaveUser = async (userToSave: Partial<User>) => {
    try {
        if (userToSave.id) {
            await updateUsers(users.map(u => u.id === userToSave.id ? {...u, ...userToSave} as User : u));
            toast({ title: "Thành công!", description: "Đã cập nhật thông tin người dùng."});
        } else {
            const newUser = {
                id: `USR${String(Date.now()).slice(-6)}`,
                username: userToSave.username || '',
                displayName: userToSave.displayName || '',
                communeId: userToSave.communeId || '',
                role: userToSave.role || 'commune_staff',
            } as User;
            await updateUsers([...users, newUser]);
            toast({ title: "Thành công!", description: "Đã tạo người dùng mới."});
        }
    } catch(error) {
        toast({ variant: 'destructive', title: "Lỗi!", description: "Không thể lưu người dùng." });
        console.error(error);
    }
    setEditingUser(null);
    setIsNewUserDialogOpen(false);
  }

  const handleCancel = () => {
    setEditingUser(null);
    setIsNewUserDialogOpen(false);
  }
  
  const handleImport = async (newUsers: User[]) => {
      const existingUsernames = new Set(users.map(u => u.username));
      const usersToAdd = newUsers.filter(u => !existingUsernames.has(u.username));
      const skippedCount = newUsers.length - usersToAdd.length;

      const finalUsers = [...users];
      usersToAdd.forEach(user => {
          finalUsers.push({
              ...user,
              id: `USR${String(Date.now()).slice(-5)}${Math.random().toString(36).substring(2, 5)}`,
          });
      });

      await updateUsers(finalUsers);

      if (usersToAdd.length > 0) {
            toast({
              title: "Import thành công!",
              description: `Đã thêm ${usersToAdd.length} người dùng mới. Bỏ qua ${skippedCount} người dùng đã tồn tại.`,
          });
      } else {
            toast({
              variant: 'default',
              title: "Không có gì thay đổi",
              description: `Tất cả ${skippedCount} người dùng trong file đã tồn tại.`,
          });
      }
      setIsImportOpen(false);
  };
  
  const adminUsers = users.filter(u => u.role === 'admin');
  const communeUsers = users.filter(u => u.role === 'commune_staff');

  return (
    <>
    <PageHeader title="Quản lý Người dùng" description="Quản lý tất cả người dùng và vai trò trong hệ thống."/>
    <Tabs defaultValue="all">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="all">Tất cả</TabsTrigger>
        <TabsTrigger value="admin">Admin</TabsTrigger>
        <TabsTrigger value="commune">Cán bộ</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <UserTable users={users} onEdit={handleEdit} onResetPassword={handleResetPassword} onDelete={handleDelete} onImport={() => setIsImportOpen(true)} />
      </TabsContent>
      <TabsContent value="admin">
        <UserTable users={adminUsers} onEdit={handleEdit} onResetPassword={handleResetPassword} onDelete={handleDelete} onImport={() => setIsImportOpen(true)} />
      </TabsContent>
      <TabsContent value="commune">
        <UserTable users={communeUsers} onEdit={handleEdit} onResetPassword={handleResetPassword} onDelete={handleDelete} onImport={() => setIsImportOpen(true)} />
      </TabsContent>
    </Tabs>

    {/* Add/Edit User Dialog */}
    <Dialog open={isNewUserDialogOpen} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
    }}>
      <DialogContent>
        {editingUser && <UserForm user={editingUser || {}} onSave={handleSaveUser} onCancel={handleCancel} />}
      </DialogContent>
    </Dialog>

     {/* Import Users Dialog */}
    <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
            <ImportUsersDialog onImport={handleImport} onCancel={() => setIsImportOpen(false)} />
        </DialogContent>
    </Dialog>

    {/* Reset Password Dialog */}
    <Dialog open={!!resettingUser} onOpenChange={(open) => !open && setResettingUser(null)}>
        <DialogContent>
            {resettingUser && (
                <ResetPasswordDialog 
                    user={resettingUser} 
                    onSave={handleSavePassword}
                    onCancel={() => setResettingUser(null)} 
                />
            )}
        </DialogContent>
    </Dialog>

    {/* Delete User Dialog */}
    <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                <AlertDialogDescription>
                    Bạn có chắc chắn muốn xóa người dùng <strong>{deletingUser?.displayName}</strong>?
                    Hành động này không thể hoàn tác.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingUser(null)}>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Xác nhận Xóa</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
