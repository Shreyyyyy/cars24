'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  TrendingUp,
  UploadCloud,
  Table as TableIcon,
  Search,
  Filter
} from 'lucide-react';

export const ShowroomLeaderboard: React.FC = () => {
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
          <Building2 className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-gray-900">No Showroom Dataset Uploaded</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            There is currently no showroom spreadsheet loaded. Upload your Excel or CSV spreadsheet on the main page to populate the dealership leaderboard.
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
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-gray-600" />
            <span>Uploaded Dealership Records ({rows.length} of {datasetInfo.rowCount} rows)</span>
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
