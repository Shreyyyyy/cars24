'use client';

import React from 'react';
import {
  Eye,
  Layers,
  CarFront,
  MessageSquare,
  Share2,
  Sparkles,
  Shield,
  Fuel,
  Gauge
} from 'lucide-react';
import { Vehicle } from '@/types';
import { formatPriceLakh, formatPriceRange } from '@/lib/formatters';
import { useDemoContext } from '@/context/DemoContext';

interface VehicleCardProps {
  vehicle: Vehicle;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
  const { openVehicleDetail, openModal, addToComparison } = useDemoContext();

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xs hover:shadow-lg hover:border-red-200 transition-all duration-300 group">
      {/* Image & Badges */}
      <div>
        <div className="relative h-48 w-full overflow-hidden bg-gray-100 cursor-pointer" onClick={() => openVehicleDetail(vehicle)}>
          <img
            src={vehicle.image}
            alt={vehicle.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-white shadow-xs ${
              vehicle.channel === 'NEXA' ? 'bg-slate-900' : 'bg-red-600'
            }`}>
              {vehicle.channel}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
              {vehicle.category}
            </span>
            {vehicle.isNewLaunch && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-black">
                New Launch
              </span>
            )}
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-semibold text-white">
            {vehicle.seatingCapacity} Seater
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="cursor-pointer" onClick={() => openVehicleDetail(vehicle)}>
            <div className="flex items-baseline justify-between gap-1">
              <h3 className="font-extrabold text-base text-gray-900 group-hover:text-red-600 transition-colors">
                {vehicle.name}
              </h3>
              <div className="text-right">
                <span className="text-xs text-gray-400 font-medium">Starts </span>
                <span className="font-black text-sm text-gray-900">
                  {formatPriceLakh(vehicle.startingPriceLakh)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
              {vehicle.tagline}
            </p>
          </div>

          {/* Key Specs Pills */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-green-700">{vehicle.claimedMileage}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate">{vehicle.fuelTypes.join('/')}</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] truncate">{vehicle.airbags} Airbags • {vehicle.safetyRating}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="p-4 pt-0 space-y-2">
        <button
          onClick={() => openModal('test_ride', { carId: vehicle.id })}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-2xs shadow-red-600/10"
        >
          <CarFront className="w-3.5 h-3.5" />
          <span>Book Test Ride</span>
        </button>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => openVehicleDetail(vehicle)}
            className="flex items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-[10px] font-semibold transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => addToComparison(vehicle.id)}
            className="flex items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-indigo-50 text-indigo-700 text-[10px] font-semibold transition-colors"
            title="Compare Car"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openModal('callback', { reason: `Enquiry for ${vehicle.name}` })}
            className="flex items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-amber-50 text-amber-700 text-[10px] font-semibold transition-colors"
            title="Ask AI / Enquiry"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openModal('share_whatsapp')}
            className="flex items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-green-50 text-green-700 text-[10px] font-semibold transition-colors"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
