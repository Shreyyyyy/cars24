export interface InsuranceLegalCategory {
  id: string;
  title: string;
  iconName: string;
  badge: string;
  tagline: string;
  overview: string;
  keyBenefits: string[];
  faqs: { q: string; a: string }[];
  partnerVendorsDemo: string[];
}

export const INSURANCE_CATEGORIES: InsuranceLegalCategory[] = [
  {
    id: 'third-party',
    title: 'Third-Party Liability Insurance',
    iconName: 'Shield',
    badge: 'Mandatory by Law',
    tagline: 'Legal protection against liabilities to third-party injury, death, or property damage.',
    overview: 'Under the Motor Vehicles Act 1988, having a valid Third-Party Liability insurance policy is legally mandatory for every car on Indian roads. It protects you against financial compensation claims made by third parties in an unforeseen accident.',
    keyBenefits: [
      'Statutory compliance preventing hefty RTO penalties',
      'Unlimited liability coverage for bodily injury or fatal casualties',
      'Property damage liability cover up to ₹7.5 Lakh',
      'Peace of mind against prolonged legal disputes'
    ],
    faqs: [
      { q: 'Is third-party insurance enough to cover damage to my own Maruti Suzuki car?', a: 'No. Third-party insurance solely covers damage or injury caused to other people or vehicles. For damage to your own vehicle, a Comprehensive or Standalone Own-Damage policy is required.' },
      { q: 'What is the standard tenure for new car third-party insurance?', a: 'In India, new private cars must be issued a mandatory 3-year third-party liability cover at the time of registration.' }
    ],
    partnerVendorsDemo: ['Maruti Insurance Broking Private Limited (MIBPL)', 'ICICI Lombard (Simulated Partner)', 'Bajaj Allianz (Simulated Partner)']
  },
  {
    id: 'comprehensive',
    title: 'Comprehensive Car Insurance',
    iconName: 'ShieldCheck',
    badge: 'Most Popular',
    tagline: 'Complete 360° protection for your car, third parties, theft, and natural disasters.',
    overview: 'A Comprehensive Insurance policy combines mandatory third-party liability with Own Damage (OD) cover. It safeguards your investment against accidents, theft, fire, floods, riots, and transit damages across India.',
    keyBenefits: [
      'Cashless claim settlement across 4,000+ Maruti Suzuki authorized workshops',
      'Cover against flood, earthquake, cyclone, and lightning',
      'Protection against car theft, vandalism, and accidental external impacts',
      'Personal Accident cover for owner-driver up to ₹15 Lakh'
    ],
    faqs: [
      { q: 'Can I add add-on covers to a comprehensive plan?', a: 'Yes! You can customize your comprehensive policy with Zero Depreciation, Engine Protect, Return to Invoice, and Roadside Assistance.' }
    ],
    partnerVendorsDemo: ['MIBPL Network', 'HDFC ERGO (Simulated Partner)', 'Tata AIG (Simulated Partner)']
  },
  {
    id: 'zero-dep',
    title: 'Zero-Depreciation Cover (Bumper to Bumper)',
    iconName: 'Sparkles',
    badge: 'Recommended for Cars < 5 Yrs',
    tagline: 'Receive 100% reimbursement on replacement car parts without depreciation deductions.',
    overview: 'Standard insurance deducts depreciation on rubber, plastic, fiberglass, and metal components during claim settlement. A Zero-Depreciation (Nil Dep) add-on ensures you get full claim reimbursement without bearing part depreciation expenses.',
    keyBenefits: [
      'Zero deduction on plastic, nylon, rubber, and glass parts replacement',
      'Up to 100% settlement on metal parts rather than sliding scale deductions',
      'Minimal out-of-pocket expenses during accidental repair bills',
      'Ideal for new car owners seeking maximum peace of mind'
    ],
    faqs: [
      { q: 'Is there a limit on how many Zero-Dep claims I can make in a year?', a: 'Most insurance partners permit 2 zero-dep claims per policy year, while select premium tiers allow unlimited claims.' }
    ],
    partnerVendorsDemo: ['Maruti Suzuki Insurance Broking Hub']
  },
  {
    id: 'renewal',
    title: 'Instant Policy Renewal',
    iconName: 'RefreshCw',
    badge: 'Quick & Seamless',
    tagline: 'Renew existing policies seamlessly with No Claim Bonus (NCB) protection.',
    overview: 'Never let your car policy lapse. Renewing on time preserves your accumulated No Claim Bonus (up to 50% discount on own-damage premium) and guarantees uninterrupted roadside assistance.',
    keyBenefits: [
      'Transfer NCB up to 50% from any previous insurer',
      'No physical inspection required if renewed before expiry date',
      'Instant digital policy issuance and policy document sync'
    ],
    faqs: [
      { q: 'What happens if my policy has already lapsed by 90 days?', a: 'If your policy has lapsed beyond 90 days, any accumulated No Claim Bonus (NCB) resets to zero, and an inspection is typically required.' }
    ],
    partnerVendorsDemo: ['MIBPL Fast Renewal Gateway']
  },
  {
    id: 'claims',
    title: 'Maruti Suzuki Cashless Claim Process',
    iconName: 'FileCheck',
    badge: 'Hassle-Free',
    tagline: 'Streamlined cashless claim approvals with Maruti Genuine Parts assurance.',
    overview: 'Through Maruti Insurance Broking, claims are settled with near-instant surveyor approvals and cashless processing directly through the authorized workshop network without complex paperwork.',
    keyBenefits: [
      'Direct cashless repair settlement at Maruti Suzuki dealer workshops',
      'Guaranteed replacement with 100% Maruti Genuine Parts (MGP)',
      'Digital surveyor inspection and expedited repair tracking'
    ],
    faqs: [
      { q: 'What documents are required to initiate an insurance claim?', a: 'Duly filled claim form, copy of RC, driving licence of the driver at the time of incident, copy of insurance policy, and police FIR in case of major collision or theft.' }
    ],
    partnerVendorsDemo: ['Maruti Insurance Assistance Desk']
  },
  {
    id: 'rto-reg',
    title: 'Registration & RTO Formalities',
    iconName: 'FileText',
    badge: 'Vehicle Compliance',
    tagline: 'High Security Registration Plates (HSRP), RC Smart Cards, and RTO transfers.',
    overview: 'Every new motor vehicle must be registered with the relevant regional transport office (RTO) before taking delivery on public roads. Maruti Suzuki dealerships handle complete registration, HSRP embossing, and fast RC delivery.',
    keyBenefits: [
      'End-to-end dealer facilitation for permanent RC issuance',
      'Mandatory HSRP plate fitting with laser tamper-proof holographic sticker',
      'BH (Bharat) Series registration eligibility assistance for transferable employees'
    ],
    faqs: [
      { q: 'Who is eligible for BH (Bharat) Series registration?', a: 'Employees of Central/State government, defense personnel, and private sector employees whose company has offices in 4 or more states/UTs are eligible for BH Series registration.' }
    ],
    partnerVendorsDemo: ['RTO Compliance Helpdesk (Demo)']
  },
  {
    id: 'road-tax',
    title: 'State Road Tax & One-Time Cess',
    iconName: 'Receipt',
    badge: 'State Regulations',
    tagline: 'Understand state-specific road tax rates, EV exemptions, and hybrid subsidies.',
    overview: 'Motor vehicle road tax varies significantly by state (ranging from 4% to 14% depending on fuel type, ex-showroom slab, and private vs company registration). Several states also offer road tax waivers on Electric and Strong Hybrid vehicles.',
    keyBenefits: [
      'Clear breakdown of state-specific registration cess and green taxes',
      'Guidance on states offering EV / Hybrid road tax waivers (e.g. UP, Delhi, Gujarat policies)',
      'Accurate on-road price calculation support'
    ],
    faqs: [
      { q: 'Do Strong Hybrids get road tax concessions in any state?', a: 'Yes! Certain states like Uttar Pradesh and select Union Territories have introduced full or partial road tax rebates for Strong Hybrid vehicles like Grand Vitara and Invicto.' }
    ],
    partnerVendorsDemo: ['Taxation Advisory Wing (Demo)']
  },
  {
    id: 'extended-warranty',
    title: 'Maruti Suzuki Extended Warranty',
    iconName: 'Award',
    badge: 'Up to 5 Years / 1,00,000 KM',
    tagline: 'Protect against unexpected mechanical and electrical breakdown expenses.',
    overview: 'Extend manufacturer warranty up to 5 years or 1,00,000 kilometres with Maruti Suzuki Royal Platinum and Solitaire Extended Warranty packages. Transferable upon vehicle resale to maintain high vehicle value.',
    keyBenefits: [
      'Coverage for critical engine, transmission, steering, and electrical components',
      'Honoured at all Maruti Suzuki authorized workshops pan-India',
      'Higher resale value for your car with valid transferable warranty'
    ],
    faqs: [
      { q: 'When is the best time to purchase an Extended Warranty?', a: 'It is most cost-effective when purchased alongside the new vehicle delivery or during the primary warranty window.' }
    ],
    partnerVendorsDemo: ['Maruti Genuine Accessories & Warranty Desk']
  },
  {
    id: 'documentation',
    title: 'Vehicle Documentation & FASTag',
    iconName: 'FolderCheck',
    badge: 'Essential Checklist',
    tagline: 'PUC certification, FASTag integration, Owner’s Manual, and DigiLocker sync.',
    overview: 'Ensure all mandatory motoring documents are maintained seamlessly in DigiLocker/mParivahan, and activate bank-linked FASTags for contactless electronic toll collection on national and state highways.',
    keyBenefits: [
      'Factory fitted & dealer-activated RFID FASTag for seamless tolling',
      'Valid PUC (Pollution Under Control) certificate validity setup',
      'DigiLocker synchronization guidance for digital driving licence & RC'
    ],
    faqs: [
      { q: 'Are digital documents in DigiLocker legally accepted by traffic police?', a: 'Yes! Under Rule 139 of Central Motor Vehicles Rules, electronic copies of RC and DL in DigiLocker or mParivahan are legally equivalent to physical original documents.' }
    ],
    partnerVendorsDemo: ['Documentation Support Unit (Demo)']
  }
];
