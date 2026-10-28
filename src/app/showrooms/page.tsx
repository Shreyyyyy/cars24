'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { ShowroomLeaderboard } from '@/components/b2b/ShowroomLeaderboard';

export default function ShowroomsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-600 text-white shadow-2xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Showroom Performance & Dealership Analytics
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Rankings, state-wise sales volume, target achievement %, and model leadership across ARENA & NEXA
            </p>
          </div>
        </div>
      </div>

      <ShowroomLeaderboard />
    </div>
  );
}
