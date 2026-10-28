/**
 * Publicly reported CARS24 facts the analyst anchors to (researched October 2026).
 * Internal detail the analyst derives (hub, city, funnel, inventory, loan book, model-level unit
 * economics) must reconcile to these. Update this sheet when new results or disclosures are published.
 *
 * Sources: Entrackr / MediaNama (FY26 India RoC filings, Sep 2026), Entrackr / BW Disrupt (FY25 filings),
 * Business Today CFO interview (H1 FY26, Jan 2026), Indian Television / Business Standard (Q4 FY26
 * first profitable quarter, May 2026), Vie Stories (reverse flip and IPO plan, Sep 2026), MediaInfoline
 * (50th hub, Agra, 21 Sep 2026), MediaNama (CarInfo acquisition, Jan 2026), Inc42 / YourStory (Team-BHP,
 * Apr 2025; LOANS24, Feb 2025).
 */

export const CARS24_PUBLIC_FACTS = `
**Company results (reported, CARS24 India entity, consolidated)**
| Period | Revenue from operations | Of which auction & retail (cars sold) | Financial services, fees & other operating | Total expenses | Net loss | Notes |
|---|---|---|---|---|---|---|
| FY24 (Apr 2023–Mar 2024) | ₹6,917 crore | — | — | — | ₹498 crore | — |
| FY25 (Apr 2024–Mar 2025) | ₹6,233 crore (−10%) | ~₹5,627 crore | ~₹606 crore | ~₹6,896 crore | ₹543 crore (+9%) | Vehicle procurement ~81% of total cost |
| FY26 (Apr 2025–Mar 2026) | ₹5,092 crore (−18.3%) | ₹4,349 crore (−22.7%) | ~₹653 crore | ₹5,674 crore | ₹441 crore (−18.8%) | Other income ₹128 crore; total income ₹5,220 crore |

FY26 cost lines: vehicle procurement ₹4,212 crore (−23.7%), employee benefits ₹806 crore (+33.4%; group ESOP cost ₹239 crore), marketing ₹105 crore (broadly flat). Combined GMV ₹8,046 crore in FY26 vs ₹7,827 crore in FY25 (+2.8%).

**Why revenue fell while GMV grew:** in mid-FY26 the wholesale (dealer auction) business moved from an inventory model to a commission model, so auction revenue is now booked as commission, not the full car value. Reported revenue is therefore not comparable across FY25 and FY26 for wholesale; use GMV, transactions and adjusted net revenue for growth.

**Management-reported operating metrics (group: India, UAE, Australia)**
| Period | Adjusted net revenue | Adjusted EBITDA | Loans disbursed | Other |
|---|---|---|---|---|
| H1 FY26 (Apr–Sep 2025) | ₹651 crore (+18%) | −₹162 crore (loss narrowed 36%) | ₹1,637 crore (+38%) | ~85,000 car transactions; GMV roughly flat; retail margins +3–4 pp YoY |
| H2 FY26 (Oct 2025–Mar 2026) | ₹760 crore (+37%) | Q4 FY26: +₹20 crore, first profitable quarter (H2 losses −83%) | ₹1,789 crore (+57%) | Retail GMV +35% YoY, now over 60% of transaction value; ownership services ~11× YoY |
| FY26 total | ₹1,411 crore | — | ₹3,426 crore | Target was 1.8 lakh+ transactions for the year |

December 2025 was the most profitable month. UAE reached positive EBITDA margin; Australia reached operating profitability in Q4 FY26. Q1 FY27 (Apr–Jun 2026) financial results have not been published; the only Q1 FY27 disclosure is that CARS24 processed over 1.1 trillion AI tokens in the quarter (CARS24 Labs, $20 million AI commitment, Jun 2026).

**Demand context**
- GST 2.0 (22 Sep 2025) cut new small-car prices (small cars 28% + cess to 18%), which caused short-term pain: used-car prices reset lower while CARS24 held stock bought at higher prices. Management called it temporary.
- India's used-car market grows ~10–12% a year. CARS24 aims to grow about twice as fast and reach ~10% market share in 3–4 years.
- Three in four retail buyers are first-time car owners. More than 3.8 crore users engage with CARS24 platforms each month; nearly one in ten Indian vehicle owners uses its services.

**Business lines**
- *Retail (B2C):* CARS24-owned, inspected and refurbished cars sold online and through hubs, with test drive at hub or home, financing and documentation help, warranty and return guarantee. 50 hubs in 24 cities (50th hub opened in Agra, 21 Sep 2026): Bengaluru 7, Hyderabad 5, Mumbai 5, Delhi 4; others include Chennai, Jaipur, Lucknow, Kochi, Patna, Rajkot, Visakhapatnam and Agra. Retail operations cover ~25 cities; plan is ~200 cities and up to ~50,000 cars of inventory.
- *Sell your car (C2B) and dealer auction (C2B2B):* instant price quote, home or branch inspection, same-day payment; cars not taken into retail are sold to partner dealers through the auction platform on commission (since mid-FY26).
- *Financial services:* CARS24 Financial Services (NBFC licence Jul 2019) and LOANS24 (launched Feb 2025): used- and new-car loans, loan against car, top-up loans. The lending arm is profitable; AUM ~₹2,000 crore (2025 report).
- *Ownership services:* CarInfo (Velocitypedia, acquired Jan 2026 for up to ₹118 crore): vehicle details, insurance and renewals with partners, challans, service history, personal loans up to ₹5 lakh. Also Vehicle Info (acquired).
- *Community:* Team-BHP (acquired Apr 2025, runs independently).
- *New cars:* entered the new-car market in 2025.
- *International:* UAE (~7% used-car share, growing ~30%), Australia (three cities). Answer about these only when asked; default scope is India.

**Corporate**
- Founded 2015 by Vikram Chopra (CEO), Mehul Agrawal, Gajendra Jangid and Ruchit Agarwal; CFO Shivanshu Makkar. Raised over $1.3 billion (SoftBank, Alpha Wave Global, Peak XV and others); last round $400 million Series G at $3.3 billion valuation; no fresh raise since and enough cash.
- Reverse flip from Singapore to India expected by April 2027, then DRHP filing; IPO 3–4 months after that.
`.trim();

