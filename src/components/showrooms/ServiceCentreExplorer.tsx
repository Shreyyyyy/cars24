'use client';

import React, { useState } from 'react';
import {
  X,
  Wrench,
  MapPin,
  Phone,
  Clock,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { SERVICE_CENTRES, SERVICE_REQUIREMENTS } from '@/data/service-centres';
import { VEHICLES } from '@/data/vehicles';
import { SHOWROOM_CITIES, SHOWROOM_STATES } from '@/data/showrooms';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

interface ServiceCentreExplorerProps {
  isModal?: boolean;
}

export const ServiceCentreExplorer: React.FC<ServiceCentreExplorerProps> = ({ isModal = false }) => {
  const { activeModal, closeModal, openModal, selectedCity: contextCity } = useDemoContext();

  const [stateFilter, setStateFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState(contextCity || 'All');
  const [vehicleModel, setVehicleModel] = useState('All');
  const [selectedReq, setSelectedReq] = useState<string>('All');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  if (isModal && activeModal !== 'service_centre') return null;

  const filteredCentres = SERVICE_CENTRES.filter(sc => {
    if (stateFilter !== 'All' && sc.state.toLowerCase() !== stateFilter.toLowerCase()) return false;
    if (cityFilter !== 'All' && sc.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
    if (selectedReq !== 'All' && !sc.specializations.includes(selectedReq)) return false;
    return true;
  });

  const handleAskAiAboutService = (scName: string) => {
    setAiAdvice(
      `🔧 AI Service Recommendation for ${scName}:
• Recommended Interval: Maruti Suzuki recommends periodic maintenance every 10,000 km or 12 months (whichever occurs first).
• Complimentary Inspection: Includes 60-point computerized battery, brake pad, fluid condition, and OBD-II electronic diagnostic check.
• Genuine Parts: Authorized centers use 100% Maruti Genuine Parts (MGP) and certified synthetic engine oil lubricants.`
    );
  };

  const content = (
    <div className="space-y-5">
      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">State</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2.5 bg-white text-gray-800 focus:border-amber-500"
            >
              {SHOWROOM_STATES.map(st => (
                <option key={st} value={st}>{st === 'All' ? 'All States' : st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">City</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2.5 bg-white text-gray-800 focus:border-amber-500"
            >
              {SHOWROOM_CITIES.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All Cities' : c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Vehicle Model</label>
            <select
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2.5 bg-white text-gray-800 focus:border-amber-500"
            >
              <option value="All">All Maruti Models</option>
              {VEHICLES.map(v => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Service Requirement</label>
            <select
              value={selectedReq}
              onChange={(e) => setSelectedReq(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2.5 bg-white text-gray-800 focus:border-amber-500"
            >
              <option value="All">All Service Needs</option>
              {SERVICE_REQUIREMENTS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI Advice Box */}
      {aiAdvice && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 text-xs text-amber-950 whitespace-pre-line leading-relaxed relative">
          <button
            onClick={() => setAiAdvice(null)}
            className="absolute top-2 right-2 text-amber-400 hover:text-amber-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {aiAdvice}
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>Found <strong className="text-gray-900">{filteredCentres.length}</strong> authorized service centers</span>
        <span className="text-[11px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
          Maruti Genuine Care
        </span>
      </div>

      {/* Service Centres List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCentres.map(sc => (
          <div
            key={sc.id}
            className="flex flex-col justify-between p-4 rounded-2xl border border-gray-200 bg-white hover:border-amber-300 hover:shadow-sm transition-all shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                  sc.channel === 'NEXA' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
                }`}>
                  {sc.channel} Service
                </span>
                <div className="flex items-center gap-2">
                  {sc.pickupAvailable && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      Doorstep Pickup
                    </span>
                  )}
                  {sc.emergencySupport && (
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      24/7 Breakdown Support
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-extrabold text-sm text-gray-900 mt-2">
                {sc.name}
              </h3>

              <div className="mt-2 space-y-1.5 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{sc.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="font-mono text-gray-700">{sc.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>{sc.timing}</span>
                </div>
              </div>

              {/* Specializations Chips */}
              <div className="mt-3">
                <div className="text-[10px] font-bold uppercase text-gray-400 mb-1">Workshop Capabilities</div>
                <div className="flex flex-wrap gap-1">
                  {sc.specializations.map((spec, i) => (
                    <span key={i} className="text-[10px] bg-gray-50 text-gray-700 px-2 py-0.5 rounded-md border border-gray-100">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleAskAiAboutService(sc.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI About Service</span>
              </button>

              <button
                onClick={() => {
                  if (isModal) closeModal();
                  openModal('callback', { city: sc.city, reason: 'Service assistance' });
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Request Service Callback</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <DemoActionBanner
          variant="compact"
          customMessage="DEMO DATA: Service booking requests are simulated. No actual service appointment is sent to Maruti Suzuki workshops."
        />
      </div>
    </div>
  );

  if (!isModal) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-600">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Find Authorized Service Centres</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Diagnostic & Maintenance
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Explore authorized workshops for periodic service, diagnostics, and genuine spare parts
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {content}
        </div>
      </div>
    </div>
  );
};
