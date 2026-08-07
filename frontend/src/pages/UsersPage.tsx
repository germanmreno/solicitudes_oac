import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Copy, KeyRound, Power } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createUser, listUsers, resetPassword, updateUser } from '@/features/users/users.api';
import { toast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

export function UsersPage() {
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  });

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpenCreate(false);
      if (result.tempPassword) {
        setTempPassword(result.tempPassword);
      } else {
        toast.success('Usuario creado correctamente.');
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'No se pudo crear el usuario'),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateUser(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const reset = useMutation({
    mutationFn: (id: string) => resetPassword(id),
    onSuccess: (pwd) => {
      setTempPassword(pwd);
    },
  });

  return (
    <div className="container-page">
      <div className="flex items-center gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-serif text-secondary">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Censistas y administradores del sistema.</p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo usuario
          </Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Nombre completo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono">@{u.username}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'ADMIN' ? 'secondary' : 'muted'}>
                      {u.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'default' : 'muted'}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Resetear contraseña"
                        onClick={() => reset.mutate(u.id)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title={u.active ? 'Desactivar' : 'Activar'}
                        onClick={() => toggle.mutate({ id: u.id, active: !u.active })}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>Si no especifica contraseña, se generará una temporal.</DialogDescription>
          </DialogHeader>
          <CreateUserForm
            submitting={create.isPending}
            onSubmit={(data) => create.mutate(data)}
            onCancel={() => setOpenCreate(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!tempPassword} onOpenChange={(v) => !v && setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contraseña temporal</DialogTitle>
            <DialogDescription>
              Esta contraseña solo se mostrará una vez. El usuario deberá cambiarla al ingresar.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-3 rounded font-mono text-sm flex items-center justify-between">
            <span className="break-all">{tempPassword}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (tempPassword) {
                  void navigator.clipboard.writeText(tempPassword);
                  toast.success('Contraseña copiada al portapapeles');
                }
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserForm({
  onSubmit,
  submitting,
  onCancel,
}: {
  onSubmit: (data: { username: string; fullName: string; role: 'ADMIN' | 'OPERATOR'; password?: string }) => void;
  submitting: boolean;
  onCancel: () => void;
}) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');
  const [password, setPassword] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ username, fullName, role, password: password || undefined });
      }}
      className="space-y-4"
    >
      <div>
        <Label>Usuario</Label>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
      </div>
      <div>
        <Label>Nombre completo</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} />
      </div>
      <div>
        <Label>Rol</Label>
        <Select value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'OPERATOR')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OPERATOR">Operador</SelectItem>
            <SelectItem value="ADMIN">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Contraseña (opcional, mínimo 8 caracteres)</Label>
        <Input
          type="text"
          placeholder="Dejar vacío para generar una temporal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Crear usuario
        </Button>
      </DialogFooter>
    </form>
  );
}
