'use client';

import React from 'react';
import {
  CalendarCheck,
  CarFront,
  Plus,
  MapPin,
  Clock,
  User,
  Phone,
  CheckCircle2,
  Copy,
  Trash2,
  Sparkles
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { VEHICLES } from '@/data/vehicles';
import { copyToClipboard } from '@/lib/formatters';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export default function TestRidesPage() {
  const { testRides, openModal, showToast } = useDemoContext();

  const handleCopyRef = (ref: string) => {
    copyToClipboard(ref).then(() => {
      showToast({
        type: 'info',
        title: 'Booking Ref Copied',
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
            <div className="p-2 rounded-xl bg-red-600 text-white shadow-2xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                Test Ride Booking Hub
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Manage simulated test drive appointments across Maruti Suzuki Arena & NEXA showrooms
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => openModal('test_ride')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-md shadow-red-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Test Ride Request</span>
        </button>
      </div>

      <DemoActionBanner
        customMessage="SIMULATED WORKFLOW: All appointments generated here are mock demonstrations for stakeholder presentations. No real dealer contact occurs."
      />

      {/* Popular Vehicles to Test Ride */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Fast-Track Test Ride Selection
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VEHICLES.slice(0, 4).map(v => (
            <div
              key={v.id}
              onClick={() => openModal('test_ride', { carId: v.id })}
              className="p-3 rounded-2xl border border-gray-200 bg-white hover:border-red-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <img
                  src={v.image}
                  alt={v.name}
                  className="w-full h-24 object-cover rounded-xl mb-2 group-hover:scale-105 transition-transform duration-300"
                />
                <h4 className="font-extrabold text-xs text-gray-900 group-hover:text-red-600">{v.name}</h4>
                <p className="text-[10px] text-gray-500">{v.category} • {v.channel}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-red-600">
                <span>Book Demo</span>
                <CarFront className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">
              Active Simulated Test Ride Requests ({testRides.length})
            </h3>
            <p className="text-xs text-gray-500">Stored in browser local session state</p>
          </div>
        </div>

        {testRides.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl space-y-3">
            <CarFront className="w-12 h-12 text-gray-300 mx-auto" />
            <div className="text-sm font-bold text-gray-700">No simulated test rides scheduled yet</div>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Click the button above to test the customer test ride reservation modal with form validation and mock reference generation.
            </p>
            <button
              onClick={() => openModal('test_ride')}
              className="mt-2 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700"
            >
              Simulate First Test Ride
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testRides.map(b => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      {b.status}
                    </span>
                    <h4 className="font-extrabold text-sm text-gray-900 mt-1">
                      {b.vehicleName} <span className="font-normal text-xs text-gray-500">({b.variant})</span>
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopyRef(b.bookingRef)}
                    className="flex items-center gap-1 font-mono text-xs font-bold text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-100"
                    title="Copy Booking Reference"
                  >
                    <span>{b.bookingRef}</span>
                    <Copy className="w-3 h-3 text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{b.showroomName}, {b.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{b.preferredDate} ({b.preferredTime})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>{b.customerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{b.phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Created: {b.createdAt}</span>
                  <span className="text-green-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ready for Presentation</span>
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
