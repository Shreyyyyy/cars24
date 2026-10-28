'use client';

import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  Zap,
  Sparkles,
  FileText,
  AlertCircle
} from 'lucide-react';
import { CrazyLoaderIcon } from '@/components/common/CrazyLoader';

interface ExcelUploadHeroProps {
  onUploadSuccess: (data: any) => void;
}

export const ExcelUploadHero: React.FC<ExcelUploadHeroProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

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
        throw new Error(data.error || 'Failed to process spreadsheet into SQLite');
      }

      onUploadSuccess(data);
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8">
      {/* Title & Architecture Banner */}
      <div className="text-center space-y-4">
        <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto flex items-center justify-center">
          <img src="/logo.png" alt="CARS24" className="w-full h-full object-contain" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold tracking-wide">
          <Zap className="w-3.5 h-3.5 fill-red-600 text-red-600" />
          <span>Real-Time Automotive Intelligence & Strategy Hub</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
          CARS24 Marketing Intelligence Hub
        </h1>
        <p className="text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Upload dealership sales reports, customer inquiries, showroom metrics, or PDFs. Get instant trend analysis, revenue insights, and actionable operational playbooks.
        </p>
      </div>

      {/* Main Drag-and-Drop Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all shadow-xs ${
          isDragging
            ? 'border-red-500 bg-red-50/50 scale-[1.01]'
            : 'border-gray-300 hover:border-red-400 bg-white hover:bg-gray-50/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 flex items-center justify-center">
            {isUploading ? (
              <CrazyLoaderIcon size="xl" />
            ) : (
              <img src="/logo.png" alt="CARS24" className="w-full h-full object-contain" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-gray-900">
              {isUploading ? 'Processing Business Report...' : 'Drag & Drop your Excel, CSV, or Report here'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Supports .xlsx, .xls, .xlsm, and .csv files. Automatically structures columns and metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">
              <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
              <span>Microsoft Excel (.xlsx, .xls)</span>
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Spreadsheet (.csv)</span>
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Real-Time Business Engine</span>
            </span>
          </div>

          <button
            type="button"
            disabled={isUploading}
            className="mt-2 px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-all shadow-md"
          >
            {isUploading ? 'Processing File...' : 'Browse Computer Files'}
          </button>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h4 className="font-extrabold text-xs text-gray-900">1. Instant Data Structuring</h4>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Upload your sales sheets or reports. The system automatically structures columns and indexes all operational records.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="font-extrabold text-xs text-gray-900">2. Natural Language Analysis</h4>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Ask any business question in simple plain English. Receive direct answers, trends, and charts in seconds.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-extrabold text-xs text-gray-900">3. Actionable Playbooks & Turnaround</h4>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Diagnoses root causes behind lagging numbers and provides role-assigned operational recommendations with clear target KPIs.
          </p>
        </div>
      </div>
    </div>
  );
};
