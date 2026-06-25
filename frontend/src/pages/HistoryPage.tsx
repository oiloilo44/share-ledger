/**
 * 가계부 내역 히스토리 페이지
 * 수정 이력을 타임라인 형식으로 표시하고 복원 기능 제공
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import { useBooks } from '../hooks/useBooks';
import { useHistory, useRevertHistory } from '../hooks/useHistory';
import { EntryHistoryAction, type EntryHistoryItem } from '../types/entries';
import { APIError } from '../lib/api';
import { formatAmount } from '../lib/format';
import { useRealtimeBookSync } from '../hooks/useRealtimeSync';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToastStore } from '../stores/toastStore';
import { ContentSkeleton } from '../components/ContentSkeleton';
import { EmptyState } from '../components/EmptyState';
import { containerVariants, itemVariants } from '../utils/animations';

/**
 * 액션 타입별 아이콘 반환
 */
function getActionIcon(actionType: EntryHistoryAction) {
  switch (actionType) {
    case EntryHistoryAction.CREATED:
      return <AddIcon color="success" />;
    case EntryHistoryAction.UPDATED:
      return <EditIcon color="info" />;
    case EntryHistoryAction.DELETED:
      return <DeleteIcon color="error" />;
    case EntryHistoryAction.RESTORED:
      return <RestoreIcon color="warning" />;
    default:
      return <EditIcon />;
  }
}

/**
 * 액션 타입별 레이블 반환
 */
function getActionLabel(actionType: EntryHistoryAction): string {
  switch (actionType) {
    case EntryHistoryAction.CREATED:
      return '생성됨';
    case EntryHistoryAction.UPDATED:
      return '수정됨';
    case EntryHistoryAction.DELETED:
      return '삭제됨';
    case EntryHistoryAction.RESTORED:
      return '복원됨';
    default:
      return '알 수 없음';
  }
}

/**
 * 액션 타입별 색상 반환
 */
