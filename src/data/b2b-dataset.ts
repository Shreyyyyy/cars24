import { ShowroomRecord, VehicleSalesRecord, MarketingCampaignRecord, EnterpriseKpis } from '@/types/b2b';

// Clean dataset initialized to empty arrays - no mock data
export const DEFAULT_SHOWROOMS: ShowroomRecord[] = [];
export const DEFAULT_VEHICLE_SALES: VehicleSalesRecord[] = [];
export const DEFAULT_CAMPAIGNS: MarketingCampaignRecord[] = [];

export const NETWORK_KPI_SUMMARY: EnterpriseKpis = {
  totalDeliveriesMTD: 0,
  targetDeliveriesMTD: 0,
  targetAchievementPct: 0,
  grossTurnoverCr: 0,
  conversionRateOverall: 0,
  totalTestDrives: 0,
  totalLeads: 0,
  activeDealersCount: 0,
  activeModelsCount: 0,
  topPerformingRegion: 'N/A',
  worstPerformingRegion: 'N/A',
  topPerformingState: 'N/A',
  topPerformingShowroom: 'N/A',
  topSellingModel: 'N/A',
  highestDiscountModel: 'N/A'
};
