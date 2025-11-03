/**
 * 가계부 상세 페이지 (내역 목록 및 관리)
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  Alert,
  Autocomplete,
  Divider,
} from '@mui/material';
import { Add, ArrowBack, Delete, Edit, History } from '@mui/icons-material';
import { useBooks } from '../hooks/useBooks';
import { useEntries, useCreateEntry, useUpdateEntry, useDeleteEntry } from '../hooks/useEntries';
import type { Entry, EntryCreate } from '../types/entries';
import { APIError } from '../lib/api';
import { formatAmount, parseCurrency, sanitizeNumberInput, toISODateString } from '../lib/format';

type EntryDialogMode = 'create' | 'edit' | null;

interface EntryDialogState {
  mode: EntryDialogMode;
  entry?: Entry;
}

interface EntryFormData {
  entry_date: string;
  description: string;
  amount: string; // 입력 중에는 문자열로 관리
  category: string;
}

export const BookDetailPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const { data: books } = useBooks();
  const { data: entries, isLoading, error } = useEntries(bookId!);
  const createEntry = useCreateEntry(bookId!);
  const updateEntry = useUpdateEntry(bookId!);
  const deleteEntry = useDeleteEntry(bookId!);

  const [dialogState, setDialogState] = useState<EntryDialogState>({ mode: null });
  const [formData, setFormData] = useState<EntryFormData>({
    entry_date: toISODateString(new Date()),
    description: '',
    amount: '',
    category: '',
  });

  const currentBook = books?.find((book) => book.id === bookId);

  // 기존 카테고리 목록 추출 (자동완성용)
  const existingCategories = useMemo(() => {
    if (!entries) return [];
    const categories = entries.map((entry) => entry.category).filter((cat): cat is string => !!cat);
    return Array.from(new Set(categories));
  }, [entries]);

  // 날짜별로 그룹화 및 정렬
  const groupedEntries = useMemo(() => {
    if (!entries) return [];

    const sorted = [...entries].sort(
      (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime(),
    );

    const groups: { date: string; entries: Entry[]; total: number }[] = [];
    let currentDate = '';
    let currentGroup: Entry[] = [];
    let currentTotal = 0;

    sorted.forEach((entry) => {
      if (entry.entry_date !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, entries: currentGroup, total: currentTotal });
        }
        currentDate = entry.entry_date;
        currentGroup = [entry];
        currentTotal = entry.amount;
      } else {
        currentGroup.push(entry);
        currentTotal += entry.amount;
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, entries: currentGroup, total: currentTotal });
    }

    return groups;
  }, [entries]);

  const handleOpenDialog = (mode: EntryDialogMode, entry?: Entry) => {
    setDialogState({ mode, entry });
    if (entry) {
      setFormData({
        entry_date: entry.entry_date,
        description: entry.description,
        amount: String(entry.amount),
        category: entry.category || '',
      });
    } else {
      setFormData({
        entry_date: toISODateString(new Date()),
        description: '',
        amount: '',
        category: '',
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogState({ mode: null });
  };

  const handleAmountChange = (value: string) => {
    const sanitized = sanitizeNumberInput(value);
    setFormData((prev) => ({ ...prev, amount: sanitized }));
  };

  const handleSubmit = async () => {
    const amountValue = parseCurrency(formData.amount);
    if (!formData.description.trim() || amountValue === null || amountValue === 0) return;

    const payload: EntryCreate = {
      entry_date: formData.entry_date,
      description: formData.description.trim(),
      amount: amountValue,
      category: formData.category.trim() || null,
    };

    try {
      if (dialogState.mode === 'create') {
        await createEntry.mutateAsync(payload);
      } else if (dialogState.mode === 'edit' && dialogState.entry) {
        await updateEntry.mutateAsync({
          entryId: dialogState.entry.id,
          data: payload,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('내역 저장 실패:', error);
    }
  };

  const handleDelete = async (entry: Entry) => {
    if (!window.confirm(`"${entry.description}" 내역을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteEntry.mutateAsync(entry.id);
    } catch (error) {
      console.error('내역 삭제 실패:', error);
    }
  };

  const parsedAmount = parseCurrency(formData.amount);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof APIError ? error.message : '내역 목록을 불러오는데 실패했습니다.';
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
        <IconButton onClick={() => navigate('/books')} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {currentBook?.name || '가계부'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<History />}
          onClick={() => navigate(`/books/${bookId}/history`)}
          sx={{ mr: 1 }}
        >
          히스토리
        </Button>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog('create')}
          disabled={createEntry.isPending}
        >
          내역 추가
        </Button>
      </Box>

      {/* 내역 목록 */}
      {groupedEntries.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            아직 내역이 없습니다.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            새 내역을 추가해보세요!
          </Typography>
        </Box>
      ) : (
        <Box>
          {groupedEntries.map((group) => (
            <Card key={group.date} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    {new Date(group.date).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </Typography>
                  <Chip
                    label={formatAmount(group.total)}
                    color={group.total >= 0 ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Divider sx={{ mb: 1 }} />
                <List disablePadding>
                  {group.entries.map((entry, index) => (
                    <ListItem
                      key={entry.id}
                      sx={{
                        py: 1,
                        px: 0,
                        borderBottom: index < group.entries.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}
                      secondaryAction={
                        <Box>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleOpenDialog('edit', entry)}
                            sx={{ mr: 0.5 }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleDelete(entry)}
                            disabled={deleteEntry.isPending}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">{entry.description}</Typography>
                            {entry.category && (
                              <Chip label={entry.category} size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            color={entry.amount >= 0 ? 'success.main' : 'error.main'}
                            fontWeight="medium"
                          >
                            {formatAmount(entry.amount)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={dialogState.mode !== null} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogState.mode === 'create' ? '새 내역 추가' : '내역 수정'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="날짜"
              type="date"
              fullWidth
              value={formData.entry_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, entry_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="설명"
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              inputProps={{ maxLength: 200 }}
              helperText={`${formData.description.length}/200`}
            />
            <TextField
              label="금액 (원)"
              fullWidth
              value={formData.amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="예: 50000 (양수: 수입, 음수: 지출)"
              helperText="음수를 입력하면 지출, 양수를 입력하면 수입으로 기록됩니다"
            />
            <Autocomplete
              freeSolo
              options={existingCategories}
              value={formData.category}
              onChange={(_, newValue) =>
                setFormData((prev) => ({ ...prev, category: newValue || '' }))
              }
              onInputChange={(_, newValue) =>
                setFormData((prev) => ({ ...prev, category: newValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="카테고리 (선택사항)"
                  helperText="기존 카테고리를 선택하거나 새로 입력하세요"
                  inputProps={{ ...params.inputProps, maxLength: 80 }}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              !formData.description.trim() ||
              formData.amount.trim() === '' ||
              parsedAmount === null ||
              parsedAmount === 0 ||
              createEntry.isPending ||
              updateEntry.isPending
            }
          >
            {dialogState.mode === 'create' ? '추가' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
