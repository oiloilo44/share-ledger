import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { designTokens } from '../theme/tokens';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary: React 애플리케이션의 예상치 못한 에러를 캐치하여
 * 사용자 친화적인 화면을 표시하는 컴포넌트
 *
 * @example
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 에러가 발생하면 상태를 업데이트하여 fallback UI 표시
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 정보를 로깅하거나 외부 서비스로 전송
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 에러 정보를 localStorage에 저장한다.
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };
      const existingLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      existingLogs.push(errorLog);
      // 최근 10개만 유지
      localStorage.setItem('error_logs', JSON.stringify(existingLogs.slice(-10)));
    } catch (e) {
      // localStorage 저장 실패 시 무시
      console.error('Failed to save error log:', e);
    }

    // 커스텀 에러 핸들러 호출
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 커스텀 fallback이 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // 기본 에러 UI (토스 스타일)
      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              textAlign: 'center',
              gap: designTokens.spacing.lg,
              py: 4,
            }}
          >
            {/* 에러 아이콘 */}
            <Box
              sx={{
                fontSize: '4rem',
                lineHeight: 1,
                mb: 2,
              }}
              role="img"
              aria-label="오류"
            >
              😵
            </Box>

            {/* 제목 */}
            <Typography
              variant="h1"
              sx={{
                fontSize: designTokens.typography.heading.lg.size,
                fontWeight: designTokens.typography.heading.lg.weight,
                lineHeight: designTokens.typography.heading.lg.lineHeight,
                color: (theme) => theme.palette.text.primary,
                mb: 1,
              }}
            >
              앗! 문제가 발생했어요
            </Typography>

            {/* 설명 */}
            <Typography
              variant="body1"
              sx={{
                fontSize: designTokens.typography.body.md.size,
                fontWeight: designTokens.typography.body.md.weight,
                lineHeight: designTokens.typography.body.md.lineHeight,
                color: (theme) => theme.palette.text.secondary,
                mb: 3,
              }}
            >
              일시적인 오류가 발생했어요.
              <br />
              잠시 후 다시 시도해주세요.
            </Typography>

            {/* 개발 모드에서만 에러 메시지 표시 */}
            {import.meta.env.DEV && this.state.error && (
              <Box
                sx={{
                  width: '100%',
                  maxWidth: '600px',
                  p: 3,
                  backgroundColor: (theme) => theme.palette.grey[100],
                  borderRadius: `${designTokens.radius.md}px`,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  textAlign: 'left',
                  mb: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: (theme) => theme.palette.error.main,
                    wordBreak: 'break-all',
                  }}
                >
                  <strong>에러:</strong> {this.state.error.message}
                  {this.state.error.stack && (
                    <>
                      <br />
                      <br />
                      <strong>스택 트레이스:</strong>
                      <br />
                      {this.state.error.stack}
                    </>
                  )}
                </Typography>
              </Box>
            )}

            {/* 액션 버튼 */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={this.resetError}
                sx={{
                  borderRadius: `${designTokens.radius.lg}px`,
                  fontWeight: designTokens.typography.label.md.weight,
                  px: 4,
                  py: 1.5,
                  minWidth: '140px',
                }}
              >
                다시 시도
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={() => {
                  window.location.href = '/';
                }}
                sx={{
                  borderRadius: `${designTokens.radius.lg}px`,
                  fontWeight: designTokens.typography.label.md.weight,
                  px: 4,
                  py: 1.5,
                  minWidth: '140px',
                }}
              >
                홈으로 이동
              </Button>
            </Box>

            {/* 추가 도움말 */}
            <Typography
              variant="caption"
              sx={{
                fontSize: designTokens.typography.label.sm.size,
                fontWeight: designTokens.typography.label.sm.weight,
                color: (theme) => theme.palette.text.secondary,
                mt: 4,
              }}
            >
              문제가 계속되면 페이지를 새로고침하거나 브라우저 캐시를 삭제해보세요.
            </Typography>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}
