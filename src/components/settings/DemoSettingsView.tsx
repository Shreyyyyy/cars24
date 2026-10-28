'use client';

import React, { useState } from 'react';
import {
  Settings,
  RotateCcw,
  Sparkles,
  Sliders,
  Globe2,
  Clock,
  Layout,
  Database,
  History,
  Trash2,
  CheckCircle2,
  CarFront,
  PhoneCall,
  MessageCircle,
  Mail,
  ShieldCheck,
  Radio,
  FileCheck
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { DEMO_CONFIG } from '@/lib/demo-mode';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export const DemoSettingsView: React.FC = () => {
  const {
    session,
    setLanguage,
    resetSession,
    resetAllDemoData,
    activityLog,
    clearActivityLog,
    simulatedDelay,
    toggleSimulatedDelay,
    showInsightPanel,
    toggleInsightPanel,
    testRides,
    callbacks,
    openModal,
    showToast
  } = useDemoContext();

  const [notificationToggle, setNotificationToggle] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState('q4_festive_edition');

  const handlePopulateSynthetic = () => {
    showToast({
      type: 'success',
      title: 'Synthetic Feed Repopulated',
      message: '14,820 synthetic customer conversations and 3,842 simulated bookings synchronized.'
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gray-900 text-white shadow-2xs">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              Demo Control & Simulation Settings
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Manage local browser state, test triggers, mock datasets and presentation preferences
            </p>
          </div>
        </div>
      </div>

      {/* Demo Action Banner */}
      <DemoActionBanner
        customMessage="DEMO CONTROL CENTRE: All toggles, reset triggers, and simulated workflows operate purely on client-side state without external data calls."
      />

      {/* Quick Action Triggers Toolbar */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Rapid Demo Action Triggers
          </h3>
          <span className="text-[11px] text-gray-400">Launch any workflow instantly</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            onClick={() => openModal('test_ride')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 hover:border-red-400 hover:bg-red-50/50 text-gray-800 transition-all text-center group"
          >
            <CarFront className="w-5 h-5 text-red-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Simulate Test Ride</span>
          </button>

          <button
            onClick={() => openModal('callback')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50/50 text-gray-800 transition-all text-center group"
          >
            <PhoneCall className="w-5 h-5 text-orange-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Simulate Callback</span>
          </button>

          <button
            onClick={() => openModal('share_whatsapp')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50/50 text-gray-800 transition-all text-center group"
          >
            <MessageCircle className="w-5 h-5 text-green-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Simulate WhatsApp</span>
          </button>

          <button
            onClick={() => openModal('share_email')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 hover:border-rose-400 hover:bg-rose-50/50 text-gray-800 transition-all text-center group"
          >
            <Mail className="w-5 h-5 text-rose-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Simulate Email</span>
          </button>

          <button
            onClick={() => openModal('vendor_referral')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-gray-800 transition-all text-center group"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Vendor Referral</span>
          </button>
        </div>
      </div>

      {/* Main Settings Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Experience Toggles */}
        <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-red-600" />
            <span>Interactive Experience Toggles</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <div className="font-bold text-gray-900">Simulate Network & Model Latency</div>
                <div className="text-gray-500 text-[11px]">Adds realistic typing delay (600ms) to AI responses</div>
              </div>
              <button
                type="button"
                onClick={toggleSimulatedDelay}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  simulatedDelay ? 'bg-red-600' : 'bg-gray-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  simulatedDelay ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <div className="font-bold text-gray-900">Customer Intent Telemetry Panel</div>
                <div className="text-gray-500 text-[11px]">Show/hide right-hand customer profiling drawer in chat</div>
              </div>
              <button
                type="button"
                onClick={toggleInsightPanel}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  showInsightPanel ? 'bg-red-600' : 'bg-gray-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  showInsightPanel ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <div className="font-bold text-gray-900">Demo In-App Toast Banners</div>
                <div className="text-gray-500 text-[11px]">Show feedback toasts on test ride bookings and triggers</div>
              </div>
              <button
                type="button"
                onClick={() => setNotificationToggle(!notificationToggle)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notificationToggle ? 'bg-red-600' : 'bg-gray-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notificationToggle ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Dataset & Reset Controls */}
        <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Dataset & State Operations</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Active Synthetic Catalogue Dataset</label>
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-800"
              >
                <option value="q4_festive_edition">Q4 Automotive Portfolio (14 Models, Swift 2024, Dzire, Brezza)</option>
                <option value="ev_future_focus">EV & Hybrid Specialized Dataset (e Vitara & Victoris Concept)</option>
                <option value="commercial_fleet">Arena Commercial & Taxi Focus (Tour / S-CNG)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={resetSession}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Chat Session</span>
              </button>

              <button
                type="button"
                onClick={handlePopulateSynthetic}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sync Synthetic Data</span>
              </button>
            </div>

            <button
              type="button"
              onClick={resetAllDemoData}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge All Local Demo State (Bookings & Activity)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Simulated Integration Health */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
          Simulated Integration Channels (Mock Sandbox)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">SMS / WhatsApp Gateway</span>
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">MOCK ACTIVE</span>
            </div>
            <p className="text-[10px] text-gray-500">Virtual sandbox dispatcher (No SMS outbound)</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Dealer DMS Hook</span>
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">MOCK ACTIVE</span>
            </div>
            <p className="text-[10px] text-gray-500">Generates MSIL-TR reference tokens locally</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">MIBPL Insurance Broker</span>
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">MOCK ACTIVE</span>
            </div>
            <p className="text-[10px] text-gray-500">Simulates cashless claim & policy renewal flows</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Smart Finance Pre-Approval</span>
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">MOCK ACTIVE</span>
            </div>
            <p className="text-[10px] text-gray-500">Simulates instant loan eligibility score calculations</p>
          </div>
        </div>
      </div>

      {/* Simulated Action History Feed */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-extrabold text-gray-900">
              Simulated Action History & Audit Log
            </h3>
          </div>
          {activityLog.length > 0 && (
            <button
              onClick={clearActivityLog}
              className="text-xs text-red-600 hover:text-red-700 font-semibold"
            >
              Clear Log
            </button>
          )}
        </div>

        {activityLog.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs">
            No simulated actions recorded yet. Try booking a test ride, scheduling a callback, or sharing via WhatsApp!
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {activityLog.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-gray-200 text-gray-800 font-mono">
                    {item.actionType}
                  </span>
                  <div>
                    <div className="font-bold text-gray-900">{item.title}</div>
                    <div className="text-[10px] text-gray-500">{item.details}</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-gray-400">
                  {item.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
