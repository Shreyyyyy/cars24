'use client';

import React from 'react';
import {
  X,
  User,
  MapPin,
  Calendar,
  Car,
  IndianRupee,
  Clock,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { DemoCustomerProfile } from '@/types';
import { useDemoContext } from '@/context/DemoContext';

interface CustomerProfileDrawerProps {
  customer: DemoCustomerProfile | null;
  onClose: () => void;
}

export const CustomerProfileDrawer: React.FC<CustomerProfileDrawerProps> = ({
  customer,
  onClose
}) => {
  const { openModal } = useDemoContext();

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col justify-between overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">{customer.name}</h3>
              <p className="text-[11px] text-gray-400 font-mono">{customer.id} • {customer.lastActive}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Status Chips */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              {customer.intent}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">
              {customer.sentiment}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
              Stage: {customer.journeyStage}
            </span>
          </div>

          {/* Details Table */}
          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden bg-white">
            <div className="p-3 flex justify-between">
              <span className="text-gray-500">Contact Number:</span>
              <span className="font-mono font-semibold text-gray-900">{customer.phoneMasked}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-gray-500">Location:</span>
              <span className="font-semibold text-gray-900">{customer.city}, {customer.state}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-gray-500">Preferred Language:</span>
              <span className="font-semibold text-gray-900">{customer.language}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-gray-500">Target Car:</span>
              <span className="font-bold text-red-600">{customer.preferredModel}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-gray-500">Declared Budget:</span>
              <span className="font-bold text-gray-900">{customer.budget}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-gray-500">Test Ride Status:</span>
              <span className={`font-bold ${customer.testRideInterest === 'Completed' ? 'text-green-600' : 'text-amber-600'}`}>
                {customer.testRideInterest}
              </span>
            </div>
          </div>

          {/* Assistant Session Notes */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              AI Conversation Summary & Notes
            </div>
            <p className="text-gray-700 leading-relaxed text-xs">
              {customer.notes}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-[11px] text-amber-900">
            <strong>Synthetic Lead:</strong> Customer data is mock-generated for demo purposes. No real PII is recorded.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-2">
          <button
            onClick={() => openModal('callback', { name: customer.name, city: customer.city })}
            className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-colors shadow-2xs text-center"
          >
            Simulate Callback
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white font-semibold text-xs text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
