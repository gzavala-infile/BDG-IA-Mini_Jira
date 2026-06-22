import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { LoginPage } from '@/pages/LoginPage';
import { BoardPage } from '@/pages/BoardPage';
import { ArchivePage } from '@/pages/ArchivePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <PrivateRoute><AppLayout /></PrivateRoute>,
    children: [
      { index: true, element: <BoardPage /> },
      { path: 'board', element: <BoardPage /> },
      { path: 'archive', element: <ArchivePage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'admin/users', element: <AdminRoute><AdminUsersPage /></AdminRoute> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
