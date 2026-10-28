export function formatIndianRupee(amount: number, compact = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (compact) {
    if (abs >= 10000000) {
      return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
      return `${sign}₹${(abs / 100000).toFixed(2)} Lakh`;
    }
  } else {
    if (abs >= 10000000) {
      return `${sign}₹${(abs / 10000000).toFixed(2)} Cr (₹${abs.toLocaleString('en-IN')})`;
    }
    if (abs >= 100000) {
      return `${sign}₹${(abs / 100000).toFixed(2)} Lakh (₹${abs.toLocaleString('en-IN')})`;
    }
  }

  return `${sign}₹${abs.toLocaleString('en-IN')}`;
}

export function formatIndianNumber(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}

export function formatCellValue(value: any, columnName = ''): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  const colLower = columnName.toLowerCase();
  const isCurrency =
    colLower.includes('inr') ||
    colLower.includes('price') ||
    colLower.includes('sales_val') ||
    colLower.includes('sales_value') ||
    colLower.includes('revenue') ||
    colLower.includes('amount') ||
    colLower.includes('turnover') ||
    colLower.includes('cost') ||
    colLower.includes('discount_amt') ||
    colLower.includes('margin');

  if (typeof value === 'number') {
    if (isCurrency || (value > 10000 && !colLower.includes('lead') && !colLower.includes('count') && !colLower.includes('id') && !colLower.includes('phone') && !colLower.includes('zip') && !colLower.includes('pincode'))) {
      return formatIndianRupee(value, true);
    }
    if (colLower.includes('pct') || colLower.includes('percent') || colLower.includes('rate') || colLower.includes('ratio')) {
      return `${value.toFixed(1)}%`;
    }
    if (colLower.includes('rating') || colLower.includes('csat') || colLower.includes('score')) {
      return `${value.toFixed(2)} / 5.0`;
    }
    return formatIndianNumber(value);
  }

  return String(value);
}

const BUSINESS_LABELS: Record<string, string> = {
  unit_count: 'Leads', // template SQL counts lead records, not delivered units
  total_units: 'Units',
  lead_count: 'Leads',
  total_leads: 'Leads',
  channel_leads: 'Leads',
  leads_generated: 'Leads',
  fuel_count: 'Leads',
  customer_count: 'Customers',
  record_count: 'Records',
  total_records: 'Records',
  total_count: 'Count',
  lost_count: 'Lost leads',
  total_sales: 'Sales value',
  channel_sales: 'Sales value',
  total_sales_value: 'Sales value',
  sales_value_inr: 'Sales value',
  total_revenue: 'Revenue',
  total_revenue_inr: 'Revenue',
  avg_sales_value: 'Avg. sale value',
  total_bookings: 'Bookings',
  total_deliveries: 'Deliveries',
  avg_satisfaction_rating: 'Avg. satisfaction (of 5)',
  satisfaction_rating_5: 'Satisfaction (of 5)',
  avg_ex_showroom_price: 'Avg. ex-showroom price',
  estimated_ex_showroom_price_inr: 'Ex-showroom price',
  dealer_network: 'Network',
  showroom_name: 'Showroom',
  sales_channel: 'Channel',
  lead_source: 'Lead source',
  fuel_type: 'Fuel',
  body_type: 'Body type',
  lost_reason: 'Loss reason',
  customer_type: 'Customer type',
  campaign_id: 'Campaign',
  test_drive_status: 'Test drive',
  booking_status: 'Booking',
  delivery_status: 'Delivery'
};

/** Converts a database column name into a label a business reader recognises. */
export function businessLabel(column: string): string {
  if (!column) return '';
  const known = BUSINESS_LABELS[column.toLowerCase()];
  if (known) return known;
  const text = column
    .replace(/_(inr|pct|5)$/i, '')
    .replace(/_/g, ' ')
    .replace(/\bavg\b/i, 'avg.')
    .trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatPriceLakh(lakh: number): string {
  return `₹${lakh.toFixed(2)} Lakh`;
}

export function formatPriceRange(min: number, max: number): string {
  return `₹${min.toFixed(2)} - ${max.toFixed(2)} Lakh`;
}

export function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MSIL-TR-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateCallbackRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MSIL-CB-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateVendorRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MIBPL-REF-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => Promise.resolve(legacyCopy(text)));
  }
  // The Clipboard API exists only on https/localhost; plain-http deployments (e.g. opened by IP) use the legacy path
  return Promise.resolve(legacyCopy(text));
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  document.body.appendChild(area);
  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  if (previous && selection) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return ok;
}
