/**
 * 가계부 목록 페이지
 * 가계부 생성/수정/삭제 기능 제공
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { motion } from 'framer-motion';
import { Add, MoreVert } from '@mui/icons-material';
import { useBooks, useCreateBook, useUpdateBook, useDeleteBook } from '../hooks/useBooks';
import { BookRole, type BookListItem } from '../types/books';
import { APIError } from '../lib/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToastStore } from '../stores/toastStore';
import CollectionsBookmarkRoundedIcon from '@mui/icons-material/CollectionsBookmarkRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import { FilterBar } from '../components/FilterBar';
import { ContentSkeleton } from '../components/ContentSkeleton';
import { EmptyState } from '../components/EmptyState';

type BookDialogMode = 'create' | 'edit' | null;

interface BookDialogState {
  mode: BookDialogMode;
  book?: BookListItem;
}

const roleLabels: Record<BookRole, string> = {
  [BookRole.OWNER]: '소유자',
  [BookRole.EDITOR]: '편집자',
};

const roleColors: Record<BookRole, 'primary' | 'default'> = {
  [BookRole.OWNER]: 'primary',
  [BookRole.EDITOR]: 'default',
};

export const BooksPage = () => {
  const navigate = useNavigate();
  const { data: books, isLoading, error } = useBooks();
  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();

  const [dialogState, setDialogState] = useState<BookDialogState>({ mode: null });
  const [bookName, setBookName] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBook, setSelectedBook] = useState<BookListItem | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<BookListItem | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const [roleFilters, setRoleFilters] = useState<string[]>(['all']);

  const handleOpenDialog = (mode: BookDialogMode, book?: BookListItem) => {
    setDialogState({ mode, book });
    setBookName(book?.name || '');
  };

  const handleCloseDialog = () => {
    setDialogState({ mode: null });
    setBookName('');
  };

  const handleSubmit = async () => {
    if (!bookName.trim()) return;

    try {
      if (dialogState.mode === 'create') {
        await createBook.mutateAsync({ name: bookName });
        showToast('가계부를 생성했습니다.', { severity: 'success', title: '새 가계부 등록 완료' });
      } else if (dialogState.mode === 'edit' && dialogState.book) {
        await updateBook.mutateAsync({
          bookId: dialogState.book.id,
          data: { name: bookName },
        });
        showToast('가계부 이름을 수정했습니다.', {
          severity: 'success',
          title: `"${dialogState.book.name}" 업데이트`,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('가계부 저장 실패:', error);
      const message =
        error instanceof APIError
          ? error.message
          : '가계부를 저장하지 못했습니다. 다시 시도하세요.';
      showToast(message, { severity: 'error', title: '가계부 저장 실패' });
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, book: BookListItem) => {
    setAnchorEl(event.currentTarget);
    setSelectedBook(book);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBook(null);
  };

  const handleEdit = () => {
    if (selectedBook) {
      handleOpenDialog('edit', selectedBook);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedBook) return;
    setConfirmDeleteTarget(selectedBook);
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget) return;
    try {
      setIsConfirmingDelete(true);
      await deleteBook.mutateAsync(confirmDeleteTarget.id);
      showToast('가계부를 삭제했습니다.', {
        severity: 'success',
        title: `"${confirmDeleteTarget.name}" 삭제`,
      });
      setConfirmDeleteTarget(null);
    } catch (err) {
      console.error('가계부 삭제 실패:', err);
      const message =
        err instanceof APIError
          ? err.message
          : `"${confirmDeleteTarget.name}" 가계부를 삭제하지 못했습니다.`;
      showToast(message, { severity: 'error', title: '삭제 실패' });
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  const handleCancelDelete = () => {
    if (isConfirmingDelete) return;
    setConfirmDeleteTarget(null);
  };

  const handleRoleFilterChange = (next: string[]) => {
    if (next.length === 0) {
      setRoleFilters(['all']);
      return;
    }
    if (next.includes('all')) {
      setRoleFilters(['all']);
      return;
    }
    setRoleFilters(next);
  };

  const filteredBooks = useMemo(() => {
    if (!books) return [];
    if (roleFilters.includes('all')) return books;
    return books.filter((book) => roleFilters.includes(book.current_role));
  }, [books, roleFilters]);

  if (isLoading) {
    return (
      <Box p={3}>
        <ContentSkeleton variant="card-grid" items={6} withToolbar />
      </Box>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof APIError ? error.message : '가계부 목록을 불러오는데 실패했습니다.';
    return (
      <Box p={3}>
        <Alert severity="error">{errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <Box p={{ xs: 2, sm: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h3" component="h1" fontWeight={800}>
          내 가계부
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<Add />}
          onClick={() => handleOpenDialog('create')}
          disabled={createBook.isPending}
        >
          가계부 추가
        </Button>
      </Box>

      <Box mb={4}>
        <FilterBar
          label="역할 필터"
          value={roleFilters}
          onChange={handleRoleFilterChange}
          allowEmpty={false}
          options={[
            {
              value: 'all',
              label: '전체',
              icon: <CollectionsBookmarkRoundedIcon fontSize="small" />,
              count: books?.length ?? 0,
            },
            {
              value: BookRole.OWNER,
              label: '소유자',
              icon: <AssignmentTurnedInRoundedIcon fontSize="small" />,
              count: books?.filter((b) => b.current_role === BookRole.OWNER)?.length ?? 0,
            },
            {
              value: BookRole.EDITOR,
              label: '편집자',
              icon: <Diversity3RoundedIcon fontSize="small" />,
              count: books?.filter((b) => b.current_role === BookRole.EDITOR)?.length ?? 0,
            },
          ]}
        />
      </Box>

      {books && books.length === 0 ? (
        <EmptyState
          title="아직 가계부가 없습니다"
          description="새 가계부를 만들어 가족이나 팀원과 함께 예산을 관리해보세요."
          icon={<CollectionsBookmarkRoundedIcon />}
          actions={[
            {
              label: '가계부 만들기',
              variant: 'contained',
              onClick: () => handleOpenDialog('create'),
            },
          ]}
        />
      ) : (
        <Grid
          container
          spacing={3}
          component={motion.div}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
        >
          {filteredBooks.map((book) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={book.id}
              component={motion.div}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/books/${book.id}`)}
              >
                <CardContent sx={{ flexGrow: 1, pb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flexGrow={1}>
                      <Typography variant="h5" component="h2" gutterBottom fontWeight={700}>
                        {book.name}
                      </Typography>
                      <Chip
                        label={roleLabels[book.current_role]}
                        color={roleColors[book.current_role]}
                        size="small"
                        icon={
                          book.current_role === BookRole.EDITOR ? (
                            <Diversity3RoundedIcon fontSize="small" />
                          ) : undefined
                        }
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                    {book.current_role === BookRole.OWNER && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, book);
                        }}
                        disabled={deleteBook.isPending && selectedBook?.id === book.id}
                        sx={{ ml: 1 }}
                      >
                        <MoreVert />
                      </IconButton>
                    )}
                  </Box>

                  <Box mt={3}>
                    <Typography variant="body2" color="text.secondary">
                      생성일:{' '}
                      {new Date(book.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                  <Button
                    size="large"
                    fullWidth
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/books/${book.id}`);
                    }}
                  >
                    내역 보기
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 메뉴 */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>수정</MenuItem>
        <MenuItem onClick={handleDelete}>삭제</MenuItem>
      </Menu>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={dialogState.mode !== null} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          {dialogState.mode === 'create' ? '새 가계부 만들기' : '가계부 이름 수정'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <TextField
            autoFocus
            label="가계부 이름"
            type="text"
            fullWidth
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit();
              }
            }}
            inputProps={{ maxLength: 80 }}
            helperText={`${bookName.length}/80`}
            placeholder="예: 우리 가족 가계부"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} size="large">
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            size="large"
            disabled={!bookName.trim() || createBook.isPending || updateBook.isPending}
          >
            {dialogState.mode === 'create' ? '만들기' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteTarget !== null}
        title="가계부 삭제"
        description={
          confirmDeleteTarget ? (
            <>
              "{confirmDeleteTarget.name}" 가계부를 삭제하시겠습니까?
              <br />
              삭제 후 복원할 수 없습니다.
            </>
          ) : undefined
        }
        confirmText="삭제"
        variant="danger"
        loading={isConfirmingDelete}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </Box>
  );
};
