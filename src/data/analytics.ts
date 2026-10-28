export interface KPIMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  subtext: string;
}

export const KPI_METRICS: KPIMetric[] = [
  {
    id: 'kpi-conversations',
    label: 'Total Demo Conversations',
    value: '14,820',
    change: '+18.4%',
    isPositive: true,
    subtext: 'vs previous 30 days'
  },
  {
    id: 'kpi-enquiries',
    label: 'Vehicle Enquiries',
    value: '9,410',
    change: '+12.7%',
    isPositive: true,
    subtext: '63.5% conversion to catalog review'
  },
  {
    id: 'kpi-test-rides',
    label: 'Test Ride Interest',
    value: '3,842',
    change: '+24.1%',
    isPositive: true,
    subtext: 'Simulated demo requests generated'
  },
  {
    id: 'kpi-callbacks',
    label: 'Callback Requests',
    value: '2,190',
    change: '+8.3%',
    isPositive: true,
    subtext: 'Across 9 major Indian cities'
  },
  {
    id: 'kpi-purchase-intent',
    label: 'High Purchase Intent',
    value: '68.2%',
    change: '+5.1%',
    isPositive: true,
    subtext: 'Users with defined budget & model'
  },
  {
    id: 'kpi-engagement',
    label: 'Average Engagement',
    value: '4m 38s',
    change: '+32s',
    isPositive: true,
    subtext: '7.8 messages / session'
  }
];

export const SENTIMENT_DISTRIBUTION = [
  { name: 'Highly Positive', value: 46, color: '#16A34A' },
  { name: 'Interested', value: 34, color: '#2563EB' },
  { name: 'Neutral', value: 14, color: '#64748B' },
  { name: 'Hesitant / Price Conscious', value: 6, color: '#DC2626' }
];

export const INTENT_DISTRIBUTION = [
  { intent: 'Exploring Cars', count: 4820, percentage: '32.5%' },
  { intent: 'Test Ride Intent', count: 3840, percentage: '25.9%' },
  { intent: 'Budget & Pricing', count: 2450, percentage: '16.5%' },
  { intent: 'Car Comparison', count: 1890, percentage: '12.8%' },
  { intent: 'Service & Maintenance', count: 1120, percentage: '7.6%' },
  { intent: 'Insurance & RTO', count: 700, percentage: '4.7%' }
];

export const CATEGORY_DEMAND = [
  { category: 'SUV (Brezza, Grand Vitara, Fronx, Jimny)', enquiries: 6420, share: 43.3 },
  { category: 'Hatchback (Swift, Baleno, WagonR, Alto, Celerio)', enquiries: 4180, share: 28.2 },
  { category: 'Sedan (All-New Dzire)', enquiries: 2150, share: 14.5 },
  { category: 'MPV (Ertiga, XL6, Invicto)', enquiries: 1410, share: 9.5 },
  { category: 'EV (e Vitara, Victoris Concept)', enquiries: 660, share: 4.5 }
];

export const POPULAR_SPECIFICATIONS = [
  { spec: 'Electric Sunroof', percentage: 76, tag: 'Exterior & Comfort' },
  { spec: '6 Airbags / 5-Star Safety', percentage: 72, tag: 'Safety' },
  { spec: 'Automatic (AGS / AT / e-CVT)', percentage: 65, tag: 'Transmission' },
  { spec: '360-Degree Camera', percentage: 58, tag: 'Tech' },
  { spec: 'Factory S-CNG', percentage: 52, tag: 'Fuel Economy' },
  { spec: 'Strong Hybrid Pure EV Mode', percentage: 44, tag: 'Green Tech' },
  { spec: 'Head-Up Display (HUD)', percentage: 39, tag: 'Tech' }
];

export const STATE_DEMAND = [
  { state: 'Maharashtra', count: 3840, topModel: 'Grand Vitara / Baleno' },
  { state: 'Delhi NCR', count: 3410, topModel: 'Brezza / Swift' },
  { state: 'Gujarat', count: 2790, topModel: 'Swift / WagonR / Dzire' },
  { state: 'Uttar Pradesh', count: 2150, topModel: 'Dzire / Ertiga' },
  { state: 'Haryana', count: 1480, topModel: 'Brezza / Fronx' },
  { state: 'Rajasthan', count: 1150, topModel: 'Swift / Jimny' }
];

export const LANGUAGE_DISTRIBUTION = [
  { language: 'English', users: 8250, share: 55.7, fill: '#E31837' },
  { language: 'Hindi (Roman)', users: 4410, share: 29.8, fill: '#0F172A' },
  { language: 'Gujarati (Roman)', users: 1240, share: 8.4, fill: '#2563EB' },
  { language: 'Marathi (Roman)', users: 920, share: 6.1, fill: '#D97706' }
];

export const TEST_RIDE_TIMELINE = [
  { day: 'Day 1', requests: 94, confirmed: 82 },
  { day: 'Day 5', requests: 118, confirmed: 104 },
  { day: 'Day 10', requests: 142, confirmed: 128 },
  { day: 'Day 15', requests: 185, confirmed: 164 },
  { day: 'Day 20', requests: 220, confirmed: 198 },
  { day: 'Day 25', requests: 275, confirmed: 245 },
  { day: 'Day 30', requests: 312, confirmed: 284 }
];

export const FUNNEL_METRICS = [
  { step: 'Showroom Chat Started', count: 14820, dropoff: '100%' },
  { step: 'Vehicle Shortlisted', count: 9410, dropoff: '63.5%' },
  { step: 'Specs / Variants Compared', count: 5620, dropoff: '37.9%' },
  { step: 'Test Ride Simulated', count: 3842, dropoff: '25.9%' },
  { step: 'Showroom Visit Scheduled', count: 2190, dropoff: '14.8%' }
];
