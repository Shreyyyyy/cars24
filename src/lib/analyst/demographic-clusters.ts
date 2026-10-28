/**
 * The CDP's customer clusters: one fixed segmentation the analyst uses for every demographic cut,
 * so cluster names, sizes and behaviour stay the same across questions and conversations.
 * Buyer shares are of FY26 India retail sales; seller shares are of FY26 cars procured from
 * individuals. Each table adds to 100%. Each customer has exactly one primary cluster per side
 * (assigned in the order listed, first match wins), so clusters never double-count.
 */

export const DEMOGRAPHIC_CLUSTERS = `
**Buyers (retail)**
| ID | Cluster | Who (CDP definition) | FY26 retail share | Where | Car and price affinity | Buying behaviour |
|---|---|---|---|---|---|---|
| B8 | Small Business & Fleet Buyers | Self-employed traders, cab and delivery operators buying for work | 5% | Metros and highway corridors | Dzire, Ertiga, Wagon R CNG; ₹3–7 lakh | CNG-first, finance-heavy, buys 1–3 cars, price-led |
| B6 | Premium Pre-owned Seekers | Household income above ₹25 lakh a year, wants a premium or larger SUV below new-car price | 7% | Metro and Tier-1 | Creta, Seltos, XUV700, City, Fortuner, luxury makes; ₹10–30 lakh | Inspection report and warranty decide, high extended-warranty uptake, low price sensitivity |
| B5 | Women Primary Buyers | Woman is the registered owner and decision-maker (not in B6/B8) | 8% | Urban and Tier-2 | Automatic hatchbacks: Baleno, i20, Swift AMT, Grand i10 | Safety and automatic drive choice, home test drive, strong review and referral influence |
| B1 | Metro First-Car Professionals | Age 23–32, salaried (IT, BFSI, services), first car in the household | 24% | Bengaluru, Hyderabad, Pune, Mumbai, NCR, Chennai | Swift, Baleno, i20, Nexon, Venue; ₹4–8 lakh | Fully digital journey, home test drive, highest loan attach, compares many listings |
| B2 | Family Upgraders | Age 30–45, household ₹8–20 lakh a year, replacing a smaller car or adding a second | 22% | Urban and Tier-1/2 | Creta, Brezza, Ertiga, Venue, City; ₹6–12 lakh | Sells old car to CARS24 in the same journey, festive-timed, space and safety focus |
| B3 | Tier-2 First-Time Buyers | First car in the household, age 25–40, ₹5–10 lakh a year | 20% | Tier-2 hub cities (Jaipur, Lucknow, Patna, Rajkot, Agra, Visakhapatnam, Kochi) | Wagon R, Alto K10, Swift, Grand i10, Kwid; ₹2.5–5 lakh | EMI-sensitive, visits a hub before booking, longest lead-to-booking, trust and documentation help matter |
| B4 | Budget Value Hunters | Price-first buyers of older, high-running cars | 9% | Peri-urban and smaller towns around hub cities | Older Wagon R, Alto, Eeco, Santro; under ₹3 lakh | Haggles, low loan attach, high cancellation, sensitive to new-car price cuts |
| B7 | Enthusiasts & Second-Car Buyers | Car enthusiasts and households buying a weekend or second car (Team-BHP-influenced) | 5% | Metro and Tier-1 | Polo GT, Jimny, Thar, Honda City, performance and diesel SUVs; ₹6–15 lakh | Reads reviews and forum threads, values service history, low discount sensitivity |

**Sellers (cars procured from individuals)**
| ID | Cluster | Who | FY26 procurement share | Behaviour |
|---|---|---|---|---|
| S5 | Fleet & Business De-fleeting | Fleet owners and businesses retiring cars | 6% | High running, bulk deals, mostly goes to dealer auction |
| S1 | Upgraders Selling to Buy New | Selling a 4–7-year-old car to buy a new one | 34% | Quote-sensitive, compares with the new-car dealer's exchange offer, festive-timed |
| S2 | Upgraders Buying on CARS24 | Sells and buys on CARS24 in the same journey | 14% | Highest lifetime value, best quote acceptance, links seller and buyer funnels |
| S3 | Cash-Need & Quick Sellers | Need money fast or are relocating | 19% | Same-day payment decides, lowest price sensitivity, high inspection-to-sale |
| S4 | Older Car Disposers | Car 8+ years old or nearing the end of its registration life (NCR 10/15-year rule) | 27% | Low realisation, mostly auction, NCR-heavy, challan and paperwork help matters |

Cluster rules: shares change only slowly year to year (a couple of points at most) and must stay consistent with the car mix you report. CarInfo signals (insurance renewal due, challans, car age, registration expiry) are richest for S1 and S4. When you cut by cluster, also cut by geography (metro / Tier-1 / Tier-2 / smaller towns) where it explains the pattern.
`.trim();
