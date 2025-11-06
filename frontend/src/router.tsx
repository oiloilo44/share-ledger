import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './components/RootLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load pages
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() =>
  import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })),
);
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const BooksPage = lazy(() => import('./pages/BooksPage').then((m) => ({ default: m.BooksPage })));
const BookDetailPage = lazy(() =>
  import('./pages/BookDetailPage').then((m) => ({ default: m.BookDetailPage })),
);
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
);
const BookSettingsPage = lazy(() =>
  import('./pages/BookSettingsPage').then((m) => ({ default: m.BookSettingsPage })),
);
const StatsPage = lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const ComponentDemoPage = lazy(() =>
  import('./pages/ComponentDemoPage').then((m) => ({ default: m.ComponentDemoPage })),
);

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/signup',
    element: (
      <Suspense fallback={null}>
        <SignupPage />
      </Suspense>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <Suspense fallback={null}>
        <ResetPasswordPage />
      </Suspense>
    ),
  },
  {
    path: '/demo',
    element: (
      <Suspense fallback={null}>
        <ComponentDemoPage />
      </Suspense>
    ),
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
            element: (
              <Suspense fallback={null}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'books',
            element: (
              <Suspense fallback={null}>
                <BooksPage />
              </Suspense>
            ),
          },
          {
            path: 'stats',
            element: (
              <Suspense fallback={null}>
                <StatsPage />
              </Suspense>
            ),
          },
          {
            path: 'books/:bookId',
            element: (
              <Suspense fallback={null}>
                <BookDetailPage />
              </Suspense>
            ),
          },
          {
            path: 'books/:bookId/history',
            element: (
              <Suspense fallback={null}>
                <HistoryPage />
              </Suspense>
            ),
          },
          {
            path: 'books/:bookId/settings',
            element: (
              <Suspense fallback={null}>
                <BookSettingsPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);
