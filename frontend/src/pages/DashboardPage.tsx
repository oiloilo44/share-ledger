import Grid2 from '@mui/material/Grid2';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '../hooks/useBooks';
import { APIError } from '../lib/api';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: books, isLoading, error } = useBooks();

  const bookCount = books?.length ?? 0;
  const recentBooks = books?.slice(0, 3) ?? [];
  const hasBooks = bookCount > 0;

  return (
    <Grid2 container spacing={3} columns={12}>
      <Grid2 size={{ xs: 12, md: 6 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h5" gutterBottom>
              가족 가계부를 시작해보세요
            </Typography>
            <Typography color="text.secondary" paragraph>
              ShareLedger는 공동 가계부를 쉽고 안전하게 관리할 수 있는 협업 도구입니다. 아래 버튼을
              눌러 가계부를 생성하고 구성원을 초대해보세요.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="contained" onClick={() => navigate('/books')}>
                가계부 관리하기
              </Button>
              {hasBooks && (
                <Button variant="outlined" onClick={() => navigate('/books')}>
                  최근 가계부 보기
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid2>
      <Grid2 size={{ xs: 12, md: 6 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              내 가계부 현황
            </Typography>
            {isLoading && (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
              </Box>
            )}
            {!isLoading && error && (
              <Alert severity="error">
                {error instanceof APIError
                  ? error.message
                  : '가계부 정보를 불러오는 중 오류가 발생했습니다.'}
              </Alert>
            )}
            {!isLoading && !error && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  현재 {hasBooks ? `${bookCount}개의 가계부가` : '등록된 가계부가'} 있습니다.
                </Typography>
                {hasBooks ? (
                  <List disablePadding>
                    {recentBooks.map((book, index) => (
                      <Box key={book.id}>
                        <ListItemButton onClick={() => navigate(`/books/${book.id}`)}>
                          <ListItemText
                            primary={book.name}
                            secondary={new Date(book.created_at).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          />
                        </ListItemButton>
                        {index !== recentBooks.length - 1 && <Divider component="div" />}
                      </Box>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    아직 가계부가 없습니다. &apos;가계부 관리하기&apos; 버튼을 눌러 첫 가계부를
                    만들어보세요.
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Grid2>
    </Grid2>
  );
};
