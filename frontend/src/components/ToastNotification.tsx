import type { SyntheticEvent } from 'react';
import {
  AlertTitle,
  Box,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ReportGmailerrorredRoundedIcon from '@mui/icons-material/ReportGmailerrorredRounded';
import { useToastStore } from '../stores/toastStore';

const iconBySeverity = {
  success: <CheckCircleRoundedIcon fontSize="medium" />,
  info: <InfoRoundedIcon fontSize="medium" />,
  warning: <WarningAmberRoundedIcon fontSize="medium" />,
  error: <ReportGmailerrorredRoundedIcon fontSize="medium" />,
};

export const ToastNotification = () => {
  const theme = useTheme();
  const { open, message, severity, hideToast, title, duration } = useToastStore();

  const palette = theme.palette[severity];
  const backgroundColor = alpha(palette.main, theme.palette.mode === 'light' ? 0.18 : 0.32);
  const foregroundColor =
    theme.palette.mode === 'light' ? palette.main : theme.palette.getContrastText(palette.main);

  const handleClose = (_event?: SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    hideToast();
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration ?? 3000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      TransitionProps={{
        enter: true,
        exit: true,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          px: 3,
          py: 2.5,
          borderRadius: theme.shape.borderRadius * 2.5,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          backgroundColor,
          border: `2px solid ${alpha(palette.main, 0.24)}`,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          minWidth: 320,
          maxWidth: 480,
          animation: 'slideUp 0.3s ease-out',
          '@keyframes slideUp': {
            from: {
              transform: 'translateY(20px)',
              opacity: 0,
            },
            to: {
              transform: 'translateY(0)',
              opacity: 1,
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: alpha(palette.main, theme.palette.mode === 'light' ? 0.24 : 0.48),
            color: foregroundColor,
            flexShrink: 0,
          }}
        >
          {iconBySeverity[severity]}
        </Box>
        <Stack spacing={0.5} flexGrow={1} justifyContent="center">
          {title && (
            <AlertTitle
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                color: theme.palette.text.primary,
                lineHeight: 1.4,
                mb: 0,
              }}
            >
              {title}
            </AlertTitle>
          )}
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              whiteSpace: 'pre-line',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {message}
          </Typography>
        </Stack>
        <IconButton
          onClick={handleClose}
          size="small"
          edge="end"
          sx={{
            color: alpha(foregroundColor, 0.72),
            '&:hover': {
              color: foregroundColor,
            },
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Snackbar>
  );
};
