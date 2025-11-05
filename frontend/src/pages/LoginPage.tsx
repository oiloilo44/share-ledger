import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '../stores/authStore';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signInWithOAuth, sendPasswordReset, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message || '로그인에 실패했습니다.');
      return;
    }

    navigate('/');
  };

  const handleOAuth = async (provider: 'google' | 'kakao') => {
    setError(null);
    const { error: oauthError } = await signInWithOAuth(provider);
    if (oauthError) {
      setError(oauthError.message || '소셜 로그인에 실패했습니다.');
    }
  };

  const handlePasswordResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);

    if (!resetEmail) {
      setResetError('이메일을 입력해주세요.');
      return;
    }

    const { error: resetErr } = await sendPasswordReset(resetEmail);
    if (resetErr) {
      setResetError(resetErr.message || '재설정 메일 전송에 실패했습니다.');
      return;
    }

    setResetMessage('재설정 메일을 전송했습니다. 메일함을 확인해주세요.');
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Card sx={{ width: '100%', boxShadow: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            {/* 로고 및 제목 */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h2" component="h1" gutterBottom fontWeight={800}>
                ShareLedger
              </Typography>
              <Typography variant="body1" color="text.secondary">
                공동 가계부 관리 서비스
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="이메일"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isLoading}
                  placeholder="email@example.com"
                />
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="비밀번호"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                  placeholder="비밀번호를 입력하세요"
                />
              </Stack>

              <Box sx={{ textAlign: 'right', mt: 1.5 }}>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => setResetDialogOpen(true)}
                  sx={{ fontWeight: 500 }}
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 4, mb: 2.5 }}
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  또는
                </Typography>
              </Divider>

              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => handleOAuth('google')}
                  disabled={isLoading}
                >
                  Google 계정으로 계속
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => handleOAuth('kakao')}
                  disabled={isLoading}
                  sx={{
                    bgcolor: '#fee500',
                    color: '#180500',
                    '&:hover': { bgcolor: '#fdd835' },
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  Kakao 계정으로 계속
                </Button>
              </Stack>

              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  계정이 없으신가요?{' '}
                  <Link component={RouterLink} to="/signup" underline="hover" fontWeight={600}>
                    회원가입
                  </Link>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>비밀번호 재설정</DialogTitle>
        <Box component="form" onSubmit={handlePasswordResetSubmit}>
          <DialogContent sx={{ pb: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              가입하신 이메일로 비밀번호 재설정 링크를 전송합니다.
            </Typography>
            {resetError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {resetError}
              </Alert>
            )}
            {resetMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {resetMessage}
              </Alert>
            )}
            <TextField
              fullWidth
              label="이메일"
              type="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              disabled={isLoading}
              required
              placeholder="email@example.com"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setResetDialogOpen(false)} disabled={isLoading} size="large">
              닫기
            </Button>
            <Button type="submit" variant="contained" disabled={isLoading} size="large">
              메일 전송
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
};
