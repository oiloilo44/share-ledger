import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Alert,
  Link,
} from '@mui/material';
import { useAuthStore } from '../stores/authStore';

export const SignupPage = () => {
  const navigate = useNavigate();
  const { signUp, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setRequiresEmailConfirmation(false);

    if (!email || !password || !passwordConfirm) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    const { error: signUpError, requiresEmailConfirmation: needsConfirmation } = await signUp(
      email,
      password,
    );

    if (signUpError) {
      setError(signUpError.message || '회원가입에 실패했습니다.');
      return;
    }

    setRequiresEmailConfirmation(needsConfirmation);
    if (needsConfirmation) {
      setSuccessMessage('회원가입이 완료되었습니다! 이메일로 전송된 인증 링크를 확인해주세요.');
      return;
    }

    setSuccessMessage('회원가입이 완료되었습니다! 메인 페이지로 이동합니다...');
    setTimeout(() => {
      navigate('/');
    }, 1500);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              ShareLedger
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              계정 만들기
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
                {requiresEmailConfirmation && (
                  <Box mt={1}>
                    <Typography variant="body2" color="text.secondary">
                      이메일 인증을 마치신 후 로그인 페이지에서 다시 로그인해주세요.
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="이메일"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || Boolean(successMessage)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="비밀번호"
                type="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || Boolean(successMessage)}
                helperText="최소 6자 이상"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="passwordConfirm"
                label="비밀번호 확인"
                type="password"
                id="passwordConfirm"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={isLoading || Boolean(successMessage)}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={isLoading || Boolean(successMessage)}
              >
                {isLoading ? '처리 중...' : '회원가입'}
              </Button>

              {requiresEmailConfirmation && (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  sx={{ mb: 2 }}
                >
                  로그인 페이지로 이동
                </Button>
              )}

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  이미 계정이 있으신가요?{' '}
                  <Link component={RouterLink} to="/login" underline="hover">
                    로그인
                  </Link>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};
