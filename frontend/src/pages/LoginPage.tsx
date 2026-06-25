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
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '../stores/authStore';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, sendPasswordReset, isLoading } = useAuthStore();

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
                공유 가계부
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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
              </Box>

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
