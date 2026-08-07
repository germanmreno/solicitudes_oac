import { Link } from 'react-router-dom';
import { Plus, ListChecks, Users, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/auth.store';

export function HomeRedirect() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className="container-page max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido</CardTitle>
            <CardDescription>Acceda al sistema de solicitudes CVM.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login"><LogIn className="h-4 w-4 mr-2" /> Iniciar sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page">
      <h1 className="text-2xl font-serif text-secondary mb-1">Bienvenido, {user.fullName}</h1>
      <p className="text-sm text-muted-foreground mb-6">¿Qué desea hacer hoy?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ActionCard
          to="/census/new"
          title="Registrar nueva solicitud"
          description="Complete el formulario para registrar un nuevo solicitante."
          icon={<Plus className="h-6 w-6" />}
        />
        <ActionCard
          to="/census/list"
          title="Ver solicitudes registradas"
          description="Consulte, filtre y descargue documentos."
          icon={<ListChecks className="h-6 w-6" />}
        />
        {user.role === 'ADMIN' && (
          <>
            <ActionCard
              to="/admin"
              title="Panel de administración"
              description="Vista global del sistema con filtros avanzados."
              icon={<ListChecks className="h-6 w-6" />}
            />
            <ActionCard
              to="/admin/users"
              title="Gestión de usuarios"
              description="Cree censistas y asigne roles."
              icon={<Users className="h-6 w-6" />}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ActionCard({ to, title, description, icon }: { to: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <Link to={to} className="block">
      <Card className="hover:border-primary/50 hover:shadow-md transition-all h-full">
        <CardHeader>
          <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-2">
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
