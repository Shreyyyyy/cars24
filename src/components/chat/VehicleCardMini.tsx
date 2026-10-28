'use client';

import React from 'react';
import { Eye, CarFront, Layers, Sparkles } from 'lucide-react';
import { Vehicle } from '@/types';
import { VEHICLES } from '@/data/vehicles';
import { formatPriceLakh } from '@/lib/formatters';
import { useDemoContext } from '@/context/DemoContext';

interface VehicleCardMiniProps {
  vehicleId: string;
}

export const VehicleCardMini: React.FC<VehicleCardMiniProps> = ({ vehicleId }) => {
  const { openVehicleDetail, openModal, addToComparison } = useDemoContext();

  const vehicle = VEHICLES.find(v => v.id === vehicleId);
  if (!vehicle) return null;

  return (
    <div className="w-64 flex-shrink-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all group">
      <div className="relative h-28 w-full overflow-hidden bg-gray-100">
        <img
          src={vehicle.image}
          alt={vehicle.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded text-white ${
            vehicle.channel === 'NEXA' ? 'bg-slate-900' : 'bg-red-600'
          }`}>
            {vehicle.channel}
          </span>
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
            {vehicle.category}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-gray-900 group-hover:text-red-700 transition-colors">
              {vehicle.name}
            </h4>
            <span className="text-[11px] font-black text-gray-900">
              {formatPriceLakh(vehicle.startingPriceLakh)}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
            {vehicle.claimedMileage} • {vehicle.fuelTypes.join(', ')}
          </p>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-gray-100">
          <button
            onClick={() => openVehicleDetail(vehicle)}
            className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-[10px] font-bold text-gray-700 transition-colors"
            title="Inspect vehicle specs"
          >
            <Eye className="w-3 h-3 text-gray-500" />
            <span>Details</span>
          </button>
          <button
            onClick={() => addToComparison(vehicle.id)}
            className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-gray-50 hover:bg-indigo-50 text-[10px] font-bold text-indigo-700 transition-colors"
            title="Add to comparison matrix"
          >
            <Layers className="w-3 h-3 text-indigo-600" />
            <span>Compare</span>
          </button>
          <button
            onClick={() => openModal('test_ride', { carId: vehicle.id })}
            className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-[10px] font-bold text-white transition-colors"
            title="Simulate test ride booking"
          >
            <CarFront className="w-3 h-3" />
            <span>Ride</span>
          </button>
        </div>
      </div>
    </div>
  );
};
