export type VehicleCategory = 'Hatchback' | 'Sedan' | 'SUV' | 'MPV' | 'EV';
export type FuelType = 'Petrol' | 'CNG' | 'Strong Hybrid' | 'Electric';
export type TransmissionType = 'Manual' | 'Automatic (AGS/AMT)' | 'Automatic (AT/CVT/e-CVT)' | 'Electric Drive';
export type ChannelType = 'ARENA' | 'NEXA';

export interface VehicleVariant {
  name: string;
  priceLakh: number;
  fuel: FuelType;
  transmission: TransmissionType;
  mileage: string;
  featuresHighlight: string[];
}

export interface Vehicle {
  id: string;
  name: string;
  tagline: string;
  category: VehicleCategory;
  channel: ChannelType;
  startingPriceLakh: number;
  topPriceLakh: number;
  fuelTypes: FuelType[];
  transmissions: TransmissionType[];
  engineCapacity: string;
  maxPower: string;
  maxTorque: string;
  claimedMileage: string;
  seatingCapacity: number;
  bootSpaceLitres: number;
  safetyRating: string;
  airbags: number;
  image: string;
  accentColor: string;
  keyFeatures: string[];
  infotainment: string;
  comfortFeatures: string[];
  safetyFeatures: string[];
  variants: VehicleVariant[];
  faqs: { question: string; answer: string }[];
  isPopular?: boolean;
  isNewLaunch?: boolean;
}

export interface Showroom {
  id: string;
  name: string;
  channel: ChannelType;
  city: string;
  state: string;
  pinCode: string;
  address: string;
  phone: string;
  timing: string;
  rating: number;
  distanceKm?: number;
  hasTestDriveAvailable: boolean;
  facilities: string[];
}

export interface ServiceCentre {
  id: string;
  name: string;
  channel: ChannelType;
  city: string;
  state: string;
  address: string;
  phone: string;
  timing: string;
  rating: number;
  specializations: string[];
  pickupAvailable: boolean;
  emergencySupport: boolean;
}

export type SupportedLanguage = 'en' | 'hi' | 'gu' | 'mr';

export interface CustomerSession {
  sessionId: string;
  language: SupportedLanguage;
  name?: string;
  locationCity: string;
  locationState: string;
  budgetMinLakh: number;
  budgetMaxLakh: number;
  preferredCategory?: VehicleCategory;
  preferredModel?: string;
  preferredFuel?: FuelType;
  purchaseTimeline: 'Immediate (1-2 weeks)' | 'Next Month' | 'Within 3 Months' | 'Exploring';
  detectedIntent: 'Exploring Cars' | 'Budget Query' | 'Test Ride Intent' | 'Service Inquiry' | 'Comparison' | 'Insurance / Finance' | 'General';
  estimatedSentiment: 'Highly Positive' | 'Interested' | 'Neutral' | 'Hesitant / Price Conscious';
  testRideInterest: boolean;
  callbackInterest: boolean;
  conversationStage: 'Discovery' | 'Vehicle Shortlisting' | 'Evaluation' | 'Action Initiation' | 'Post-Booking';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedPrompts?: string[];
  vehicleRecommendations?: string[]; // IDs of vehicles
  actions?: {
    label: string;
    actionType: 'book_test_ride' | 'find_showroom' | 'compare_cars' | 'service_centre' | 'insurance' | 'callback' | 'share_whatsapp' | 'share_email';
    payload?: any;
  }[];
}

export interface TestRideBooking {
  id: string;
  bookingRef: string;
  customerName: string;
  phone: string;
  email?: string;
  vehicleId: string;
  vehicleName: string;
  variant: string;
  state: string;
  city: string;
  showroomName: string;
  preferredDate: string;
  preferredTime: string;
  preferredLanguage: string;
  status: 'Simulated – Not a Real Booking';
  createdAt: string;
}

export interface CallbackRequest {
  id: string;
  callbackRef: string;
  customerName: string;
  phone: string;
  email?: string;
  state: string;
  city: string;
  reason: string;
  preferredDate: string;
  preferredTime: string;
  preferredLanguage: string;
  status: 'Demo Request Created – No Actual Call Scheduled';
  createdAt: string;
}

export interface VendorReferral {
  id: string;
  referralRef: string;
  customerName: string;
  phone: string;
  city: string;
  category: string;
  preferredTime: string;
  status: 'Simulated Referral – Demo Only';
  createdAt: string;
}

export interface DemoActivityItem {
  id: string;
  timestamp: string;
  actionType: 'TEST_RIDE' | 'CALLBACK' | 'WHATSAPP_SHARE' | 'EMAIL_SHARE' | 'VENDOR_REFERRAL' | 'CAR_COMPARE' | 'CHAT_INTERACTION' | 'RESET';
  title: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface DemoCustomerProfile {
  id: string;
  name: string;
  phoneMasked: string;
  city: string;
  state: string;
  language: string;
  preferredModel: string;
  budget: string;
  intent: string;
  sentiment: string;
  testRideInterest: 'Yes' | 'No' | 'Completed';
  journeyStage: string;
  lastActive: string;
  notes: string;
}