function getActionColor(
  actionType: EntryHistoryAction,
): 'success' | 'info' | 'error' | 'warning' | 'default' {
  switch (actionType) {
    case EntryHistoryAction.CREATED:
      return 'success';
    case EntryHistoryAction.UPDATED:
      return 'info';
    case EntryHistoryAction.DELETED:
      return 'error';
    case EntryHistoryAction.RESTORED:
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * 히스토리 스냅샷에서 내역 정보 추출
 */
interface SnapshotData {
  description: string;
  amount: number;
  entry_date: string;
  category?: string;
}

function parseSnapshot(snapshot: Record<string, unknown>): SnapshotData | null {
  if (!snapshot || typeof snapshot !== 'object') return null;

  const description = snapshot.description as string;
  const amount = snapshot.amount as number;
  const entry_date = snapshot.entry_date as string;
  const category = snapshot.category as string | undefined;

  if (!description || typeof amount !== 'number' || !entry_date) return null;

  return { description, amount, entry_date, category };
}

export const HistoryPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const { data: books } = useBooks();
  const { data: historyItems, isLoading, error } = useHistory(bookId!);
  const revertHistory = useRevertHistory(bookId!);
  const showToast = useToastStore((state) => state.showToast);

  // 실시간 동기화
  useRealtimeBookSync(bookId);

  const currentBook = books?.find((book) => book.id === bookId);
  const [confirmState, setConfirmState] = useState<{
    item: EntryHistoryItem;
    snapshot: SnapshotData;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleRevert = async (item: EntryHistoryItem) => {
    const snapshotData = parseSnapshot(item.snapshot);
    if (!snapshotData) {
      showToast('복원할 수 없는 히스토리입니다.', 'error');
      return;
    }
    setConfirmState({ item, snapshot: snapshotData });
  };

  const handleConfirmRevert = async () => {
    if (!confirmState) return;
    try {
      setIsConfirming(true);
      await revertHistory.mutateAsync(confirmState.item.id);
      showToast('히스토리를 복원했습니다.', 'success');
      setConfirmState(null);
    } catch (err) {
      console.error('히스토리 복원 실패:', err);
      const message =
        err instanceof APIError
          ? err.message
          : '히스토리를 복원하지 못했습니다. 다시 시도해주세요.';
      showToast(message, 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelRevert = () => {
    if (isConfirming) return;
    setConfirmState(null);
  };

  if (isLoading) {
    return (
      <Box>
        <Stack direction="row" alignItems="center" mb={3} gap={1}>
          <IconButton onClick={() => navigate(`/books/${bookId}`)}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight={800}>
            히스토리
          </Typography>
        </Stack>
        <ContentSkeleton variant="list" items={5} />
      </Box>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof APIError ? error.message : '히스토리를 불러오는데 실패했습니다.';
    return (
      <Box>
        <Stack direction="row" alignItems="center" mb={3} gap={1}>
          <IconButton onClick={() => navigate(`/books/${bookId}`)}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight={800}>
            히스토리
          </Typography>
        </Stack>
        <Alert severity="error">{errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" mb={3} gap={1}>
        <IconButton onClick={() => navigate(`/books/${bookId}`)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight={800} sx={{ flexGrow: 1 }}>
          {currentBook?.name} - 히스토리
        </Typography>
      </Stack>

      {/* 안내 메시지 */}
      <Alert severity="info" sx={{ mb: 3 }}>
        최근 100건의 변경 이력만 보관됩니다. 복원 버튼을 클릭하면 해당 시점의 내역으로 되돌릴 수
        있습니다.
      </Alert>

      {/* 히스토리 목록 */}
      {!historyItems || historyItems.length === 0 ? (
        <EmptyState
          title="변경 이력이 없습니다"
          description="내역을 추가하거나 수정하면 히스토리가 기록됩니다."
          icon={<RestoreIcon />}
          tone="informative"
          actions={[
            {
              label: '내역으로 돌아가기',
              variant: 'contained',
              onClick: () => navigate(`/books/${bookId}`),
            },
          ]}
        />
      ) : (
        <Stack
          spacing={2}
          component={motion.div}
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {historyItems.map((item) => {
            const snapshotData = parseSnapshot(item.snapshot);
            if (!snapshotData) return null;

            return (
              <Card
                key={item.id}
                component={motion.div}
                variants={itemVariants}
                sx={{
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    {/* 아이콘 */}
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${getActionColor(item.action_type)}.light`,
                        flexShrink: 0,
                      }}
                    >
                      {getActionIcon(item.action_type)}
                    </Box>

                    {/* 내용 */}
                    <Stack spacing={1} flex={1}>
                      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                        <Typography variant="body1" fontWeight={700}>
                          {snapshotData.description}
                        </Typography>
                        {snapshotData.category && (
                          <Chip label={snapshotData.category} size="small" variant="outlined" />
                        )}
                        <Chip
                          label={getActionLabel(item.action_type)}
                          color={getActionColor(item.action_type)}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>

                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(item.changed_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" color="text.secondary">
                            내역 날짜:{' '}
                            {new Date(snapshotData.entry_date).toLocaleDateString('ko-KR')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            •
                          </Typography>
                          <Typography
                            variant="body2"
                            color={snapshotData.amount >= 0 ? 'success.main' : 'error.main'}
                            fontWeight={700}
                          >
                            {formatAmount(snapshotData.amount)}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>

                    {/* 복원 버튼 */}
                    <IconButton
                      onClick={() => handleRevert(item)}
                      disabled={revertHistory.isPending}
                      color="primary"
                      sx={{
                        '&:hover': {
                          backgroundColor: 'primary.light',
                          transform: 'scale(1.1)',
                        },
                        transition: 'all 0.15s ease-in-out',
                      }}
                    >
                      <UndoIcon />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* 뒤로 가기 버튼 */}
      {historyItems && historyItems.length > 0 && (
        <Box mt={3} display="flex" justifyContent="center">
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate(`/books/${bookId}`)}
            sx={{ minWidth: 200 }}
          >
            내역으로 돌아가기
          </Button>
        </Box>
      )}

      <ConfirmDialog
        open={confirmState !== null}
        title="히스토리 복원"
        description={
          confirmState ? (
            <>
              "{confirmState.snapshot.description}" 내역을{' '}
              {new Date(confirmState.snapshot.entry_date).toLocaleDateString('ko-KR')} 기준으로
              복원하시겠습니까?
              <br />
              금액: {formatAmount(confirmState.snapshot.amount)}
              <br />
              카테고리: {confirmState.snapshot.category || '없음'}
            </>
          ) : undefined
        }
        confirmText="복원"
        variant="warning"
        loading={isConfirming}
        onConfirm={handleConfirmRevert}
        onCancel={handleCancelRevert}
      />
    </Box>
  );
};
