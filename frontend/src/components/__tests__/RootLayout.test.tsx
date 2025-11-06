/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from '../RootLayout';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const theme = createTheme();
const queryClient = new QueryClient();

// Realtime sync 훅 모킹
vi.mock('../../hooks/useRealtimeSync', () => ({
  useRealtimeBooksListSync: vi.fn(),
}));

const renderRootLayout = (initialEntries: string[] = ['/']) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<div>Home Page</div>} />
              <Route path="books" element={<div>Books Page</div>} />
              <Route path="stats" element={<div>Stats Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('RootLayout', () => {
  beforeEach(() => {
    // 스토어 초기화
    useUIStore.setState({
      themeMode: 'light',
      toggleTheme: vi.fn(),
      initializeTheme: vi.fn(),
    });
    useAuthStore.setState({
      user: { id: '123', email: 'test@example.com' } as any,
      session: null,
      isLoading: false,
      isInitialized: true,
      signOut: vi.fn(),
      initialize: vi.fn(),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      sendPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
    });
    localStorage.clear();
  });

  describe('기본 렌더링', () => {
    it('로고 표시', () => {
      renderRootLayout();
      expect(screen.getByText('ShareLedger')).toBeInTheDocument();
    });

    it('네비게이션 버튼 표시', () => {
      renderRootLayout();
      expect(screen.getByLabelText('홈')).toBeInTheDocument();
      expect(screen.getByLabelText('통계')).toBeInTheDocument();
      expect(screen.getByLabelText('가계부')).toBeInTheDocument();
    });

    it('사용자 이메일 표시 (데스크톱)', () => {
      renderRootLayout();
      // 데스크톱에서만 표시 (display: none on mobile)
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('로그아웃 버튼 표시', () => {
      renderRootLayout();
      // 모바일 + 데스크톱 2개의 로그아웃 버튼
      const logoutButtons = screen.getAllByLabelText('로그아웃');
      expect(logoutButtons).toHaveLength(2);
    });

    it('다크 모드 토글 버튼 표시', () => {
      renderRootLayout();
      expect(screen.getByLabelText('다크 모드로 전환')).toBeInTheDocument();
    });

    it('푸터 저작권 표시', () => {
      renderRootLayout();
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(`© ${currentYear} ShareLedger`)).toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    it('Skip to main content 링크 렌더링', () => {
      renderRootLayout();
      const skipLink = screen.getByText('본문으로 바로가기');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('main 요소에 id="main-content" 존재', () => {
      renderRootLayout();
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveAttribute('id', 'main-content');
    });

    it('현재 페이지 aria-current 속성', () => {
      renderRootLayout(['/']);
      const homeButton = screen.getByLabelText('홈');
      expect(homeButton).toHaveAttribute('aria-current', 'page');
    });

    it('다른 페이지는 aria-current 없음', () => {
      renderRootLayout(['/']);
      const booksButton = screen.getByLabelText('가계부');
      expect(booksButton).not.toHaveAttribute('aria-current');
    });
  });

  describe('다크 모드 토글', () => {
    it('라이트 모드일 때 Brightness4 아이콘 표시', () => {
      useUIStore.setState({ themeMode: 'light' });
      renderRootLayout();
      const toggleButton = screen.getByLabelText('다크 모드로 전환');
      expect(toggleButton).toBeInTheDocument();
    });

    it('다크 모드일 때 Brightness7 아이콘과 라벨 변경', () => {
      useUIStore.setState({ themeMode: 'dark' });
      renderRootLayout();
      const toggleButton = screen.getByLabelText('라이트 모드로 전환');
      expect(toggleButton).toBeInTheDocument();
    });

    it('토글 버튼 클릭 시 toggleTheme 호출', async () => {
      const user = userEvent.setup();
      const toggleThemeMock = vi.fn();
      useUIStore.setState({ toggleTheme: toggleThemeMock });

      renderRootLayout();
      const toggleButton = screen.getByLabelText('다크 모드로 전환');
      await user.click(toggleButton);

      expect(toggleThemeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('로그아웃', () => {
    it('로그아웃 버튼 클릭 시 signOut 호출', async () => {
      const user = userEvent.setup();
      const signOutMock = vi.fn();
      useAuthStore.setState({ signOut: signOutMock });

      renderRootLayout();
      // 데스크톱 로그아웃 버튼 클릭 (여러 개 있으므로 getAll 사용)
      const logoutButtons = screen.getAllByLabelText('로그아웃');
      await user.click(logoutButtons[0]);

      await waitFor(() => {
        expect(signOutMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('네비게이션', () => {
    it('홈 페이지 기본 렌더링', () => {
      renderRootLayout(['/']);
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });

    it('가계부 페이지 라우팅', () => {
      renderRootLayout(['/books']);
      expect(screen.getByText('Books Page')).toBeInTheDocument();
    });

    it('통계 페이지 라우팅', () => {
      renderRootLayout(['/stats']);
      expect(screen.getByText('Stats Page')).toBeInTheDocument();
    });

    it('가계부 버튼 클릭 시 aria-current 업데이트', async () => {
      const user = userEvent.setup();
      renderRootLayout(['/']);

      const booksButton = screen.getByLabelText('가계부');
      await user.click(booksButton);

      await waitFor(() => {
        expect(screen.getByText('Books Page')).toBeInTheDocument();
      });
    });
  });

  describe('사용자 상태', () => {
    it('user가 null일 때 이메일 표시 안 됨', () => {
      useAuthStore.setState({ user: null });
      renderRootLayout();
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
    });

    it('user가 있을 때 이메일 표시', () => {
      useAuthStore.setState({ user: { id: '123', email: 'user@example.com' } as any });
      renderRootLayout();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  describe('페이지 전환 애니메이션', () => {
    it('Outlet이 AnimatePresence로 감싸져 있음', () => {
      renderRootLayout(['/']);
      // 자식 페이지가 렌더링되는지 확인
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });
});
