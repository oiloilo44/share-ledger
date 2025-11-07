import type { ReactNode } from 'react';
import { useRef } from 'react';
import {
  alpha,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ReportGmailerrorredOutlinedIcon from '@mui/icons-material/ReportGmailerrorredOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';

export type ConfirmDialogVariant = 'info' | 'warning' | 'danger' | 'success';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onExited?: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'warning',
  loading = false,
  onConfirm,
  onCancel,
  onExited,
}: ConfirmDialogProps) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // 다이얼로그 트랜지션 완료 후 확인 버튼에 포커스
  const handleEntered = () => {
    if (confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      TransitionProps={{
        onEntered: handleEntered,
        onExited: onExited,
      }}
    >
      <DialogHeader variant={variant} title={title} />
      {description && (
        <DialogContent dividers>
          <Typography
            id="confirm-dialog-description"
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: 'pre-line' }}
          >
            {description}
          </Typography>
        </DialogContent>
      )}
      <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
        <Button onClick={onCancel} disabled={loading} variant="outlined">
          {cancelText}
        </Button>
        <Button
          ref={confirmButtonRef}
          onClick={onConfirm}
          color={variant === 'danger' ? 'error' : variant === 'success' ? 'success' : 'primary'}
          variant="contained"
          disabled={loading}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const getVariantIcon = (variant: ConfirmDialogVariant) => {
  switch (variant) {
    case 'danger':
      return <ReportGmailerrorredOutlinedIcon fontSize="inherit" />;
    case 'warning':
      return <WarningAmberOutlinedIcon fontSize="inherit" />;
    case 'success':
      return <CheckCircleOutlineOutlinedIcon fontSize="inherit" />;
    default:
      return <InfoOutlinedIcon fontSize="inherit" />;
  }
};

const DialogHeader = ({ variant, title }: { variant: ConfirmDialogVariant; title: string }) => {
  const theme = useTheme();
  const palette =
    variant === 'danger'
      ? theme.palette.error
      : variant === 'warning'
        ? theme.palette.warning
        : variant === 'success'
          ? theme.palette.success
          : theme.palette.info;

  return (
    <DialogTitle id="confirm-dialog-title" sx={{ px: 3, py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            color: palette.main,
            backgroundColor: alpha(palette.main, theme.palette.mode === 'light' ? 0.12 : 0.24),
          }}
        >
          {getVariantIcon(variant)}
        </Stack>
        <Typography variant="h6" component="span">
          {title}
        </Typography>
      </Stack>
    </DialogTitle>
  );
};
