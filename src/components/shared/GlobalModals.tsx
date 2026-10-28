'use client';

import React from 'react';
import { TestRideModal } from '@/components/bookings/TestRideModal';
import { CallbackModal } from '@/components/bookings/CallbackModal';
import { ShareWhatsAppModal } from '@/components/shared/ShareWhatsAppModal';
import { ShareEmailModal } from '@/components/shared/ShareEmailModal';
import { CarComparisonModal } from '@/components/vehicles/CarComparisonModal';
import { VehicleDetailModal } from '@/components/vehicles/VehicleDetailModal';
import { ShowroomExplorer } from '@/components/showrooms/ShowroomExplorer';
import { ServiceCentreExplorer } from '@/components/showrooms/ServiceCentreExplorer';
import { InsuranceLegalView } from '@/components/insurance/InsuranceLegalView';
import { VendorReferralModal } from '@/components/insurance/VendorReferralModal';

export const GlobalModals: React.FC = () => {
  return (
    <>
      <TestRideModal />
      <CallbackModal />
      <ShareWhatsAppModal />
      <ShareEmailModal />
      <CarComparisonModal />
      <VehicleDetailModal />
      <ShowroomExplorer isModal={true} />
      <ServiceCentreExplorer isModal={true} />
      <InsuranceLegalView isModal={true} />
      <VendorReferralModal />
    </>
  );
};