/**
 * Canonical working assumptions for detail CARS24 does not publish. They are internal estimates,
 * fixed here so every conversation uses the same scale and mix. Always label them "est." in answers.
 */
export const CARS24_WORKING_ASSUMPTIONS = `
| Item | Canonical estimate (India, FY26) |
|---|---|
| Car transactions (retail + auction) | ~1.55 lakh (≈ 13,000 a month; H1 FY26 group 85,000 incl. UAE and Australia) |
| Split by count | Retail ~44% (~68,000 cars), dealer auction ~56% (~87,000 cars) |
| Average retail price | ~₹6.4 lakh; average auction car ~₹3.6 lakh |
| Retail gross margin per car | ~₹40,000–45,000 after refurbishment, before marketing and hub cost |
| Auction commission per car | ~₹12,000–15,000 |
| Body mix (retail) | Hatchback ~46%, compact SUV ~24%, sedan ~16%, mid-size SUV/MPV ~14% |
| Make mix (retail) | Maruti Suzuki ~44%, Hyundai ~24%, Tata ~8%, Honda ~7%, Mahindra ~5%, Toyota ~4%, Kia ~3%, others ~5% |
| Top retail models | Swift, Baleno, Wagon R, Dzire, i20, Grand i10, Creta, Venue, Brezza, Nexon, City, XUV300 |
| Age and running | Average car ~5.5 years old and ~52,000 km at sale |
| Fuel and transmission | Petrol ~76%, CNG ~8%, diesel ~15%, EV ~1%; automatic ~22% |
| Loan attach | ~45% of retail sales financed (LOANS24 + partner lenders); average ticket ~₹4.6 lakh |
| Days to sell (retail stock) | ~38 days average; stock over 60 days needs a price drop |
| Returns | ~3% of retail deliveries returned within the return window |

These estimates must reconcile to the reported facts above: FY26 GMV ₹8,046 crore ≈ retail cars × average retail price + auction cars × average auction price + new-car and other GMV.
`.trim();
