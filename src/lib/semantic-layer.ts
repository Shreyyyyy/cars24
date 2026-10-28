/**
 * Semantic Layer: Approved Business Metrics, Dimension Mappings, and Templates
 */

export interface BusinessMetric {
  key: string;
  name: string;
  category: 'volume' | 'efficiency' | 'revenue' | 'funnel';
  formula: string;
  unit: string;
  description: string;
}

export const APPROVED_METRICS: Record<string, BusinessMetric> = {
  units_sold: {
    key: 'units_sold',
    name: 'Total Units Delivered',
    category: 'volume',
    formula: 'SUM("monthly_sales_units") or COUNT(*)',
    unit: 'Units',
    description: 'Total number of retail vehicle deliveries completed.'
  },
  target_achievement: {
    key: 'target_achievement',
    name: 'Target Quota Achievement',
    category: 'efficiency',
    formula: 'AVG("target_achievement_pct")',
    unit: '%',
    description: 'Percentage of monthly retail quota achieved against target.'
  },
  conversion_rate: {
    key: 'conversion_rate',
    name: 'Lead-to-Delivery Conversion Rate',
    category: 'funnel',
    formula: '(Delivered Leads / Total Leads) * 100',
    unit: '%',
    description: 'Proportion of verified buyer inquiries that successfully conclude in a vehicle delivery.'
  },
  test_drive_ratio: {
    key: 'test_drive_ratio',
    name: 'Inquiry-to-Test Drive Rate',
    category: 'funnel',
    formula: '(Test Drives / Total Leads) * 100',
    unit: '%',
    description: 'Proportion of prospects who progress from lead inquiry to an active test drive.'
  },
  average_discount: {
    key: 'average_discount',
    name: 'Average Discretionary Discount',
    category: 'revenue',
    formula: 'AVG("discount_amount_lakh")',
    unit: '₹ Lakh',
    description: 'Average dealer-level tactical discount per delivered unit.'
  }
};

/**
 * Maps natural language terms to actual dataset columns
 */
export function resolveSemanticDimension(
  term: string,
  availableColumns: string[]
): string | null {
  const t = term.toLowerCase();
  const lowerCols = availableColumns.map(c => ({ original: c, lower: c.toLowerCase() }));

  // Showroom / Dealer
  if (['showroom', 'dealer', 'dealership', 'outlet', 'branch'].includes(t)) {
    const match = lowerCols.find(c =>
      ['assigned_dealer', 'showroom_name', 'dealer_name', 'showroom', 'dealership', 'branch'].includes(c.lower)
    );
    if (match) return match.original;
  }

  // Model / Vehicle
  if (['model', 'car', 'vehicle', 'product'].includes(t)) {
    const match = lowerCols.find(c =>
      ['model_of_interest', 'final_model', 'model_name', 'car_model', 'vehicle_model', 'model'].includes(c.lower)
    );
    if (match) return match.original;
  }

  // Fuel Type
  if (['fuel', 'powertrain', 'fuel_type'].includes(t)) {
    const match = lowerCols.find(c =>
      ['preferred_fuel_type', 'final_fuel_type', 'fuel_type', 'fuel'].includes(c.lower)
    );
    if (match) return match.original;
  }

  // State / Region
  if (['state', 'region', 'zone', 'territory'].includes(t)) {
    const match = lowerCols.find(c =>
      ['state', 'region', 'zone', 'territory'].includes(c.lower)
    );
    if (match) return match.original;
  }

  // City / Location
  if (['city', 'location', 'hub'].includes(t)) {
    const match = lowerCols.find(c =>
      ['city', 'location', 'hub'].includes(c.lower)
    );
    if (match) return match.original;
  }

  // Channel
  if (['channel', 'network', 'channel_type', 'source'].includes(t)) {
    const match = lowerCols.find(c =>
      ['channel', 'lead_source_category', 'sales_channel', 'lead_source'].includes(c.lower)
    );
    if (match) return match.original;
  }

  return null;
}
