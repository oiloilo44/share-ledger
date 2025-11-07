/**
 * 가계부 상세 페이지 (내역 목록 · 고급 필터 · 반복 관리)
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Popover,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  FilterList as FilterListIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useBooks } from '../hooks/useBooks';
import { useEntries, useCreateEntry, useUpdateEntry, useDeleteEntry } from '../hooks/useEntries';
import { useMembers } from '../hooks/useMembers';
import type { Entry, EntryCreate } from '../types/entries';
import { EntryTypeFilter } from '../types/entries';
import { APIError, type EntryListParams } from '../lib/api';
import { formatAmount, formatDateWithWeekday, toISODateString } from '../lib/format';
import { exportEntriesAsCSV, exportEntriesAsXLSX } from '../lib/export';
import { enqueueOfflineEntry } from '../lib/offlineQueue';
import { useRealtimeBookSync } from '../hooks/useRealtimeSync';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToastStore } from '../stores/toastStore';
import { ContentSkeleton } from '../components/ContentSkeleton';
import { EmptyState } from '../components/EmptyState';
import { useOfflineStore } from '../stores/offlineStore';
import { BottomSheet } from '../components/BottomSheet';
import { AmountInput } from '../components/AmountInput';
import { FilterBar } from '../components/FilterBar';
import { containerVariants, itemVariants } from '../utils/animations';
import { expandEntriesForMonth } from '../utils/expandRecurringEntry';
import type { ExpandedEntry } from '../types/entries';

// Lazy load heavy components
const BulkUploadWizard = lazy(() =>
  import('../components/BulkUploadWizard').then((m) => ({ default: m.BulkUploadWizard })),
);

type EntryDialogMode = 'create' | 'edit' | null;

interface EntryDialogState {
  mode: EntryDialogMode;
  entry?: Entry;
}

interface EntryFormData {
  entry_date: string;
  description: string;
  amount: number;
  amountType: 'income' | 'expense';
  category: string;
  frequency: 'once' | 'monthly' | 'weekly';
  end_date: string | null;
  day_of_month: number | null;
  day_of_week: number | null;
}

interface FilterState {
  fromDate: string | null;
  toDate: string | null;
  categories: string[];
  includeUncategorized: boolean;
  memberIds: string[];
  minAmount: number | null;
  maxAmount: number | null;
  type: EntryTypeFilter | null;
  search: string;
}

const defaultFilters: FilterState = {
  fromDate: null,
  toDate: null,
  categories: [],
  includeUncategorized: false,
  memberIds: [],
  minAmount: null,
  maxAmount: null,
  type: null,
  search: '',
};

const serializeFilters = (filters: FilterState) => JSON.stringify(filters);

const parseNumber = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseList = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);

const parseFiltersFromParams = (params: URLSearchParams): FilterState => {
  const typeParam = params.get('type');
  const type =
    typeParam === EntryTypeFilter.INCOME || typeParam === EntryTypeFilter.EXPENSE
      ? (typeParam as EntryTypeFilter)
      : null;

  return {
    fromDate: params.get('from') || null,
    toDate: params.get('to') || null,
    categories: parseList(params.get('categories')),
    includeUncategorized: params.get('uncategorized') === '1',
    memberIds: parseList(params.get('members')),
    minAmount: parseNumber(params.get('min')),
    maxAmount: parseNumber(params.get('max')),
    type,
    search: params.get('search') ?? '',
  };
};

const filtersToEntryParams = (filters: FilterState): EntryListParams => ({
  fromDate: filters.fromDate ?? undefined,
  toDate: filters.toDate ?? undefined,
  categories: filters.categories.length ? filters.categories : undefined,
  includeUncategorized: filters.includeUncategorized || undefined,
  memberIds: filters.memberIds.length ? filters.memberIds : undefined,
  minAmount: filters.minAmount ?? undefined,
  maxAmount: filters.maxAmount ?? undefined,
  // type 필터는 클라이언트 사이드에서만 처리 (서버 요청 X)
  search: filters.search || undefined,
});

const filtersToSearchParams = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.fromDate) params.set('from', filters.fromDate);
  if (filters.toDate) params.set('to', filters.toDate);
  if (filters.categories.length) params.set('categories', filters.categories.join(','));
  if (filters.includeUncategorized) params.set('uncategorized', '1');
  if (filters.memberIds.length) params.set('members', filters.memberIds.join(','));
  if (filters.minAmount !== null) params.set('min', String(filters.minAmount));
  if (filters.maxAmount !== null) params.set('max', String(filters.maxAmount));
  if (filters.type) params.set('type', filters.type);
  if (filters.search) params.set('search', filters.search);
  return params;
};

const formatFilterSummary = (filters: FilterState, memberLookup: Record<string, string>) => {
  const parts: string[] = [];
  if (filters.fromDate || filters.toDate) {
    parts.push(`${filters.fromDate ?? '시작'} ~ ${filters.toDate ?? '현재'}`);
  }
  if (filters.categories.length) {
    parts.push(`카테고리 ${filters.categories.join(', ')}`);
  }
  if (filters.includeUncategorized) {
    parts.push('미분류 포함');
  }
  if (filters.memberIds.length) {
    const labels = filters.memberIds.map((id) => memberLookup[id] ?? id);
    parts.push(`작성자 ${labels.join(', ')}`);
  }
  if (filters.minAmount !== null || filters.maxAmount !== null) {
    const minLabel = filters.minAmount !== null ? formatAmount(filters.minAmount) : '-∞원';
    const maxLabel = filters.maxAmount !== null ? formatAmount(filters.maxAmount) : '+∞원';
    parts.push(`금액 ${minLabel} ~ ${maxLabel}`);
  }
  if (filters.type) {
    parts.push(filters.type === EntryTypeFilter.INCOME ? '수입만' : '지출만');
  }
  if (filters.search) {
    parts.push(`검색 "${filters.search}"`);
  }
  return parts.join(' · ');
};

/**
 * 스와이프 제스처를 지원하는 내역 아이템 컴포넌트
 * 왼쪽 스와이프: 삭제, 오른쪽 스와이프: 수정
 */
