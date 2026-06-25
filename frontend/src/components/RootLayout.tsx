import { AppBar, Box, Container, IconButton, Toolbar, Typography, Button } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { ToastNotification } from './ToastNotification';
import { OfflineBanner } from './OfflineBanner';
import { useRealtimeBooksListSync } from '../hooks/useRealtimeSync';

export const RootLayout = () => {
  const { themeMode, toggleTheme } = useUIStore();
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // 가계부 목록 실시간 동기화
  useRealtimeBooksListSync();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Skip to main content 링크 (접근성) */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: '-9999px',
          zIndex: 9999,
          padding: '1rem',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          textDecoration: 'none',
          '&:focus': {
            left: '1rem',
            top: '1rem',
          },
        }}
      >
        본문으로 바로가기
      </Box>

      <AppBar position="sticky" color="primary" enableColorOnDark component="header">
        <Toolbar>
          <Button
            color="inherit"
            onClick={() => navigate('/')}
            aria-label="ShareLedger 홈으로 이동"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              textTransform: 'none',
              minWidth: 'auto',
              p: 0,
            }}
          >
            ShareLedger
          </Button>
          <Box
            component="nav"
            aria-label="주요 네비게이션"
            sx={{ flexGrow: 1, ml: { xs: 1, sm: 3 }, display: 'flex', gap: { xs: 0.5, sm: 1 } }}
          >
            <Button
              color="inherit"
              startIcon={<HomeIcon aria-hidden="true" />}
              onClick={() => navigate('/')}
              aria-label="홈"
              aria-current={location.pathname === '/' ? 'page' : undefined}
              sx={{
                fontWeight: location.pathname === '/' ? 'bold' : 'normal',
                minWidth: { xs: 'auto', sm: '80px' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': {
                  mr: { xs: 0, sm: 1 },
                },
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>홈</Box>
            </Button>
            <Button
              color="inherit"
              startIcon={<BarChartIcon aria-hidden="true" />}
              onClick={() => navigate('/stats')}
              aria-label="통계"
              aria-current={location.pathname.startsWith('/stats') ? 'page' : undefined}
              sx={{
                fontWeight: location.pathname.startsWith('/stats') ? 'bold' : 'normal',
                minWidth: { xs: 'auto', sm: '80px' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': {
                  mr: { xs: 0, sm: 1 },
                },
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>통계</Box>
            </Button>
            <Button
              color="inherit"
              startIcon={<MenuBookIcon aria-hidden="true" />}
              onClick={() => navigate('/books')}
              aria-label="가계부"
              aria-current={location.pathname === '/books' ? 'page' : undefined}
              sx={{
                fontWeight: location.pathname === '/books' ? 'bold' : 'normal',
                minWidth: { xs: 'auto', sm: '80px' },
                px: { xs: 1, sm: 2 },
                '& .MuiButton-startIcon': {
                  mr: { xs: 0, sm: 1 },
                },
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>가계부</Box>
            </Button>
          </Box>
          {user && (
            <Typography
              variant="body2"
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'block' },
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.email}
            </Typography>
          )}
          <IconButton
            color="inherit"
            onClick={toggleTheme}
            size="large"
            aria-label={themeMode === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            {themeMode === 'light' ? (
              <Brightness4Icon aria-hidden="true" />
            ) : (
              <Brightness7Icon aria-hidden="true" />
            )}
          </IconButton>
          <IconButton
            color="inherit"
            onClick={handleLogout}
            size="large"
            aria-label="로그아웃"
            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
          >
            <LogoutIcon aria-hidden="true" />
          </IconButton>
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogoutIcon aria-hidden="true" />}
            sx={{ ml: 1, display: { xs: 'none', sm: 'inline-flex' } }}
            aria-label="로그아웃"
          >
            로그아웃
          </Button>
        </Toolbar>
      </AppBar>
      <OfflineBanner />
      <Container
        component="main"
        id="main-content"
        sx={{
          flex: 1,
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3 },
          position: 'relative',
        }}
        maxWidth="lg"
      >
        <Outlet />
      </Container>
      <Box component="footer" sx={{ py: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} ShareLedger
        </Typography>
      </Box>
      <ToastNotification />
    </Box>
  );
};
