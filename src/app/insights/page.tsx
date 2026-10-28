'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, UploadCloud } from 'lucide-react';

export default function InsightsPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/db/status')
      .then(res => res.json())
      .then(data => setIsLoaded(Boolean(data.loaded)))
      .catch(() => setIsLoaded(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-xs text-gray-500 font-bold">Checking database...</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-600 text-white shadow-2xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Executive Analytics & Performance Insights
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Aggregated network KPIs and distribution metrics
            </p>
          </div>
        </div>
      </div>

      {!isLoaded ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-3xl space-y-4 max-w-2xl mx-auto shadow-2xs my-8">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-gray-900">No Analytics Dataset Uploaded</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              No data spreadsheet is currently loaded. Please upload your Excel or CSV file to view executive analytics.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 shadow-md transition-all"
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>Upload Dataset on Query Page</span>
          </Link>
        </div>
      ) : (
        <div className="p-8 text-center bg-white border border-gray-200 rounded-2xl">
          <p className="text-xs text-gray-600 font-semibold">
            Dataset active. Use the <Link href="/" className="text-red-600 font-bold underline">AI Query Engine</Link> to ask natural language questions and generate dynamic charts.
          </p>
        </div>
      )}
    </div>
  );
}
