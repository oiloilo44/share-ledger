import { Alert, Button } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useOfflineStore } from '../stores/offlineStore';
import { flushOfflineQueue, getOfflineQueueCount } from '../lib/offlineQueue';
import { useToastStore } from '../stores/toastStore';

export const OfflineBanner = () => {
  const isOffline = useOfflineStore((state) => state.isOffline);
  const pendingEntries = useOfflineStore((state) => state.pendingEntries);
  const showToast = useToastStore((state) => state.showToast);

  const handleManualSync = async () => {
    const { success, failure } = await flushOfflineQueue();
    const count = getOfflineQueueCount();
    useOfflineStore.getState().setPendingEntries(count);
    if (success > 0) {
      showToast(`${success}건을 동기화했습니다.`, {
        severity: 'success',
        title: '오프라인 동기화',
      });
    }
    if (failure > 0) {
      showToast(`${failure}건이 아직 대기 중입니다.`, {
        severity: 'warning',
        title: '동기화 실패',
      });
    }
  };

  if (!isOffline && pendingEntries === 0) {
    return null;
  }

  const message = isOffline
    ? '오프라인 모드입니다. 작성한 내역은 연결 시 자동 업로드됩니다.'
    : `동기화 대기 중인 내역 ${pendingEntries}건이 있습니다.`;

  return (
    <Alert
      icon={isOffline ? <WifiOffIcon fontSize="inherit" /> : undefined}
      severity={isOffline ? 'warning' : 'info'}
      action={
        pendingEntries > 0 && !isOffline ? (
          <Button
            color="inherit"
            size="small"
            onClick={handleManualSync}
            startIcon={<SyncIcon fontSize="small" />}
          >
            지금 동기화
          </Button>
        ) : undefined
      }
      sx={{ borderRadius: 0 }}
    >
      {message}
    </Alert>
  );
};
