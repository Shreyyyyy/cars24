'use client';

import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  Phone,
  Copy,
  Check,
  Send,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { copyToClipboard } from '@/lib/formatters';
import { logDemoAction } from '@/lib/demo-mode';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export const ShareWhatsAppModal: React.FC = () => {
  const { activeModal, closeModal, testRides, comparisonCarIds, showToast } = useDemoContext();

  const isOpen = activeModal === 'share_whatsapp';

  const [contentType, setContentType] = useState<'vehicle' | 'test_ride' | 'comparison' | 'showroom' | 'summary'>('vehicle');
  const [phoneNumber, setPhoneNumber] = useState('9820123456');
  const [isSimulatedSent, setIsSimulatedSent] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generatePreview = () => {
    switch (contentType) {
      case 'vehicle':
        return `🚗 *Maruti Suzuki All-New Swift (2024)*
Price: ₹6.49 - ₹9.64 Lakh
Fuel & Mileage: Up to 25.75 kmpl (Petrol / S-CNG)
Safety: 6 Airbags standard across all trims, ESP & Hill Hold
Features: 9" SmartPlay Pro+, Wireless CarPlay, Cruise Control

Explore more at your nearest Maruti Suzuki showroom!
_(Simulated Maruti Suzuki AI Showroom Assistant Demo)_`;

      case 'test_ride':
        const latestTR = testRides[0];
        return `🚗 *Maruti Suzuki Test Ride Confirmation*
Ref: ${latestTR ? latestTR.bookingRef : 'MSIL-TR-DEMO99'}
Vehicle: ${latestTR ? latestTR.vehicleName : 'Brezza ZXi AT'}
Showroom: ${latestTR ? latestTR.showroomName : 'Maruti Suzuki ARENA – SG Highway, Ahmedabad'}
Slot: Tomorrow at 11:00 AM

_(Simulated Demo Summary - No real appointment)_`;

      case 'comparison':
        return `⚖️ *Maruti Suzuki Comparison Matrix*
Models: Swift vs Baleno vs Brezza
• Swift: ₹6.49L+ | 25.75 kmpl | 6 Airbags Standard
• Baleno: ₹6.66L+ | 22.94 kmpl | 360 Camera & HUD
• Brezza: ₹8.34L+ | 19.89 kmpl | Electric Sunroof SUV

Compare full details on the Maruti Suzuki AI Assistant!`;

      case 'showroom':
        return `📍 *Maruti Suzuki Showroom & Service Hub*
Name: Maruti Suzuki ARENA – SG Highway
Location: Near ISKCON Cross Roads, Ahmedabad
Timings: 09:00 AM - 08:30 PM
Facilities: Demo Fleet, Test Drive Track, True Value Lounge
Phone: +91 79-2692-DEMO (Fictional)`;

      case 'summary':
      default:
        return `💬 *Your Maruti Suzuki Showroom Assistant Consultation*
Session ID: SESS-MSIL-7824
Identified Interest: Compact SUV with Automatic Transmission
Shortlisted Models: Brezza ZXi AT & Grand Vitara Strong Hybrid
Budget Range: ₹8 - 14 Lakh
Next Step: Demo Test Ride Scheduled`;
    }
  };

  const previewText = generatePreview();

  const handleSimulateSend = () => {
    setIsSimulatedSent(true);
    logDemoAction('WHATSAPP_SHARE', `Simulated WhatsApp Share: ${contentType}`, { phone: phoneNumber });
    showToast({
      type: 'success',
      title: 'Simulated WhatsApp Share',
      message: 'Demo only – WhatsApp message not sent to external network.'
    });
  };

  const handleCopy = () => {
    copyToClipboard(previewText).then(() => {
      setCopied(true);
      showToast({
        type: 'info',
        title: 'Copied to Clipboard',
        message: 'Message template copied.'
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
            <div className="p-2.5 rounded-xl bg-green-100/80 text-green-600">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Share on WhatsApp</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  Simulation
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Generate and preview formatted automotive updates
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
            customMessage="DEMO ONLY: Does not trigger WhatsApp API or open external apps. Safe simulation."
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!isSimulatedSent ? (
            <>
              {/* Content Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Select Content to Share
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'vehicle', label: 'Vehicle Details' },
                    { id: 'comparison', label: 'Car Comparison' },
                    { id: 'test_ride', label: 'Test Ride Summary' },
                    { id: 'showroom', label: 'Showroom Info' },
                    { id: 'summary', label: 'Chat Summary' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setContentType(tab.id as any)}
                      className={`p-2 rounded-xl border text-center font-medium transition-all ${
                        contentType === tab.id
                          ? 'border-green-600 bg-green-50 text-green-800 font-bold shadow-2xs'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Recipient Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full text-xs rounded-xl border border-gray-300 pl-8 p-2.5 bg-white text-gray-900 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Message Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Simulated Message Preview
                  </label>
                  <span className="text-[10px] text-gray-400">WhatsApp Format</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-950/5 border border-emerald-900/10 font-sans text-xs text-gray-800 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                  {previewText}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateSend}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold shadow-md shadow-green-600/20 hover:bg-green-700 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Simulate Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Sent State */
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center justify-center text-center p-4 bg-green-50 rounded-2xl border border-green-200">
                <div className="p-3 rounded-full bg-green-600 text-white mb-2 shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-green-950">
                  Simulated WhatsApp Send Complete
                </h3>
                <p className="text-xs text-green-800 mt-0.5 font-medium">
                  Demo only – WhatsApp message not sent
                </p>
                <div className="mt-2 text-[11px] text-gray-600">
                  Target: +91 {phoneNumber} (Mock Dispatch)
                </div>
              </div>

              {/* Preview with copy */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                {previewText}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsSimulatedSent(false)}
                  className="text-xs font-semibold text-green-700 hover:text-green-800 underline"
                >
                  Edit Message
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>
                  <button
                    type="button"
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
