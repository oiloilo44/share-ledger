/**
 * 가계부 내역 히스토리 페이지
 * 수정 이력을 타임라인 형식으로 표시하고 복원 기능 제공
 */

import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Alert,
  Divider,
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

  // 실시간 동기화
  useRealtimeBookSync(bookId);

  const currentBook = books?.find((book) => book.id === bookId);

  const handleRevert = async (item: EntryHistoryItem) => {
    const snapshotData = parseSnapshot(item.snapshot);
    if (!snapshotData) return;

    const confirmMessage = `"${snapshotData.description}" 내역을 이 시점으로 복원하시겠습니까?\n\n날짜: ${new Date(snapshotData.entry_date).toLocaleDateString('ko-KR')}\n금액: ${formatAmount(snapshotData.amount)}\n카테고리: ${snapshotData.category || '없음'}`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await revertHistory.mutateAsync(item.id);
      alert('히스토리가 성공적으로 복원되었습니다.');
    } catch (error) {
      console.error('히스토리 복원 실패:', error);
      const errorMessage =
        error instanceof APIError ? error.message : '히스토리 복원에 실패했습니다.';
      alert(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof APIError ? error.message : '히스토리를 불러오는데 실패했습니다.';
    return (
      <Box p={3}>
        <Alert severity="error">{errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* 헤더 */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate(`/books/${bookId}`)} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {currentBook?.name} - 히스토리
        </Typography>
      </Box>

      {/* 안내 메시지 */}
      <Alert severity="info" sx={{ mb: 3 }}>
        최근 100건의 변경 이력만 보관됩니다. 복원 버튼을 클릭하면 해당 시점의 내역으로 되돌릴 수
        있습니다.
      </Alert>

      {/* 히스토리 목록 */}
      {!historyItems || historyItems.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            아직 변경 이력이 없습니다.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            내역을 추가하거나 수정하면 히스토리가 기록됩니다.
          </Typography>
        </Box>
      ) : (
        <Card>
          <CardContent>
            <List disablePadding>
              {historyItems.map((item, index) => {
                const snapshotData = parseSnapshot(item.snapshot);
                if (!snapshotData) return null;

                return (
                  <Box key={item.id}>
                    <ListItem
                      sx={{ py: 2, px: 1 }}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => handleRevert(item)}
                          disabled={revertHistory.isPending}
                          title="이 시점으로 복원"
                        >
                          <UndoIcon />
                        </IconButton>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {getActionIcon(item.action_type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="body1" component="span" fontWeight="medium">
                              {snapshotData.description}
                            </Typography>
                            {snapshotData.category && (
                              <Chip label={snapshotData.category} size="small" variant="outlined" />
                            )}
                            <Chip
                              label={getActionLabel(item.action_type)}
                              color={getActionColor(item.action_type)}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box display="flex" flexDirection="column" gap={0.5} mt={0.5}>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(item.changed_at).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" color="text.secondary">
                                날짜:{' '}
                                {new Date(snapshotData.entry_date).toLocaleDateString('ko-KR')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                •
                              </Typography>
                              <Typography
                                variant="body2"
                                color={snapshotData.amount >= 0 ? 'success.main' : 'error.main'}
                                fontWeight="medium"
                              >
                                {formatAmount(snapshotData.amount)}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < historyItems.length - 1 && <Divider />}
                  </Box>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}

      {/* 뒤로 가기 버튼 */}
      <Box mt={3} display="flex" justifyContent="center">
        <Button variant="outlined" onClick={() => navigate(`/books/${bookId}`)}>
          내역으로 돌아가기
        </Button>
      </Box>
    </Box>
  );
};
