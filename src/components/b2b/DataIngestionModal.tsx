'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  Download,
  RotateCcw,
  Sparkles,
  Layers,
  X,
  Zap
} from 'lucide-react';

interface DataIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
}

export const DataIngestionModal: React.FC<DataIngestionModalProps> = ({
  isOpen,
  onClose,
  onDataUpdated
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState<{
    success: boolean;
    message: string;
    details?: { tableName: string; rowCount: number; columns: string[] };
  } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setIngestionStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/db/upload', {
        method: 'POST',
        body: formData
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textResp = await res.text();
        throw new Error(textResp.slice(0, 150) || `Server returned ${res.status}: ${res.statusText}`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to ingest file into SQLite');
      }

      setIngestionStatus({
        success: true,
        message: `Successfully loaded "${file.name}" into SQLite table '${data.tableName}'!`,
        details: {
          tableName: data.tableName,
          rowCount: data.rowCount,
          columns: data.columns
        }
      });

      if (onDataUpdated) {
        onDataUpdated();
      }
    } catch (err: any) {
      setIngestionStatus({
        success: false,
        message: `Upload error: ${err.message || 'Invalid format'}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const sampleHeaders = [
      'showroom_name',
      'city',
      'state',
      'channel',
      'car_model',
      'monthly_units_sold',
      'monthly_revenue_lakhs',
      'target_achievement_pct',
      'walk_in_customers',
      'test_drives_conducted'
    ];
    const sampleRows = [
      'ARENA SG Highway,Ahmedabad,Gujarat,ARENA,All-New Swift,310,248.0,118.5,1240,430',
      'NEXA Andheri West,Mumbai,Maharashtra,NEXA,Grand Vitara,285,427.5,114.2,980,390',
      'ARENA Connaught Place,New Delhi,Delhi,ARENA,Brezza,260,260.0,108.3,1120,380',
      'NEXA Indiranagar,Bengaluru,Karnataka,NEXA,Fronx,245,220.5,112.0,890,340',
      'ARENA Anna Nagar,Chennai,Tamil Nadu,ARENA,Baleno,230,195.5,105.4,850,310',
      'NEXA Jubilee Hills,Hyderabad,Telangana,NEXA,Jimny,190,266.0,103.8,760,290'
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [sampleHeaders.join(','), ...sampleRows].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', 'maruti_dealership_sales_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Upload Data & Business Reports</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  All Formats Supported
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Load showroom sales sheets, vehicle metrics, marketing memos, or PDF reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-red-500 bg-red-50/50'
                : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
            }`}
            onClick={() => !isUploading && document.getElementById('file-upload-input-modal')?.click()}
          >
            <UploadCloud className="w-10 h-10 text-red-600 mx-auto mb-2" />
            <div className="font-bold text-sm text-gray-900">
              {isUploading ? 'Processing Document...' : 'Drag & Drop your Excel, CSV, PDF, or Word file here'}
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Supports Excel (.xlsx, .xls), CSV, PDF reports, Word documents (.docx, .doc), and Text files
            </p>
            <input
              id="file-upload-input-modal"
              type="file"
              accept=".csv, .xlsx, .xls, .xlsm, .pdf, .txt, .doc, .docx, .json, .md"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 font-semibold text-xs shadow-2xs hover:bg-gray-50">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{isUploading ? 'Processing File...' : 'Browse Local Files'}</span>
            </div>
          </div>

          {/* Feedback banner */}
          {ingestionStatus && (
            <div className={`p-4 rounded-xl border flex items-start gap-2.5 ${
              ingestionStatus.success
                ? 'bg-green-50 border-green-200 text-green-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              {ingestionStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold">{ingestionStatus.message}</div>
                {ingestionStatus.details && (
                  <div className="text-[11px] text-green-800">
                    Imported <strong>{ingestionStatus.details.rowCount.toLocaleString()}</strong> rows with columns:{' '}
                    <span className="font-mono">{ingestionStatus.details.columns.slice(0, 6).join(', ')}...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions & Template Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-gray-700 font-semibold text-xs hover:text-red-600"
            >
              <Download className="w-4 h-4 text-gray-400" />
              <span>Download Sample Dealership CSV Template</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