interface SwipeableEntryItemProps {
  entry: Entry;
  memberLookup: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
}

const SwipeableEntryItem = ({
  entry,
  memberLookup,
  onEdit,
  onDelete,
  deleteDisabled,
}: SwipeableEntryItemProps) => {
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      // 왼쪽 스와이프: 삭제
      onDelete();
    },
    onSwipedRight: () => {
      // 오른쪽 스와이프: 수정
      onEdit();
    },
    trackMouse: false, // 마우스 드래그는 비활성화 (터치만)
    delta: 80, // 최소 80px 이동해야 스와이프로 인식
    preventScrollOnSwipe: true,
  });

  return (
    <Box {...swipeHandlers}>
      <ListItem
        divider
        secondaryAction={
          <Stack direction="row" spacing={1}>
            <IconButton onClick={onEdit} size="small">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={onDelete} size="small" disabled={deleteDisabled}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        }
      >
        <ListItemText
          primary={
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {entry.description}
              </Typography>
              {entry.category && <Chip label={entry.category} size="small" variant="outlined" />}
            </Stack>
          }
          secondary={
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Typography
                variant="body2"
                color={entry.amount >= 0 ? 'success.main' : 'error.main'}
                fontWeight={600}
              >
                {formatAmount(entry.amount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                작성자: {memberLookup[entry.user_id] ?? entry.user_id}
              </Typography>
            </Stack>
          }
        />
      </ListItem>
    </Box>
  );
};

export const BookDetailPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: books } = useBooks();
  const currentBook = useMemo(() => books?.find((book) => book.id === bookId), [books, bookId]);

  const [appliedFilters, setAppliedFilters] = useState<FilterState>(() =>
    parseFiltersFromParams(searchParams),
  );
  const [draftFilters, setDraftFilters] = useState<FilterState>(appliedFilters);
  const searchSignature = searchParams.toString();
  const filtersSignature = serializeFilters(appliedFilters);

  // 선택된 월 (YYYY-MM 형식)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 월 이동 핸들러
  const handlePreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    setSelectedMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    handleCloseMonthPicker();
  };

  const handleOpenMonthPicker = (event: React.MouseEvent<HTMLElement>) => {
    setMonthPickerAnchor(event.currentTarget);
    setMonthPickerView('month');
  };

  const handleCloseMonthPicker = () => {
    setMonthPickerAnchor(null);
    setMonthPickerView('month');
  };

  const handleMonthSelect = (date: Date | null) => {
    // 월 선택 view일 때만 상태 업데이트 및 창 닫기
    if (date && monthPickerView === 'month') {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
      handleCloseMonthPicker();
    }
  };

  // 선택된 월 포맷팅
  const selectedMonthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return `${year}년 ${month}월`;
  }, [selectedMonth]);

  // 현재 월 포맷팅
  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  }, []);

  useEffect(() => {
    const next = parseFiltersFromParams(new URLSearchParams(searchSignature));
    if (serializeFilters(next) !== filtersSignature) {
      setAppliedFilters(next);
      setDraftFilters(next);
    }
  }, [searchSignature, filtersSignature]);

  const entryQueryParams = useMemo(() => filtersToEntryParams(appliedFilters), [appliedFilters]);
  const entriesQuery = useEntries(bookId!, entryQueryParams);
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const isLoading = entriesQuery.isLoading;
  const error = entriesQuery.error;

  const createEntry = useCreateEntry(bookId!);
  const updateEntry = useUpdateEntry(bookId!);
  const deleteEntry = useDeleteEntry(bookId!);
  const { data: members } = useMembers(bookId!);
  const showToast = useToastStore((state) => state.showToast);

  useRealtimeBookSync(bookId);

  const memberOptions = useMemo(
    () =>
      (members ?? []).map((member) => ({
        id: member.user_id,
        label: member.full_name ?? member.email,
      })),
    [members],
  );
  const memberLookup = useMemo(
    () => Object.fromEntries(memberOptions.map((option) => [option.id, option.label])),
    [memberOptions],
  );

  // entries를 전개 (반복 내역 계산)
  const expandedEntries = useMemo(() => {
    if (!entries.length) return [];
    // expandEntriesForMonth를 사용하여 선택된 월의 반복 내역 전개
    return expandEntriesForMonth(entries, selectedMonth);
  }, [entries, selectedMonth]);

  // 타입 필터 적용 (전체/수입/지출)
  const filteredEntries = useMemo(() => {
    if (!appliedFilters.type) return expandedEntries;

    return expandedEntries.filter((entry) => {
      if (appliedFilters.type === EntryTypeFilter.INCOME) {
        return entry.amount > 0;
      } else if (appliedFilters.type === EntryTypeFilter.EXPENSE) {
        return entry.amount < 0;
      }
      return true;
    });
  }, [expandedEntries, appliedFilters.type]);

  const existingCategories = useMemo(() => {
    const categories = filteredEntries
      .map((entry) => entry.category)
      .filter((category): category is string => Boolean(category));
    return Array.from(new Set(categories)).sort();
  }, [filteredEntries]);

  const groupedEntries = useMemo(() => {
    if (!filteredEntries.length)
      return [] as Array<{ date: string; entries: ExpandedEntry[]; total: number }>;
    const sorted = [...filteredEntries].sort(
      (a, b) => new Date(b.occurrence_date).getTime() - new Date(a.occurrence_date).getTime(),
    );

    const groups: Array<{ date: string; entries: ExpandedEntry[]; total: number }> = [];
    let currentDate = '';
    let currentGroup: ExpandedEntry[] = [];
    let currentTotal = 0;

    for (const entry of sorted) {
      if (entry.occurrence_date !== currentDate) {
        if (currentGroup.length) {
          groups.push({ date: currentDate, entries: currentGroup, total: currentTotal });
        }
        currentDate = entry.occurrence_date;
        currentGroup = [entry];
        currentTotal = entry.amount;
      } else {
        currentGroup.push(entry);
        currentTotal += entry.amount;
      }
    }

    if (currentGroup.length) {
      groups.push({ date: currentDate, entries: currentGroup, total: currentTotal });
    }

    return groups;
  }, [filteredEntries]);

  const hasEntries = entries.length > 0;
  const hasFiltersApplied = serializeFilters(appliedFilters) !== serializeFilters(defaultFilters);
  const filterSummary = useMemo(
    () => formatFilterSummary(appliedFilters, memberLookup),
    [appliedFilters, memberLookup],
  );

  const [dialogState, setDialogState] = useState<EntryDialogState>({ mode: null });
  const [formData, setFormData] = useState<EntryFormData>({
    entry_date: toISODateString(new Date()),
    description: '',
    amount: 0,
    amountType: 'expense',
    category: '',
    frequency: 'once',
    end_date: null,
    day_of_month: null,
    day_of_week: null,
  });
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<Entry | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFilterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [monthPickerAnchor, setMonthPickerAnchor] = useState<HTMLElement | null>(null);
  const [monthPickerView, setMonthPickerView] = useState<'year' | 'month'>('month');

  const handleOpenDialog = (mode: EntryDialogMode, entry?: Entry) => {
    setDialogState({ mode, entry });
    if (entry) {
      const absAmount = Math.abs(entry.amount);
      const amountType = entry.amount >= 0 ? 'income' : 'expense';
      setFormData({
        entry_date: entry.entry_date,
        description: entry.description,
        amount: absAmount,
        amountType,
        category: entry.category ?? '',
        frequency: entry.frequency,
        end_date: entry.end_date,
        day_of_month: entry.day_of_month,
        day_of_week: entry.day_of_week,
      });
    } else {
      setFormData({
        entry_date: toISODateString(new Date()),
        description: '',
        amount: 0,
        amountType: 'expense',
        category: '',
        frequency: 'once',
        end_date: null,
        day_of_month: null,
        day_of_week: null,
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogState({ mode: null });
  };

  const handleAmountInputChange = (value: number, type: 'income' | 'expense') => {
    setFormData((prev) => ({ ...prev, amount: value, amountType: type }));
  };

  const handleSubmit = async () => {
    if (!formData.entry_date || !formData.description.trim() || formData.amount === 0) {
      showToast('날짜, 설명, 금액을 올바르게 입력해주세요.', {
        severity: 'warning',
        title: '입력 확인',
      });
      return;
    }

    const signedAmount = formData.amountType === 'income' ? formData.amount : -formData.amount;

    const payload: EntryCreate = {
      entry_date: formData.entry_date,
      description: formData.description.trim(),
      amount: signedAmount,
      category: formData.category.trim() ? formData.category.trim() : null,
      frequency: formData.frequency,
      end_date: formData.end_date,
      day_of_month: formData.day_of_month,
      day_of_week: formData.day_of_week,
    };

    // 오프라인 체크
    if (!navigator.onLine) {
      const queued = enqueueOfflineEntry({ ...payload, bookId: bookId!, timestamp: Date.now() });
      useOfflineStore.getState().setPendingEntries(queued);
      showToast('오프라인 상태입니다. 연결 시 자동 업로드됩니다.', {
        severity: 'info',
        title: '대기열 저장',
      });
      handleCloseDialog();
      return;
    }

    // 낙관적 업데이트: 다이얼로그를 즉시 닫고 토스트 표시
    const isCreate = dialogState.mode === 'create';
    const successMessage = isCreate ? '내역을 추가했습니다.' : '내역을 수정했습니다.';
    const successTitle = isCreate ? '저장 완료' : '수정 완료';

    handleCloseDialog();
    showToast(successMessage, { severity: 'success', title: successTitle });

    // 백그라운드에서 서버 요청 처리
    try {
      if (isCreate) {
        await createEntry.mutateAsync(payload);
      } else if (dialogState.entry) {
        await updateEntry.mutateAsync({ entryId: dialogState.entry.id, data: payload });
      }
    } catch (err) {
      console.error('내역 저장 실패:', err);
      const message =
        err instanceof APIError ? err.message : '내역을 저장하지 못했습니다. 다시 시도해주세요.';
      showToast(message, { severity: 'error', title: '저장 실패' });
    }
  };

  const handleDelete = (entry: Entry) => {
    setConfirmDeleteTarget(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget) return;

    const targetEntry = confirmDeleteTarget;

    // 낙관적 업데이트: 다이얼로그를 즉시 닫고 토스트 표시
    setIsDeleteDialogOpen(false);
    showToast('내역을 삭제했습니다.', { severity: 'success', title: '삭제 완료' });

    // 백그라운드에서 서버 요청 처리
    try {
      await deleteEntry.mutateAsync(targetEntry.id);
    } catch (err) {
      console.error('삭제 실패:', err);
      const message =
        err instanceof APIError
          ? err.message
          : `"${targetEntry.description}" 내역을 삭제하지 못했습니다.`;
      showToast(message, { severity: 'error', title: '삭제 실패' });
    }
  };

  const handleDeleteDialogExited = () => {
    // 다이얼로그 애니메이션 완료 후 상태 초기화
    setConfirmDeleteTarget(null);
  };

  const handleResetFilters = () => {
    setAppliedFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearchParams(new URLSearchParams(), { replace: true });
    setFilterDrawerOpen(false);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    const params = filtersToSearchParams(draftFilters);
    setSearchParams(params, { replace: true });
    setFilterDrawerOpen(false);
  };

  const handleExport = (formatType: 'csv' | 'xlsx') => {
    if (!entries.length) {
      showToast('내보낼 내역이 없습니다.', { severity: 'info', title: '내보내기' });
      setExportDialogOpen(false);
      return;
    }

    const baseName = (currentBook?.name ?? 'shareledger').replace(/\s+/g, '-');
    const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
    const fileName = `${baseName}-${timestamp}`;

    if (formatType === 'csv') {
      exportEntriesAsCSV(entries, fileName);
    } else {
      exportEntriesAsXLSX(entries, fileName);
    }

    showToast('내보내기를 시작했습니다.', { severity: 'success', title: '내보내기' });
    setExportDialogOpen(false);
  };

  if (!bookId) {
    return (
      <Box p={3}>
        <Alert severity="warning">잘못된 가계부 경로입니다.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box p={3}>
        <ContentSkeleton variant="detail" items={4} withToolbar />
      </Box>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof APIError
        ? error.message
        : '내역을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.';
    return (
      <Box p={3}>
        <Alert severity="error">{errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* 헤더 */}
      <Box display="flex" alignItems="center" mb={2} gap={1} flexWrap="wrap">
        <IconButton onClick={() => navigate('/books')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight={800} sx={{ flexGrow: 1 }}>
          {currentBook?.name ?? '가계부'}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => navigate(`/books/${bookId}/settings`)}
          >
            설정
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => navigate(`/books/${bookId}/history`)}
          >
            히스토리
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFilterDrawerOpen(true)}
          >
            고급 필터
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => setExportDialogOpen(true)}
          >
            내보내기
          </Button>
          <Suspense
            fallback={
              <Button variant="outlined" disabled>
                일괄 업로드
              </Button>
            }
          >
            <BulkUploadWizard bookId={bookId} existingCategories={existingCategories} />
          </Suspense>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
            disabled={createEntry.isPending}
          >
            내역 추가
          </Button>
        </Stack>
      </Box>

      {/* 월 선택 + 빠른 필터 */}
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        {/* 월 선택 */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <IconButton onClick={handlePreviousMonth} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <Button
            variant="outlined"
            size="small"
            onClick={handleOpenMonthPicker}
            sx={{ minWidth: '110px' }}
          >
            {selectedMonthLabel}
          </Button>
          <IconButton onClick={handleNextMonth} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>

        {/* 빠른 필터 (전체/수입/지출) */}
        <FilterBar
          options={[
            { value: 'all', label: '전체' },
            { value: EntryTypeFilter.INCOME, label: '수입' },
            { value: EntryTypeFilter.EXPENSE, label: '지출' },
          ]}
          value={appliedFilters.type ? [appliedFilters.type] : ['all']}
          onChange={(values) => {
            // 단일 선택 모드: 새로 추가된 값만 사용
            const prevValue = appliedFilters.type ? [appliedFilters.type] : ['all'];
            const newValue = values.find((v) => !prevValue.includes(v)) || values[0] || 'all';
            const typeValue = newValue === 'all' ? null : (newValue as EntryTypeFilter);
            const newFilters = { ...appliedFilters, type: typeValue };
            setAppliedFilters(newFilters);
            setDraftFilters(newFilters);
            setSearchParams(filtersToSearchParams(newFilters), { replace: true });
          }}
          allowEmpty={false}
        />
      </Box>

      {hasFiltersApplied && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleResetFilters}>
              초기화
            </Button>
          }
        >
          {filterSummary || '필터가 적용되었습니다.'}
        </Alert>
      )}

      {hasEntries ? (
        <Stack
          spacing={3}
          component={motion.div}
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {groupedEntries.map((group) => (
            <Card
              key={group.date}
              variant="outlined"
              component={motion.div}
              variants={itemVariants}
            >
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  spacing={1}
                  mb={2}
                >
                  <Typography variant="h6" fontWeight={700}>
                    {formatDateWithWeekday(group.date)}
                  </Typography>
                  <Chip
                    label={formatAmount(group.total)}
                    color={group.total >= 0 ? 'success' : 'error'}
                    variant="outlined"
                  />
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <List disablePadding>
                  {group.entries.map((entry) => (
                    <SwipeableEntryItem
                      key={entry.id}
                      entry={entry}
                      memberLookup={memberLookup}
                      onEdit={() => handleOpenDialog('edit', entry)}
                      onDelete={() => handleDelete(entry)}
                      deleteDisabled={deleteEntry.isPending}
                    />
                  ))}
                </List>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <EmptyState
          title="표시할 내역이 없습니다"
          description={
            hasFiltersApplied
              ? '선택한 조건에 해당하는 내역이 없습니다. 필터를 조정해보세요.'
              : '첫 내역을 추가하고 가계부를 시작해보세요.'
          }
        />
      )}

      <BottomSheet
        open={dialogState.mode !== null}
        onClose={handleCloseDialog}
        title={dialogState.mode === 'create' ? '새 내역 추가' : '내역 수정'}
        maxWidth="sm"
      >
        <Stack spacing={3}>
          {/* AmountInput */}
          <AmountInput
            value={formData.amount}
            type={formData.amountType}
            onChange={handleAmountInputChange}
          />

          {/* 날짜 */}
          <DatePicker
            label="날짜"
            value={formData.entry_date ? new Date(formData.entry_date) : null}
            onChange={(date) => {
              setFormData((prev) => ({
                ...prev,
                entry_date: date ? toISODateString(date) : '',
              }));
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                required: true,
              },
              field: { clearable: true },
            }}
          />

          {/* 설명 */}
          <TextField
            label="설명"
            value={formData.description}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, description: event.target.value }))
            }
            inputProps={{ maxLength: 200 }}
            helperText={`${formData.description.length}/200`}
            placeholder="예: 점심 식사"
            fullWidth
            required
          />

          {/* 카테고리 */}
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
                label="카테고리 (선택)"
                inputProps={{ ...params.inputProps, maxLength: 80 }}
                placeholder="예: 식비"
              />
            )}
          />

          {/* 반복 설정 */}
          <TextField
            select
            label="반복 주기"
            value={formData.frequency}
            onChange={(event) => {
              const newFrequency = event.target.value as 'once' | 'monthly' | 'weekly';
              setFormData((prev) => ({
                ...prev,
                frequency: newFrequency,
                // frequency 변경 시 관련 필드 초기화
                end_date: newFrequency === 'once' ? null : prev.end_date,
                day_of_month: newFrequency === 'monthly' ? 1 : null,
                day_of_week: newFrequency === 'weekly' ? 0 : null,
              }));
            }}
            fullWidth
          >
            <MenuItem value="once">단건</MenuItem>
            <MenuItem value="monthly">월 반복</MenuItem>
            <MenuItem value="weekly">주 반복</MenuItem>
          </TextField>

          {/* 종료일 (반복일 경우만 표시) */}
          {formData.frequency !== 'once' && (
            <DatePicker
              label="종료일 (선택)"
              value={formData.end_date ? new Date(formData.end_date) : null}
              onChange={(date) => {
                setFormData((prev) => ({
                  ...prev,
                  end_date: date ? toISODateString(date) : null,
                }));
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: '설정하지 않으면 무기한 반복됩니다.',
                },
                field: { clearable: true },
              }}
            />
          )}

          {/* 반복 날짜 (월 반복일 경우만 표시) */}
          {formData.frequency === 'monthly' && (
            <TextField
              select
              label="반복 날짜"
              value={formData.day_of_month ?? 1}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  day_of_month: Number(event.target.value),
                }))
              }
              fullWidth
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <MenuItem key={day} value={day}>
                  매달 {day}일
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* 반복 요일 (주 반복일 경우만 표시) */}
          {formData.frequency === 'weekly' && (
            <TextField
              select
              label="반복 요일"
              value={formData.day_of_week ?? 0}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  day_of_week: Number(event.target.value),
                }))
              }
              fullWidth
            >
              <MenuItem value={0}>일요일</MenuItem>
              <MenuItem value={1}>월요일</MenuItem>
              <MenuItem value={2}>화요일</MenuItem>
              <MenuItem value={3}>수요일</MenuItem>
              <MenuItem value={4}>목요일</MenuItem>
              <MenuItem value={5}>금요일</MenuItem>
              <MenuItem value={6}>토요일</MenuItem>
            </TextField>
          )}

          {/* 액션 버튼 */}
          <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
            <Button onClick={handleCloseDialog} size="large" fullWidth variant="outlined">
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              size="large"
              fullWidth
              disabled={
                !formData.entry_date ||
                !formData.description.trim() ||
                formData.amount === 0 ||
                createEntry.isPending ||
                updateEntry.isPending
              }
            >
              {dialogState.mode === 'create' ? '추가' : '저장'}
            </Button>
          </Stack>
        </Stack>
      </BottomSheet>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="내역 삭제"
        description={
          confirmDeleteTarget
            ? `"${confirmDeleteTarget.description}" 내역을 삭제하시겠습니까?`
            : undefined
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onExited={handleDeleteDialogExited}
        confirmText="삭제"
        variant="danger"
      />

      <Drawer anchor="right" open={isFilterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}>
        <Box sx={{ width: { xs: '100vw', sm: 360 }, p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">고급 필터</Typography>
            <DatePicker
              label="시작일"
              value={draftFilters.fromDate ? new Date(draftFilters.fromDate) : null}
              onChange={(value) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  fromDate: value ? toISODateString(value) : null,
                }))
              }
              slotProps={{
                field: { clearable: true },
              }}
            />
            <DatePicker
              label="종료일"
              value={draftFilters.toDate ? new Date(draftFilters.toDate) : null}
              onChange={(value) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  toDate: value ? toISODateString(value) : null,
                }))
              }
              slotProps={{
                field: { clearable: true },
              }}
            />
            <TextField
              label="검색어"
              value={draftFilters.search}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              placeholder="설명에서 검색"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="최소 금액"
                type="number"
                value={draftFilters.minAmount ?? ''}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    minAmount: event.target.value === '' ? null : Number(event.target.value),
                  }))
                }
              />
              <TextField
                label="최대 금액"
                type="number"
                value={draftFilters.maxAmount ?? ''}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    maxAmount: event.target.value === '' ? null : Number(event.target.value),
                  }))
                }
              />
            </Stack>
            <ToggleButtonGroup
              value={draftFilters.type}
              exclusive
              onChange={(_, value) =>
                setDraftFilters((prev) => ({ ...prev, type: value === null ? null : value }))
              }
              color="primary"
            >
              <ToggleButton value={EntryTypeFilter.INCOME}>수입</ToggleButton>
              <ToggleButton value={EntryTypeFilter.EXPENSE}>지출</ToggleButton>
            </ToggleButtonGroup>
            <Autocomplete
              multiple
              freeSolo
              options={existingCategories}
              value={draftFilters.categories}
              onChange={(_, value) => setDraftFilters((prev) => ({ ...prev, categories: value }))}
              renderInput={(params) => (
                <TextField {...params} label="카테고리" placeholder="카테고리를 선택 또는 입력" />
              )}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={draftFilters.includeUncategorized}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      includeUncategorized: event.target.checked,
                    }))
                  }
                />
              }
              label="카테고리 미분류 포함"
            />
            <TextField
              select
              label="작성자"
              SelectProps={{ multiple: true }}
              value={draftFilters.memberIds}
              onChange={(event) => {
                const value = event.target.value;
                setDraftFilters((prev) => ({
                  ...prev,
                  memberIds: typeof value === 'string' ? value.split(',') : (value as string[]),
                }));
              }}
              helperText="선택한 사용자만 표시합니다"
            >
              {memberOptions.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.label}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1} justifyContent="flex-end" pt={1}>
              <Button onClick={handleResetFilters}>초기화</Button>
              <Button variant="contained" onClick={handleApplyFilters}>
                적용
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Drawer>

      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>데이터 내보내기</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            현재 필터가 적용된 {entries.length}건의 내역을 CSV 또는 XLSX 형식으로 내보낼 수
            있습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>취소</Button>
          <Button onClick={() => handleExport('csv')}>CSV</Button>
          <Button variant="contained" onClick={() => handleExport('xlsx')}>
            XLSX
          </Button>
        </DialogActions>
      </Dialog>

      <Popover
        open={Boolean(monthPickerAnchor)}
        anchorEl={monthPickerAnchor}
        onClose={handleCloseMonthPicker}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Stack spacing={3} sx={{ p: 2, pb: 1 }}>
          <DateCalendar
            views={['year', 'month']}
            openTo="month"
            value={
              selectedMonth
                ? new Date(
                    parseInt(selectedMonth.split('-')[0]),
                    parseInt(selectedMonth.split('-')[1]) - 1,
                  )
                : null
            }
            onChange={handleMonthSelect}
            onViewChange={(newView) => {
              if (newView === 'year' || newView === 'month') {
                setMonthPickerView(newView);
              }
            }}
            slotProps={{
              calendarHeader: {
                format: 'yyyy년',
              } as unknown as Record<string, unknown>,
            }}
            sx={{
              minHeight: 320,
              maxHeight: 320,
              '& .MuiPickersSlideTransition-root': {
                minHeight: 240,
              },
            }}
          />
          <Button variant="outlined" onClick={handleToday} fullWidth>
            {currentMonthLabel}
          </Button>
        </Stack>
      </Popover>
    </Box>
  );
};
