import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth';
import { login } from '@/features/auth/auth.api';
import { getErrorMessage } from '@/lib/api/client';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    setError(null);
    try {
      await login(values);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/census';
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Credenciales inválidas'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Iniciar sesión</CardTitle>
              <CardDescription>Use sus credenciales asignadas por el administrador.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="username">Usuario</Label>
                  <Input id="username" autoComplete="username" {...form.register('username')} />
                  {form.formState.errors.username && (
                    <p className="error-text">{form.formState.errors.username.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
                  {form.formState.errors.password && (
                    <p className="error-text">{form.formState.errors.password.message}</p>
                  )}
                </div>
                {error && <p className="error-text">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                  Entrar
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2026 Corporación Venezolana de Minería · Ministerio del Poder Popular de Desarrollo Minero
            Ecológico e Industrias Básicas
          </p>
          <p className="text-center text-sm mt-2">
            <Link to="/consulta" className="text-primary hover:underline">
              Consulte el estatus de su solicitud
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
