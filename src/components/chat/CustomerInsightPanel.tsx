'use client';

import React from 'react';
import {
  Sparkles,
  User,
  MapPin,
  IndianRupee,
  Car,
  Fuel,
  Calendar,
  Smile,
  Target,
  RotateCcw,
  CheckCircle2,
  PhoneCall,
  Clock,
  Layers,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { formatPriceRange } from '@/lib/formatters';

interface CustomerInsightPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const CustomerInsightPanel: React.FC<CustomerInsightPanelProps> = ({
  isCollapsed,
  onToggleCollapse
}) => {
  const { session, resetSession, openModal } = useDemoContext();

  const getIntentBadgeColor = (intent: string) => {
    switch (intent) {
      case 'Test Ride Intent': return 'bg-red-100 text-red-800 border-red-200';
      case 'Budget Query': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Service Inquiry': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Comparison': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Insurance / Finance': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Exploring Cars':
      default: return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const getSentimentBadgeColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Highly Positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'Interested': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Hesitant / Price Conscious': return 'bg-red-100 text-red-800 border-red-200';
      case 'Neutral':
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (isCollapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center py-4 px-2 border-l border-gray-200 bg-white w-12 justify-between">
        <button
          onClick={onToggleCollapse}
          title="Expand Customer Insights"
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="rotate-90 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
          Customer Insights
        </div>
        <div className="h-6" />
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col justify-between h-full overflow-y-auto select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-gray-900 leading-none">
                Customer Intelligence
              </h3>
              <span className="text-[10px] text-gray-400 font-mono mt-0.5 inline-block">
                {session.sessionId}
              </span>
            </div>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            title="Collapse panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2 text-[10px] text-gray-500 leading-tight">
          Real-time intent and behavioural telemetry inferred during conversation.
        </div>
      </div>

      {/* Dynamic Telemetry Signals */}
      <div className="p-4 space-y-4 text-xs">
        {/* Intent & Sentiment Badges */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Model-Inferred Intent
            </span>
            <span className="text-[9px] text-gray-400">AI Model</span>
          </div>
          <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between ${getIntentBadgeColor(session.detectedIntent)}`}>
            <span>{session.detectedIntent}</span>
            <Target className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Estimated Sentiment
            </span>
            <span className="text-[9px] text-gray-400">Real-Time</span>
          </div>
          <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between ${getSentimentBadgeColor(session.estimatedSentiment)}`}>
            <span>{session.estimatedSentiment}</span>
            <Smile className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Journey Stage */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Journey Stage
            </span>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
              {session.conversationStage}
            </span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-red-600 h-full rounded-full transition-all duration-500"
              style={{
                width: session.conversationStage === 'Discovery' ? '25%' :
                       session.conversationStage === 'Vehicle Shortlisting' ? '50%' :
                       session.conversationStage === 'Evaluation' ? '75%' : '100%'
              }}
            />
          </div>
        </div>

        {/* Profile Attributes */}
        <div className="space-y-2 pt-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Customer Profile Parameters
          </div>

          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="p-2.5 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>Location</span>
              </span>
              <span className="font-semibold text-gray-900">{session.locationCity}, {session.locationState}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
                <span>Budget Band</span>
              </span>
              <span className="font-semibold text-gray-900">{formatPriceRange(session.budgetMinLakh, session.budgetMaxLakh)}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-gray-400" />
                <span>Preferred Body</span>
              </span>
              <span className="font-semibold text-gray-900">{session.preferredCategory || 'SUV / Hatchback'}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-gray-400" />
                <span>Fuel Stance</span>
              </span>
              <span className="font-semibold text-gray-900">{session.preferredFuel || 'Petrol / S-CNG'}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Timeline</span>
              </span>
              <span className="font-semibold text-gray-900">{session.purchaseTimeline}</span>
            </div>
          </div>
        </div>

        {/* Readiness Flags */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Test Ride Interest:</span>
            <span className={`font-bold ${session.testRideInterest ? 'text-green-600' : 'text-gray-400'}`}>
              {session.testRideInterest ? 'Active (Request Created)' : 'Not Yet Booked'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Callback Interest:</span>
            <span className={`font-bold ${session.callbackInterest ? 'text-orange-600' : 'text-gray-400'}`}>
              {session.callbackInterest ? 'Active (Scheduled)' : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2">
        <button
          onClick={resetSession}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-red-600 transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Session Data</span>
        </button>

        <div className="text-[10px] text-center text-gray-400">
          Synthetic session state stored in browser storage
        </div>
      </div>
    </div>
  );
};
