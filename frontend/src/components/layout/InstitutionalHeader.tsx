import * as React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/features/auth/auth.store';
import { logout } from '@/features/auth/auth.api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SyncIndicator } from './SyncIndicator';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';

export function InstitutionalHeader() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [pwdOpen, setPwdOpen] = React.useState(false);
  const base = import.meta.env.BASE_URL;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="border-b border-border bg-white">
      <div className="container mx-auto px-4 py-3 flex items-center gap-6">
        <Link to="/" aria-label="Inicio" className="flex-shrink-0">
          <BrandingImage src={`${base}branding/logo_ministerio.png`} fallbackText="MPPDEIB" className="h-12 sm:h-14" />
        </Link>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <p className="text-[10px] sm:text-xs text-secondary/70 font-medium tracking-widest uppercase">
            Corporación Venezolana de Minería
          </p>
          <p className="font-serif text-base sm:text-lg text-secondary font-semibold leading-tight">
            Registro de Solicitudes de Atención al Ciudadano
          </p>
        </div>

        <Link to="/" aria-label="CVM" className="flex-shrink-0">
          <BrandingImage src={`${base}branding/logo_cvm.png`} fallbackText="CVM" className="h-12 sm:h-14" />
        </Link>
      </div>

      {user && (
        <div className="border-t border-border bg-muted/40">
          <div className="container mx-auto px-4 py-2 flex items-center gap-3">
            <nav className="flex items-center gap-1 overflow-x-auto">
              <NavLink
                to="/census/new"
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                    isActive ? 'bg-secondary text-secondary-foreground font-semibold' : 'text-foreground hover:bg-muted'
                  }`
                }
              >
                Nueva solicitud
              </NavLink>
              <NavLink
                to="/census/list"
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                    isActive ? 'bg-secondary text-secondary-foreground font-semibold' : 'text-foreground hover:bg-muted'
                  }`
                }
              >
                Mis solicitudes
              </NavLink>
              {user.role === 'ADMIN' && (
                <>
                  <NavLink
                    to="/admin"
                    end
                    className={({ isActive }) =>
                      `px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                        isActive ? 'bg-secondary text-secondary-foreground font-semibold' : 'text-foreground hover:bg-muted'
                      }`
                    }
                  >
                    Panel
                  </NavLink>
                  <NavLink
                    to="/admin/catalogs"
                    end
                    className={({ isActive }) =>
                      `px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                        isActive ? 'bg-secondary text-secondary-foreground font-semibold' : 'text-foreground hover:bg-muted'
                      }`
                    }
                  >
                    Catálogos
                  </NavLink>
                  <NavLink
                    to="/admin/users"
                    end
                    className={({ isActive }) =>
                      `px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                        isActive ? 'bg-secondary text-secondary-foreground font-semibold' : 'text-foreground hover:bg-muted'
                      }`
                    }
                  >
                    Usuarios
                  </NavLink>
                </>
              )}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <NavLink
                to="/charts"
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                    isActive ? 'bg-secondary text-secondary-foreground font-semibold' : 'text-foreground hover:bg-muted'
                  }`
                }
              >
                Gráficos
              </NavLink>
              <SyncIndicator />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span className="hidden sm:inline max-w-[160px] truncate">{user.fullName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.fullName}</span>
                      <span className="text-xs text-muted-foreground font-normal">@{user.username}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    {user.role === 'ADMIN' ? (
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Administrador
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" /> Operador
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setPwdOpen(true); }}>
                    <KeyRound className="h-4 w-4 mr-2" /> Cambiar contraseña
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </header>
  );
}

function BrandingImage({ src, fallbackText, className }: { src: string; fallbackText: string; className?: string }) {
  const [errored, setErrored] = React.useState(false);
  if (errored) {
    return (
      <div className={className + ' px-3 inline-flex items-center justify-center rounded bg-secondary text-primary font-serif font-bold'}>
        {fallbackText}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={fallbackText}
      className={className + ' w-auto object-contain'}
      onError={() => setErrored(true)}
    />
  );
}
