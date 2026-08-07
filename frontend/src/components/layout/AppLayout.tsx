import { Outlet } from 'react-router-dom';
import { InstitutionalHeader } from './InstitutionalHeader';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <InstitutionalHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-muted/40 py-4 text-center text-xs text-muted-foreground">
        © 2026 Corporación Venezolana de Minería · Todos los derechos reservados
      </footer>
    </div>
  );
}
