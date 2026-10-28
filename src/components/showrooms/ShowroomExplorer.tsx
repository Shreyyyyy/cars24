'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Building2,
  Phone,
  Clock,
  CarFront,
  PhoneCall,
  Search,
  SlidersHorizontal,
  Star,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { SHOWROOMS, SHOWROOM_CITIES, SHOWROOM_STATES } from '@/data/showrooms';
import { Showroom } from '@/types';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

interface ShowroomExplorerProps {
  isModal?: boolean;
}

export const ShowroomExplorer: React.FC<ShowroomExplorerProps> = ({ isModal = false }) => {
  const { activeModal, closeModal, openModal, selectedCity: contextCity } = useDemoContext();

  const [stateFilter, setStateFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState(contextCity || 'All');
  const [channelFilter, setChannelFilter] = useState('All');
  const [pinCode, setPinCode] = useState('');
  const [selectedShowroom, setSelectedShowroom] = useState<Showroom | null>(null);

  if (isModal && activeModal !== 'find_showroom') return null;

  const filteredShowrooms = SHOWROOMS.filter(s => {
    if (stateFilter !== 'All' && s.state.toLowerCase() !== stateFilter.toLowerCase()) return false;
    if (cityFilter !== 'All' && s.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
    if (channelFilter !== 'All' && s.channel !== channelFilter) return false;
    if (pinCode.trim() !== '' && !s.pinCode.includes(pinCode.trim())) return false;
    return true;
  });

  const content = (
    <div className="space-y-5">
      {/* Search & Filter Controls */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">State</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-2.5 bg-white text-gray-800 focus:border-red-500"
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
              className="w-full rounded-xl border border-gray-300 p-2.5 bg-white text-gray-800 focus:border-red-500"
            >
              {SHOWROOM_CITIES.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All Target Cities' : c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Channel Network</label>
            <div className="flex rounded-xl border border-gray-300 overflow-hidden bg-gray-100 p-0.5">
              {['All', 'ARENA', 'NEXA'].map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannelFilter(ch)}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${
                    channelFilter === ch ? 'bg-white text-red-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">PIN Code (Optional)</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="e.g. 380054"
                className="w-full rounded-xl border border-gray-300 pl-8 p-2.5 bg-white text-gray-800 focus:border-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>Found <strong className="text-gray-900">{filteredShowrooms.length}</strong> verified demo showroom locations</span>
        <span className="text-[11px] bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded-full border border-red-200">
          Showing Mock Data
        </span>
      </div>

      {/* Showroom Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShowrooms.map(s => (
          <div
            key={s.id}
            className="flex flex-col justify-between p-4 rounded-2xl border border-gray-200 bg-white hover:border-red-200 hover:shadow-md transition-all shadow-2xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                  s.channel === 'NEXA' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
                }`}>
                  {s.channel}
                </span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{s.rating}</span>
                </div>
              </div>

              <h3 className="font-extrabold text-sm text-gray-900 mt-2 leading-tight">
                {s.name}
              </h3>

              <div className="mt-2 space-y-1.5 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{s.address} ({s.pinCode})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="font-mono text-gray-700">{s.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>{s.timing}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {s.facilities.slice(0, 3).map((f, i) => (
                  <span key={i} className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md border border-gray-100">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
              <button
                onClick={() => {
                  if (isModal) closeModal();
                  openModal('test_ride', { showroomName: s.name, city: s.city });
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-2xs"
              >
                <CarFront className="w-3.5 h-3.5" />
                <span>Book Test Ride</span>
              </button>
              <button
                onClick={() => {
                  if (isModal) closeModal();
                  openModal('callback', { city: s.city, reason: 'Showroom enquiry' });
                }}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                title="Request Callback"
              >
                <PhoneCall className="w-4 h-4 text-orange-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <DemoActionBanner
          variant="compact"
          customMessage="DEMO DATA: Dealership addresses, contact numbers, and opening hours are synthetic mocks for demonstration purposes."
        />
      </div>
    </div>
  );

  if (!isModal) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100/80 text-blue-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Find Showrooms Near You</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  ARENA & NEXA
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Explore authorized dealer locations across top metropolitan hubs
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
