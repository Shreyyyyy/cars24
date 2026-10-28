'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { InsuranceLegalView } from '@/components/insurance/InsuranceLegalView';

export default function InsurancePage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              Insurance, Warranty & Legal Assistance
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Guidance on Third-Party, Comprehensive, Zero-Depreciation covers, RTO registration, and cashless claims
            </p>
          </div>
        </div>
      </div>

      <InsuranceLegalView isModal={false} />
    </div>
  );
}
