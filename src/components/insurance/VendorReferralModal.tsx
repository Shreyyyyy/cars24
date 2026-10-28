'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Building,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Copy,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { SHOWROOM_CITIES } from '@/data/showrooms';
import { generateVendorRef, copyToClipboard } from '@/lib/formatters';
import { validateIndianPhone, validateRequired } from '@/lib/validation';
import { logDemoAction } from '@/lib/demo-mode';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export const VendorReferralModal: React.FC = () => {
  const { activeModal, closeModal, modalPayload, showToast, selectedCity } = useDemoContext();

  const isOpen = activeModal === 'vendor_referral';

  const categoryName = modalPayload?.title || 'Comprehensive Insurance';

  const [formData, setFormData] = useState({
    name: 'Aarav Sharma',
    phone: '9820123456',
    city: selectedCity || 'Mumbai',
    category: categoryName,
    time: '11:00 AM – 01:00 PM'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedRef, setCompletedRef] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const nameCheck = validateRequired(formData.name, 'Full name');
    if (!nameCheck.isValid) newErrors.name = nameCheck.error!;

    const phoneCheck = validateIndianPhone(formData.phone);
    if (!phoneCheck.isValid) newErrors.phone = phoneCheck.error!;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const refCode = generateVendorRef();
      const record = {
        ref: refCode,
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        category: formData.category,
        time: formData.time,
        status: 'Simulated Referral – Demo Only'
      };

      setCompletedRef(record);
      logDemoAction('VENDOR_REFERRAL', `Simulated Vendor Referral for ${formData.category}`, { ref: refCode, city: formData.city });
      showToast({
        type: 'success',
        title: 'Vendor Referral Simulated',
        message: `Reference ${refCode}. No actual vendor will contact you.`
      });
    }, 700);
  };

  const copySummary = () => {
    if (!completedRef) return;
    const summary = `[MARUTI SUZUKI SIMULATED INSURANCE/LEGAL REFERRAL]
Ref: ${completedRef.ref}
Customer: ${completedRef.name} (${completedRef.phone})
Category: ${completedRef.category}
City: ${completedRef.city}
Preferred Slot: ${completedRef.time}
Status: Simulated Referral - Demo Only`;

    copyToClipboard(summary).then(() => {
      setCopied(true);
      showToast({
        type: 'info',
        title: 'Copied to Clipboard',
        message: 'Referral summary copied.'
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
            <div className="p-2.5 rounded-xl bg-emerald-100/80 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Connect to Vendor (Demo)</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Simulation
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Simulated referral to Maruti Insurance Broking & Legal partners
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
            customMessage="SIMULATED REFERRAL: No real customer details are transmitted to insurance brokers or external vendors."
          />
        </div>

        {/* Form Body */}
        <div className="p-6">
          {!completedRef ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Enquiry Category
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.category}
                  className="w-full text-xs rounded-xl border border-gray-200 p-2.5 bg-gray-50 text-gray-800 font-semibold"
                />
              </div>

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
                      placeholder="e.g. Aarav Sharma"
                      className={`w-full text-xs rounded-xl border pl-8 p-2.5 bg-white text-gray-900 focus:outline-none ${
                        errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:border-emerald-500'
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
                        errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-[10px] text-red-500 mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-emerald-500"
                  >
                    {SHOWROOM_CITIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Preferred Callback Time
                  </label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-emerald-500"
                  >
                    <option value="10:00 AM – 12:00 PM">10:00 AM – 12:00 PM</option>
                    <option value="12:00 PM – 02:00 PM">12:00 PM – 02:00 PM</option>
                    <option value="02:00 PM – 04:00 PM">02:00 PM – 04:00 PM</option>
                    <option value="04:00 PM – 06:00 PM">04:00 PM – 06:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Simulate Vendor Referral</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center justify-center text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="p-3 rounded-full bg-emerald-600 text-white mb-2 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-emerald-950">
                  Simulated Referral Generated!
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Demo Partner Connection Recorded
                </p>
                <div className="mt-3 px-3 py-1 bg-white border border-emerald-300 rounded-xl shadow-2xs font-mono font-bold text-sm text-emerald-900">
                  Ref: {completedRef.ref}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2 text-xs text-gray-700">
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Subject:</span>
                  <span className="font-bold text-gray-900">{completedRef.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Contact:</span>
                  <span className="font-semibold text-gray-900">{completedRef.name} ({completedRef.phone})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">City & Slot:</span>
                  <span className="font-semibold text-gray-900">{completedRef.city} • {completedRef.time}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Status:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    {completedRef.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCompletedRef(null)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
                >
                  Create Another Enquiry
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={copySummary}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>
                  <button
                    onClick={closeModal}
                    className="px-5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800"
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
