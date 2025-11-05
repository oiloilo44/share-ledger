import * as XLSX from 'xlsx';
import type { Entry } from '../types/entries';

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEntriesAsCSV(entries: Entry[], fileName: string) {
  const header = ['날짜', '설명', '금액', '카테고리'];
  const rows = entries.map((entry) => [
    entry.entry_date,
    entry.description,
    entry.amount,
    entry.category ?? '',
  ]);
  const csvContent = [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${fileName}.csv`);
}

export function exportEntriesAsXLSX(entries: Entry[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(
    entries.map((entry) => ({
      날짜: entry.entry_date,
      설명: entry.description,
      금액: entry.amount,
      카테고리: entry.category ?? '',
    })),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entries');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  triggerDownload(blob, `${fileName}.xlsx`);
}
