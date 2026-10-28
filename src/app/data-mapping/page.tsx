'use client';

import React, { useState } from 'react';
import { Database } from 'lucide-react';
import { SchemaMappingEditor } from '@/components/mapping/SchemaMappingEditor';
import { LoadVerificationView } from '@/components/mapping/LoadVerificationView';

type View = 'mapping' | 'load';

export default function DataMappingPage() {
  const [view, setView] = useState<View>('mapping');
  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 space-y-5">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-600 text-white"><Database className="w-5 h-5" /></div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Data Mapping</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          The business dictionary the assistant writes SQL from (sheets, columns, joins and metric definitions), and how the file was loaded.
        </p>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {([['mapping', 'Schema mapping'], ['load', 'Load & verification']] as [View, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`rounded-md px-3 py-1 text-xs font-bold ${view === id ? 'bg-white text-red-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {view === 'mapping' ? <SchemaMappingEditor /> : <LoadVerificationView />}
    </div>
  );
}
