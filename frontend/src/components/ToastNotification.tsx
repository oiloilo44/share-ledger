/**
 * Toast 알림 컴포넌트
 * 전역 알림 메시지를 표시
 */

import { Snackbar, Alert } from '@mui/material';
import { useToastStore } from '../stores/toastStore';

export const ToastNotification = () => {
  const { open, message, severity, hideToast } = useToastStore();

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    hideToast();
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};
