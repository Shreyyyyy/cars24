'use client';

import React from 'react';
import { Car } from 'lucide-react';
import { VehicleSalesMatrix } from '@/components/b2b/VehicleSalesMatrix';

export default function VehiclesPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-600 text-white shadow-2xs">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Vehicle Sales, Model Volumes & Segment Breakdown
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Retail performance, turnover contribution, MoM growth rates, and body style segmentation
            </p>
          </div>
        </div>
      </div>

      <VehicleSalesMatrix />
    </div>
  );
}
