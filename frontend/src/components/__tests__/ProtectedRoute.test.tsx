/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuthStore } from '../../stores/authStore';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderWithRouter = (initialEntries: string[] = ['/protected']) => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // 각 테스트 전 스토어 초기화
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      isInitialized: false,
      initialize: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      sendPasswordReset: vi.fn(),
      updatePassword: vi.fn(),
    });
  });

  describe('초기화', () => {
    it('isInitialized가 false일 때 initialize 호출', async () => {
      const initializeMock = vi.fn();
      useAuthStore.setState({
        isInitialized: false,
        isLoading: false,
        user: null,
        initialize: initializeMock,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(initializeMock).toHaveBeenCalledTimes(1);
      });
    });

    it('isInitialized가 true일 때 initialize 호출하지 않음', () => {
      const initializeMock = vi.fn();
      useAuthStore.setState({
        isInitialized: true,
        isLoading: false,
        user: { id: '123', email: 'test@example.com' } as any,
        initialize: initializeMock,
      });

      renderWithRouter();

      expect(initializeMock).not.toHaveBeenCalled();
    });
  });

  describe('로딩 상태', () => {
    it('isInitialized가 false일 때 로딩 스피너 표시', () => {
      useAuthStore.setState({
        isInitialized: false,
        isLoading: false,
        user: null,
      });

      renderWithRouter();

      // CircularProgress가 role="progressbar"로 렌더링됨
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('isLoading이 true일 때 로딩 스피너 표시', () => {
      useAuthStore.setState({
        isInitialized: true,
        isLoading: true,
        user: null,
      });

      renderWithRouter();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('초기화 중일 때 보호된 콘텐츠 표시 안 됨', () => {
      useAuthStore.setState({
        isInitialized: false,
        isLoading: false,
        user: null,
      });

      renderWithRouter();

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('인증 확인', () => {
    it('user가 null일 때 /login으로 리다이렉트', async () => {
      useAuthStore.setState({
        isInitialized: true,
        isLoading: false,
        user: null,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });

    it('user가 null일 때 보호된 콘텐츠 표시 안 됨', () => {
      useAuthStore.setState({
        isInitialized: true,
        isLoading: false,
        user: null,
      });

      renderWithRouter();

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('인증된 접근', () => {
    it('user가 있을 때 보호된 콘텐츠 표시', async () => {
      useAuthStore.setState({
        isInitialized: true,
        isLoading: false,
        user: { id: '123', email: 'test@example.com' } as any,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('user가 있을 때 로그인 페이지 표시 안 됨', () => {
      useAuthStore.setState({
        isInitialized: true,
        isLoading: false,
        user: { id: '123', email: 'test@example.com' } as any,
      });

      renderWithRouter();

      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });

    it('user가 있을 때 로딩 스피너 표시 안 됨', () => {
      useAuthStore.setState({
        isInitialized: true,
        isLoading: false,
        user: { id: '123', email: 'test@example.com' } as any,
      });

      renderWithRouter();

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('상태 전환', () => {
    it('초기화 완료 후 사용자가 없으면 로그인 페이지로 이동', async () => {
      useAuthStore.setState({
        isInitialized: false,
        isLoading: false,
        user: null,
      });

      renderWithRouter();

      // 초기화 중 로딩 스피너 표시
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // 초기화 완료
      useAuthStore.setState({
        isInitialized: true,
        isLoading: false,
        user: null,
      });

      // 로그인 페이지로 리다이렉트
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });

    it('초기화 완료 후 사용자가 있으면 보호된 콘텐츠 표시', async () => {
      useAuthStore.setState({
        isInitialized: false,
        isLoading: false,
        user: null,
      });

      renderWithRouter();

      // 초기화 중 로딩 스피너 표시
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // 초기화 완료 및 사용자 로그인
      useAuthStore.setState({
        isInitialized: true,
        isLoading: false,
        user: { id: '123', email: 'test@example.com' } as any,
      });

      // 보호된 콘텐츠 표시
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });
});
