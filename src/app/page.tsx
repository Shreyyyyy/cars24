'use client';

import React from 'react';
import { MarketingChatbot } from '@/components/b2b/MarketingChatbot';

export default function MarketingIntelligenceDashboardPage() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-hidden bg-gray-50">
      <MarketingChatbot />
    </div>
  );
}
