import { getDatasetMetadata, executeSQLiteQuery } from '@/lib/sqlite-server';
import { QueryExecutionResult } from '@/types/b2b';

export function getActiveDatasetStats() {
  const meta = getDatasetMetadata();
  if (!meta) {
    return {
      showroomsCount: 0,
      modelsCount: 0,
      campaignsCount: 0,
      customTablesCount: 0,
      customTableNames: [],
      totalSalesUnits: 0,
      totalRevenueCr: 0
    };
  }

  let totalSales = 0;
  let totalRev = 0;

  try {
    const sumCols = meta.columns.filter(c => c.includes('sale') || c.includes('unit') || c.includes('qty'));
    const revCols = meta.columns.filter(c => c.includes('rev') || c.includes('turnover') || c.includes('amount'));

    if (sumCols.length > 0) {
      const res = executeSQLiteQuery(`SELECT SUM("${sumCols[0]}") as total FROM uploaded_data;`);
      totalSales = Number(res[0]?.total || 0);
    }
    if (revCols.length > 0) {
      const res = executeSQLiteQuery(`SELECT SUM("${revCols[0]}") as total FROM uploaded_data;`);
      totalRev = Number(res[0]?.total || 0);
    }
  } catch {}

  return {
    showroomsCount: meta.rowCount,
    modelsCount: 0,
    campaignsCount: 0,
    customTablesCount: 1,
    customTableNames: ['uploaded_data'],
    totalSalesUnits: totalSales,
    totalRevenueCr: totalRev
  };
}

export function resetToDefaultDataset() {
  // Clean reset - no mock data
}

export function executeNaturalLanguageQuery(rawQuery: string): QueryExecutionResult {
  const meta = getDatasetMetadata();
  if (!meta) {
    return {
      query: rawQuery,
      executionTimeMs: 0,
      summary: 'No dataset is loaded. Please upload your Excel or CSV spreadsheet first.',
      sqlQuery: '-- No dataset loaded',
      columns: [],
      rows: [],
      chartType: 'bar',
      chartXKey: '',
      chartYKey: '',
      chartTitle: 'No Data Available',
      keyInsights: ['Please upload an Excel or CSV spreadsheet to begin analysis.'],
      datasetSource: 'uploaded_data'
    };
  }

  const startTime = performance.now();
  const rows = executeSQLiteQuery('SELECT * FROM uploaded_data LIMIT 10;');
  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;
  const cols = rows.length > 0 ? Object.keys(rows[0]) : meta.columns;

  return {
    query: rawQuery,
    executionTimeMs,
    summary: `Executed query against ${meta.fileName} in SQLite. Retrieved ${rows.length} records.`,
    sqlQuery: 'SELECT * FROM uploaded_data LIMIT 10;',
    columns: cols,
    rows,
    chartType: 'bar',
    chartXKey: cols[0] || 'category',
    chartYKey: cols[1] || 'value',
    chartTitle: 'Query Distribution',
    keyInsights: [`SQLite in-memory query completed in ${executionTimeMs}ms.`],
    datasetSource: 'uploaded_data'
  };
}
