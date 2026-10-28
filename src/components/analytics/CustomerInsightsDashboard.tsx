'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  UploadCloud,
  Layers,
  Database
} from 'lucide-react';

export const CustomerInsightsDashboard: React.FC = () => {
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
    return <div className="p-12 text-center text-xs text-gray-500 font-bold">Checking database...</div>;
  }

  if (!datasetInfo) {
    return (
      <div className="p-12 text-center bg-white border border-gray-200 rounded-3xl space-y-4 max-w-2xl mx-auto shadow-2xs my-8">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <BarChart3 className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-gray-900">No Analytics Dataset Uploaded</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            There is currently no spreadsheet loaded in the SQLite database. Upload your Excel or CSV file to view real-time marketing analytics.
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
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600 text-white shadow-2xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Executive Marketing & Sales Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Data dynamically sourced from {datasetInfo.fileName} in SQLite
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
            Source: {datasetInfo.fileName} ({datasetInfo.rowCount} records)
          </span>
        </div>
      </div>

      {/* Dataset Table */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900">
          Preview Records ({rows.length} of {datasetInfo.rowCount})
        </h3>
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
                    <td key={ci} className="p-3 whitespace-nowrap text-gray-700">
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
