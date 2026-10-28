'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Shield,
  Sparkles,
  RefreshCw,
  FileCheck,
  FileText,
  Receipt,
  Award,
  FolderCheck,
  ChevronRight,
  HelpCircle,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { INSURANCE_CATEGORIES, InsuranceLegalCategory } from '@/data/insurance';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

interface InsuranceLegalViewProps {
  isModal?: boolean;
}

export const InsuranceLegalView: React.FC<InsuranceLegalViewProps> = ({ isModal = false }) => {
  const { activeModal, closeModal, openModal } = useDemoContext();

  const [selectedCategory, setSelectedCategory] = useState<InsuranceLegalCategory>(INSURANCE_CATEGORIES[1]); // Comprehensive default

  if (isModal && activeModal !== 'insurance') return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield': return <Shield className="w-5 h-5 text-blue-600" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-amber-500" />;
      case 'RefreshCw': return <RefreshCw className="w-5 h-5 text-indigo-600" />;
      case 'FileCheck': return <FileCheck className="w-5 h-5 text-purple-600" />;
      case 'FileText': return <FileText className="w-5 h-5 text-teal-600" />;
      case 'Receipt': return <Receipt className="w-5 h-5 text-rose-600" />;
      case 'Award': return <Award className="w-5 h-5 text-orange-600" />;
      case 'FolderCheck':
      default: return <FolderCheck className="w-5 h-5 text-cyan-600" />;
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Category Pills/Cards Carousel */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Select Guidance Category
          </h3>
          <span className="text-[11px] text-gray-400">9 Legal & Policy Modules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {INSURANCE_CATEGORIES.map(cat => {
            const isSelected = selectedCategory.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`p-3.5 rounded-2xl border text-left transition-all shadow-2xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-white shadow-2xs border border-gray-100">
                      {getIcon(cat.iconName)}
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {cat.badge}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-gray-900 leading-snug">
                    {cat.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {cat.tagline}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-emerald-700">
                  <span>Explore Guidelines</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Category Deep Dive */}
      <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-100/70 text-emerald-700">
              {getIcon(selectedCategory.iconName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-gray-900">
                  {selectedCategory.title}
                </h3>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {selectedCategory.badge}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedCategory.tagline}
              </p>
            </div>
          </div>

          <button
            onClick={() => openModal('vendor_referral', { title: selectedCategory.title })}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex-shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Connect to Vendor (Demo)</span>
          </button>
        </div>

        {/* Educational Overview */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <h4 className="font-bold text-gray-900 mb-1.5 text-xs uppercase tracking-wider text-gray-500">
            Educational Overview
          </h4>
          {selectedCategory.overview}
        </div>

        {/* Key Benefits */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
            Key Coverage & Provisions
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {selectedCategory.keyBenefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-gray-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-800 font-medium leading-relaxed">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
            Frequently Asked Questions
          </h4>
          <div className="space-y-2 text-xs">
            {selectedCategory.faqs.map((faq, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                <div className="font-bold text-gray-900 flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>{faq.q}</span>
                </div>
                <p className="text-gray-600 pl-5 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Simulated Vendors */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <div>
            <span className="font-semibold text-gray-700">Participating Simulated Partners: </span>
            {selectedCategory.partnerVendorsDemo.join(' • ')}
          </div>
          <button
            onClick={() => openModal('callback', { reason: 'Insurance assistance' })}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline"
          >
            Request Insurance Consultation Callback
          </button>
        </div>
      </div>

      <div className="pt-1">
        <DemoActionBanner
          customMessage="DISCLAIMER: The information presented here represents general automotive educational guidance and is not legal or financial advice. Quotes and terms are simulated for demonstration purposes only."
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
            <div className="p-2.5 rounded-xl bg-emerald-100/80 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Insurance & Legal Assistance</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Educational Guide
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Understand policies, Zero-Dep covers, RTO compliance, and claim workflows
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
