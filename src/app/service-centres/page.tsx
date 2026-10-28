'use client';

import React from 'react';
import { Wrench } from 'lucide-react';
import { ServiceCentreExplorer } from '@/components/showrooms/ServiceCentreExplorer';

export default function ServiceCentresPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-600 text-white shadow-2xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              Maruti Suzuki Authorized Service Network
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Periodic maintenance, diagnostics, genuine spare parts, and warranty assistance
            </p>
          </div>
        </div>
      </div>

      <ServiceCentreExplorer isModal={false} />
    </div>
  );
}
