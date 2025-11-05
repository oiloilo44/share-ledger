import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import {
  useRecurringEntries,
  useCreateRecurringEntry,
  useUpdateRecurringEntry,
  useRetryRecurringEntry,
  useDeleteRecurringEntry,
} from '../hooks/useRecurringEntries';
import type { RecurringEntry, RecurringEntryPayload, RecurringFrequency } from '../types/recurring';
import { formatAmount, parseCurrency, toISODateString } from '../lib/format';
import { ConfirmDialog } from './ConfirmDialog';
import { useToastStore } from '../stores/toastStore';

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' },
];

type DrawerMode = 'create' | 'edit';

interface RecurringEntryFormState {
  description: string;
  amount: string;
  category: string;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
}

const defaultFormState: RecurringEntryFormState = {
  description: '',
  amount: '',
  category: '',
  frequency: 'monthly',
  day_of_month: 1,
  day_of_week: null,
  start_date: toISODateString(new Date()),
  end_date: null,
};

interface RecurringEntriesSectionProps {
  bookId: string;
}

export const RecurringEntriesSection = ({ bookId }: RecurringEntriesSectionProps) => {
  const { data: recurringEntries, isLoading } = useRecurringEntries(bookId);
  const createMutation = useCreateRecurringEntry(bookId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const updateMutation = useUpdateRecurringEntry(editingId ?? '', bookId);
  const retryMutation = useRetryRecurringEntry(bookId);
  const deleteMutation = useDeleteRecurringEntry(bookId);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [formState, setFormState] = useState<RecurringEntryFormState>({ ...defaultFormState });
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RecurringEntry | null>(null);
  const showToast = useToastStore((state) => state.showToast);

  const editingEntry = useMemo(
    () => recurringEntries?.find((item) => item.id === editingId),
    [recurringEntries, editingId],
  );

  const handleOpenDrawer = (mode: DrawerMode, entry?: RecurringEntry) => {
    if (mode === 'edit' && entry) {
      setDrawerMode('edit');
      setEditingId(entry.id);
      setFormState({
        description: entry.description,
        amount: String(entry.amount),
        category: entry.category ?? '',
        frequency: entry.frequency,
        day_of_month: entry.day_of_month,
        day_of_week: entry.day_of_week,
        start_date: entry.start_date,
        end_date: entry.end_date,
      });
    } else {
      setDrawerMode('create');
      setEditingId(null);
      setFormState({ ...defaultFormState });
    }
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setDrawerOpen(false);
  };

  const handleFormChange = (key: keyof RecurringEntryFormState, value: string | number | null) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const amountValue = parseCurrency(formState.amount);
    if (!formState.description.trim() || amountValue === null || amountValue === 0) {
      showToast('설명과 금액을 올바르게 입력해주세요.', {
        severity: 'warning',
        title: '유효성 오류',
      });
      return;
    }

    const payload: RecurringEntryPayload = {
      description: formState.description.trim(),
      amount: amountValue,
      category: formState.category.trim() === '' ? null : formState.category.trim(),
      frequency: formState.frequency,
      day_of_month: formState.frequency === 'monthly' ? (formState.day_of_month ?? 1) : null,
      day_of_week: formState.frequency === 'weekly' ? (formState.day_of_week ?? 0) : null,
      start_date: formState.start_date,
      end_date: formState.end_date,
    };

    try {
      if (drawerMode === 'create') {
        await createMutation.mutateAsync(payload);
        showToast('반복 내역을 추가했습니다.', { severity: 'success', title: '추가 완료' });
      } else if (editingId) {
        await updateMutation.mutateAsync(payload);
        showToast('반복 내역을 수정했습니다.', { severity: 'success', title: '수정 완료' });
      }
      setDrawerOpen(false);
      setEditingId(null);
      setFormState({ ...defaultFormState });
    } catch (error) {
      console.error('반복 내역 저장 실패:', error);
      showToast('반복 내역을 저장하지 못했습니다.', { severity: 'error', title: '저장 실패' });
    }
  };

  const handleRetry = async (entry: RecurringEntry) => {
    try {
      await retryMutation.mutateAsync(entry.id);
      showToast('다음 실행을 재설정했습니다.', { severity: 'success', title: '재시도 완료' });
    } catch (error) {
      console.error('재시도 실패:', error);
      showToast('재시도 중 문제가 발생했습니다.', { severity: 'error', title: '재시도 실패' });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      showToast('반복 내역을 삭제했습니다.', { severity: 'success', title: '삭제 완료' });
      setPendingDelete(null);
    } catch (error) {
      console.error('삭제 실패:', error);
      showToast('반복 내역을 삭제하지 못했습니다.', { severity: 'error', title: '삭제 실패' });
    }
  };

  const recurrenceSummary = (entry: RecurringEntry) => {
    if (entry.frequency === 'monthly') {
      return `매달 ${entry.day_of_month ?? 1}일`;
    }
    const dayLabel =
      DAY_OF_WEEK_OPTIONS.find((opt) => opt.value === entry.day_of_week)?.label ?? '요일 미정';
    return `매주 ${dayLabel}`;
  };

  const nextOccurrenceLabel = (entry: RecurringEntry) => {
    if (!entry.next_occurrence) return '예정 없음';
    return format(new Date(entry.next_occurrence), 'yyyy-MM-dd');
  };

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <EventRepeatIcon color="primary" />
            <Typography variant="h6">반복 내역 관리</Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDrawer('create')}
          >
            반복 내역 추가
          </Button>
        </Stack>

        <Box mt={3}>
          {isLoading ? (
            <Typography variant="body2" color="text.secondary">
              반복 내역을 불러오는 중입니다...
            </Typography>
          ) : recurringEntries && recurringEntries.length > 0 ? (
            <List disablePadding>
              {recurringEntries.map((entry) => (
                <ListItem
                  key={entry.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    mb: 2,
                  }}
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="다음 실행 재설정">
                        <span>
                          <IconButton
                            onClick={() => handleRetry(entry)}
                            disabled={retryMutation.isPending}
                          >
                            <ReplayIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <IconButton onClick={() => handleOpenDrawer('edit', entry)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => setPendingDelete(entry)}
                        disabled={deleteMutation.isPending}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={1}
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                      >
                        <Typography variant="subtitle1" fontWeight={600}>
                          {entry.description}
                        </Typography>
                        <Chip
                          label={recurrenceSummary(entry)}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                        <Chip
                          label={
                            entry.is_active
                              ? `다음 실행: ${nextOccurrenceLabel(entry)}`
                              : '비활성화'
                          }
                          size="small"
                          color={entry.is_active ? 'success' : 'default'}
                        />
                      </Stack>
                    }
                    secondary={
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={1}
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                      >
                        <Typography
                          variant="body2"
                          color={entry.amount >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatAmount(entry.amount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {entry.category ?? '미분류'}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              아직 등록된 반복 내역이 없습니다. 자주 반복되는 지출이나 수입을 자동으로 기록해보세요.
            </Typography>
          )}
        </Box>
      </CardContent>

      <RecurringEntryDrawer
        open={isDrawerOpen}
        mode={drawerMode}
        formState={formState}
        onClose={handleCloseDrawer}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        editing={editingEntry}
        isSubmitting={drawerMode === 'create' ? createMutation.isPending : updateMutation.isPending}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="반복 내역 삭제"
        description={
          pendingDelete ? `"${pendingDelete.description}" 반복 내역을 삭제하시겠습니까?` : undefined
        }
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
        confirmText="삭제"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </Card>
  );
};

interface RecurringEntryDrawerProps {
  open: boolean;
  mode: DrawerMode;
  formState: RecurringEntryFormState;
  editing: RecurringEntry | undefined;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (key: keyof RecurringEntryFormState, value: string | number | null) => void;
  onSubmit: () => void;
}

const RecurringEntryDrawer = ({
  open,
  mode,
  formState,
  editing,
  isSubmitting,
  onClose,
  onChange,
  onSubmit,
}: RecurringEntryDrawerProps) => (
  <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{mode === 'create' ? '새 반복 내역 추가' : '반복 내역 수정'}</DialogTitle>
    <DialogContent>
      <Stack spacing={2} mt={1}>
        <TextField
          label="설명"
          value={formState.description}
          onChange={(event) => onChange('description', event.target.value)}
          inputProps={{ maxLength: 200 }}
        />
        <TextField
          label="금액 (원)"
          value={formState.amount}
          placeholder="예: 15000 (지출은 음수)"
          onChange={(event) => onChange('amount', event.target.value)}
        />
        <TextField
          label="카테고리"
          value={formState.category}
          onChange={(event) => onChange('category', event.target.value)}
          placeholder="선택 사항"
        />
        <TextField
          select
          label="반복 주기"
          value={formState.frequency}
          onChange={(event) => onChange('frequency', event.target.value as RecurringFrequency)}
        >
          <MenuItem value="monthly">월 반복</MenuItem>
          <MenuItem value="weekly">주 반복</MenuItem>
        </TextField>
        {formState.frequency === 'monthly' ? (
          <TextField
            select
            label="반복 일"
            value={formState.day_of_month ?? 1}
            onChange={(event) => onChange('day_of_month', Number(event.target.value))}
          >
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
              <MenuItem key={day} value={day}>
                매달 {day}일
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            select
            label="반복 요일"
            value={formState.day_of_week ?? 0}
            onChange={(event) => onChange('day_of_week', Number(event.target.value))}
          >
            {DAY_OF_WEEK_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                매주 {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <DatePicker
              label="시작일"
              value={formState.start_date ? new Date(formState.start_date) : null}
              onChange={(value) =>
                onChange('start_date', value ? toISODateString(value) : toISODateString(new Date()))
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DatePicker
              label="종료일 (선택)"
              value={formState.end_date ? new Date(formState.end_date) : null}
              onChange={(value) => onChange('end_date', value ? toISODateString(value) : null)}
              slotProps={{ textField: { helperText: '설정하지 않으면 무기한 반복됩니다.' } }}
            />
          </Grid>
        </Grid>
        {editing && editing.last_created_date && (
          <Typography variant="caption" color="text.secondary">
            마지막 생성일: {format(new Date(editing.last_created_date), 'yyyy-MM-dd')}
          </Typography>
        )}
      </Stack>
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 2 }}>
      <Button onClick={onClose} disabled={isSubmitting}>
        취소
      </Button>
      <Button onClick={onSubmit} variant="contained" disabled={isSubmitting}>
        {mode === 'create' ? '추가' : '저장'}
      </Button>
    </DialogActions>
  </Dialog>
);
