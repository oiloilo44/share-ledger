import { type ReactNode, useEffect, useState, forwardRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  IconButton,
  Slide,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { TransitionProps } from '@mui/material/transitions';

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
  hideCloseButton?: boolean;
  disableBackdropClick?: boolean;
}

export const BottomSheet = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'sm',
  fullScreen = false,
  hideCloseButton = false,
  disableBackdropClick = false,
}: BottomSheetProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    if (!open) {
      setTranslateY(0);
    }
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateY > 100) {
      onClose();
    }
    setTranslateY(0);
  };

  const handleBackdropClick = () => {
    if (!disableBackdropClick) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleBackdropClick}
      TransitionComponent={Transition}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={fullScreen || isMobile}
      PaperProps={{
        sx: {
          borderTopLeftRadius: isMobile
            ? theme.shape.borderRadius * 3
            : theme.shape.borderRadius * 2,
          borderTopRightRadius: isMobile
            ? theme.shape.borderRadius * 3
            : theme.shape.borderRadius * 2,
          borderBottomLeftRadius: isMobile ? 0 : theme.shape.borderRadius * 2,
          borderBottomRightRadius: isMobile ? 0 : theme.shape.borderRadius * 2,
          m: 0,
          ...(isMobile && {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '90vh',
            transform: `translateY(${translateY}px)`,
            transition: isDragging
              ? 'none'
              : `transform ${theme.transitions.duration.short}ms ${theme.transitions.easing.easeOut}`,
          }),
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: alpha(theme.palette.common.black, 0.5),
        },
      }}
    >
      {/* Drag Handle (모바일) */}
      {isMobile && (
        <Box
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          sx={{
            pt: 2,
            pb: 1,
            display: 'flex',
            justifyContent: 'center',
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 4,
              backgroundColor: alpha(theme.palette.text.primary, 0.2),
              borderRadius: 2,
            }}
          />
        </Box>
      )}

      {/* Title */}
      {title && (
        <DialogTitle
          sx={{
            pt: isMobile ? 1 : 3,
            pb: 2,
            px: 3,
            fontWeight: 700,
            fontSize: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {title}
          {!hideCloseButton && (
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                ml: 2,
                color: theme.palette.text.secondary,
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}

      {/* Content */}
      <DialogContent
        sx={{
          px: 3,
          pb: isMobile ? 3 : 3,
          pt: title ? 0 : 2,
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
};
