import { AppBar, Box, Container, IconButton, Toolbar, Typography, Button } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import { Outlet } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

export const RootLayout = () => {
  const { themeMode, toggleTheme } = useUIStore();
  const { signOut, user } = useAuthStore();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" color="primary" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ShareLedger
          </Typography>
          {user && (
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user.email}
            </Typography>
          )}
          <IconButton color="inherit" onClick={toggleTheme} size="large" aria-label="toggle theme">
            {themeMode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />} sx={{ ml: 1 }}>
            로그아웃
          </Button>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ flex: 1, py: 4 }}>
        <Outlet />
      </Container>
      <Box component="footer" sx={{ py: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} ShareLedger
        </Typography>
      </Box>
    </Box>
  );
};
