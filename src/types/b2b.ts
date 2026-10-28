export type ChannelType = 'ARENA' | 'NEXA';
export type VehicleSegment = 'SUV' | 'Hatchback' | 'Sedan' | 'MPV' | 'EV';
export type FuelType = 'Petrol' | 'CNG' | 'Strong Hybrid' | 'Electric';

export interface ShowroomRecord {
  id: string;
  showroomName: string;
  channel: ChannelType;
  city: string;
  state: string;
  region: 'North' | 'West' | 'South' | 'East' | 'Central';
  monthlySalesUnits: number;
  monthlyRevenueCr: number;
  salesTargetUnits: number;
  targetAchievementPct: number;
  totalLeads: number;
  testDrivesConducted: number;
  conversionRatePct: number;
  topSellingModel: string;
  managerName: string;
  contactNumber: string;
}

export interface VehicleSalesRecord {
  id: string;
  modelName: string;
  segment: VehicleSegment;
  channel: ChannelType;
  fuelType: FuelType;
  unitsSold: number;
  revenueCr: number;
  averageExShowroomLakh: number;
  targetUnits: number;
  achievementPct: number;
  growthMoMPct: number;
  stockInHandUnits: number;
  avgDiscountLakh: number;
  topState: string;
}

export interface MarketingCampaignRecord {
  id: string;
  campaignName: string;
  targetSegment: VehicleSegment;
  targetModel: string;
  channel: string;
  budgetLakh: number;
  spendLakh: number;
  leadsGenerated: number;
  salesAttributed: number;
  costPerLead: number;
  roiMultiplier: number;
  activeStatus: 'Active' | 'Completed' | 'Planned';
}

export interface QueryExecutionResult {
  query: string;
  executionTimeMs: number;
  summary: string;
  sqlQuery: string;
  columns: string[];
  rows: Record<string, any>[];
  chartType: 'bar' | 'pie' | 'line' | 'table';
  chartXKey?: string;
  chartYKey?: string;
  chartTitle?: string;
  keyInsights: string[];
  datasetSource: string;
}

export interface DatabaseConnectorConfig {
  id: string;
  name: string;
  type: 'sqlite' | 'postgres' | 'snowflake' | 'bigquery' | 'databricks' | 'oracle' | 'mysql';
  status: 'connected' | 'available' | 'coming_soon';
  host?: string;
  database?: string;
  lastSync?: string;
  tablesCount: number;
  recordsCount: number;
}

export interface EnterpriseKpis {
  totalDeliveriesMTD: number;
  targetDeliveriesMTD: number;
  targetAchievementPct: number;
  grossTurnoverCr: number;
  conversionRateOverall: number;
  totalTestDrives: number;
  totalLeads: number;
  activeDealersCount: number;
  activeModelsCount: number;
  topPerformingRegion: string;
  worstPerformingRegion: string;
  topPerformingState: string;
  topPerformingShowroom: string;
  topSellingModel: string;
  highestDiscountModel: string;
}

