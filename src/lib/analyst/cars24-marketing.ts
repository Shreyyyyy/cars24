/**
 * CARS24 India marketing data the analyst treats as internal actuals: five fiscal years of spend by
 * channel (media-spend system + finance P&L), objective and quarter splits, in-house marketing cost,
 * and the marketing-mix model (MMM) read-out. Simulated, but built to be internally consistent and
 * to tie to the reported FY26 marketing line (₹105 crore). Totals, shares and ROI are computed here,
 * never hand-typed, so every table reconciles; edit the inputs and the tables follow.
 */

type Group = 'Digital performance' | 'Brand and reach' | 'Owned, local and referral' | 'Non-working (agency, tools)';

interface Channel {
  name: string;
  group: Group;
  /** ₹ crore: FY22, FY23, FY24, FY25, FY26, H1 FY27 (Apr–Sep 2026) */
  spend: [number, number, number, number, number, number];
  /** MMM, FY26: cost per incremental transaction (₹) and adstock half-life; absent for non-working cost */
  mmm?: { costPerIncrTx: number; halfLife: string; marginalRoi: number; status: string };
}

const PERIODS = ['FY22', 'FY23', 'FY24', 'FY25', 'FY26', 'H1 FY27'] as const;
const FY26 = 4;
const H1_FY27 = 5;

const CHANNELS: Channel[] = [
  { name: 'Paid search (Google, Bing; brand + generic)', group: 'Digital performance', spend: [62, 55, 34, 24, 24, 11.8],
    mmm: { costPerIncrTx: 14000, halfLife: '1 week', marginalRoi: 0.9, status: 'Saturated on brand terms; generic used-car terms still scale' } },
  { name: 'Paid social (Meta, Instagram)', group: 'Digital performance', spend: [48, 42, 24, 16.5, 17, 8.7],
    mmm: { costPerIncrTx: 22000, halfLife: '1 week', marginalRoi: 1.0, status: 'Near optimum' } },
  { name: 'YouTube, OTT and connected TV', group: 'Brand and reach', spend: [40, 33, 15, 8, 8.5, 4.8],
    mmm: { costPerIncrTx: 34000, halfLife: '3 weeks', marginalRoi: 0.9, status: 'Below saturation; halo lifts search' } },
  { name: 'Programmatic and display', group: 'Digital performance', spend: [22, 18, 10, 6, 5.5, 2.4],
    mmm: { costPerIncrTx: 48000, halfLife: '1 week', marginalRoi: 0.4, status: 'Over-saturated; weakest marginal return' } },
  { name: 'App-install networks and affiliates', group: 'Digital performance', spend: [26, 20, 11, 6.5, 6, 2.1],
    mmm: { costPerIncrTx: 30000, halfLife: '1 week', marginalRoi: 0.6, status: 'Saturated; install fraud risk' } },
  { name: 'E-tail and fintech platform ads (Amazon, Flipkart, PhonePe, Paytm, CRED)', group: 'Digital performance', spend: [9, 10, 6, 4.5, 5, 3.4],
    mmm: { costPerIncrTx: 20000, halfLife: '1 week', marginalRoi: 1.2, status: 'Under-invested; strongest for loan and seller leads' } },
  { name: 'TV (Hindi GEC, news, regional)', group: 'Brand and reach', spend: [95, 70, 25, 7.5, 7, 2.6],
    mmm: { costPerIncrTx: 42000, halfLife: '4 weeks', marginalRoi: 0.8, status: 'Works only in festive bursts' } },
  { name: 'Sports and IPL sponsorships', group: 'Brand and reach', spend: [55, 38, 12, 4, 4, 3.2],
    mmm: { costPerIncrTx: 55000, halfLife: '5 weeks', marginalRoi: 0.4, status: 'Brand-only; lowest direct return' } },
  { name: 'Influencer and creator (incl. auto YouTubers)', group: 'Brand and reach', spend: [6, 8, 5, 4, 4.5, 2.6],
    mmm: { costPerIncrTx: 26000, halfLife: '2 weeks', marginalRoi: 1.1, status: 'Below saturation' } },
  { name: 'OOH, radio and print (near hubs)', group: 'Brand and reach', spend: [18, 14, 7, 5, 4.5, 2.2],
    mmm: { costPerIncrTx: 40000, halfLife: '3 weeks', marginalRoi: 0.6, status: 'Useful only within ~5 km of a hub' } },
  { name: 'Hub BTL and local activations', group: 'Owned, local and referral', spend: [4, 5, 4, 4, 4.5, 2.6],
    mmm: { costPerIncrTx: 18000, halfLife: '1 week', marginalRoi: 1.3, status: 'Under-invested in Tier-2 hub cities' } },
  { name: 'CRM messaging (WhatsApp, SMS, push, email)', group: 'Owned, local and referral', spend: [3, 3.5, 3, 3, 3.5, 1.9],
    mmm: { costPerIncrTx: 8000, halfLife: 'under 1 week', marginalRoi: 2.0, status: 'Highest return; capped by consented base' } },
  { name: 'Referral and customer incentives', group: 'Owned, local and referral', spend: [5, 5, 3.5, 3, 3, 1.6],
    mmm: { costPerIncrTx: 15000, halfLife: '2 weeks', marginalRoi: 1.5, status: 'Under-invested' } },
  { name: 'Agency fees and creative production', group: 'Non-working (agency, tools)', spend: [17, 13, 7, 4.5, 4, 1.5] },
  { name: 'Martech, data and tools (CDP, attribution, MMM, analytics)', group: 'Non-working (agency, tools)', spend: [6, 6.5, 5, 4, 4, 2.1] }
];

