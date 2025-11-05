import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Papa from 'papaparse';
import { parseCurrency } from '../lib/format';
import { useBulkImportEntries } from '../hooks/useEntries';
import type { EntryCreate, EntryBulkImportResult } from '../types/entries';
import { useToastStore } from '../stores/toastStore';

interface BulkUploadWizardProps {
  bookId: string;
  existingCategories: string[];
}

type ColumnKey = 'entry_date' | 'description' | 'amount' | 'category';

interface ColumnMapping {
  entry_date: string | null;
  description: string | null;
  amount: string | null;
  category: string | null;
}

interface EditableRow {
  entry_date: string;
  description: string;
  amount: string;
  category: string;
  error?: string;
  sourceIndex: number;
}

const steps = ['파일 선택', '열 매핑', '미리보기', '결과'];

const requiredColumns: ColumnKey[] = ['entry_date', 'description', 'amount'];

const templateCsv = `entry_date,description,amount,category\n2024-01-01,아침 식사,-4500,식비\n2024-01-02,급여,3500000,수입`;

const guessMapping = (headers: string[], keyword: string) =>
  headers.find((header) => header.toLowerCase().includes(keyword));

const validateRow = (row: EditableRow): string | undefined => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.entry_date)) {
    return '날짜 형식은 YYYY-MM-DD 이어야 합니다.';
  }
  if (!row.description.trim()) {
    return '설명을 입력해주세요.';
  }
  const amountValue = parseCurrency(row.amount);
  if (amountValue === null || amountValue === 0) {
    return '금액을 올바르게 입력해주세요.';
  }
  return undefined;
};

