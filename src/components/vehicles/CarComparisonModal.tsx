'use client';

import React, { useState } from 'react';
import {
  X,
  GitCompareArrows,
  Sparkles,
  Share2,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  CarFront,
  Fuel,
  Gauge,
  Shield,
  Layers,
  Info
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { VEHICLES } from '@/data/vehicles';
import { Vehicle } from '@/types';
import { formatPriceRange } from '@/lib/formatters';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export const CarComparisonModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    comparisonCarIds,
    addToComparison,
    removeFromComparison,
    openModal,
    showToast
  } = useDemoContext();

  const isOpen = activeModal === 'compare_cars';

  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  if (!isOpen) return null;

  const comparedVehicles = VEHICLES.filter(v => comparisonCarIds.includes(v.id));
  const availableVehiclesToAdd = VEHICLES.filter(v => !comparisonCarIds.includes(v.id));

  const handleAskAiDifferences = () => {
    if (comparedVehicles.length < 2) {
      showToast({
        type: 'warning',
        title: 'Select at least 2 cars',
        message: 'Add another vehicle to generate an AI comparison breakdown.'
      });
      return;
    }

    setIsExplaining(true);
    setTimeout(() => {
      setIsExplaining(false);
      const names = comparedVehicles.map(v => v.name).join(' and ');
      setAiExplanation(
        `🤖 AI Specification Analysis for ${names}:
• Price & Positioning: ${comparedVehicles[0].name} starts at ₹${comparedVehicles[0].startingPriceLakh}L catering to ${comparedVehicles[0].category} buyers, while ${comparedVehicles[1].name} is priced from ₹${comparedVehicles[1].startingPriceLakh}L for ${comparedVehicles[1].category} seekers.
• Efficiency & Powertrain: ${comparedVehicles[0].name} achieves ${comparedVehicles[0].claimedMileage} compared to ${comparedVehicles[1].name}'s ${comparedVehicles[1].claimedMileage}.
• Safety Architecture: Both vehicles come equipped with advanced active safety (ESP, Hill Hold) and high airbag counts (${comparedVehicles[0].airbags} vs ${comparedVehicles[1].airbags} Airbags).
• Buyer Recommendation: Choose ${comparedVehicles[0].name} for ${comparedVehicles[0].keyFeatures[0]?.toLowerCase() || 'agility'}, or ${comparedVehicles[1].name} if you prioritize ${comparedVehicles[1].keyFeatures[0]?.toLowerCase() || 'space and road presence'}.`
      );
    }, 800);
  };

  const handleShareComparison = () => {
    openModal('share_whatsapp');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100/80 text-indigo-600">
              <GitCompareArrows className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Compare Maruti Suzuki Cars</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Up to 3 Vehicles
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Side-by-side specification, pricing and feature matrix
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

        {/* Action Controls Bar */}
        <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Add to Compare:</span>
            {availableVehiclesToAdd.length > 0 && comparedVehicles.length < 3 ? (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addToComparison(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-xs rounded-lg border border-gray-300 py-1.5 px-2.5 bg-white text-gray-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="">+ Select vehicle to add</option>
                {availableVehiclesToAdd.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-gray-400">Max 3 cars selected</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAskAiDifferences}
              disabled={isExplaining || comparedVehicles.length < 2}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>{isExplaining ? 'Analyzing...' : 'Ask AI to Explain Differences'}</span>
            </button>
            <button
              onClick={handleShareComparison}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Comparison</span>
            </button>
          </div>
        </div>

        {/* AI Insight Box (if generated) */}
        {aiExplanation && (
          <div className="px-6 pt-3 flex-shrink-0">
            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 text-xs text-indigo-950 whitespace-pre-line leading-relaxed relative">
              <button
                onClick={() => setAiExplanation(null)}
                className="absolute top-2 right-2 text-indigo-400 hover:text-indigo-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {aiExplanation}
            </div>
          </div>
        )}

        {/* Main Matrix Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {comparedVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
              <CarFront className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-semibold">No cars selected for comparison</p>
              <p className="text-xs text-gray-400 mt-1">Select up to 3 cars from the dropdown above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="p-3 bg-gray-50/60 font-semibold text-gray-500 w-44">
                      Specification
                    </th>
                    {comparedVehicles.map(v => (
                      <th key={v.id} className="p-3 min-w-[200px] align-top bg-white border-l border-gray-100">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              {v.channel}
                            </span>
                            <h3 className="text-sm font-extrabold text-gray-900 mt-1">{v.name}</h3>
                            <p className="text-[11px] text-gray-500 font-normal">{v.tagline}</p>
                          </div>
                          <button
                            onClick={() => removeFromComparison(v.id)}
                            title="Remove from comparison"
                            className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-gray-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="mt-2 text-xs font-bold text-gray-900 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                          {formatPriceRange(v.startingPriceLakh, v.topPriceLakh)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Category</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100 font-semibold text-gray-900">
                        {v.category}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Fuel Options</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100">
                        {v.fuelTypes.join(', ')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Claimed Mileage</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100 font-semibold text-green-700">
                        {v.claimedMileage}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Engine & Capacity</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100">
                        {v.engineCapacity}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Max Power</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100 font-medium">
                        {v.maxPower}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Max Torque</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100">
                        {v.maxTorque}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Transmission</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100">
                        {v.transmissions.join(', ')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Seating & Boot</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100">
                        {v.seatingCapacity} Seats • {v.bootSpaceLitres} Litres
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Safety & Airbags</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100">
                        <span className="font-semibold text-gray-900">{v.airbags} Airbags</span> • {v.safetyRating}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Infotainment</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100">
                        {v.infotainment}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Key Highlights</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100">
                        <ul className="space-y-1 list-disc list-inside text-[11px] text-gray-600">
                          {v.keyFeatures.slice(0, 3).map((feat, i) => (
                            <li key={i}>{feat}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium bg-gray-50/40 text-gray-500">Action</td>
                    {comparedVehicles.map(v => (
                      <td key={v.id} className="p-3 border-l border-gray-100">
                        <button
                          onClick={() => {
                            closeModal();
                            openModal('test_ride', { carId: v.id });
                          }}
                          className="w-full py-1.5 px-3 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-2xs text-center"
                        >
                          Book Test Ride
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4">
            <DemoActionBanner
              variant="compact"
              customMessage="Specifications and features are illustrative demo datasets curated for Maruti Suzuki Arena & NEXA portfolios."
            />
          </div>
        </div>
      </div>
    </div>
  );
};
