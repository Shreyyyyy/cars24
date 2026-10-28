'use client';

import React from 'react';
import {
  PhoneCall,
  Plus,
  Clock,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  Copy,
  Sparkles
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { copyToClipboard } from '@/lib/formatters';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export default function CallbacksPage() {
  const { callbacks, openModal, showToast } = useDemoContext();

  const handleCopyRef = (ref: string) => {
    copyToClipboard(ref).then(() => {
      showToast({
        type: 'info',
        title: 'Callback Ref Copied',
        message: `Reference token ${ref} copied.`
      });
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-600 text-white shadow-2xs">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                Dealer Callback Requests
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Simulated phone consultation requests with Maruti Suzuki Arena & NEXA relationship managers
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => openModal('callback')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-colors shadow-md shadow-orange-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Callback Request</span>
        </button>
      </div>

      <DemoActionBanner
        customMessage="SIMULATED OUTBOUND: Callback requests operate as local UI prototypes. No phone calls or telemarketing outreach will be triggered."
      />

      {/* Callbacks List */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">
              Active Callback Log ({callbacks.length})
            </h3>
            <p className="text-xs text-gray-500">Track demo callback slots and reasons</p>
          </div>
        </div>

        {callbacks.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl space-y-3">
            <PhoneCall className="w-12 h-12 text-gray-300 mx-auto" />
            <div className="text-sm font-bold text-gray-700">No simulated callback requests created yet</div>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Simulate customer callback requests for vehicle quotes, test ride coordination, or service questions.
            </p>
            <button
              onClick={() => openModal('callback')}
              className="mt-2 px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700"
            >
              Simulate Callback Request
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {callbacks.map(cb => (
              <div
                key={cb.id}
                className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">
                      {cb.status}
                    </span>
                    <h4 className="font-extrabold text-sm text-gray-900 mt-1">
                      Reason: {cb.reason}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopyRef(cb.callbackRef)}
                    className="flex items-center gap-1 font-mono text-xs font-bold text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-100"
                    title="Copy Reference"
                  >
                    <span>{cb.callbackRef}</span>
                    <Copy className="w-3 h-3 text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>{cb.customerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{cb.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{cb.city}, {cb.state}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{cb.preferredDate} ({cb.preferredTime})</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Language: {cb.preferredLanguage}</span>
                  <span className="text-orange-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Demo Scheduled</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
