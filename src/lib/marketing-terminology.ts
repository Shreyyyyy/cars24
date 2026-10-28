/**
 * Automotive Marketing & Sales Terminology & KPI Engine
 * Centralizes industry jargon, standard formulas, and commercial benchmarks.
 */

export interface MarketingKPI {
  code: string;
  name: string;
  category: 'acquisition' | 'conversion' | 'channel' | 'financial' | 'operations';
  formula: string;
  benchmark: string;
  description: string;
  businessOwner: string;
}

export const AUTOMOTIVE_MARKETING_KPIS: Record<string, MarketingKPI> = {
  CAC: {
    code: 'CAC',
    name: 'Customer Acquisition Cost',
    category: 'acquisition',
    formula: 'Total Marketing & Channel Spend / Total Delivered Vehicles',
    benchmark: '₹8,000 - ₹16,000 per delivery (ARENA) | ₹18,000 - ₹32,000 (NEXA)',
    description: 'Fully loaded commercial expenditure required to convert an inquiry into a final physical vehicle handover.',
    businessOwner: 'VP Marketing & Media Planning'
  },
  CPL: {
    code: 'CPL',
    name: 'Cost Per Lead',
    category: 'acquisition',
    formula: 'Total Campaign Ad Spend / Total Qualified Leads Ingested',
    benchmark: '₹180 - ₹450 (Digital Search/Social) | ₹800 - ₹1,800 (Auto Expos/Events)',
    description: 'Direct paid media spend incurred per unique customer inquiry captured into LMS.',
    businessOwner: 'Performance Marketing Lead'
  },
  ROAS: {
    code: 'ROAS',
    name: 'Return On Ad Spend',
    category: 'financial',
    formula: 'Total Attributable Vehicle Gross Revenue / Total Paid Campaign Spend',
    benchmark: '22x - 38x for flagship models | 15x - 25x for entry hatchbacks',
    description: 'Multiplier of gross showroom revenue generated for every rupee deployed in digital & ATL advertising.',
    businessOwner: 'Chief Marketing Officer'
  },
  CVR_TD: {
    code: 'CVR_TD',
    name: 'Lead-to-Test-Drive Conversion Rate',
    category: 'conversion',
    formula: '(Completed Test Drives / Total Valid Leads) * 100',
    benchmark: '> 35% in Top-Quartile Dealerships (< 20% indicates follow-up lag)',
    description: 'Percentage of prospects who experience a physical or doorstep vehicle test drive.',
    businessOwner: 'National Sales Operations'
  },
  CVR_BOOKING: {
    code: 'CVR_BOOKING',
    name: 'Test-Drive-to-Booking Rate',
    category: 'conversion',
    formula: '(Total Bookings / Completed Test Drives) * 100',
    benchmark: '40% - 55% across ARENA & NEXA network',
    description: 'Effectiveness of showroom sales consultants in closing commercial booking advances post test drive.',
    businessOwner: 'Dealer Principal & Zonal Heads'
  },
  DELIVERY_RATE: {
    code: 'DELIVERY_RATE',
    name: 'Overall Lead-to-Delivery Conversion',
    category: 'conversion',
    formula: '(Total Delivered Units / Total Ingested Leads) * 100',
    benchmark: '18% - 22% National Maruti Suzuki Benchmark',
    description: 'End-to-end funnel yield from top-of-funnel inquiry to registered customer handover.',
    businessOwner: 'Executive Director (Sales)'
  },
  SLA_RESPONSE: {
    code: 'SLA_RESPONSE',
    name: 'First Response Lead SLA',
    category: 'operations',
    formula: 'Average elapsed minutes between lead creation and first dealer CRM touchpoint',
    benchmark: '< 30 minutes for digital leads (> 60m yields 42% drop in conversion)',
    description: 'Speed-to-lead compliance metric tracking dealership responsiveness to prospective buyers.',
    businessOwner: 'Customer Relations & CRM Lead'
  },
  CNG_PENETRATION: {
    code: 'CNG_PENETRATION',
    name: 'S-CNG Powertrain Mix',
    category: 'channel',
    formula: '(S-CNG Inquiries & Sales / Total Fuel Mix) * 100',
    benchmark: '30% - 38% overall volume share in Tier 1/2 urban clusters',
    description: 'Share of alternate-fuel clean mobility powertrain within Maruti Suzuki retail volume.',
    businessOwner: 'Product Strategy & Regional Supply'
  }
};

/**
 * Returns formatted guidance strings for system prompts
 */
export function getMarketingGlossaryPromptContext(): string {
  const list = Object.values(AUTOMOTIVE_MARKETING_KPIS).map(kpi => {
    return `- **${kpi.code} (${kpi.name})**: ${kpi.description} Formula: \`${kpi.formula}\`. Benchmark: ${kpi.benchmark}`;
  });
  return list.join('\n');
}
