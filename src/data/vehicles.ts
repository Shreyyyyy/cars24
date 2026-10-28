import { Vehicle } from '@/types';

export const VEHICLES: Vehicle[] = [
  {
    id: 'swift-2024',
    name: 'All-New Swift',
    tagline: 'Driven by Thrill. Engineered for the Bold.',
    category: 'Hatchback',
    channel: 'ARENA',
    startingPriceLakh: 6.49,
    topPriceLakh: 9.64,
    fuelTypes: ['Petrol', 'CNG'],
    transmissions: ['Manual', 'Automatic (AGS/AMT)'],
    engineCapacity: '1197 cc (Z-Series 3-Cyl Dual Jet)',
    maxPower: '81.58 PS @ 5700 rpm',
    maxTorque: '111.7 Nm @ 4300 rpm',
    claimedMileage: '24.8 kmpl (MT) / 25.75 kmpl (AGS)',
    seatingCapacity: 5,
    bootSpaceLitres: 265,
    safetyRating: '3-Star GNCAP (4-Star Equivalent Protocol)',
    airbags: 6,
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#E31837',
    keyFeatures: [
      '6 Airbags as Standard across all variants',
      '9-inch SmartPlay Pro+ Touchscreen with Wireless CarPlay & Android Auto',
      'Wireless Phone Charger & Rear AC Vents',
      'Cruise Control & LED Projector Headlamps with DRLs',
      'Suzuki Connect with 40+ Connected Features'
    ],
    infotainment: '9" HD SmartPlay Pro+ with Arkamys Surround Sound',
    comfortFeatures: ['Automatic Climate Control', 'Push Button Start/Stop', 'Cruise Control', 'Rear AC Vents', 'Type-A & Type-C Fast Chargers'],
    safetyFeatures: ['6 Airbags Standard', 'Electronic Stability Program (ESP)', 'Hill Hold Assist', 'ABS with EBD', 'Reverse Parking Sensors & Camera'],
    isPopular: true,
    isNewLaunch: true,
    variants: [
      { name: 'LXi 1.2 MT', priceLakh: 6.49, fuel: 'Petrol', transmission: 'Manual', mileage: '24.8 kmpl', featuresHighlight: ['6 Airbags', 'ESP', 'Remote Keyless Entry'] },
      { name: 'VXi 1.2 MT', priceLakh: 7.29, fuel: 'Petrol', transmission: 'Manual', mileage: '24.8 kmpl', featuresHighlight: ['7" Touchscreen', 'Steering Controls', 'Power Windows'] },
      { name: 'VXi 1.2 AGS', priceLakh: 7.79, fuel: 'Petrol', transmission: 'Automatic (AGS/AMT)', mileage: '25.75 kmpl', featuresHighlight: ['Auto Gear Shift', '7" Touchscreen', 'Electrically Adjustable ORVMs'] },
      { name: 'ZXi+ 1.2 MT Dual Tone', priceLakh: 8.99, fuel: 'Petrol', transmission: 'Manual', mileage: '24.8 kmpl', featuresHighlight: ['9" SmartPlay Pro+', 'LED Projectors', 'Wireless Charger', 'Cruise Control'] },
      { name: 'ZXi+ 1.2 AGS Dual Tone', priceLakh: 9.64, fuel: 'Petrol', transmission: 'Automatic (AGS/AMT)', mileage: '25.75 kmpl', featuresHighlight: ['Top-spec AGS', 'Dual-Tone Roof', 'Arkamy Sound'] }
    ],
    faqs: [
      { question: 'What is the real-world fuel economy of the new Swift?', answer: 'The new Z-Series 1.2L engine achieves an ARAI certified mileage of up to 25.75 kmpl on AGS and 24.8 kmpl on MT, with real-world city mileage typically ranging between 17-21 kmpl.' },
      { question: 'Does Swift offer 6 airbags in the base model?', answer: 'Yes! The 2024 Swift offers 6 airbags as standard safety equipment across all trim levels (LXi to ZXi+).' }
    ]
  },
  {
    id: 'brezza',
    name: 'Brezza',
    tagline: 'Hot and Techy SUV for the Modern Explorer',
    category: 'SUV',
    channel: 'ARENA',
    startingPriceLakh: 8.34,
    topPriceLakh: 14.14,
    fuelTypes: ['Petrol', 'CNG'],
    transmissions: ['Manual', 'Automatic (AT/CVT/e-CVT)'],
    engineCapacity: '1462 cc (K15C Smart Hybrid)',
    maxPower: '103.06 PS @ 6000 rpm',
    maxTorque: '136.8 Nm @ 4400 rpm',
    claimedMileage: '19.89 kmpl (MT) / 19.80 kmpl (AT) / 25.51 km/kg (CNG)',
    seatingCapacity: 5,
    bootSpaceLitres: 328,
    safetyRating: '4-Star Global NCAP',
    airbags: 6,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#D97706',
    keyFeatures: [
      'Electric Sunroof with Tilt Function',
      'Head-Up Display (HUD) with Turn-by-Turn Guidance',
      '360-View HD Camera with Dynamic Guidelines',
      'Smart Hybrid Dual Battery System',
      'Paddle Shifters on 6-Speed Automatic'
    ],
    infotainment: '9" SmartPlay Pro+ with Surround Sense by Arkamys',
    comfortFeatures: ['Electric Sunroof', 'Cooled Glovebox', 'Rear Fast USB Ports', 'Wireless Phone Charger', 'Rear AC Vents'],
    safetyFeatures: ['6 Airbags (Top trims)', '360 View Camera', 'ESP with Hill Hold', 'ISOFIX Child Seat Mounts', 'All-door Anti-pinch Window'],
    isPopular: true,
    variants: [
      { name: 'LXi 1.5 MT', priceLakh: 8.34, fuel: 'Petrol', transmission: 'Manual', mileage: '19.89 kmpl', featuresHighlight: ['Dual Airbags', 'ESP', 'Rear AC Vents'] },
      { name: 'VXi 1.5 MT', priceLakh: 9.69, fuel: 'Petrol', transmission: 'Manual', mileage: '19.89 kmpl', featuresHighlight: ['7" Touchscreen', 'Auto Climate Control', 'Rear Defogger'] },
      { name: 'ZXi 1.5 MT Sunroof', priceLakh: 11.14, fuel: 'Petrol', transmission: 'Manual', mileage: '19.89 kmpl', featuresHighlight: ['Electric Sunroof', 'Alloy Wheels', 'Push Button Start'] },
      { name: 'ZXi+ 1.5 AT Dual Tone', priceLakh: 14.14, fuel: 'Petrol', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '19.80 kmpl', featuresHighlight: ['360 Camera', 'Head-Up Display', '6 Airbags', 'Paddle Shifters'] }
    ],
    faqs: [
      { question: 'Is the Brezza available with an Electric Sunroof?', answer: 'Yes, Brezza offers an electric sunroof starting from the ZXi trim.' },
      { question: 'Is Brezza available with factory-fitted CNG?', answer: 'Yes, Brezza is the first sub-4m compact SUV in India to feature a factory-fitted twin-cylinder compatible S-CNG technology.' }
    ]
  },
  {
    id: 'grand-vitara',
    name: 'Grand Vitara',
    tagline: 'Rule Every Road with Intelligent Electric Hybrid',
    category: 'SUV',
    channel: 'NEXA',
    startingPriceLakh: 10.99,
    topPriceLakh: 20.09,
    fuelTypes: ['Petrol', 'Strong Hybrid', 'CNG'],
    transmissions: ['Manual', 'Automatic (AT/CVT/e-CVT)'],
    engineCapacity: '1490 cc (Strong Hybrid e-CVT) / 1462 cc (Mild Hybrid)',
    maxPower: '115.56 PS (Combined Strong Hybrid)',
    maxTorque: '141 Nm (Engine) + 141 Nm (Motor)',
    claimedMileage: '27.97 kmpl (Strong Hybrid) / 21.11 kmpl (MT)',
    seatingCapacity: 5,
    bootSpaceLitres: 373,
    safetyRating: '5-Star Expected (Based on Global C-Platform)',
    airbags: 6,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#1E3A8A',
    keyFeatures: [
      'Intelligent Electric Hybrid with Pure EV Mode (Up to 27.97 kmpl)',
      'Panoramic Sunroof (Twin Slide Glass)',
      'ALLGRIP SELECT Electronic All-Wheel-Drive (AWD)',
      'Ventilated Front Seats with Premium Leatherette Upholstery',
      'Head-Up Display & 360 View HD Camera'
    ],
    infotainment: '9" SmartPlay Pro+ with Arkamys Premium Sound System',
    comfortFeatures: ['Panoramic Sunroof', 'Ventilated Front Seats', 'Wireless Smartphone Charging', 'Digital Instrument Cluster 7"', 'PM 2.5 Air Purifier'],
    safetyFeatures: ['6 Airbags', 'All Wheel Disc Brakes', 'Electronic Stability Program', 'Tyre Pressure Monitoring (TPMS)', 'Hill Descent Control on AWD'],
    isPopular: true,
    variants: [
      { name: 'Sigma 1.5 MT', priceLakh: 10.99, fuel: 'Petrol', transmission: 'Manual', mileage: '21.11 kmpl', featuresHighlight: ['Dual Airbags', 'ESP', 'Halogen Projectors', 'Keyless Entry'] },
      { name: 'Delta 1.5 AT', priceLakh: 13.60, fuel: 'Petrol', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '20.58 kmpl', featuresHighlight: ['7" Touchscreen', 'Paddle Shifters', 'Cruise Control'] },
      { name: 'Zeta+ Strong Hybrid e-CVT', priceLakh: 18.43, fuel: 'Strong Hybrid', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '27.97 kmpl', featuresHighlight: ['Electric EV Mode', 'Panoramic Sunroof', 'Wireless Charger'] },
      { name: 'Alpha+ Strong Hybrid e-CVT', priceLakh: 20.09, fuel: 'Strong Hybrid', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '27.97 kmpl', featuresHighlight: ['Ventilated Seats', '360 Camera', 'Head-Up Display', 'TPMS'] }
    ],
    faqs: [
      { question: 'How does the Strong Hybrid system in Grand Vitara work?', answer: 'The Strong Hybrid pairs an efficient 1.5L petrol engine with a high-output electric motor and lithium-ion battery. It can drive purely on electric power silently in city traffic, delivering unmatched 27.97 kmpl mileage without needing external plug-in charging.' },
      { question: 'Is All-Wheel Drive available on Grand Vitara?', answer: 'Yes! Grand Vitara Alpha MT offers Maruti Suzukis renowned ALLGRIP SELECT AWD system with Auto, Sport, Snow, and Lock drive modes.' }
    ]
  },
  {
    id: 'fronx',
    name: 'Fronx',
    tagline: 'The Shape of New. Turbocharged Urban Crossover.',
    category: 'SUV',
    channel: 'NEXA',
    startingPriceLakh: 7.51,
    topPriceLakh: 13.04,
    fuelTypes: ['Petrol', 'CNG'],
    transmissions: ['Manual', 'Automatic (AGS/AMT)', 'Automatic (AT/CVT/e-CVT)'],
    engineCapacity: '998 cc Turbo Boosterjet / 1197 cc Dual Jet',
    maxPower: '100.06 PS @ 5500 rpm (Turbo)',
    maxTorque: '147.6 Nm @ 2000-4500 rpm (Turbo)',
    claimedMileage: '20.01 kmpl (Turbo AT) / 21.79 kmpl (1.2 MT) / 28.51 km/kg (CNG)',
    seatingCapacity: 5,
    bootSpaceLitres: 308,
    safetyRating: 'Tested on HEARTECT-Platform with High-Tensile Steel',
    airbags: 6,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#9333EA',
    keyFeatures: [
      '1.0L Turbo Boosterjet Engine with Direct Injection',
      'Coupe SUV aerodynamic silhouette with NEXWave grille',
      'Head-Up Display & 360 Degree View Camera',
      'Paddle Shifters with 6-Speed Torque Converter AT',
      'Wireless Apple CarPlay and Android Auto'
    ],
    infotainment: '9" SmartPlay Pro+ with Over-The-Air (OTA) updates',
    comfortFeatures: ['Fast Wireless Charging', 'Dual Tone Burgundy-Black Interior', 'Telescopic Steering Wheel', 'Automatic Climate Control'],
    safetyFeatures: ['6 Airbags (Zeta/Alpha)', 'Side & Curtain Airbags', 'ESP with Hill Hold Assist', 'ABS with EBD'],
    isPopular: true,
    variants: [
      { name: 'Sigma 1.2 MT', priceLakh: 7.51, fuel: 'Petrol', transmission: 'Manual', mileage: '21.79 kmpl', featuresHighlight: ['Auto Climate Control', 'Dual Airbags', 'ESP', 'Halogen Projectors'] },
      { name: 'Delta+ 1.2 AGS', priceLakh: 9.28, fuel: 'Petrol', transmission: 'Automatic (AGS/AMT)', mileage: '22.89 kmpl', featuresHighlight: ['LED Multi-reflector Headlamps', '7" Touchscreen', 'Alloy Wheels'] },
      { name: 'Zeta 1.0 Turbo 6AT', priceLakh: 12.05, fuel: 'Petrol', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '20.01 kmpl', featuresHighlight: ['1.0L Boosterjet', '6-Speed AT with Paddle Shifters', '6 Airbags'] },
      { name: 'Alpha 1.0 Turbo 6AT Dual Tone', priceLakh: 13.04, fuel: 'Petrol', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '20.01 kmpl', featuresHighlight: ['360 Camera', 'Head-Up Display', 'Precision Cut Alloys', '9" Touchscreen'] }
    ],
    faqs: [
      { question: 'What makes Fronx Turbo special?', answer: 'The Fronx Boosterjet brings 100 PS and 147.6 Nm torque with instant boost from 2000 RPM, paired with a smooth 6-speed torque converter AT with paddle shifters.' }
    ]
  },
  {
    id: 'baleno',
    name: 'Baleno',
    tagline: 'Tech Goes Bold. Premium Hatchback Benchmark.',
    category: 'Hatchback',
    channel: 'NEXA',
    startingPriceLakh: 6.66,
    topPriceLakh: 9.88,
    fuelTypes: ['Petrol', 'CNG'],
    transmissions: ['Manual', 'Automatic (AGS/AMT)'],
    engineCapacity: '1197 cc Dual VVT Petrol Engine',
    maxPower: '89.73 PS @ 6000 rpm',
    maxTorque: '113 Nm @ 4400 rpm',
    claimedMileage: '22.35 kmpl (MT) / 22.94 kmpl (AGS) / 30.61 km/kg (CNG)',
    seatingCapacity: 5,
    bootSpaceLitres: 318,
    safetyRating: 'HEARTECT Body Structure with Ultra-High Tensile Steel',
    airbags: 6,
    image: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#2563EB',
    keyFeatures: [
      'Head-Up Display displaying speed, RPM, and fuel consumption',
      '360 View HD Camera with 3D Birdseye Perspective',
      'Surround Sense Audio powered by Arkamys',
      'Next-Gen Suzuki Connect telematics with Alexa skill support',
      'UV-Cut Glass for heat and glare insulation'
    ],
    infotainment: '9" SmartPlay Pro+ Touchscreen Infotainment',
    comfortFeatures: ['Rear AC Vents', 'Cruise Control', 'Push Start Stop', 'Fast Type-C USB Charging', 'Height Adjustable Driver Seat'],
    safetyFeatures: ['6 Airbags (Zeta/Alpha)', 'ESP with Hill Hold', 'Brake Assist', 'Rear Defogger and Wiper'],
    isPopular: true,
    variants: [
      { name: 'Sigma 1.2 MT', priceLakh: 6.66, fuel: 'Petrol', transmission: 'Manual', mileage: '22.35 kmpl', featuresHighlight: ['Automatic AC', 'Central Locking', 'All Power Windows'] },
      { name: 'Delta 1.2 AGS', priceLakh: 8.00, fuel: 'Petrol', transmission: 'Automatic (AGS/AMT)', mileage: '22.94 kmpl', featuresHighlight: ['7" Touchscreen', 'Steering Controls', 'ESP'] },
      { name: 'Alpha 1.2 AGS', priceLakh: 9.88, fuel: 'Petrol', transmission: 'Automatic (AGS/AMT)', mileage: '22.94 kmpl', featuresHighlight: ['360 Camera', 'HUD', '6 Airbags', 'LED Fog Lamps'] }
    ],
    faqs: [
      { question: 'Does Baleno have 360-degree camera?', answer: 'Yes! The Alpha variant comes with an industry-leading 360-degree camera with multiple angle views and obstacle alerts.' }
    ]
  },
  {
    id: 'dzire',
    name: 'All-New Dzire',
    tagline: 'Move Forward in Style. India’s Most Loved Sedan.',
    category: 'Sedan',
    channel: 'ARENA',
    startingPriceLakh: 6.79,
    topPriceLakh: 10.14,
    fuelTypes: ['Petrol', 'CNG'],
    transmissions: ['Manual', 'Automatic (AGS/AMT)'],
    engineCapacity: '1197 cc Z-Series 3-Cylinder Engine',
    maxPower: '81.58 PS @ 5700 rpm',
    maxTorque: '111.7 Nm @ 4300 rpm',
    claimedMileage: '24.79 kmpl (MT) / 25.71 kmpl (AGS) / 33.73 km/kg (CNG)',
    seatingCapacity: 5,
    bootSpaceLitres: 382,
    safetyRating: '5-Star Global NCAP Rating',
    airbags: 6,
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#047857',
    keyFeatures: [
      '5-Star Safety Rating Global NCAP with 6 Airbags standard',
      'Electric Sunroof – Segment First in Sub-compact Sedans',
      '360 View HD Camera with guidelines',
      'Class-leading fuel economy up to 33.73 km/kg CNG',
      'Sleek executive European silhouette'
    ],
    infotainment: '9" SmartPlay Pro+ with Wireless Apple CarPlay & Android Auto',
    comfortFeatures: ['Electric Sunroof', 'Rear AC Vents', 'Rear Armrest with Cupholders', 'Automatic Climate Control', 'Wireless Phone Charger'],
    safetyFeatures: ['5-Star GNCAP Crash Test Rating', '6 Airbags Standard Across All Variants', 'ESP with Hill Hold Assist', 'ABS with EBD'],
    isPopular: true,
    isNewLaunch: true,
    variants: [
      { name: 'LXi 1.2 MT', priceLakh: 6.79, fuel: 'Petrol', transmission: 'Manual', mileage: '24.79 kmpl', featuresHighlight: ['6 Airbags', 'ESP', 'All Power Windows'] },
      { name: 'VXi 1.2 MT', priceLakh: 7.79, fuel: 'Petrol', transmission: 'Manual', mileage: '24.79 kmpl', featuresHighlight: ['7" Touchscreen', 'Rear AC Vents', 'Remote Keyless'] },
      { name: 'ZXi 1.2 MT Sunroof', priceLakh: 8.89, fuel: 'Petrol', transmission: 'Manual', mileage: '24.79 kmpl', featuresHighlight: ['Electric Sunroof', 'Wireless Charger', 'Push Button Start'] },
      { name: 'ZXi+ 1.2 AGS Sunroof', priceLakh: 10.14, fuel: 'Petrol', transmission: 'Automatic (AGS/AMT)', mileage: '25.71 kmpl', featuresHighlight: ['360 Camera', 'Sunroof', 'Leatherette Steering', '9" Screen'] }
    ],
    faqs: [
      { question: 'What is the safety rating of the new 2024 Dzire?', answer: 'The new Dzire has officially scored a 5-Star safety rating from Global NCAP with 6 airbags, ESP, and pedestrian protection as standard.' }
    ]
  },
  {
    id: 'ertiga',
    name: 'Ertiga',
    tagline: 'Togetherness in Every Journey. India’s Favourite MPV.',
    category: 'MPV',
    channel: 'ARENA',
    startingPriceLakh: 8.69,
    topPriceLakh: 13.03,
    fuelTypes: ['Petrol', 'CNG'],
    transmissions: ['Manual', 'Automatic (AT/CVT/e-CVT)'],
    engineCapacity: '1462 cc K15C Smart Hybrid',
    maxPower: '103 PS @ 6000 rpm',
    maxTorque: '136.8 Nm @ 4400 rpm',
    claimedMileage: '20.51 kmpl (MT) / 20.30 kmpl (AT) / 26.11 km/kg (CNG)',
    seatingCapacity: 7,
    bootSpaceLitres: 209,
    safetyRating: '3-Star Global NCAP',
    airbags: 4,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#B45309',
    keyFeatures: [
      'Spacious 7-Seater Configuration with One-Touch Walk-in 3rd row',
      'Smart Hybrid Dual Battery Technology with Idle Stop-Start',
      'Air-Cooled Twin Front Cup Holders',
      'Roof Mounted AC with 3-Speed Control for 2nd & 3rd Row',
      'Paddle Shifters on 6-Speed Automatic Transmission'
    ],
    infotainment: '7" SmartPlay Pro with Voice Assistant and Smartphone Link',
    comfortFeatures: ['Reclining 3rd Row Seats', 'Roof Mounted Rear AC', 'Air-Cooled Cup Holders', 'Cruise Control', 'Smart Key with Push Start'],
    safetyFeatures: ['Front & Side Airbags (4 Airbags on ZXi+)', 'ESP with Hill Hold Assist', 'ABS with EBD', 'ISOFIX Child Seat Anchors'],
    isPopular: true,
    variants: [
      { name: 'LXi 1.5 MT', priceLakh: 8.69, fuel: 'Petrol', transmission: 'Manual', mileage: '20.51 kmpl', featuresHighlight: ['Dual Airbags', 'ESP', 'Projector Headlamps', 'Cooled Cup Holders'] },
      { name: 'VXi 1.5 MT CNG', priceLakh: 10.78, fuel: 'CNG', transmission: 'Manual', mileage: '26.11 km/kg', featuresHighlight: ['Factory S-CNG', 'Audio System', 'Keyless Entry'] },
      { name: 'ZXi+ 1.5 AT', priceLakh: 13.03, fuel: 'Petrol', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '20.30 kmpl', featuresHighlight: ['4 Airbags', 'Paddle Shifters', '7" Touchscreen', 'Cruise Control'] }
    ],
    faqs: [
      { question: 'Is Ertiga suitable for highway road trips with full family?', answer: 'Yes! Ertiga comfortably accommodates 7 adults with dedicated roof-mounted AC vents, reclining seatbacks in all 3 rows, and balanced suspension.' }
    ]
  },
  {
    id: 'xl6',
    name: 'XL6',
    tagline: 'Time to Indulge. Premium 6-Seater MPV.',
    category: 'MPV',
    channel: 'NEXA',
    startingPriceLakh: 11.61,
    topPriceLakh: 14.77,
    fuelTypes: ['Petrol', 'CNG'],
    transmissions: ['Manual', 'Automatic (AT/CVT/e-CVT)'],
    engineCapacity: '1462 cc K15C Smart Hybrid',
    maxPower: '103 PS @ 6000 rpm',
    maxTorque: '136.8 Nm @ 4400 rpm',
    claimedMileage: '20.97 kmpl (MT) / 20.27 kmpl (AT) / 26.32 km/kg (CNG)',
    seatingCapacity: 6,
    bootSpaceLitres: 209,
    safetyRating: 'Tested on HEARTECT-Platform',
    airbags: 4,
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#1E293B',
    keyFeatures: [
      'Plush 2nd Row Captain Seats with Individual Armrests and One-Touch Recline',
      'Ventilated Front Seats with 3-Level Cooling',
      '360 View HD Camera with Blind Spot Detection',
      'Tyre Pressure Monitoring System (TPMS)',
      'UV Cut Toughened Glass for cabin thermal comfort'
    ],
    infotainment: '7" SmartPlay Pro with Suzuki Connect Connected Car Suite',
    comfortFeatures: ['Ventilated Driver & Co-Driver Seats', 'Captain Seats Row 2', 'Cruise Control', 'Auto Headlamps', 'Paddle Shifters'],
    safetyFeatures: ['Quad Airbags Standard', '360 Camera', 'TPMS', 'ESP & Hill Hold', 'Anti-Pinch Driver Window'],
    variants: [
      { name: 'Zeta 1.5 MT', priceLakh: 11.61, fuel: 'Petrol', transmission: 'Manual', mileage: '20.97 kmpl', featuresHighlight: ['Captain Seats', 'Quad Airbags', 'Cruise Control'] },
      { name: 'Alpha+ 1.5 AT Dual Tone', priceLakh: 14.77, fuel: 'Petrol', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '20.27 kmpl', featuresHighlight: ['Ventilated Seats', '360 Camera', 'TPMS', 'Paddle Shifters'] }
    ],
    faqs: [
      { question: 'What is the main difference between Ertiga and XL6?', answer: 'XL6 is a premium 6-seater sold exclusively through NEXA featuring dedicated 2nd-row luxury Captain Seats, ventilated front seats, 360-view camera, and rugged crossover styling.' }
    ]
  },
  {
    id: 'invicto',
    name: 'Invicto',
    tagline: 'The League of Extraordinary. Flagship Intelligent Hybrid MPV.',
    category: 'MPV',
    channel: 'NEXA',
    startingPriceLakh: 25.31,
    topPriceLakh: 29.02,
    fuelTypes: ['Strong Hybrid'],
    transmissions: ['Automatic (AT/CVT/e-CVT)'],
    engineCapacity: '1987 cc 2.0L Intelligent Electric Hybrid',
    maxPower: '186 PS Combined System Output',
    maxTorque: '188 Nm (Engine) + 206 Nm (Motor)',
    claimedMileage: '23.24 kmpl (ARAI Certified)',
    seatingCapacity: 7,
    bootSpaceLitres: 239,
    safetyRating: '5-Star Class Architecture (TNGA Monocoque Platform)',
    airbags: 6,
    image: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#312E81',
    keyFeatures: [
      '2.0L Powerful Hybrid Powertrain with Instant Electric Motor Boost',
      'Panoramic Sunroof with Mood Lighting',
      'Powered Tailgate with One-Touch Walkaway Close',
      'Dual-Zone Automatic Climate Control (Front and Rear Independent)',
      '8-Way Powered Driver Seat with Memory Function'
    ],
    infotainment: '10.1" Ultra-wide HD Touchscreen with Wireless Apple CarPlay',
    comfortFeatures: ['Panoramic Sunroof', 'Powered Tailgate', 'Ventilated Front Seats', 'Electronic Parking Brake with Auto Hold', 'Retractable Sunshades'],
    safetyFeatures: ['6 Airbags Across All Trims', 'All 4 Disc Brakes', 'Electronic Parking Brake', 'TPMS', '360 View Monitor'],
    variants: [
      { name: 'Zeta+ 7-Seater 2.0 Hybrid e-CVT', priceLakh: 25.31, fuel: 'Strong Hybrid', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '23.24 kmpl', featuresHighlight: ['6 Airbags', 'Dual Zone AC', 'Electronic Parking Brake'] },
      { name: 'Alpha+ 7-Seater 2.0 Hybrid e-CVT', priceLakh: 29.02, fuel: 'Strong Hybrid', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '23.24 kmpl', featuresHighlight: ['Panoramic Sunroof', 'Powered Tailgate', 'Ventilated Seats', '10.1" Screen'] }
    ],
    faqs: [
      { question: 'Does Invicto need to be plugged into a wall socket?', answer: 'No. Invicto is a self-charging Strong Hybrid. The high-capacity battery charges automatically during braking, decelerating, and engine cruising.' }
    ]
  },
  {
    id: 'jimny',
    name: 'Jimny 5-Door',
    tagline: 'Purity of Purpose. Authentic 4x4 Off-Roader.',
    category: 'SUV',
    channel: 'NEXA',
    startingPriceLakh: 12.74,
    topPriceLakh: 14.95,
    fuelTypes: ['Petrol'],
    transmissions: ['Manual', 'Automatic (AT/CVT/e-CVT)'],
    engineCapacity: '1462 cc K15B with ALLGRIP PRO',
    maxPower: '104.8 PS @ 6000 rpm',
    maxTorque: '134.2 Nm @ 4000 rpm',
    claimedMileage: '16.94 kmpl (MT) / 16.39 kmpl (AT)',
    seatingCapacity: 4,
    bootSpaceLitres: 208,
    safetyRating: 'Ladder Frame Robust Steel Chassis',
    airbags: 6,
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#15803D',
    keyFeatures: [
      'ALLGRIP PRO 4WD with Low-Range Transfer Gearbox (4L / 4H / 2H)',
      'Heavy-Duty Ladder Frame Chassis with 3-Link Rigid Axle Suspension',
      'Brake Limited Slip Differential (Brake LSD) for Extreme Traction',
      '210 mm High Ground Clearance with Approach Angle 36° & Departure 50°',
      'Gunmetal Scratch-Resistant Interior Finishes with 9" Display'
    ],
    infotainment: '9" SmartPlay Pro+ Touchscreen with Off-Road Telemetry Screen',
    comfortFeatures: ['Cruise Control', 'Automatic Climate Control', 'Power Folding ORVMs', 'Headlamp Washers'],
    safetyFeatures: ['6 Airbags Standard', 'Brake LSD', 'Hill Hold Assist & Hill Descent Control', 'ABS with EBD'],
    variants: [
      { name: 'Zeta 1.5 MT 4WD', priceLakh: 12.74, fuel: 'Petrol', transmission: 'Manual', mileage: '16.94 kmpl', featuresHighlight: ['ALLGRIP PRO 4x4', '6 Airbags', 'Brake LSD', '7" Touchscreen'] },
      { name: 'Alpha 1.5 AT 4WD Dual Tone', priceLakh: 14.95, fuel: 'Petrol', transmission: 'Automatic (AT/CVT/e-CVT)', mileage: '16.39 kmpl', featuresHighlight: ['LED Projectors', 'Headlamp Washers', '9" Screen', 'Alloy Wheels'] }
    ],
    faqs: [
      { question: 'Is Jimny a real 4x4 or an AWD crossover?', answer: 'Jimny is an authentic, hardcore 4x4 built on a ladder-frame chassis with a dedicated low-ratio transfer case (4L) and solid front & rear rigid axles.' }
    ]
  },
  {
    id: 'wagonr',
    name: 'WagonR',
    tagline: 'Dil Se Strong. India’s Tall Boy Legend.',
    category: 'Hatchback',
    channel: 'ARENA',
    startingPriceLakh: 5.54,
    topPriceLakh: 7.33,
    fuelTypes: ['Petrol', 'CNG'],
    transmissions: ['Manual', 'Automatic (AGS/AMT)'],
    engineCapacity: '1.0L K10C (67 PS) & 1.2L K12N Dual Jet (90 PS)',
    maxPower: '89.73 PS @ 6000 rpm (1.2L)',
    maxTorque: '113 Nm @ 4400 rpm (1.2L)',
    claimedMileage: '24.35 kmpl (1.0 MT) / 25.19 kmpl (1.0 AGS) / 34.05 km/kg (CNG)',
    seatingCapacity: 5,
    bootSpaceLitres: 341,
    safetyRating: 'Dual Airbags with ESP Standard',
    airbags: 2,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#0284C7',
    keyFeatures: [
      'Huge 341 Litre Boot Space – Largest in Hatchback segment',
      'Tall Boy Design for effortless ingress and unmatched headroom',
      'S-CNG Technology delivering 34.05 km/kg fuel efficiency',
      '7" SmartPlay Studio with Smartphone Connectivity',
      'Hill Hold Assist on Auto Gear Shift (AGS) trims'
    ],
    infotainment: '7" SmartPlay Studio with Bluetooth and USB',
    comfortFeatures: ['Split 60:40 Rear Folding Seats', 'Steering Mounted Controls', 'Remote Keyless Entry'],
    safetyFeatures: ['Dual Airbags Standard', 'ESP with Hill Hold', 'Rear Parking Sensors', 'Speed Alert System'],
    variants: [
      { name: 'LXi 1.0 MT', priceLakh: 5.54, fuel: 'Petrol', transmission: 'Manual', mileage: '24.35 kmpl', featuresHighlight: ['Dual Airbags', 'ESP', 'Front Power Windows'] },
      { name: 'LXi 1.0 CNG', priceLakh: 6.44, fuel: 'CNG', transmission: 'Manual', mileage: '34.05 km/kg', featuresHighlight: ['Factory S-CNG', 'Super Economical'] },
      { name: 'ZXi+ 1.2 AGS Dual Tone', priceLakh: 7.33, fuel: 'Petrol', transmission: 'Automatic (AGS/AMT)', mileage: '25.19 kmpl', featuresHighlight: ['1.2L Engine', 'Alloy Wheels', '7" Touchscreen'] }
    ],
    faqs: [
      { question: 'Why is WagonR considered the ideal city hatchback?', answer: 'Because of its high seating position, great visibility, spacious 341L boot, low running cost (up to 34 km/kg CNG), and AGS automatic convenience.' }
    ]
  },
  {
    id: 'alto-k10',
    name: 'Alto K10',
    tagline: 'India’s Pride. Unmatched Affordability & Peace of Mind.',
    category: 'Hatchback',
    channel: 'ARENA',
    startingPriceLakh: 3.99,
    topPriceLakh: 5.96,
    fuelTypes: ['Petrol', 'CNG'],
    transmissions: ['Manual', 'Automatic (AGS/AMT)'],
    engineCapacity: '998 cc Next-Gen K10C Dual Jet',
    maxPower: '66.62 PS @ 5500 rpm',
    maxTorque: '89 Nm @ 3500 rpm',
    claimedMileage: '24.39 kmpl (MT) / 24.90 kmpl (AGS) / 33.85 km/kg (CNG)',
    seatingCapacity: 5,
    bootSpaceLitres: 214,
    safetyRating: 'ESP and ABS Standard',
    airbags: 2,
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#DC2626',
    keyFeatures: [
      'Accessible entry price starting from ₹3.99 Lakh',
      'Punchy 1.0L Next-Gen K-Series Engine',
      'Electronic Stability Program (ESP) standard across all variants',
      '7" SmartPlay Studio with Apple CarPlay and Android Auto',
      'Tight 4.5m Turning Radius for easy city parking'
    ],
    infotainment: '7" Touchscreen SmartPlay Studio Audio',
    comfortFeatures: ['Front Power Windows', 'Remote Keyless Entry', 'Digital Speedometer'],
    safetyFeatures: ['Dual Front Airbags', 'ESP with Hill Hold (AGS)', 'ABS with EBD', 'Reverse Parking Sensors'],
    variants: [
      { name: 'Std 1.0 MT', priceLakh: 3.99, fuel: 'Petrol', transmission: 'Manual', mileage: '24.39 kmpl', featuresHighlight: ['Dual Airbags', 'ABS with EBD', 'ESP'] },
      { name: 'VXi 1.0 MT', priceLakh: 5.06, fuel: 'Petrol', transmission: 'Manual', mileage: '24.39 kmpl', featuresHighlight: ['Audio System', 'Front Power Windows', 'Body-coloured Bumpers'] },
      { name: 'VXi+ 1.0 AGS', priceLakh: 5.96, fuel: 'Petrol', transmission: 'Automatic (AGS/AMT)', mileage: '24.90 kmpl', featuresHighlight: ['7" Touchscreen', 'Automatic AGS', 'Steering Controls'] }
    ],
    faqs: [
      { question: 'Does Alto K10 offer an automatic gearbox?', answer: 'Yes! The Alto K10 offers Maruti Suzuki Auto Gear Shift (AGS) on VXi and VXi+ trims.' }
    ]
  },
  {
    id: 'celerio',
    name: 'Celerio',
    tagline: 'Drive with Pure Dynamism. India’s Most Fuel-Efficient Petrol Car.',
    category: 'Hatchback',
    channel: 'ARENA',
    startingPriceLakh: 5.36,
    topPriceLakh: 7.04,
    fuelTypes: ['Petrol', 'CNG'],
    transmissions: ['Manual', 'Automatic (AGS/AMT)'],
    engineCapacity: '998 cc Dual Jet Dual VVT',
    maxPower: '65.7 PS @ 5500 rpm',
    maxTorque: '89 Nm @ 3500 rpm',
    claimedMileage: '26.68 kmpl (Petrol VXi AGS) / 34.43 km/kg (CNG)',
    seatingCapacity: 5,
    bootSpaceLitres: 313,
    safetyRating: 'ESP and Dual Airbags Standard',
    airbags: 2,
    image: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#059669',
    keyFeatures: [
      'Segment leader: Up to 26.68 kmpl ARAI petrol mileage',
      '3D Organic Sculpted 3D Design',
      'Engine Idle Start-Stop Technology',
      '313 Litres generous luggage boot space',
      'Keyless Entry with Push Button Start'
    ],
    infotainment: '7" SmartPlay Studio with Smartphone Link',
    comfortFeatures: ['Push Button Start/Stop', 'Steering Mounted Controls', 'Pollen Filter AC'],
    safetyFeatures: ['Dual Airbags', 'ESP with Hill Hold Assist', 'ABS with EBD'],
    variants: [
      { name: 'LXi 1.0 MT', priceLakh: 5.36, fuel: 'Petrol', transmission: 'Manual', mileage: '25.24 kmpl', featuresHighlight: ['Dual Airbags', 'ESP', 'Idle Start Stop'] },
      { name: 'VXi 1.0 CNG', priceLakh: 6.73, fuel: 'CNG', transmission: 'Manual', mileage: '34.43 km/kg', featuresHighlight: ['Factory S-CNG', '34.43 km/kg mileage'] },
      { name: 'ZXi+ 1.0 AGS', priceLakh: 7.04, fuel: 'Petrol', transmission: 'Automatic (AGS/AMT)', mileage: '26.00 kmpl', featuresHighlight: ['Push Start', '7" Touchscreen', 'Alloy Wheels'] }
    ],
    faqs: [
      { question: 'Is Celerio really Indias most fuel efficient petrol car?', answer: 'Yes, with an ARAI certified mileage of 26.68 kmpl on the VXi AGS trim, Celerio holds the record for highest mileage among non-hybrid petrol cars in India.' }
    ]
  },
  {
    id: 'e-vitara',
    name: 'e Vitara',
    tagline: 'Emotional Versatile Cruiser. Maruti Suzuki’s First Global All-Electric SUV.',
    category: 'EV',
    channel: 'NEXA',
    startingPriceLakh: 19.90,
    topPriceLakh: 25.50,
    fuelTypes: ['Electric'],
    transmissions: ['Electric Drive'],
    engineCapacity: '49 kWh / 61 kWh Blade Battery Pack (eAxle)',
    maxPower: '184 PS (AWD eAxle Dual Motor)',
    maxTorque: '300 Nm Instant Torque',
    claimedMileage: '500+ km Driving Range per Charge (WLTP)',
    seatingCapacity: 5,
    bootSpaceLitres: 410,
    safetyRating: 'ADAS Level 2 + 7 Airbags Standard',
    airbags: 7,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#06B6D4',
    keyFeatures: [
      'ALLGRIP-e Electric 4WD with Independent Front and Rear Motors',
      'Up to 500+ km Certified Long Range on Single Charge',
      'Ultra-Safe LFP Blade Battery Pack with Fast DC Charging (10-80% in 35 mins)',
      'Dual-Screen Panoramic Cockpit with Level-2 ADAS Suite',
      'Vehicle-to-Load (V2L) Power Delivery'
    ],
    infotainment: 'Dual 10.25" Floating Panoramic Displays with Google Automotive OS',
    comfortFeatures: ['Ventilated Electric Memory Seats', 'Dual-Pane Panoramic Glass Roof', 'V2L External Device Charging', 'Smart Ambient 64-Color Lighting'],
    safetyFeatures: ['Level 2 ADAS Suite (Adaptive Cruise, Lane Keep, AEB)', '7 Airbags Standard', '360 3D Transparent Chassis View', 'Driver Fatigue Monitor'],
    isNewLaunch: true,
    isPopular: true,
    variants: [
      { name: 'e Vitara 49 kWh 2WD', priceLakh: 19.90, fuel: 'Electric', transmission: 'Electric Drive', mileage: '400 km Range', featuresHighlight: ['49 kWh LFP Battery', 'ADAS Level 2', 'Dual 10.25" Displays'] },
      { name: 'e Vitara 61 kWh Long Range', priceLakh: 22.90, fuel: 'Electric', transmission: 'Electric Drive', mileage: '500+ km Range', featuresHighlight: ['61 kWh Battery', 'Ventilated Seats', 'Fast DC Charging'] },
      { name: 'e Vitara 61 kWh ALLGRIP-e 4WD', priceLakh: 25.50, fuel: 'Electric', transmission: 'Electric Drive', mileage: '480 km Range', featuresHighlight: ['Dual Motor 4WD', 'Trail Mode', 'Panoramic Roof', '7 Airbags'] }
    ],
    faqs: [
      { question: 'What is the real charging time for e Vitara?', answer: 'With high-speed 150kW DC fast chargers, the e Vitara charges from 10% to 80% in approximately 35 minutes. An 11kW AC home wallbox delivers a full charge in under 7 hours.' },
      { question: 'Does e Vitara offer 4-Wheel Drive?', answer: 'Yes! The top variant features ALLGRIP-e with independent front and rear electric motors for instant torque vectoring in slippery conditions.' }
    ]
  },
  {
    id: 'victoris',
    name: 'Victoris Concept',
    tagline: 'Futuristic Luxury Gran Tourer. The Vision of Tomorrow.',
    category: 'EV',
    channel: 'NEXA',
    startingPriceLakh: 27.50,
    topPriceLakh: 34.00,
    fuelTypes: ['Electric'],
    transmissions: ['Electric Drive'],
    engineCapacity: '75 kWh High-Density Solid-State Assisted Battery',
    maxPower: '245 PS Dual Motor Performance',
    maxTorque: '380 Nm Instant Torque',
    claimedMileage: '620 km Estimated Range',
    seatingCapacity: 5,
    bootSpaceLitres: 440,
    safetyRating: 'Autonomous Level 2.5 Architecture',
    airbags: 8,
    image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80',
    accentColor: '#4F46E5',
    keyFeatures: [
      'Next-Gen Aero Gran Tourer Silhouette with Active Spoilers',
      'Ultra-Fast 800V Architecture – 200 km Range in 10 Minutes',
      'Augmented Reality Head-Up Display (AR-HUD)',
      'Smart Glass Panoramic Roof with Variable Electrochromic Opacity',
      'Bespoke Sustainable Interior crafted from recycled ocean textiles'
    ],
    infotainment: 'Curved OLED Cinematic Horizon Display with Spatial Audio',
    comfortFeatures: ['Zero-Gravity Executive Reclining Seats', 'Electrochromic Smart Glass', 'Biometric Driver Profile Recognition'],
    safetyFeatures: ['Level 2.5 Autonomous Pilot', '8 Airbags', 'LiDAR & Radar Collision Prevention'],
    isNewLaunch: true,
    variants: [
      { name: 'Victoris GT RWD 75 kWh', priceLakh: 27.50, fuel: 'Electric', transmission: 'Electric Drive', mileage: '620 km Range', featuresHighlight: ['AR-HUD', 'OLED Horizon Screen', '800V Charging'] },
      { name: 'Victoris GT AWD Signature', priceLakh: 34.00, fuel: 'Electric', transmission: 'Electric Drive', mileage: '580 km Range', featuresHighlight: ['Dual Motor 245 PS', 'Electrochromic Roof', 'Level 2.5 ADAS'] }
    ],
    faqs: [
      { question: 'What is the Victoris Concept?', answer: 'The Victoris Concept is Maruti Suzukis vision of a futuristic Gran Tourer EV demonstrating state-of-the-art battery aerodynamics, 800V ultra-charging, and next-generation connectivity.' }
    ]
  }
];

export const CATEGORIES = ['All', 'Hatchback', 'SUV', 'Sedan', 'MPV', 'EV'] as const;
export const FUEL_TYPES = ['All', 'Petrol', 'CNG', 'Strong Hybrid', 'Electric'] as const;
export const TRANSMISSION_TYPES = ['All', 'Manual', 'Automatic (AGS/AMT)', 'Automatic (AT/CVT/e-CVT)', 'Electric Drive'] as const;
export const CHANNELS = ['All', 'ARENA', 'NEXA'] as const;
