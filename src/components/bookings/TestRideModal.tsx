'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CarFront,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Copy,
  Building2,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Languages,
  Loader2,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useDemoContext } from '@/context/DemoContext';
import { VEHICLES } from '@/data/vehicles';
import { SHOWROOMS, SHOWROOM_CITIES, SHOWROOM_STATES } from '@/data/showrooms';
import { generateBookingRef, copyToClipboard } from '@/lib/formatters';
import { validateIndianPhone, validateRequired, validateEmailOptional } from '@/lib/validation';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export const TestRideModal: React.FC = () => {
  const { activeModal, closeModal, addTestRide, modalPayload, showToast, selectedCity: initialCity } = useDemoContext();

  const isOpen = activeModal === 'test_ride';

  const [formData, setFormData] = useState({
    name: 'Rahul Sharma',
    phone: '9820123456',
    email: 'rahul.sharma@example.com',
    carId: 'swift-2024',
    variant: 'ZXi+ 1.2 AGS Dual Tone',
    state: 'Gujarat',
    city: initialCity || 'Ahmedabad',
    showroomName: 'Maruti Suzuki ARENA – SG Highway',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '11:00 AM',
    language: 'English'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Initialize with payload if car passed
  useEffect(() => {
    if (modalPayload?.carId) {
      const v = VEHICLES.find(x => x.id === modalPayload.carId);
      if (v) {
        setFormData(prev => ({
          ...prev,
          carId: v.id,
          variant: v.variants[0]?.name || 'Standard',
        }));
      }
    }
  }, [modalPayload]);

  if (!isOpen) return null;

  const selectedVehicle = VEHICLES.find(v => v.id === formData.carId) || VEHICLES[0];
  const filteredShowrooms = SHOWROOMS.filter(s => s.city.toLowerCase() === formData.city.toLowerCase());

  const handleCityChange = (newCity: string) => {
    const matchedShowroom = SHOWROOMS.find(s => s.city.toLowerCase() === newCity.toLowerCase());
    setFormData(prev => ({
      ...prev,
      city: newCity,
      showroomName: matchedShowroom ? matchedShowroom.name : 'Central Maruti Showroom'
    }));
  };

  const handleCarChange = (newCarId: string) => {
    const v = VEHICLES.find(x => x.id === newCarId) || VEHICLES[0];
    setFormData(prev => ({
      ...prev,
      carId: newCarId,
      variant: v.variants[0]?.name || 'Base Variant'
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const nameCheck = validateRequired(formData.name, 'Customer name');
    if (!nameCheck.isValid) newErrors.name = nameCheck.error!;

    const phoneCheck = validateIndianPhone(formData.phone);
    if (!phoneCheck.isValid) newErrors.phone = phoneCheck.error!;

    const emailCheck = validateEmailOptional(formData.email);
    if (!emailCheck.isValid) newErrors.email = emailCheck.error!;

    if (!formData.showroomName) newErrors.showroomName = 'Please choose a showroom';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const bookingRef = generateBookingRef();
      const bookingRecord = addTestRide({
        bookingRef,
        customerName: formData.name,
        phone: formData.phone,
        email: formData.email,
        vehicleId: selectedVehicle.id,
        vehicleName: selectedVehicle.name,
        variant: formData.variant,
        state: formData.state,
        city: formData.city,
        showroomName: formData.showroomName,
        preferredDate: formData.date,
        preferredTime: formData.time,
        preferredLanguage: formData.language,
        status: 'Simulated – Not a Real Booking'
      });

      setCompletedBooking(bookingRecord);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (err) {}
    }, 900);
  };

  const copySummary = () => {
    if (!completedBooking) return;
    const summary = `[MARUTI SUZUKI SIMULATED TEST RIDE]
Ref: ${completedBooking.bookingRef}
Customer: ${completedBooking.customerName} (${completedBooking.phone})
Vehicle: ${completedBooking.vehicleName} (${completedBooking.variant})
Location: ${completedBooking.showroomName}, ${completedBooking.city}
Date & Time: ${completedBooking.preferredDate} at ${completedBooking.preferredTime}
Status: Simulated - No Real Appointment`;

    copyToClipboard(summary).then(() => {
      setCopied(true);
      showToast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: 'Simulated test ride details copied.'
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100/80 text-red-600">
              <CarFront className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Book a Test Ride</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  Demo Simulation
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Experience the Maruti Suzuki drive at your nearest showroom
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

        {/* Demo Disclaimer Banner */}
        <div className="px-6 pt-4">
          <DemoActionBanner
            variant="compact"
            customMessage="SIMULATED WORKFLOW: Submitting will generate a mock booking confirmation. No actual dealer contact will occur."
          />
        </div>

        {/* Form Body or Confirmation */}
        <div className="p-6">
          {!completedBooking ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Car Selection Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Vehicle <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.carId}
                    onChange={(e) => handleCarChange(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  >
                    {VEHICLES.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.channel}) – From ₹{v.startingPriceLakh}L
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Variant <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.variant}
                    onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  >
                    {selectedVehicle.variants.map(varItem => (
                      <option key={varItem.name} value={varItem.name}>
                        {varItem.name} (₹{varItem.priceLakh}L)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full text-xs rounded-xl border pl-8 p-2.5 bg-white text-gray-900 focus:outline-none ${
                        errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:border-red-500'
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className={`w-full text-xs rounded-xl border pl-8 p-2.5 bg-white text-gray-900 focus:outline-none ${
                        errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:border-red-500'
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-[10px] text-red-500 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full text-xs rounded-xl border border-gray-300 pl-8 p-2.5 bg-white text-gray-900 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Showroom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-red-500"
                  >
                    {SHOWROOM_CITIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Preferred Showroom <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.showroomName}
                    onChange={(e) => setFormData({ ...formData, showroomName: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-red-500"
                  >
                    {filteredShowrooms.length > 0 ? (
                      filteredShowrooms.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.channel})
                        </option>
                      ))
                    ) : (
                      <option value="Authorized Maruti Suzuki Showroom">Authorized Maruti Suzuki Showroom</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Date, Time, Language */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Preferred Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Preferred Time Slot <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-red-500"
                  >
                    <option value="10:00 AM">10:00 AM – 11:30 AM</option>
                    <option value="11:30 AM">11:30 AM – 01:00 PM</option>
                    <option value="02:30 PM">02:30 PM – 04:00 PM</option>
                    <option value="04:30 PM">04:30 PM – 06:00 PM</option>
                    <option value="06:30 PM">06:30 PM – 08:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Consultant Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-red-500"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Gujarati">Gujarati</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Simulating Booking...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Simulate Booking</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Confirmation State */
            <div className="space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center justify-center text-center p-4 bg-green-50/80 rounded-2xl border border-green-200">
                <div className="p-3 rounded-full bg-green-600 text-white mb-2 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-green-950">
                  Demo Test Ride Request Confirmed!
                </h3>
                <p className="text-xs text-green-800 mt-0.5">
                  Simulation reference generated for presentation purposes.
                </p>
                <div className="mt-3 px-3 py-1 bg-white border border-green-300 rounded-xl shadow-2xs font-mono font-bold text-sm text-green-900">
                  Booking Ref: {completedBooking.bookingRef}
                </div>
              </div>

              {/* Summary Card */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2 text-xs text-gray-700">
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Vehicle:</span>
                  <span className="font-bold text-gray-900">{completedBooking.vehicleName} ({completedBooking.variant})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Showroom:</span>
                  <span className="font-semibold text-gray-900">{completedBooking.showroomName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Date & Slot:</span>
                  <span className="font-semibold text-gray-900">{completedBooking.preferredDate} at {completedBooking.preferredTime}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-semibold text-gray-900">{completedBooking.customerName} ({completedBooking.phone})</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Status:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    {completedBooking.status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCompletedBooking(null)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 underline"
                >
                  Edit / Book Another
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={copySummary}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