/** In-house marketing and growth team cost, ₹ crore, same periods. Booked in employee benefits, not in the marketing line. */
const IN_HOUSE_TEAM: number[] = [52, 58, 44, 33, 34, 18];

/** FY26 working-media spend by objective, ₹ crore (must sum to FY26 working media). */
const FY26_OBJECTIVES: [string, number][] = [
  ['Seller acquisition (C2B quote requests and inspections)', 37],
  ['Retail buyer demand (leads, test drives, bookings)', 42],
  ['Brand and trust', 12],
  ['Financial services (LOANS24) and CarInfo cross-sell', 6]
];

/** Quarterly total marketing spend, ₹ crore (must sum to FY26 and H1 FY27 totals). */
const QUARTERS: [string, number, string][] = [
  ['Q1 FY26 (Apr–Jun 2025)', 24.6, 'Steady digital; IPL 2025 sponsorship'],
  ['Q2 FY26 (Jul–Sep 2025)', 26.9, 'Pre-festive build; held back after GST 2.0 price reset (22 Sep)'],
  ['Q3 FY26 (Oct–Dec 2025)', 31.2, 'Navratri–Diwali burst, TV and YouTube; December year-end seller push'],
  ['Q4 FY26 (Jan–Mar 2026)', 22.3, 'Cut back for EBITDA; search, CRM and referral protected'],
  ['Q1 FY27 (Apr–Jun 2026)', 27.6, 'IPL 2026; LOANS24 and CarInfo cross-sell campaigns'],
  ['Q2 FY27 (Jul–Sep 2026)', 25.9, 'Pre-festive build; Pitru Paksha (26 Sep–10 Oct) held spend back']
];

/** FY26 spend by geography, % of total (must sum to 100). */
const FY26_GEO: [string, number][] = [
  ['Delhi NCR', 17], ['Bengaluru', 15], ['Mumbai and Pune', 14], ['Hyderabad', 10], ['Chennai', 6],
  ['Other hub cities (19)', 22], ['Non-hub procurement cities', 6], ['National, not geo-targeted', 10]
];

