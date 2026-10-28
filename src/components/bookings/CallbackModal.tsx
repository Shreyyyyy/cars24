'use client';

import React, { useState } from 'react';
import {
  X,
  PhoneCall,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Copy,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { SHOWROOM_CITIES } from '@/data/showrooms';
import { generateCallbackRef, copyToClipboard } from '@/lib/formatters';
import { validateIndianPhone, validateRequired, validateEmailOptional } from '@/lib/validation';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export const CALLBACK_REASONS = [
  'Vehicle enquiry',
  'Pricing enquiry',
  'Test ride assistance',
  'Showroom enquiry',
  'Service assistance',
  'Insurance assistance',
  'Other'
];

export const CallbackModal: React.FC = () => {
  const { activeModal, closeModal, addCallback, showToast, selectedCity } = useDemoContext();

  const isOpen = activeModal === 'callback';

  const [formData, setFormData] = useState({
    name: 'Pooja Patel',
    phone: '9724123456',
    email: '',
    language: 'English',
    state: 'Gujarat',
    city: selectedCity || 'Ahmedabad',
    reason: 'Pricing enquiry',
    date: new Date().toISOString().split('T')[0],
    time: '02:00 PM – 04:00 PM'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCallback, setCompletedCallback] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const nameCheck = validateRequired(formData.name, 'Customer name');
    if (!nameCheck.isValid) newErrors.name = nameCheck.error!;

    const phoneCheck = validateIndianPhone(formData.phone);
    if (!phoneCheck.isValid) newErrors.phone = phoneCheck.error!;

    const emailCheck = validateEmailOptional(formData.email);
    if (!emailCheck.isValid) newErrors.email = emailCheck.error!;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const callbackRef = generateCallbackRef();
      const record = addCallback({
        callbackRef,
        customerName: formData.name,
        phone: formData.phone,
        email: formData.email,
        state: formData.state,
        city: formData.city,
        reason: formData.reason,
        preferredDate: formData.date,
        preferredTime: formData.time,
        preferredLanguage: formData.language,
        status: 'Demo Request Created – No Actual Call Scheduled'
      });

      setCompletedCallback(record);
    }, 700);
  };

  const copySummary = () => {
    if (!completedCallback) return;
    const summary = `[MARUTI SUZUKI SIMULATED CALLBACK REQUEST]
Ref: ${completedCallback.callbackRef}
Customer: ${completedCallback.customerName} (${completedCallback.phone})
City: ${completedCallback.city}
Reason: ${completedCallback.reason}
Time: ${completedCallback.preferredDate} (${completedCallback.preferredTime})
Language: ${completedCallback.preferredLanguage}
Status: Demo Request Created - No Actual Call Scheduled`;

    copyToClipboard(summary).then(() => {
      setCopied(true);
      showToast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: 'Callback request summary copied.'
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-100/80 text-orange-600">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Schedule a Callback</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                  Simulation
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Request a consultation call with a dealership executive
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

        {/* Demo Disclaimer */}
        <div className="px-6 pt-4">
          <DemoActionBanner
            variant="compact"
            customMessage="SIMULATED ACTION: No actual phone calls or SMS reminders will be placed."
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {!completedCallback ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for Callback <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-orange-500"
                >
                  {CALLBACK_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Pooja Patel"
                      className={`w-full text-xs rounded-xl border pl-8 p-2.5 bg-white text-gray-900 focus:outline-none ${
                        errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:border-orange-500'
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
                      placeholder="10-digit mobile"
                      className={`w-full text-xs rounded-xl border pl-8 p-2.5 bg-white text-gray-900 focus:outline-none ${
                        errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:border-orange-500'
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-[10px] text-red-500 mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* City & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-orange-500"
                  >
                    {SHOWROOM_CITIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Preferred Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-orange-500"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Gujarati">Gujarati</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>
              </div>

              {/* Preferred Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Time Slot
                  </label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-orange-500"
                  >
                    <option value="10:00 AM – 12:00 PM">10:00 AM – 12:00 PM</option>
                    <option value="12:00 PM – 02:00 PM">12:00 PM – 02:00 PM</option>
                    <option value="02:00 PM – 04:00 PM">02:00 PM – 04:00 PM</option>
                    <option value="04:00 PM – 06:00 PM">04:00 PM – 06:00 PM</option>
                    <option value="06:00 PM – 08:00 PM">06:00 PM – 08:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
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
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-600/20 hover:bg-orange-700 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Simulating Request...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Simulate Callback Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center justify-center text-center p-4 bg-orange-50/80 rounded-2xl border border-orange-200">
                <div className="p-3 rounded-full bg-orange-600 text-white mb-2 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-orange-950">
                  Demo Callback Scheduled!
                </h3>
                <p className="text-xs text-orange-800 mt-0.5">
                  Demo Request Created – No Actual Call Scheduled
                </p>
                <div className="mt-3 px-3 py-1 bg-white border border-orange-300 rounded-xl shadow-2xs font-mono font-bold text-sm text-orange-950">
                  Ref: {completedCallback.callbackRef}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2 text-xs text-gray-700">
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Reason:</span>
                  <span className="font-bold text-gray-900">{completedCallback.reason}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Contact:</span>
                  <span className="font-semibold text-gray-900">{completedCallback.customerName} ({completedCallback.phone})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Slot & Language:</span>
                  <span className="font-semibold text-gray-900">{completedCallback.preferredDate} ({completedCallback.preferredTime}) • {completedCallback.preferredLanguage}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Status:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    {completedCallback.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCompletedCallback(null)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline"
                >
                  Create Another Request
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
