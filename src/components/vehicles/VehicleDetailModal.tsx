'use client';

import React, { useState } from 'react';
import {
  X,
  Car,
  Fuel,
  Gauge,
  Shield,
  Layers,
  Sparkles,
  Share2,
  CalendarCheck,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  DollarSign,
  Info
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { formatPriceLakh, formatPriceRange } from '@/lib/formatters';
import { VEHICLES } from '@/data/vehicles';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export const VehicleDetailModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    selectedVehicle,
    addToComparison,
    openModal,
    showToast
  } = useDemoContext();

  const isOpen = activeModal === 'vehicle_details' && selectedVehicle !== null;
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'variants' | 'faqs'>('overview');

  if (!isOpen || !selectedVehicle) return null;

  const relatedVehicles = VEHICLES.filter(
    v => v.id !== selectedVehicle.id && (v.category === selectedVehicle.category || v.channel === selectedVehicle.channel)
  ).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
              selectedVehicle.channel === 'NEXA'
                ? 'bg-slate-900 text-white'
                : 'bg-red-600 text-white'
            }`}>
              {selectedVehicle.channel}
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
                {selectedVehicle.name}
              </h2>
              <p className="text-xs text-gray-500">{selectedVehicle.tagline}</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white flex-shrink-0">
          <div className="md:col-span-7 relative h-56 sm:h-72 overflow-hidden bg-gray-100">
            <img
              src={selectedVehicle.image}
              alt={selectedVehicle.name}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
              <div className="text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur px-2 py-0.5 rounded">
                  {selectedVehicle.category}
                </span>
                <div className="text-lg sm:text-2xl font-black mt-1">
                  Starting {formatPriceLakh(selectedVehicle.startingPriceLakh)}
                </div>
                <div className="text-xs text-gray-200">
                  Ex-showroom Delhi (Est. Range up to {formatPriceLakh(selectedVehicle.topPriceLakh)})
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 p-5 flex flex-col justify-between space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-gray-400 text-[10px] font-semibold uppercase">Claimed Mileage</div>
                <div className="text-xs font-bold text-green-700 mt-0.5">{selectedVehicle.claimedMileage}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-gray-400 text-[10px] font-semibold uppercase">Engine / Battery</div>
                <div className="text-xs font-bold text-gray-900 mt-0.5 truncate">{selectedVehicle.engineCapacity}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-gray-400 text-[10px] font-semibold uppercase">Airbags & Safety</div>
                <div className="text-xs font-bold text-gray-900 mt-0.5">{selectedVehicle.airbags} Airbags Standard</div>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-gray-400 text-[10px] font-semibold uppercase">Transmission</div>
                <div className="text-xs font-bold text-gray-900 mt-0.5 truncate">{selectedVehicle.transmissions[0]}</div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  closeModal();
                  openModal('test_ride', { carId: selectedVehicle.id });
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 hover:from-red-700 hover:to-red-800 transition-all"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Simulate Test Ride</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addToComparison(selectedVehicle.id)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Add to Compare</span>
                </button>
                <button
                  onClick={() => openModal('share_whatsapp')}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-green-600" />
                  <span>Share Car</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-white px-6">
          {[
            { id: 'overview', label: 'Key Features' },
            { id: 'specs', label: 'Technical Specs' },
            { id: 'variants', label: `Variants (${selectedVehicle.variants.length})` },
            { id: 'faqs', label: 'Buyer FAQs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Highlight Innovations
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedVehicle.keyFeatures.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-800 font-medium leading-relaxed">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Safety Architecture</span>
                  </h4>
                  <ul className="space-y-1.5 text-gray-600">
                    {selectedVehicle.safetyFeatures.map((s, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Comfort & Infotainment</span>
                  </h4>
                  <ul className="space-y-1.5 text-gray-600">
                    {selectedVehicle.comfortFeatures.map((c, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-3">
              <table className="w-full text-left border border-gray-200 rounded-xl overflow-hidden">
                <tbody className="divide-y divide-gray-100">
                  <tr className="bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-500 w-1/3">Engine / Powertrain</td>
                    <td className="p-3 font-medium text-gray-900">{selectedVehicle.engineCapacity}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-500">Maximum Power</td>
                    <td className="p-3 font-medium text-gray-900">{selectedVehicle.maxPower}</td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-500">Maximum Torque</td>
                    <td className="p-3 font-medium text-gray-900">{selectedVehicle.maxTorque}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-500">Claimed Fuel Economy</td>
                    <td className="p-3 font-semibold text-green-700">{selectedVehicle.claimedMileage}</td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-500">Transmissions Offered</td>
                    <td className="p-3 font-medium text-gray-900">{selectedVehicle.transmissions.join(', ')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-500">Boot Space Capacity</td>
                    <td className="p-3 font-medium text-gray-900">{selectedVehicle.bootSpaceLitres} Litres</td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-500">Seating Capacity</td>
                    <td className="p-3 font-medium text-gray-900">{selectedVehicle.seatingCapacity} Passengers</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-500">Crash Safety Protocol</td>
                    <td className="p-3 font-medium text-gray-900">{selectedVehicle.safetyRating}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left border border-gray-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                      <th className="p-3">Variant Name</th>
                      <th className="p-3">Fuel</th>
                      <th className="p-3">Transmission</th>
                      <th className="p-3">ARAI Mileage</th>
                      <th className="p-3">Ex-Showroom Price</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedVehicle.variants.map((v, i) => (
                      <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-3 font-bold text-gray-900">
                          <div>{v.name}</div>
                          <div className="text-[10px] text-gray-500 font-normal">
                            {v.featuresHighlight.join(' • ')}
                          </div>
                        </td>
                        <td className="p-3 font-medium text-gray-700">{v.fuel}</td>
                        <td className="p-3 font-medium text-gray-700">{v.transmission}</td>
                        <td className="p-3 font-semibold text-green-700">{v.mileage}</td>
                        <td className="p-3 font-extrabold text-gray-900">{formatPriceLakh(v.priceLakh)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              closeModal();
                              openModal('test_ride', { carId: selectedVehicle.id, variant: v.name });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-600 hover:text-white font-bold transition-all text-[11px]"
                          >
                            Book Ride
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'faqs' && (
            <div className="space-y-3">
              {selectedVehicle.faqs.map((faq, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                  <h5 className="font-bold text-gray-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span>{faq.question}</span>
                  </h5>
                  <p className="text-gray-600 pl-6 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Related Models */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Related Vehicles to Explore
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedVehicles.map(rel => (
                <div
                  key={rel.id}
                  onClick={() => openModal('vehicle_details', rel)}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50/30 cursor-pointer transition-all group"
                >
                  <img
                    src={rel.image}
                    alt={rel.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 group-hover:text-red-700 truncate">
                      {rel.name}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      From {formatPriceLakh(rel.startingPriceLakh)}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
