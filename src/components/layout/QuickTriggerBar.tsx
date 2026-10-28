'use client';

import React from 'react';
import {
  CarFront,
  MapPin,
  Wrench,
  ShieldCheck,
  MessageCircle,
  Mail,
  PhoneCall,
  GitCompareArrows,
  Sparkles
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';

export const QuickTriggerBar: React.FC = () => {
  const { openModal, comparisonCarIds } = useDemoContext();

  const TRIGGERS = [
    {
      id: 'test_ride',
      label: 'Book Test Ride',
      subtitle: 'Simulate Appointment',
      icon: CarFront,
      color: 'hover:border-red-500 hover:shadow-red-500/10 text-red-600 bg-red-50/50',
      action: () => openModal('test_ride')
    },
    {
      id: 'find_showroom',
      label: 'Find Showrooms',
      subtitle: 'ARENA & NEXA Locations',
      icon: MapPin,
      color: 'hover:border-blue-500 hover:shadow-blue-500/10 text-blue-600 bg-blue-50/50',
      action: () => openModal('find_showroom')
    },
    {
      id: 'service_centre',
      label: 'Service Centres',
      subtitle: 'Maintenance & Repairs',
      icon: Wrench,
      color: 'hover:border-amber-500 hover:shadow-amber-500/10 text-amber-600 bg-amber-50/50',
      action: () => openModal('service_centre')
    },
    {
      id: 'insurance',
      label: 'Insurance & Legal',
      subtitle: 'Zero-Dep & RTO Advice',
      icon: ShieldCheck,
      color: 'hover:border-emerald-500 hover:shadow-emerald-500/10 text-emerald-600 bg-emerald-50/50',
      action: () => openModal('insurance')
    },
    {
      id: 'compare_cars',
      label: 'Compare Cars',
      subtitle: `${comparisonCarIds.length} models selected`,
      icon: GitCompareArrows,
      color: 'hover:border-indigo-500 hover:shadow-indigo-500/10 text-indigo-600 bg-indigo-50/50',
      action: () => openModal('compare_cars')
    },
    {
      id: 'callback',
      label: 'Schedule Callback',
      subtitle: 'Simulate Phone Request',
      icon: PhoneCall,
      color: 'hover:border-violet-500 hover:shadow-violet-500/10 text-violet-600 bg-violet-50/50',
      action: () => openModal('callback')
    },
    {
      id: 'share_whatsapp',
      label: 'Share on WhatsApp',
      subtitle: 'Simulate Message Card',
      icon: MessageCircle,
      color: 'hover:border-green-500 hover:shadow-green-500/10 text-green-600 bg-green-50/50',
      action: () => openModal('share_whatsapp')
    },
    {
      id: 'share_email',
      label: 'Share via Email',
      subtitle: 'Simulate Email Template',
      icon: Mail,
      color: 'hover:border-rose-500 hover:shadow-rose-500/10 text-rose-600 bg-rose-50/50',
      action: () => openModal('share_email')
    }
  ];

  return (
    <div className="w-full bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-red-600"></span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Showroom Trigger Shortcuts
          </h3>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            Click any trigger to simulate live automotive workflows
          </span>
        </div>
        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          8 Core Workflows
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {TRIGGERS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={t.action}
              className={`flex flex-col items-start p-2.5 rounded-xl border border-gray-200 bg-white transition-all text-left shadow-2xs hover:shadow-sm ${t.color} group`}
            >
              <div className="p-1.5 rounded-lg bg-white shadow-2xs border border-gray-100 mb-2 group-hover:scale-105 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-gray-900 leading-tight">
                {t.label}
              </span>
              <span className="text-[10px] text-gray-500 leading-tight truncate w-full mt-0.5">
                {t.subtitle}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
