import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { BooksPage } from './pages/BooksPage';
import { BookDetailPage } from './pages/BookDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { BookSettingsPage } from './pages/BookSettingsPage';
import { StatsPage } from './pages/StatsPage';
import { ComponentDemoPage } from './pages/ComponentDemoPage';
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
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/demo',
    element: <ComponentDemoPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'books',
            element: <BooksPage />,
          },
          {
            path: 'stats',
            element: <StatsPage />,
          },
          {
            path: 'books/:bookId',
            element: <BookDetailPage />,
          },
          {
            path: 'books/:bookId/history',
            element: <HistoryPage />,
          },
          {
            path: 'books/:bookId/settings',
            element: <BookSettingsPage />,
          },
        ],
      },
    ],
  },
]);
