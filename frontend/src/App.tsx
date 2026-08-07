import { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth, RequireAdmin } from '@/components/RequireAuth';
import { Toaster } from '@/components/ui/toast';
import { LoginPage } from '@/pages/LoginPage';
import { ConsultaPage } from '@/pages/ConsultaPage';
import { HomeRedirect } from '@/pages/HomeRedirect';
import { CensusListPage } from '@/pages/CensusListPage';
import { CensusDetailPage } from '@/pages/CensusDetailPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { UsersPage } from '@/pages/UsersPage';
import { CatalogsPage } from '@/pages/CatalogsPage';
import { ChartsPage } from '@/pages/ChartsPage';
import { CensusWizard } from '@/components/forms/CensusWizard';
import { setupAutoSync } from '@/lib/offline/queue';
import { useSyncStore } from '@/lib/offline/sync.store';

export default function App() {
  const refresh = useSyncStore((s) => s.refresh);

  useEffect(() => {
    setupAutoSync();
    void refresh();
  }, [refresh]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/consulta" element={<ConsultaPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/census" element={<Navigate to="/census/list" replace />} />
            <Route path="/census/new" element={<CensusWizard />} />
            <Route path="/census/list" element={<CensusListPage />} />
            <Route path="/census/:id" element={<CensusDetailPage />} />
            <Route path="/charts" element={<ChartsPage />} />

            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/catalogs" element={<CatalogsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
