import { SupportedLanguage } from '@/types';

export interface BotReplyResult {
  reply: string;
  recommendedVehicleIds?: string[];
  suggestedPrompts: string[];
  actions?: {
    label: string;
    actionType: 'book_test_ride' | 'find_showroom' | 'compare_cars' | 'service_centre' | 'insurance' | 'callback' | 'share_whatsapp' | 'share_email';
    payload?: any;
  }[];
  detectedIntent: 'Exploring Cars' | 'Budget Query' | 'Test Ride Intent' | 'Service Inquiry' | 'Comparison' | 'Insurance / Finance' | 'General';
  estimatedSentiment: 'Highly Positive' | 'Interested' | 'Neutral' | 'Hesitant / Price Conscious';
  stageUpdate?: 'Discovery' | 'Vehicle Shortlisting' | 'Evaluation' | 'Action Initiation';
}

export function generateBotReply(userInput: string, language: SupportedLanguage): BotReplyResult {
  const query = userInput.toLowerCase().trim();

  // Test Ride Intent
  if (
    query.includes('test ride') ||
    query.includes('test drive') ||
    query.includes('drive car') ||
    query.includes('gaadi chalani') ||
    query.includes('chalana chahta') ||
    query.includes('trial')
  ) {
    if (language === 'hi') {
      return {
        reply: 'Bilkul! 🚗 Maruti Suzuki Showroom Assistant aapke liye ek demo test ride arrange kar sakta hai. Aap kaunsi car (Swift, Brezza, Grand Vitara, Dzire) aur kis shahar (Delhi, Mumbai, Ahmedabad, etc.) mein test drive lena chahenge?',
        recommendedVehicleIds: ['swift-2024', 'brezza', 'grand-vitara'],
        suggestedPrompts: ['Brezza Test Ride Book Karein', 'Grand Vitara Hybrid Explore Karein', 'Nearby Showroom Dekhein'],
        actions: [
          { label: 'Book Demo Test Ride', actionType: 'book_test_ride' },
          { label: 'Find Showrooms', actionType: 'find_showroom' }
        ],
        detectedIntent: 'Test Ride Intent',
        estimatedSentiment: 'Highly Positive',
        stageUpdate: 'Action Initiation'
      };
    } else if (language === 'gu') {
      return {
        reply: 'Chokkas! 🚗 Tamare maate ek demo test drive ni vyavastha kari shakiye chhiye. Tame kaye gadi (Swift, Brezza, Grand Vitara) ane kaya city ma test drive karva mango chho?',
        recommendedVehicleIds: ['swift-2024', 'brezza', 'grand-vitara'],
        suggestedPrompts: ['Demo Test Ride Book Karo', 'Ahmedabad Showrooms', 'Swift Price Jano'],
        actions: [
          { label: 'Demo Test Ride Book Karo', actionType: 'book_test_ride' },
          { label: 'Showroom Shodho', actionType: 'find_showroom' }
        ],
        detectedIntent: 'Test Ride Intent',
        estimatedSentiment: 'Highly Positive',
        stageUpdate: 'Action Initiation'
      };
    } else if (language === 'mr') {
      return {
        reply: 'Nakkich! 🚗 Aamhi tumchya sathi demo test drive request arrange karu shakto. Tumhala konti car (Swift, Brezza, Grand Vitara) ani kontya shahrant (Mumbai, Pune) test drive karaychi ahe?',
        recommendedVehicleIds: ['swift-2024', 'brezza', 'grand-vitara'],
        suggestedPrompts: ['Test Drive Book Kara', 'Pune Showrooms', 'Brezza Features'],
        actions: [
          { label: 'Book Demo Test Ride', actionType: 'book_test_ride' },
          { label: 'Showroom Shodha', actionType: 'find_showroom' }
        ],
        detectedIntent: 'Test Ride Intent',
        estimatedSentiment: 'Highly Positive',
        stageUpdate: 'Action Initiation'
      };
    } else {
      return {
        reply: 'Absolutely! 🚗 Let’s set up a demo test ride request for you. Which Maruti Suzuki model are you eager to experience, and which city are you in?',
        recommendedVehicleIds: ['swift-2024', 'brezza', 'grand-vitara'],
        suggestedPrompts: ['Book Swift Test Ride', 'Book Brezza Test Ride', 'Book Grand Vitara Test Ride', 'Find Showrooms Near Me'],
        actions: [
          { label: 'Book Demo Test Ride', actionType: 'book_test_ride' },
          { label: 'Find Showrooms', actionType: 'find_showroom' }
        ],
        detectedIntent: 'Test Ride Intent',
        estimatedSentiment: 'Highly Positive',
        stageUpdate: 'Action Initiation'
      };
    }
  }

  // Budget under 10 lakh / budget queries
  if (
    query.includes('10 lakh') ||
    query.includes('under 10') ||
    query.includes('budget') ||
    query.includes('sasti') ||
    query.includes('price') ||
    query.includes('kemti') ||
    query.includes('bhav')
  ) {
    if (language === 'hi') {
      return {
        reply: 'Bilkul! 😊 ₹10 Lakh ke andar hamare paas Bharat ki sabse popular cars hain: All-New Swift (₹6.49L se), All-New Dzire 5-Star Safety (₹6.79L se), Baleno (₹6.66L se), Fronx Coupe SUV (₹7.51L se) aur Brezza (₹8.34L se). Aap petrol prefer karenge ya CNG?',
        recommendedVehicleIds: ['swift-2024', 'dzire', 'fronx', 'brezza'],
        suggestedPrompts: ['Compare Swift vs Dzire', 'Fronx Automatic Features', 'Book Test Ride', 'Check CNG Models'],
        actions: [
          { label: 'Compare Cars', actionType: 'compare_cars' },
          { label: 'Book Test Ride', actionType: 'book_test_ride' }
        ],
        detectedIntent: 'Budget Query',
        estimatedSentiment: 'Interested',
        stageUpdate: 'Vehicle Shortlisting'
      };
    } else if (language === 'gu') {
      return {
        reply: 'Barabar chhe! 😊 ₹10 Lakh na budget ma Maruti Suzuki ni best cars: All-New Swift (₹6.49L thi), Baleno (₹6.66L thi), New Dzire (₹6.79L thi) ane Fronx SUV (₹7.51L thi). Tamne Petrol game chhe ke CNG?',
        recommendedVehicleIds: ['swift-2024', 'dzire', 'baleno', 'fronx'],
        suggestedPrompts: ['Cars Compare Karo', 'Swift Test Ride', 'Showroom Shodho'],
        actions: [
          { label: 'Compare Cars', actionType: 'compare_cars' },
          { label: 'Test Ride Book Karo', actionType: 'book_test_ride' }
        ],
        detectedIntent: 'Budget Query',
        estimatedSentiment: 'Interested',
        stageUpdate: 'Vehicle Shortlisting'
      };
    } else if (language === 'mr') {
      return {
        reply: 'Agdi barobar! 😊 ₹10 Lakh chya budget madhe sarvotkrusht paryay: All-New Swift (₹6.49L pasun), Dzire (5-Star Safety, ₹6.79L), Baleno (₹6.66L) ani Fronx (₹7.51L). Tumhala Petrol hawe ki CNG?',
        recommendedVehicleIds: ['swift-2024', 'dzire', 'baleno', 'fronx'],
        suggestedPrompts: ['Compare Swift & Baleno', 'Test Drive Book Kara', 'Showroom Shodha'],
        actions: [
          { label: 'Compare Cars', actionType: 'compare_cars' },
          { label: 'Book Test Ride', actionType: 'book_test_ride' }
        ],
        detectedIntent: 'Budget Query',
        estimatedSentiment: 'Interested',
        stageUpdate: 'Vehicle Shortlisting'
      };
    } else {
      return {
        reply: 'Under ₹10 Lakh, Maruti Suzuki offers exceptional value! Leading choices include the All-New Swift (from ₹6.49L), the 5-Star NCAP rated All-New Dzire (from ₹6.79L), the premium Baleno (from ₹6.66L), the Fronx Turbo crossover (from ₹7.51L), and the rugged Brezza (from ₹8.34L). Would you lean towards Petrol or factory S-CNG?',
        recommendedVehicleIds: ['swift-2024', 'dzire', 'fronx', 'brezza'],
        suggestedPrompts: ['Compare Swift vs Dzire', 'Explore Brezza Variants', 'Check CNG Options', 'Schedule a Callback'],
        actions: [
          { label: 'Compare Cars', actionType: 'compare_cars' },
          { label: 'Book Test Ride', actionType: 'book_test_ride' },
          { label: 'Schedule Callback', actionType: 'callback' }
        ],
        detectedIntent: 'Budget Query',
        estimatedSentiment: 'Interested',
        stageUpdate: 'Vehicle Shortlisting'
      };
    }
  }

  // SUV queries
  if (
    query.includes('suv') ||
    query.includes('brezza') ||
    query.includes('grand vitara') ||
    query.includes('jimny') ||
    query.includes('fronx') ||
    query.includes('4x4')
  ) {
    return {
      reply: language === 'hi'
        ? 'Hamare SUV line-up mein shandar models hain: Brezza (Electric Sunroof & 360 Camera), Grand Vitara Intelligent Strong Hybrid (27.97 kmpl & Pure EV mode), Fronx Turbo Boosterjet crossover, aur Jimny authentic 4x4 with ALLGRIP PRO. Kaunsa model aapke lifestyle ke liye fit baithta hai?'
        : language === 'gu'
        ? 'Maruti Suzuki SUV Range ma shandar options chhe: Brezza (Sunroof sathe), Grand Vitara Intelligent Hybrid (27.97 kmpl mileage), Fronx sporty crossover, ane Jimny 4x4. Tamare ketli seating ane kya driving profile joiye chhe?'
        : language === 'mr'
        ? 'Maruti Suzuki chya SUV portfolio madhe damdar ghadya ahet: Brezza (Sunroof & 360 View), Grand Vitara Strong Hybrid (27.97 kmpl), Fronx ani Jimny 4x4. Konte model tumhala aavadle?'
        : 'Our SUV line-up caters to every adventure: Brezza (Techy sub-compact with Electric Sunroof & 360 Camera), Grand Vitara (Intelligent Strong Hybrid delivering 27.97 kmpl with AWD option), Fronx (Turbo Boosterjet coupe crossover), and Jimny (Pure ladder-frame 4x4 with ALLGRIP PRO). Which one would you love to inspect?',
      recommendedVehicleIds: ['brezza', 'grand-vitara', 'fronx', 'jimny'],
      suggestedPrompts: ['Compare Brezza vs Grand Vitara', 'Grand Vitara Hybrid Mileage', 'Jimny 4x4 Features', 'Book SUV Test Ride'],
      actions: [
        { label: 'Compare SUVs', actionType: 'compare_cars' },
        { label: 'Book Test Ride', actionType: 'book_test_ride' }
      ],
      detectedIntent: 'Exploring Cars',
      estimatedSentiment: 'Highly Positive',
      stageUpdate: 'Evaluation'
    };
  }

  // Service Centre intent
  if (
    query.includes('service') ||
    query.includes('repair') ||
    query.includes('maintenance') ||
    query.includes('servicing') ||
    query.includes('mechanic') ||
    query.includes('ac issue') ||
    query.includes('oil change')
  ) {
    const cityMention = ['ahmedabad', 'mumbai', 'pune', 'delhi', 'gurugram', 'noida', 'jaipur', 'lucknow', 'ghaziabad'].find(c => query.includes(c));
    return {
      reply: cityMention
        ? `Sure! Here is our demo service-centre directory for ${cityMention.charAt(0).toUpperCase() + cityMention.slice(1)}. You can explore authorized workshops, specializations (Periodic maintenance, AC, Battery, Engine), opening hours, and book a simulated service assistance callback.`
        : 'Maruti Suzuki operates India’s largest service network with 4,000+ authorized workshops. You can explore workshop locations, filter by service requirement (Periodic maintenance, AC, Battery, Engine diagnostics), and schedule a simulated callback.',
      suggestedPrompts: ['Find Service Centres', 'Check Periodic Maintenance', 'Schedule Service Callback'],
      actions: [
        { label: 'View Service Centres', actionType: 'service_centre' },
        { label: 'Schedule Callback', actionType: 'callback' }
      ],
      detectedIntent: 'Service Inquiry',
      estimatedSentiment: 'Neutral',
      stageUpdate: 'Discovery'
    };
  }

  // Showrooms near me
  if (
    query.includes('showroom') ||
    query.includes('dealer') ||
    query.includes('dealership') ||
    query.includes('near me') ||
    query.includes('kahan hai') ||
    query.includes('address')
  ) {
    return {
      reply: language === 'hi'
        ? 'Aap Delhi, Gurugram, Noida, Ghaziabad, Ahmedabad, Mumbai, Pune, Jaipur ya Lucknow ke kisi bhi Maruti Suzuki ARENA ya NEXA showroom ka address, phone number aur facilities dekh sakte hain.'
        : language === 'gu'
        ? 'Tame Ahmedabad, Mumbai, Delhi ane bija shahro ma Maruti Suzuki ARENA ane NEXA na showrooms na demo addresses ane contact details joi shako chho.'
        : language === 'mr'
        ? 'Aaplya jawalil Mumbai, Pune, Delhi ithe aslelya Maruti Suzuki ARENA aani NEXA showroom che demo details pahu shakto.'
        : 'I can connect you to our interactive Showroom Explorer covering Delhi, Gurugram, Ghaziabad, Noida, Ahmedabad, Mumbai, Pune, Jaipur, and Lucknow across both ARENA and NEXA channels. Would you like to check addresses and facilities?',
      suggestedPrompts: ['Find Showrooms in Ahmedabad', 'Find Showrooms in Delhi', 'Find Showrooms in Mumbai', 'Book Test Ride'],
      actions: [
        { label: 'Find Showrooms', actionType: 'find_showroom' },
        { label: 'Book Test Ride', actionType: 'book_test_ride' }
      ],
      detectedIntent: 'Exploring Cars',
      estimatedSentiment: 'Interested',
      stageUpdate: 'Discovery'
    };
  }

  // CNG inquiries
  if (
    query.includes('cng') ||
    query.includes('mileage') ||
    query.includes('average') ||
    query.includes('fuel economy') ||
    query.includes('kitna deti hai')
  ) {
    return {
      reply: 'Maruti Suzuki is the pioneer of factory-fitted S-CNG technology in India with dual interdependent ECUs and intelligent fuel injection! Top fuel-efficient picks include WagonR S-CNG (34.05 km/kg), Celerio S-CNG (34.43 km/kg), All-New Dzire S-CNG (33.73 km/kg), and Brezza S-CNG (25.51 km/kg).',
      recommendedVehicleIds: ['wagonr', 'celerio', 'dzire', 'brezza'],
      suggestedPrompts: ['Compare WagonR vs Celerio CNG', 'Dzire S-CNG Details', 'Book Test Ride'],
      actions: [
        { label: 'Compare Cars', actionType: 'compare_cars' },
        { label: 'Book Test Ride', actionType: 'book_test_ride' }
      ],
      detectedIntent: 'Budget Query',
      estimatedSentiment: 'Highly Positive',
      stageUpdate: 'Vehicle Shortlisting'
    };
  }

  // Insurance inquiries
  if (
    query.includes('insurance') ||
    query.includes('bima') ||
    query.includes('zero dep') ||
    query.includes('rto') ||
    query.includes('road tax') ||
    query.includes('warranty') ||
    query.includes('claim')
  ) {
    return {
      reply: 'Maruti Suzuki Insurance Broking (MIBPL) provides end-to-end cashless claim settlement across 4,000+ dealer workshops with 100% Maruti Genuine Parts. You can explore Zero-Depreciation covers, extended warranty up to 5 years, and state road tax guidance.',
      suggestedPrompts: ['Explore Zero-Dep Cover', 'Check Road Tax & Cess', 'Connect to Insurance Partner', 'Claim Settlement Process'],
      actions: [
        { label: 'Insurance & Legal Guide', actionType: 'insurance' },
        { label: 'Schedule Callback', actionType: 'callback' }
      ],
      detectedIntent: 'Insurance / Finance',
      estimatedSentiment: 'Interested',
      stageUpdate: 'Evaluation'
    };
  }

  // Comparison inquiries
  if (
    query.includes('compare') ||
    query.includes('versus') ||
    query.includes('vs') ||
    query.includes('difference') ||
    query.includes('antar')
  ) {
    return {
      reply: 'You can compare up to three Maruti Suzuki vehicles side-by-side on our dedicated comparison matrix! Inspect ex-showroom prices, engine specs, claimed mileage, boot space, safety ratings, and comfort equipment.',
      recommendedVehicleIds: ['swift-2024', 'baleno', 'fronx'],
      suggestedPrompts: ['Compare Swift vs Baleno', 'Compare Brezza vs Grand Vitara', 'Compare Ertiga vs XL6'],
      actions: [
        { label: 'Open Car Comparison', actionType: 'compare_cars' },
        { label: 'Ask AI About Specs', actionType: 'callback' }
      ],
      detectedIntent: 'Comparison',
      estimatedSentiment: 'Interested',
      stageUpdate: 'Evaluation'
    };
  }

  // General default fallback
  if (language === 'hi') {
    return {
      reply: 'Main aapki Maruti Suzuki car search ko aasan banane ke liye yahan hoon! Aap models dekh sakte hain, specs compare kar sakte hain, najdeeki showroom dhundh sakte hain ya demo test ride request bana sakte hain. Aap kya jaanna chahenge?',
      recommendedVehicleIds: ['swift-2024', 'brezza', 'grand-vitara'],
      suggestedPrompts: ['Find a car under ₹10 lakh', 'Compare SUVs', 'Book a test ride', 'Find a showroom near me'],
      actions: [
        { label: 'Book Test Ride', actionType: 'book_test_ride' },
        { label: 'Find Showrooms', actionType: 'find_showroom' }
      ],
      detectedIntent: 'Exploring Cars',
      estimatedSentiment: 'Neutral',
      stageUpdate: 'Discovery'
    };
  } else if (language === 'gu') {
    return {
      reply: 'Namaste! Maruti Suzuki showroom assistant ma tamaru swagat chhe. Tame car models joi shako chho, price ane mileage compare kari shako chho, ane demo test ride book kari shako chho. Hu tamari shu madad kari shaku?',
      recommendedVehicleIds: ['swift-2024', 'brezza', 'grand-vitara'],
      suggestedPrompts: ['10 Lakh ni andar car', 'Ahmedabad Showroom', 'Test Drive Book Karo', 'CNG Cars'],
      actions: [
        { label: 'Test Ride Book Karo', actionType: 'book_test_ride' },
        { label: 'Showroom Shodho', actionType: 'find_showroom' }
      ],
      detectedIntent: 'Exploring Cars',
      estimatedSentiment: 'Neutral',
      stageUpdate: 'Discovery'
    };
  } else if (language === 'mr') {
    return {
      reply: 'Namaskar! Maruti Suzuki AI Assistant madhe aaple swagat ahe. Tumhi cars shodhू shakto, mileage ani specifications compare karu shakto, kiwa test drive sathi demo request karu shakto. Mi tumhala kashi madat karu?',
      recommendedVehicleIds: ['swift-2024', 'brezza', 'dzire'],
      suggestedPrompts: ['₹10 Lakh chya aat car', 'Mumbai / Pune Showrooms', 'Test Drive Book Kara', 'CNG Models'],
      actions: [
        { label: 'Book Test Ride', actionType: 'book_test_ride' },
        { label: 'Find Showrooms', actionType: 'find_showroom' }
      ],
      detectedIntent: 'Exploring Cars',
      estimatedSentiment: 'Neutral',
      stageUpdate: 'Discovery'
    };
  }

  return {
    reply: "I'm here to help you navigate Maruti Suzuki's line-up! Whether you want to explore fuel-efficient hatchbacks, high-riding SUVs, or premium hybrid MPVs, compare specifications, locate verified showrooms, or book a demo test ride — what can I assist you with today?",
    recommendedVehicleIds: ['swift-2024', 'brezza', 'grand-vitara'],
    suggestedPrompts: ['Find a car under ₹10 lakh', 'Compare SUVs', 'Find a showroom near me', 'Explore CNG cars', 'Book a test ride'],
    actions: [
      { label: 'Book Test Ride', actionType: 'book_test_ride' },
      { label: 'Find Showrooms', actionType: 'find_showroom' },
      { label: 'Compare Cars', actionType: 'compare_cars' }
    ],
    detectedIntent: 'Exploring Cars',
    estimatedSentiment: 'Interested',
    stageUpdate: 'Discovery'
  };
}
