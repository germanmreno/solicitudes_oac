import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth/auth.store';
import { API_BASE } from '@/lib/api/config';

export function RequireAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, setAccessToken, clear } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!accessToken) {
        try {
          const { data } = await axios.post<{ data: { accessToken: string } }>(
            `${API_BASE}/auth/refresh`,
            {},
            { withCredentials: true },
          );
          setAccessToken(data.data.accessToken);
        } catch {
          clear();
          navigate('/login', { replace: true, state: { from: location } });
          return;
        }
      }
      if (!cancelled) setChecking(false);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [accessToken, setAccessToken, clear, location, navigate]);

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  useEffect(() => {
    if (user && user.role !== 'ADMIN') navigate('/census', { replace: true });
  }, [user, navigate]);
  if (!user) return null;
  if (user.role !== 'ADMIN') return null;
  return <Outlet />;
}
