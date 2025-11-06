import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
} from '@mui/material';
import { Download, ChevronLeft, ChevronRight } from '@mui/icons-material';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { useBooks } from '../hooks/useBooks';
import { useEntryStats } from '../hooks/useEntries';
import { ContentSkeleton } from '../components/ContentSkeleton';
import { EmptyState } from '../components/EmptyState';
import { entriesApi } from '../lib/api';
import { formatAmount, formatCurrency } from '../lib/format';
import { exportEntriesAsCSV, exportEntriesAsXLSX } from '../lib/export';
import { containerVariants, itemVariants } from '../utils/animations';

const PIE_COLORS = ['#5B8FF9', '#61DDAA', '#65789B', '#F6BD16', '#7262fd', '#78D3F8'];

function calculateMonthRange(month: string) {
  const [year, monthValue] = month.split('-').map(Number);
  const start = new Date(year, monthValue - 1, 1);
  const end = new Date(year, monthValue, 0);
  return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
}

export const StatsPage = () => {
  const { data: books, isLoading: isBooksLoading } = useBooks();
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (!selectedBookId && books && books.length > 0) {
      setSelectedBookId(books[0].id);
    }
  }, [books, selectedBookId]);

  const { data: stats, isLoading: isStatsLoading } = useEntryStats(selectedBookId, {
    month: selectedMonth,
  });

  const handlePrevMonth = () => {
    const current = new Date(`${selectedMonth}-01`);
    current.setMonth(current.getMonth() - 1);
    setSelectedMonth(format(current, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const current = new Date(`${selectedMonth}-01`);
    current.setMonth(current.getMonth() + 1);
    setSelectedMonth(format(current, 'yyyy-MM'));
  };

  const summaryCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: '총 수입',
        value: formatAmount(stats.summary.total_income),
        color: 'success.main',
      },
      {
        label: '총 지출',
        value: formatAmount(-stats.summary.total_expense),
        color: 'error.main',
      },
      {
        label: '순자산',
        value: formatAmount(stats.summary.net_amount),
        color: 'primary.main',
      },
    ];
  }, [stats]);

  const trendData = useMemo(
    () =>
      stats?.trend.map((item) => ({
        period: format(new Date(item.period), 'yyyy-MM'),
        income: item.income,
        expense: item.expense,
      })) ?? [],
    [stats],
  );

  const handleExport = async (formatType: 'csv' | 'xlsx') => {
    if (!selectedBookId) return;
    const { start, end } = calculateMonthRange(selectedMonth);
    const entries = await entriesApi.list(selectedBookId, {
      fromDate: start,
      toDate: end,
    });
    const fileName = `shareledger-${selectedMonth}`;
    if (formatType === 'csv') {
      exportEntriesAsCSV(entries, fileName);
    } else {
      exportEntriesAsXLSX(entries, fileName);
    }
  };

  if (isBooksLoading) {
    return <ContentSkeleton variant="card-grid" items={3} />;
  }

  if (!books || books.length === 0) {
    return (
      <EmptyState
        title="가계부가 없습니다"
        description="통계를 확인하려면 먼저 가계부를 생성해주세요."
      />
    );
  }

  return (
    <Stack spacing={4}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <TextField
          select
          label="가계부"
          value={selectedBookId}
          onChange={(event) => setSelectedBookId(event.target.value)}
          sx={{ width: { xs: '100%', md: 280 } }}
        >
          {books.map((book) => (
            <MenuItem key={book.id} value={book.id}>
              {book.name}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={handlePrevMonth} size="small" aria-label="이전 달">
            <ChevronLeft />
          </IconButton>
          <TextField
            label="월 선택"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            inputProps={{ max: format(new Date(), 'yyyy-MM') }}
            sx={{ width: 180 }}
          />
          <IconButton onClick={handleNextMonth} size="small" aria-label="다음 달">
            <ChevronRight />
          </IconButton>
        </Stack>
        <Box flexGrow={1} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <Button variant="outlined" startIcon={<Download />} onClick={() => handleExport('csv')}>
            CSV 내보내기
          </Button>
          <Button variant="contained" startIcon={<Download />} onClick={() => handleExport('xlsx')}>
            XLSX 내보내기
          </Button>
        </Stack>
      </Stack>

      {isStatsLoading || !stats ? (
        <ContentSkeleton variant="card-grid" items={4} />
      ) : (
        <Stack spacing={4}>
          <Grid
            container
            spacing={3}
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {summaryCards.map((card) => (
              <Grid
                item
                xs={12}
                md={4}
                key={card.label}
                component={motion.div}
                variants={itemVariants}
              >
                <Card sx={{ borderLeft: 4, borderColor: card.color }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      {card.label}
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 1 }}>
                      {card.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid
            container
            spacing={3}
            component={motion.div}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <Grid item xs={12} md={6} component={motion.div} variants={itemVariants}>
              <Card sx={{ height: 360 }}>
                <CardContent sx={{ height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    카테고리별 지출 비중
                  </Typography>
                  {stats.category_distribution.length === 0 ? (
                    <EmptyState
                      title="데이터가 없습니다"
                      description="선택한 기간에 지출 내역이 없습니다."
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.category_distribution}
                          dataKey="amount"
                          nameKey="category"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={3}
                        >
                          {stats.category_distribution.map((entry, index) => (
                            <Cell
                              key={`cell-${entry.category}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${formatCurrency(value)}원`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} component={motion.div} variants={itemVariants}>
              <Card sx={{ height: 360 }}>
                <CardContent sx={{ height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    월별 수입·지출 추이
                  </Typography>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData}
                      margin={{ top: 16, right: 16, bottom: 0, left: -16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${formatCurrency(value)}원`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="income"
                        name="수입"
                        stroke="#61DDAA"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        name="지출"
                        stroke="#F6BD16"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card component={motion.div} initial="hidden" animate="visible" variants={itemVariants}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                상위 지출 항목
              </Typography>
              {stats.top_expenses.length === 0 ? (
                <EmptyState title="지출 데이터 없음" description="상위 지출 항목이 없습니다." />
              ) : (
                <Stack divider={<Divider flexItem />}>
                  {stats.top_expenses.map((item) => (
                    <Stack
                      key={item.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1.5}
                    >
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {item.description}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.category ?? '미분류'} ·{' '}
                          {format(new Date(item.entry_date), 'yyyy-MM-dd')}
                        </Typography>
                      </Box>
                      <Typography variant="h6" color="error.main">
                        -{formatCurrency(item.amount)}원
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  );
};
