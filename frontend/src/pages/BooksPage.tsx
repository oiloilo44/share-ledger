/**
 * 가계부 목록 페이지
 * 가계부 생성/수정/삭제 기능 제공
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
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
import { Add, MoreVert } from '@mui/icons-material';
import { useBooks, useCreateBook, useUpdateBook, useDeleteBook } from '../hooks/useBooks';
import { BookRole, type BookListItem } from '../types/books';
import { APIError } from '../lib/api';

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
      } else if (dialogState.mode === 'edit' && dialogState.book) {
        await updateBook.mutateAsync({
          bookId: dialogState.book.id,
          data: { name: bookName },
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('가계부 저장 실패:', error);
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

    if (!window.confirm(`"${selectedBook.name}" 가계부를 삭제하시겠습니까?`)) {
      handleMenuClose();
      return;
    }

    try {
      await deleteBook.mutateAsync(selectedBook.id);
    } catch (error) {
      console.error('가계부 삭제 실패:', error);
    }
    handleMenuClose();
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
      error instanceof APIError ? error.message : '가계부 목록을 불러오는데 실패했습니다.';
    return (
      <Box p={3}>
        <Alert severity="error">{errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          내 가계부
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog('create')}
          disabled={createBook.isPending}
        >
          가계부 추가
        </Button>
      </Box>

      {books && books.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            아직 가계부가 없습니다.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            새 가계부를 만들어 시작해보세요!
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {books?.map((book) => (
            <Grid item xs={12} sm={6} md={4} key={book.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6" component="h2" gutterBottom>
                      {book.name}
                    </Typography>
                    {book.current_role === BookRole.OWNER && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, book)}
                        disabled={deleteBook.isPending && selectedBook?.id === book.id}
                      >
                        <MoreVert />
                      </IconButton>
                    )}
                  </Box>
                  <Chip
                    label={roleLabels[book.current_role]}
                    color={roleColors[book.current_role]}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    생성일:{' '}
                    {new Date(book.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate(`/books/${book.id}`)}
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
        <DialogTitle>
          {dialogState.mode === 'create' ? '새 가계부 만들기' : '가계부 이름 수정'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!bookName.trim() || createBook.isPending || updateBook.isPending}
          >
            {dialogState.mode === 'create' ? '만들기' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