/** Blended contribution per incremental transaction used by the MMM (₹): 44% retail × ~₹42,500 + 56% auction × ~₹13,500, plus loan income. */
const CONTRIBUTION_PER_TX = 26000;
const FY26_TRANSACTIONS = 155000;
const FY26_GMV_CRORE = 8046;
const FY27_PLAN_CRORE = 118;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const r1 = (x: number) => Math.round(x * 10) / 10;
const cr = (x: number) => `₹${r1(x).toFixed(1)}`;
const pct = (part: number, whole: number) => `${((part / whole) * 100).toFixed(1)}%`;
const inr = (x: number) => Math.round(x).toLocaleString('en-IN');
/** Signed change, e.g. +3.9% / −61.3% */
const chg = (from: number, to: number) => { const v = ((to - from) / from) * 100; return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`; };

const totals = PERIODS.map((_, i) => r1(sum(CHANNELS.map(c => c.spend[i]))));
const working = PERIODS.map((_, i) => r1(sum(CHANNELS.filter(c => c.group !== 'Non-working (agency, tools)').map(c => c.spend[i]))));

function check(label: string, actual: number, expected: number) {
  if (Math.abs(actual - expected) > 0.05) throw new Error(`cars24-marketing: ${label} is ${actual}, expected ${expected}`);
}
// Fail at import (and so at build) if the inputs stop reconciling
check('FY26 total vs reported marketing line', totals[FY26], 105);
check('FY26 objectives vs working media', sum(FY26_OBJECTIVES.map(o => o[1])), working[FY26]);
check('FY26 quarters vs FY26 total', sum(QUARTERS.slice(0, 4).map(q => q[1])), totals[FY26]);
check('FY27 quarters vs H1 FY27 total', sum(QUARTERS.slice(4).map(q => q[1])), totals[H1_FY27]);
check('FY26 geography shares', sum(FY26_GEO.map(g => g[1])), 100);

function spendTable(): string {
  const head = `| Channel | Group | ${PERIODS.join(' | ')} | FY26 share | FY22→FY26 |`;
  const sep = `|---|---|${PERIODS.map(() => '---:').join('|')}|---:|---:|`;
  const rows = CHANNELS.map(c =>
    `| ${c.name} | ${c.group} | ${c.spend.map(cr).join(' | ')} | ${pct(c.spend[FY26], totals[FY26])} | ${chg(c.spend[0], c.spend[FY26])} |`);
  const groups = Array.from(new Set(CHANNELS.map(c => c.group))).map(g => {
    const s = PERIODS.map((_, i) => sum(CHANNELS.filter(c => c.group === g).map(c => c.spend[i])));
    return `| *Subtotal: ${g}* | | ${s.map(cr).join(' | ')} | ${pct(s[FY26], totals[FY26])} | ${chg(s[0], s[FY26])} |`;
  });
  const total = `| **Total marketing (P&L marketing line)** | | ${totals.map(cr).join(' | ')} | 100.0% | ${chg(totals[0], totals[FY26])} |`;
  const team = `| In-house marketing and growth team (in employee benefits, outside the line above) | | ${IN_HOUSE_TEAM.map(cr).join(' | ')} | | |`;
  const loaded = `| **Fully loaded marketing cost (line + team)** | | ${totals.map((t, i) => cr(t + IN_HOUSE_TEAM[i])).join(' | ')} | | |`;
  return [head, sep, ...rows, ...groups, total, team, loaded].join('\n');
}

function mmmTable(): string {
  const media = CHANNELS.filter(c => c.mmm);
  const rows = media.map(c => {
    const m = c.mmm!;
    const incr = Math.round((c.spend[FY26] * 1e7) / m.costPerIncrTx);
    return { c, m, incr, roi: CONTRIBUTION_PER_TX / m.costPerIncrTx };
  });
  const incrTotal = sum(rows.map(r => r.incr));
  const lines = rows.map(({ c, m, incr, roi }) =>
    `| ${c.name} | ${cr(c.spend[FY26])} | ${inr(incr)} | ₹${inr(m.costPerIncrTx)} | ${roi.toFixed(2)}× | ${m.marginalRoi.toFixed(1)}× | ${m.halfLife} | ${m.status} |`);
  const roiWorking = (incrTotal * CONTRIBUTION_PER_TX) / (working[FY26] * 1e7);
  const roiTotal = (incrTotal * CONTRIBUTION_PER_TX) / (totals[FY26] * 1e7);
  return [
    '| Channel | FY26 spend (₹ cr) | Incremental transactions | Cost per incremental transaction | ROI (contribution ÷ spend) | Marginal ROI (next ₹1) | Adstock half-life | Saturation read-out |',
    '|---|---:|---:|---:|---:|---:|---|---|',
    ...lines,
    `| **Working media total** | ${cr(working[FY26])} | ${inr(incrTotal)} | ₹${inr((working[FY26] * 1e7) / incrTotal)} | ${roiWorking.toFixed(2)}× | | | |`,
    '',
    `- Base vs marketing: of ~${inr(FY26_TRANSACTIONS)} FY26 India transactions (est.), ${inr(incrTotal)} (${pct(incrTotal, FY26_TRANSACTIONS)}) are incremental to paid and owned marketing; the remaining ${inr(FY26_TRANSACTIONS - incrTotal)} are base demand (brand equity built in FY22–FY23, organic app and web, repeat customers, word of mouth, CarInfo and Team-BHP traffic).`,
    `- ROI uses a blended contribution of ₹${inr(CONTRIBUTION_PER_TX)} per incremental transaction (44% retail at ~₹42,500 margin, 56% auction at ~₹13,500 commission, plus loan income). ROI on total marketing including non-working cost: ${roiTotal.toFixed(2)}×. On customer lifetime value (repeat sell-and-buy, loans, warranty, ownership services) ROI is ~1.6× on working media.`,
    '- Average ROI ranks past performance; marginal ROI ranks where the next rupee should go. Reallocation advice uses marginal ROI and respects saturation; brand channels (TV, sports, YouTube) carry long adstock, so judge them over 8–12 weeks, not in-week.'
  ].join('\n');
}

export const CARS24_MARKETING_MIX = `
**Marketing spend by channel, CARS24 India (₹ crore; FY22–FY26 full years, H1 FY27 = Apr–Sep 2026 actuals)**
${spendTable()}

Source and basis: media-spend system reconciled to the finance P&L marketing line (gross of agency commission, ex-GST). FY26 ties to the reported ₹105 crore. FY22 is shown as a full year for comparison even though monthly data starts at the window start. H1 FY27 total ${cr(totals[H1_FY27])} crore vs H1 FY26 ${cr(QUARTERS[0][1] + QUARTERS[1][1])} crore (${chg(QUARTERS[0][1] + QUARTERS[1][1], totals[H1_FY27])}). FY27 marketing plan: ₹${FY27_PLAN_CRORE} crore (Plan), so H2 FY27 plan = ₹${r1(FY27_PLAN_CRORE - totals[H1_FY27]).toFixed(1)} crore, weighted to the Navratri–Diwali window (Oct–Nov 2026) and the December–January seller season.

**The five-year story:** FY22–FY23 were the brand-building years (TV, sports and IPL, YouTube and other brand and reach channels were about half of spend). From FY24 the company cut marketing hard on the path to profitability: total spend fell ${pct(totals[0] - totals[FY26], totals[0])} from FY22 to FY26 while GMV held, because base demand built in the brand years kept coming, and performance, CRM and referral replaced mass media. Brand and reach fell from ${pct(sum(CHANNELS.filter(c => c.group === 'Brand and reach').map(c => c.spend[0])), totals[0])} of spend in FY22 to ${pct(sum(CHANNELS.filter(c => c.group === 'Brand and reach').map(c => c.spend[FY26])), totals[FY26])} in FY26.

**Intensity (FY26):** marketing = ${pct(totals[FY26], FY26_GMV_CRORE)} of GMV (₹${totals[FY26]} crore ÷ ₹${inr(FY26_GMV_CRORE)} crore); ₹${inr((totals[FY26] * 1e7) / FY26_TRANSACTIONS)} per transaction (÷ ~${inr(FY26_TRANSACTIONS)} transactions, est.); fully loaded with the in-house team ₹${inr(((totals[FY26] + IN_HOUSE_TEAM[FY26]) * 1e7) / FY26_TRANSACTIONS)} per transaction. Working media ${cr(working[FY26])} crore (${pct(working[FY26], totals[FY26])}), non-working ${cr(totals[FY26] - working[FY26])} crore.

**FY26 working media by objective (₹ crore)**
| Objective | Spend | Share of working media |
|---|---:|---:|
${FY26_OBJECTIVES.map(([o, v]) => `| ${o} | ${cr(v)} | ${pct(v, working[FY26])} |`).join('\n')}
| **Total working media** | ${cr(working[FY26])} | 100.0% |

**Quarterly total marketing spend (₹ crore)**
| Quarter | Spend | What drove it |
|---|---:|---|
${QUARTERS.map(([q, v, why]) => `| ${q} | ${cr(v)} | ${why} |`).join('\n')}

**FY26 spend by geography (% of total ₹${totals[FY26]} crore)**
| Geography | Share | ₹ crore |
|---|---:|---:|
${FY26_GEO.map(([g, s]) => `| ${g} | ${s}% | ${cr((totals[FY26] * s) / 100)} |`).join('\n')}
| **Total** | 100% | ${cr(totals[FY26])} |

**Marketing-mix model (MMM) read-out, FY26 (weekly Bayesian MMM with adstock and saturation, refreshed quarterly, validated against geo hold-outs)**
${mmmTable()}

**Rules for marketing answers**
- These are internal actuals from the media-spend system and finance P&L; MMM figures are modelled — say "modelled" when you give them. Use these numbers exactly; derive anything finer (months, campaigns, cities, weeks) so it adds back to them.
- A month's channel spend follows its quarter total and the seasonality above; months add to quarters, quarters to years, channels to the total, cities to the geography split.
- Budget reallocation is zero-sum within the stated budget (FY27 Plan ₹${FY27_PLAN_CRORE} crore) unless the user asks to change the budget; move money from low to high marginal ROI and stop before saturation.
- Seller-side and buyer-side spend serve different funnels: judge seller spend on cost per inspection and cost per procurement, buyer spend on cost per booking and cost per retail sale.
- Closed months after Sep 2026 are not in this sheet: derive their actuals from the H2 FY27 plan and the seasonality above, keep them fixed for the conversation, and label the current month MTD. Spend after today is Plan or projection, never actual.
`.trim();
