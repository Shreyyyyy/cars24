'use client';

import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  Copy,
  CheckCircle2,
  Sparkles,
  FileText
} from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { copyToClipboard } from '@/lib/formatters';
import { logDemoAction } from '@/lib/demo-mode';
import { DemoActionBanner } from '@/components/layout/DemoActionBanner';

export const ShareEmailModal: React.FC = () => {
  const { activeModal, closeModal, testRides, showToast } = useDemoContext();

  const isOpen = activeModal === 'share_email';

  const [recipient, setRecipient] = useState('customer@example.com');
  const [subject, setSubject] = useState('Your Maruti Suzuki AI Showroom Consultation & Quotation Summary');
  const [contentCategory, setContentCategory] = useState<'quote' | 'brochure' | 'test_ride' | 'specs'>('quote');
  const [bodyText, setBodyText] = useState(
`Dear Customer,

Thank you for exploring Maruti Suzuki through our AI Showroom Assistant!

Here is your requested showroom consultation summary:
- Preferred Segment: Compact SUV / Premium Hatchback
- Recommended Models: All-New Swift (from ₹6.49L), Brezza (from ₹8.34L), Grand Vitara Hybrid (from ₹10.99L)
- Financing Options: Up to 90% on-road financing available via Maruti Suzuki Smart Finance
- Next Recommended Step: Visit your nearest ARENA or NEXA showroom for a hands-on drive.

Warm regards,
Maruti Suzuki AI Showroom Team`
  );

  const [isSimulatedSent, setIsSimulatedSent] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleTemplateChange = (type: 'quote' | 'brochure' | 'test_ride' | 'specs') => {
    setContentCategory(type);
    if (type === 'test_ride') {
      const tr = testRides[0];
      setSubject('Confirmed: Simulated Maruti Suzuki Test Ride Appointment Details');
      setBodyText(
`Dear Customer,

Here are the details for your simulated Maruti Suzuki test ride:

- Booking Reference: ${tr ? tr.bookingRef : 'MSIL-TR-DEMO88'}
- Vehicle: ${tr ? tr.vehicleName : 'All-New Swift ZXi+'}
- Dealership: ${tr ? tr.showroomName : 'Maruti Suzuki ARENA – Connaught Place, New Delhi'}
- Date & Time: ${tr ? tr.preferredDate : 'Tomorrow'} at ${tr ? tr.preferredTime : '11:00 AM'}

Note: This is a frontend demo simulation. No physical appointment has been dispatched.

Best regards,
Maruti Suzuki Digital Showroom`
      );
    } else if (type === 'brochure') {
      setSubject('Digital Brochure & Technical Specifications – Maruti Suzuki Fleet');
      setBodyText(
`Dear Car Enthusiast,

Please find enclosed the digital specification sheets and feature catalogue for the 2024-2025 Maruti Suzuki line-up:

1. All-New Swift (Z-Series 1.2L Dual Jet, 25.75 kmpl)
2. Brezza (Electric Sunroof, 360 Camera, 6 Airbags)
3. Grand Vitara (Intelligent Electric Hybrid, 27.97 kmpl, ALLGRIP AWD)
4. All-New Dzire (5-Star Global NCAP Rating)

Download official brochures at any time or chat with our AI Showroom Assistant.

Warm regards,
Maruti Suzuki India`
      );
    } else {
      setSubject('Your Maruti Suzuki AI Showroom Consultation & Quotation Summary');
      setBodyText(
`Dear Customer,

Thank you for exploring Maruti Suzuki through our AI Showroom Assistant!

Here is your requested showroom consultation summary:
- Preferred Segment: Compact SUV / Premium Hatchback
- Recommended Models: All-New Swift (from ₹6.49L), Brezza (from ₹8.34L), Grand Vitara Hybrid (from ₹10.99L)
- Financing Options: Up to 90% on-road financing available via Maruti Suzuki Smart Finance
- Next Recommended Step: Visit your nearest ARENA or NEXA showroom for a hands-on drive.

Warm regards,
Maruti Suzuki AI Showroom Team`
      );
    }
  };

  const handleSimulateSend = () => {
    setIsSimulatedSent(true);
    logDemoAction('EMAIL_SHARE', `Simulated Email Sent to: ${recipient}`, { subject, category: contentCategory });
    showToast({
      type: 'success',
      title: 'Simulated Email Sent',
      message: 'Demo only – No actual email dispatched via SMTP.'
    });
  };

  const handleCopy = () => {
    const full = `To: ${recipient}\nSubject: ${subject}\n\n${bodyText}`;
    copyToClipboard(full).then(() => {
      setCopied(true);
      showToast({
        type: 'info',
        title: 'Copied to Clipboard',
        message: 'Email content copied.'
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100/80 text-rose-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Share via Email</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                  Simulation
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Compose and simulate sending branded automotive documents
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
            customMessage="SIMULATION ONLY: No actual email server or SMTP client will be contacted."
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!isSimulatedSent ? (
            <>
              {/* Template Buttons */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Select Email Content Template
                </label>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleTemplateChange('quote')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      contentCategory === 'quote' ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Consultation Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTemplateChange('test_ride')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      contentCategory === 'test_ride' ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Test Ride Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTemplateChange('brochure')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      contentCategory === 'brochure' ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Digital Brochure
                  </button>
                </div>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-rose-500"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 bg-white text-gray-900 focus:border-rose-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Message Body (Editable Preview)
                </label>
                <textarea
                  rows={5}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full text-xs rounded-xl border border-gray-300 p-3 bg-white text-gray-900 focus:border-rose-500 font-mono leading-relaxed"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy Email'}</span>
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
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-600/20 hover:bg-rose-700 transition-all"
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
              <div className="flex flex-col items-center justify-center text-center p-4 bg-rose-50 rounded-2xl border border-rose-200">
                <div className="p-3 rounded-full bg-rose-600 text-white mb-2 shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-rose-950">
                  Simulated Email Dispatched!
                </h3>
                <p className="text-xs text-rose-800 mt-0.5 font-medium">
                  DEMO ONLY: No actual email was sent to {recipient}.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto font-mono">
                {`Subject: ${subject}\n\n${bodyText}`}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsSimulatedSent(false)}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-800 underline"
                >
                  Edit Email
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy Email'}</span>
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
