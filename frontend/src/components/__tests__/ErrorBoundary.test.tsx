import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const theme = createTheme();

// 에러를 발생시키는 테스트 컴포넌트
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // localStorage 초기화
    localStorage.clear();
    // console.error 모킹 초기화
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('정상 렌더링', () => {
    it('에러가 없을 때 자식 컴포넌트 렌더링', () => {
      renderWithTheme(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('에러가 발생하지 않으면 에러 UI 표시 안 됨', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText(/앗! 문제가 발생했어요/)).not.toBeInTheDocument();
    });
  });

  describe('에러 캐치', () => {
    it('에러 발생 시 기본 에러 UI 표시', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('앗! 문제가 발생했어요')).toBeInTheDocument();
      expect(screen.getByText(/일시적인 오류가 발생했어요/)).toBeInTheDocument();
    });

    it('에러 발생 시 이모지 아이콘 표시', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const emoji = screen.getByRole('img', { name: '오류' });
      expect(emoji).toBeInTheDocument();
      expect(emoji).toHaveTextContent('😵');
    });

    it('에러 발생 시 액션 버튼 표시', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '홈으로 이동' })).toBeInTheDocument();
    });
  });

  describe('커스텀 fallback', () => {
    it('fallback prop으로 커스텀 에러 UI 표시', () => {
      const customFallback = (error: Error, resetError: () => void) => (
        <div>
          <div>Custom error: {error.message}</div>
          <button onClick={resetError}>Reset</button>
        </div>
      );

      renderWithTheme(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Custom error: Test error message')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
      // 기본 에러 UI는 표시되지 않음
      expect(screen.queryByText('앗! 문제가 발생했어요')).not.toBeInTheDocument();
    });
  });

  describe('에러 핸들러', () => {
    it('onError prop 호출', () => {
      const onErrorSpy = vi.fn();

      renderWithTheme(
        <ErrorBoundary onError={onErrorSpy}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error message',
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
      );
    });
  });

  describe('에러 복구', () => {
    it('"다시 시도" 버튼 클릭 시 에러 상태 초기화', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      // 외부 변수를 사용하는 컴포넌트
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error message');
        }
        return <div>No error</div>;
      };

      renderWithTheme(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>,
      );

      // 에러 UI 표시 확인
      expect(screen.getByText('앗! 문제가 발생했어요')).toBeInTheDocument();

      // 에러를 발생시키지 않도록 변경
      shouldThrow = false;

      // "다시 시도" 버튼 클릭
      const retryButton = screen.getByRole('button', { name: '다시 시도' });
      await user.click(retryButton);

      // 에러 상태가 초기화되어 자식 컴포넌트가 다시 렌더링됨
      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument();
      });
    });

    it('"홈으로 이동" 버튼 클릭 시 window.location.href 변경', async () => {
      const user = userEvent.setup();
      // window.location.href setter를 모킹
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).location;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).location = { href: '' };

      renderWithTheme(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const homeButton = screen.getByRole('button', { name: '홈으로 이동' });
      await user.click(homeButton);

      expect(window.location.href).toBe('/');
    });
  });

  describe('에러 로깅', () => {
    it('localStorage에 에러 로그 저장', () => {
      renderWithTheme(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0]).toMatchObject({
        message: 'Test error message',
        timestamp: expect.any(String),
        stack: expect.any(String),
        componentStack: expect.any(String),
      });
    });

    it('최근 10개의 에러 로그만 유지', () => {
      // 11개의 에러를 발생시킴
      for (let i = 0; i < 11; i++) {
        const { unmount } = renderWithTheme(
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>,
        );
        unmount();
      }

      const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      expect(errorLogs).toHaveLength(10);
    });
  });

  describe('커스텀 fallback에서 resetError 사용', () => {
    it('커스텀 fallback에서 resetError 호출 가능', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const customFallback = (_error: Error, resetError: () => void) => (
        <div>
          <div>Error occurred</div>
          <button onClick={resetError}>Custom Reset</button>
        </div>
      );

      // 외부 변수를 사용하는 컴포넌트
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error message');
        }
        return <div>No error</div>;
      };

      renderWithTheme(
        <ErrorBoundary fallback={customFallback}>
          <TestComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Error occurred')).toBeInTheDocument();

      // 에러를 발생시키지 않도록 변경
      shouldThrow = false;

      const resetButton = screen.getByRole('button', { name: 'Custom Reset' });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument();
      });
    });
  });
});
