import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { RootLayout } from './components/RootLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
        ],
      },
    ],
  },
]);