const triggerDownload = (content: BlobPart, fileName: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const BulkUploadWizard = ({ bookId, existingCategories }: BulkUploadWizardProps) => {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    entry_date: null,
    description: null,
    amount: null,
    category: null,
  });
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<EntryBulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkImport = useBulkImportEntries(bookId);
  const showToast = useToastStore((state) => state.showToast);

  const resetState = () => {
    setActiveStep(0);
    setHeaders([]);
    setRawRows([]);
    setColumnMapping({ entry_date: null, description: null, amount: null, category: null });
    setRows([]);
    setResult(null);
    setParseError(null);
  };

  const handleOpen = () => {
    resetState();
    setOpen(true);
  };

  const handleClose = () => {
    if (bulkImport.isPending) return;
    setOpen(false);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          setParseError(results.errors[0].message);
          return;
        }
        const data = results.data ?? [];
        if (!data.length) {
          setParseError('데이터가 비어 있습니다.');
          return;
        }
        const detectedHeaders = results.meta.fields ?? Object.keys(data[0]);
        setHeaders(detectedHeaders);
        setRawRows(data);
        setParseError(null);
        setColumnMapping({
          entry_date: guessMapping(detectedHeaders, 'date') ?? null,
          description:
            guessMapping(detectedHeaders, 'desc') ?? guessMapping(detectedHeaders, '내용') ?? null,
          amount:
            guessMapping(detectedHeaders, 'amount') ??
            guessMapping(detectedHeaders, '금액') ??
            null,
          category:
            guessMapping(detectedHeaders, 'category') ??
            guessMapping(detectedHeaders, '카테고리') ??
            null,
        });
        setActiveStep(1);
      },
      error: (error) => {
        setParseError(error.message);
      },
    });
    event.target.value = '';
  };

  const isMappingValid = useMemo(
    () =>
      requiredColumns.every((column) => {
        const mapped = columnMapping[column];
        return mapped !== null && headers.includes(mapped);
      }),
    [columnMapping, headers],
  );

  const hydrateRows = () => {
    const editable = rawRows.map((row, index) => {
      const getValue = (key: string | null) => (key ? String(row[key] ?? '').trim() : '');
      const dataRow: EditableRow = {
        entry_date: getValue(columnMapping.entry_date).replace(/\./g, '-'),
        description: getValue(columnMapping.description),
        amount: getValue(columnMapping.amount).replace(/,/g, ''),
        category: getValue(columnMapping.category),
        sourceIndex: index,
      };
      dataRow.error = validateRow(dataRow);
      return dataRow;
    });
    setRows(editable);
  };

  const handleNextFromMapping = () => {
    hydrateRows();
    setActiveStep(2);
  };

  const handleRowChange = (index: number, key: keyof EditableRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[index], [key]: value };
      row.error = validateRow(row);
      next[index] = row;
      return next;
    });
  };

  const hasErrors = rows.some((row) => row.error);
  const validRows = rows.filter((row) => !row.error);

  const handleImport = async () => {
    if (!rows.length) {
      showToast('업로드할 데이터가 없습니다.', { severity: 'warning', title: '일괄 업로드' });
      return;
    }
    if (hasErrors) {
      showToast('오류가 있는 행을 수정한 후 다시 시도해주세요.', {
        severity: 'warning',
        title: '검증 오류',
      });
      return;
    }

    const payload: EntryCreate[] = validRows.map((row) => ({
      entry_date: row.entry_date,
      description: row.description.trim(),
      amount: parseCurrency(row.amount) ?? 0,
      category: row.category.trim() ? row.category.trim() : null,
    }));

    try {
      const response = await bulkImport.mutateAsync(payload);
      setResult(response);
      setActiveStep(3);
      showToast('일괄 업로드를 완료했습니다.', { severity: 'success', title: '업로드 완료' });
    } catch (error) {
      console.error('Bulk import failed:', error);
      showToast('업로드 중 오류가 발생했습니다.', { severity: 'error', title: '업로드 실패' });
    }
  };

  const downloadTemplate = () => {
    triggerDownload(templateCsv, 'shareledger-template.csv', 'text/csv;charset=utf-8;');
  };

  const downloadErrorLog = () => {
    if (!result) return;
    const failed = result.rows.filter((row) => !row.success && row.error);
    if (!failed.length) return;
    const header = 'row_index,error\n';
    const body = failed
      .map((row) => `${row.index},"${(row.error ?? '').replace(/"/g, '""')}"`)
      .join('\n');
    triggerDownload(header + body, 'bulk-upload-errors.csv', 'text/csv;charset=utf-8;');
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack spacing={2}>
            <Typography variant="body1">
              CSV 또는 Excel에서 추출한 파일을 업로드하세요. 첫 줄은 반드시 헤더여야 합니다.
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="contained" startIcon={<UploadFileIcon />} onClick={handleFileSelect}>
                파일 선택
              </Button>
              <Typography variant="body2" color="text.secondary">
                지원 형식: CSV (UTF-8)
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                샘플이 필요하신가요?
              </Typography>
              <Link component="button" type="button" onClick={downloadTemplate} underline="hover">
                템플릿 다운로드
              </Link>
            </Stack>
            {parseError && <Alert severity="error">{parseError}</Alert>}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              hidden
              onChange={handleFileChange}
            />
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              CSV 헤더를 ShareLedger 필드에 매핑하세요.
            </Typography>
            {(['entry_date', 'description', 'amount', 'category'] as ColumnKey[]).map((key) => (
              <TextField
                key={key}
                select
                label={
                  key === 'entry_date'
                    ? '날짜 (YYYY-MM-DD)'
                    : key === 'description'
                      ? '설명'
                      : key === 'amount'
                        ? '금액'
                        : '카테고리'
                }
                value={columnMapping[key] ?? ''}
                onChange={(event) =>
                  setColumnMapping((prev) => ({ ...prev, [key]: event.target.value || null }))
                }
                helperText={requiredColumns.includes(key) ? '필수 필드' : '선택 필드'}
              >
                <MenuItem value="">(사용 안 함)</MenuItem>
                {headers.map((header) => (
                  <MenuItem key={header} value={header}>
                    {header}
                  </MenuItem>
                ))}
              </TextField>
            ))}
            {!isMappingValid && (
              <Alert severity="warning">날짜, 설명, 금액 열을 모두 선택해야 합니다.</Alert>
            )}
          </Stack>
        );
      case 2:
        return (
          <Stack spacing={2}>
            <Alert severity={hasErrors ? 'warning' : 'success'}>
              {hasErrors
                ? '오류가 있는 행이 있습니다. 빨간색으로 표시된 행을 수정 후 다시 시도하세요.'
                : `총 ${rows.length}건의 데이터를 업로드할 준비가 되었습니다.`}
            </Alert>
            <TableContainer component={Paper} sx={{ maxHeight: 360 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>날짜</TableCell>
                    <TableCell>설명</TableCell>
                    <TableCell>금액</TableCell>
                    <TableCell>카테고리</TableCell>
                    <TableCell>상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={row.sourceIndex}
                      sx={{ backgroundColor: row.error ? 'rgba(244, 67, 54, 0.08)' : undefined }}
                    >
                      <TableCell width="15%">
                        <TextField
                          value={row.entry_date}
                          onChange={(event) =>
                            handleRowChange(index, 'entry_date', event.target.value)
                          }
                          size="small"
                          placeholder="YYYY-MM-DD"
                        />
                      </TableCell>
                      <TableCell width="35%">
                        <TextField
                          value={row.description}
                          onChange={(event) =>
                            handleRowChange(index, 'description', event.target.value)
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell width="20%">
                        <TextField
                          value={row.amount}
                          onChange={(event) => handleRowChange(index, 'amount', event.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell width="20%">
                        <TextField
                          value={row.category}
                          onChange={(event) =>
                            handleRowChange(index, 'category', event.target.value)
                          }
                          size="small"
                          placeholder="선택"
                          inputProps={{ list: 'category-suggestions' }}
                        />
                      </TableCell>
                      <TableCell width="10%">
                        {row.error ? (
                          <Tooltip title={row.error}>
                            <Chip label="오류" color="error" size="small" />
                          </Tooltip>
                        ) : (
                          <Chip label="정상" color="success" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <datalist id="category-suggestions">
              {existingCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </Stack>
        );
      case 3:
        return result ? (
          <Stack spacing={2}>
            <Alert severity="success">
              총 {result.total}건 중 {result.success_count}건이 성공했고 {result.failure_count}건이
              실패했습니다.
            </Alert>
            {result.failure_count > 0 && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">실패한 행</Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 240 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>행 번호</TableCell>
                        <TableCell>오류</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.rows
                        .filter((row) => !row.success)
                        .map((row) => (
                          <TableRow key={row.index}>
                            <TableCell>{row.index + 1}</TableCell>
                            <TableCell>{row.error ?? '알 수 없는 오류'}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box>
                  <Button
                    variant="outlined"
                    onClick={downloadErrorLog}
                    startIcon={<UploadFileIcon />}
                  >
                    오류 로그 다운로드
                  </Button>
                </Box>
              </Stack>
            )}
          </Stack>
        ) : (
          <Alert severity="error">업로드 결과를 불러오지 못했습니다.</Alert>
        );
      default:
        return null;
    }
  };

  const renderActions = () => {
    if (activeStep === 0) {
      return null;
    }
    if (activeStep === 1) {
      return (
        <Button onClick={handleNextFromMapping} disabled={!isMappingValid} variant="contained">
          다음
        </Button>
      );
    }
    if (activeStep === 2) {
      return (
        <Button
          onClick={handleImport}
          disabled={bulkImport.isPending || hasErrors}
          variant="contained"
        >
          업로드
        </Button>
      );
    }
    if (activeStep === 3) {
      return (
        <Button
          onClick={() => {
            resetState();
            setActiveStep(0);
          }}
          variant="contained"
        >
          새로운 업로드
        </Button>
      );
    }
    return null;
  };

  return (
    <>
      <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={handleOpen}>
        일괄 업로드
      </Button>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>CSV 일괄 업로드</DialogTitle>
        <DialogContent dividers>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {renderStepContent()}
        </DialogContent>
        <DialogActions>
          {activeStep > 0 && activeStep < steps.length - 1 && (
            <Button
              onClick={() => setActiveStep((prev) => prev - 1)}
              disabled={bulkImport.isPending}
            >
              이전
            </Button>
          )}
          <Button onClick={handleClose} disabled={bulkImport.isPending}>
            닫기
          </Button>
          {renderActions()}
        </DialogActions>
      </Dialog>
    </>
  );
};
