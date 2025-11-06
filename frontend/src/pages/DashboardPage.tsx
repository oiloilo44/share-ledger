import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Grid2 from '@mui/material/Grid2';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalanceWallet as WalletIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import { useBooks } from '../hooks/useBooks';
import { useEntries } from '../hooks/useEntries';
import { APIError } from '../lib/api';
import { ContentSkeleton } from '../components/ContentSkeleton';
import { EmptyState } from '../components/EmptyState';
import { formatAmount } from '../lib/format';
import { containerVariants, itemVariants } from '../utils/animations';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: books, isLoading: booksLoading, error: booksError } = useBooks();

  // 현재 달의 시작일과 종료일
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 0);

    return {
      fromDate: from.toISOString().split('T')[0],
      toDate: to.toISOString().split('T')[0],
    };
  }, []);

  // 첫 번째 가계부의 이번 달 내역 가져오기
  const firstBookId = books?.[0]?.id;
  const { data: entries, isLoading: entriesLoading } = useEntries(firstBookId ?? '', {
    fromDate,
    toDate,
  });

  const isLoading = booksLoading || (entriesLoading && !!firstBookId);
  const hasBooks = (books?.length ?? 0) > 0;

  // 통계 계산
  const stats = useMemo(() => {
    if (!entries?.length) {
      return { totalIncome: 0, totalExpense: 0, balance: 0, recentEntries: [] };
    }

    const totalIncome = entries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);

    const totalExpense = entries
      .filter((e) => e.amount < 0)
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const balance = totalIncome - totalExpense;

    const recentEntries = [...entries]
      .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
      .slice(0, 5);

    return { totalIncome, totalExpense, balance, recentEntries };
  }, [entries]);

  // 예산 (임시로 총 수입의 80%로 설정, 추후 실제 예산 기능 구현 시 수정)
  const budget = stats.totalIncome > 0 ? stats.totalIncome * 0.8 : 2000000;
  const budgetUsagePercent = budget > 0 ? Math.min((stats.totalExpense / budget) * 100, 100) : 0;

  if (booksError) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {booksError instanceof APIError
            ? booksError.message
            : '가계부 정보를 불러오는 중 오류가 발생했습니다.'}
        </Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h3" component="h1" fontWeight={800} gutterBottom>
          대시보드
        </Typography>
        <ContentSkeleton variant="card-grid" items={3} />
      </Box>
    );
  }

  if (!hasBooks) {
    return (
      <Box>
        <Typography variant="h3" component="h1" fontWeight={800} gutterBottom>
          대시보드
        </Typography>
        <EmptyState
          title="가계부를 만들어보세요"
          description="첫 가계부를 생성하고 지출과 수입을 관리해보세요."
          icon={<WalletIcon />}
          tone="informative"
          actions={[
            {
              label: '가계부 만들기',
              variant: 'contained',
              onClick: () => navigate('/books'),
              startIcon: <AddIcon />,
            },
          ]}
        />
      </Box>
    );
  }

  return (
    <Box>
      {/* 헤더 */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h3" component="h1" fontWeight={800}>
          대시보드
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => navigate(`/books/${firstBookId}`)}
        >
          내역 추가
        </Button>
      </Stack>

      <Grid2
        container
        spacing={3}
        component={motion.div}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* 이번 달 지출 카드 */}
        <Grid2 size={{ xs: 12, md: 6 }} component={motion.div} variants={itemVariants}>
          <Card
            sx={{
              height: '100%',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TrendingDownIcon color="error" fontSize="small" />
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    이번 달 지출
                  </Typography>
                </Stack>

                <Typography variant="h3" component="div" fontWeight={800} color="error.main">
                  <CountUp
                    end={stats.totalExpense}
                    duration={0.8}
                    separator=","
                    prefix="-₩"
                    decimals={0}
                    preserveValue
                  />
                </Typography>

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      예산 대비
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                      {budgetUsagePercent.toFixed(0)}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={budgetUsagePercent}
                    color={
                      budgetUsagePercent > 80
                        ? 'error'
                        : budgetUsagePercent > 60
                          ? 'warning'
                          : 'success'
                    }
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor: 'action.hover',
                    }}
                  />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    예산: {formatAmount(budget)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        {/* 이번 달 수입 카드 */}
        <Grid2 size={{ xs: 12, md: 6 }} component={motion.div} variants={itemVariants}>
          <Card
            sx={{
              height: '100%',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TrendingUpIcon color="success" fontSize="small" />
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    이번 달 수입
                  </Typography>
                </Stack>

                <Typography variant="h3" component="div" fontWeight={800} color="success.main">
                  <CountUp
                    end={stats.totalIncome}
                    duration={0.8}
                    separator=","
                    prefix="₩"
                    decimals={0}
                    preserveValue
                  />
                </Typography>

                <Box>
                  <Typography variant="body2" color="text.secondary" mb={0.5}>
                    이번 달 잔액
                  </Typography>
                  <Chip
                    label={formatAmount(stats.balance)}
                    color={stats.balance >= 0 ? 'success' : 'error'}
                    sx={{ fontWeight: 700, fontSize: '1rem', height: 32 }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>

        {/* 최근 내역 카드 */}
        <Grid2 size={{ xs: 12 }} component={motion.div} variants={itemVariants}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" component="h2" fontWeight={700}>
                  최근 내역
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigate(`/books/${firstBookId}`)}
                >
                  전체보기
                </Button>
              </Stack>

              {stats.recentEntries.length === 0 ? (
                <EmptyState
                  title="내역이 없습니다"
                  description="첫 내역을 추가해보세요."
                  tone="informative"
                />
              ) : (
                <Stack spacing={1.5}>
                  {stats.recentEntries.map((entry) => (
                    <Card
                      key={entry.id}
                      variant="outlined"
                      sx={{
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <CardActionArea onClick={() => navigate(`/books/${firstBookId}`)}>
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack spacing={0.5} flex={1}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body1" fontWeight={600}>
                                  {entry.description}
                                </Typography>
                                {entry.category && (
                                  <Chip label={entry.category} size="small" variant="outlined" />
                                )}
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(entry.entry_date).toLocaleDateString('ko-KR', {
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </Typography>
                            </Stack>
                            <Typography
                              variant="h6"
                              fontWeight={700}
                              color={entry.amount >= 0 ? 'success.main' : 'error.main'}
                            >
                              {formatAmount(entry.amount)}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid2>

        {/* 내 가계부 카드 */}
        <Grid2 size={{ xs: 12 }} component={motion.div} variants={itemVariants}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" component="h2" fontWeight={700}>
                  내 가계부
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/books')}
                >
                  새 가계부
                </Button>
              </Stack>

              <Grid2 container spacing={2}>
                {books?.slice(0, 4).map((book) => (
                  <Grid2 key={book.id} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          borderColor: 'primary.main',
                          transform: 'translateY(-2px)',
                          boxShadow: 2,
                        },
                      }}
                    >
                      <CardActionArea onClick={() => navigate(`/books/${book.id}`)}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight={600} gutterBottom noWrap>
                            {book.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(book.created_at).toLocaleDateString('ko-KR')}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid2>
                ))}
              </Grid2>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Box>
  );
};
