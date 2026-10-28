'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Car,
  TrendingUp,
  Fuel,
  Layers,
  ArrowUpDown,
  Filter,
  DollarSign,
  PieChart as PieIcon,
  UploadCloud,
  Zap,
  Table as TableIcon
} from 'lucide-react';

export const VehicleSalesMatrix: React.FC = () => {
  const [datasetInfo, setDatasetInfo] = useState<{
    fileName: string;
    rowCount: number;
    columns: string[];
    previewRows?: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/db/status')
      .then(res => res.json())
      .then(data => {
        if (data.loaded && data.metadata) {
          setDatasetInfo({
            fileName: data.metadata.fileName,
            rowCount: data.metadata.rowCount,
            columns: data.metadata.columns,
            previewRows: data.previewRows
          });
        } else {
          setDatasetInfo(null);
        }
      })
      .catch(() => setDatasetInfo(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-xs text-gray-500 font-bold">
        Checking SQLite database...
      </div>
    );
  }

  if (!datasetInfo) {
    return (
      <div className="p-12 text-center bg-white border border-gray-200 rounded-3xl space-y-4 max-w-2xl mx-auto shadow-2xs my-8">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <Car className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-gray-900">No Vehicle Dataset Uploaded</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            There is currently no spreadsheet loaded. Upload your sales, showroom, or vehicle Excel/CSV file to view dynamic analytics.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 shadow-md transition-all"
        >
          <UploadCloud className="w-4 h-4 text-emerald-400" />
          <span>Upload Excel Spreadsheet</span>
        </Link>
      </div>
    );
  }

  const rows = datasetInfo.previewRows || [];
  const columns = datasetInfo.columns || [];

  return (
    <div className="space-y-6">
      {/* Top Aggregates */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <span className="text-gray-400 text-xs font-bold uppercase">Active Spreadsheet</span>
          <div className="text-base sm:text-lg font-black text-gray-900 mt-1 truncate">
            {datasetInfo.fileName}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">Loaded into SQLite</span>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <span className="text-gray-400 text-xs font-bold uppercase">Total Data Records</span>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
            {datasetInfo.rowCount.toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Indexed in memory</span>
        </div>

        <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <span className="text-gray-400 text-xs font-bold uppercase">Columns Available</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            {columns.length}
          </div>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Ready for AI Queries</span>
        </div>
      </div>

      {/* Dynamic Data Table from Uploaded File */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-gray-600" />
            <span>Uploaded Data Preview ({rows.length} of {datasetInfo.rowCount} rows)</span>
          </h3>
          <Link
            href="/"
            className="text-xs font-bold text-red-600 hover:text-red-700"
          >
            Ask Questions in Natural Language →
          </Link>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                {columns.map((col, ci) => (
                  <th key={ci} className="p-3 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-gray-50">
                  {columns.map((col, ci) => (
                    <td key={ci} className={`p-3 whitespace-nowrap ${ci === 0 ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
