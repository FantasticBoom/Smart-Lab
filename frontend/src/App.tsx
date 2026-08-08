import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { InventoryLabDetailPage } from './pages/inventory/InventoryLabDetailPage';
import { InventoryComputerLabPage } from './pages/inventory/InventoryComputerLabPage';
import { LockScreenPage } from './pages/lockscreen/LockScreenPage';
import { LockScreenLabPage } from './pages/lockscreen/LockScreenLabPage';
import { ManagementUsersPage } from './pages/management/ManagementUsersPage';
import { ManagementIndexPage } from './pages/management/ManagementIndexPage';
import { LabCategoryManagement } from './pages/management/LabCategoryManagement';
import { ScheduleLabIndexPage } from './pages/management/ScheduleLabIndexPage';
import { ScheduleLabDetailPage } from './pages/management/ScheduleLabDetailPage';
import { BeritaAcaraPage } from './pages/berita-acara/BeritaAcaraPage';
import { BeritaAcaraDetailPage } from './pages/berita-acara/BeritaAcaraDetailPage';
import { GenerateBeritaAcaraPage } from './pages/berita-acara/GenerateBeritaAcaraPage';
import BorrowLabPage from './pages/public/BorrowLabPage';
import VerifyBookingPage from './pages/public/VerifyBookingPage';
import LabBorrowingManagement from './pages/admin/LabBorrowingManagement';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/borrow-lab" element={<BorrowLabPage />} />
          <Route path="/verify/:bookingId" element={<VerifyBookingPage />} />

          
          <Route path="/" element={<ProtectedRoute allowedRoles={['superadmin', 'operator']} />}>
            <Route element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="inventory/labs/:id" element={<InventoryLabDetailPage />} />
              <Route path="inventory/computer-labs/:id" element={<InventoryComputerLabPage />} />
              <Route path="lockscreen" element={<LockScreenPage />} />
              <Route path="lockscreen/labs/:id" element={<LockScreenLabPage />} />
              <Route path="berita-acara" element={<BeritaAcaraPage />} />
              <Route path="berita-acara/generate" element={<GenerateBeritaAcaraPage />} />
              <Route path="berita-acara/:id" element={<BeritaAcaraDetailPage />} />
              <Route path="peminjaman-lab" element={<LabBorrowingManagement />} />
              <Route path="schedule-lab" element={<ScheduleLabIndexPage />} />
              <Route path="schedule-lab/:id" element={<ScheduleLabDetailPage />} />
              
              {/* Superadmin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
                <Route path="management" element={<ManagementIndexPage />} />
                <Route path="management/users" element={<ManagementUsersPage />} />
                <Route path="management/lab-categories" element={<LabCategoryManagement />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

