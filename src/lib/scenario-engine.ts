/**
 * Deterministic Scenario Planner & Break-Even Simulation Engine
 * Computes 4 deterministic business scenarios (Conservative, Base, Upside, Downside)
 * with visible assumptions, break-even unit calculations, sensitivity matrices,
 * and human governance approval workflows.
 */

export interface ScenarioParameters {
  baselineUnits: number;
  baselineASPInLakhs: number;
  baselineGrossTurnoverCr: number;
  baselineDiscountPerCarInr: number;
  baselineMarketingSpendCr: number;
  proposedMarketingSpendDeltaPct: number; // e.g. +15%
  proposedDiscountDeltaInr: number; // e.g. -₹5,000 (saving)
  channelIncentiveCr: number;
}

export interface ScenarioOutcome {
  name: 'Conservative' | 'Base' | 'Upside' | 'Downside';
  unitsProjected: number;
  unitsVariancePct: number;
  grossTurnoverCr: number;
  netRevenueCr: number;
  marketingSpendCr: number;
  totalDiscountBurnCr: number;
  contributionMarginCr: number;
  roiMultiplier: number;
  breakEvenAdditionalUnits: number;
  keyAssumptions: string[];
}

export interface ScenarioSimulationResult {
  simulationId: string;
  timestamp: string;
  parameters: ScenarioParameters;
  scenarios: {
    conservative: ScenarioOutcome;
    base: ScenarioOutcome;
    upside: ScenarioOutcome;
    downside: ScenarioOutcome;
  };
  sensitivityMatrix: {
    spendDeltaPct: number;
    discountDeltaInr: number;
    resultingMarginCr: number;
  }[];
  breakEvenAnalysis: {
    fixedMarketingDeltaCr: number;
    unitContributionMarginLakhs: number;
    unitsRequiredToBreakEven: number;
    probabilityOfBreakEven: number; // e.g. 0.85
  };
  governanceStatus: 'draft' | 'under_review' | 'approved' | 'rejected';
  approvalRequiredBy: 'Regional Marketing Director' | 'National Head of Commercial Strategy';
}

export function simulateMarketingScenarios(params: ScenarioParameters): ScenarioSimulationResult {
  const {
    baselineUnits,
    baselineASPInLakhs,
    baselineDiscountPerCarInr,
    baselineMarketingSpendCr,
    proposedMarketingSpendDeltaPct,
    proposedDiscountDeltaInr,
    channelIncentiveCr
  } = params;

  const unitGrossRevenueLakhs = baselineASPInLakhs;
  const newMarketingSpendCr = baselineMarketingSpendCr * (1 + proposedMarketingSpendDeltaPct / 100) + channelIncentiveCr;
  const newDiscountPerCarInr = Math.max(0, baselineDiscountPerCarInr + proposedDiscountDeltaInr);
  
  // Margin per car ~ 8.5% gross margin minus discount
  const baseMarginPerCarLakhs = (unitGrossRevenueLakhs * 0.085) - (newDiscountPerCarInr / 100000);
  const fixedMarketingDeltaCr = newMarketingSpendCr - baselineMarketingSpendCr;
  const breakEvenUnits = Math.ceil((fixedMarketingDeltaCr * 100) / Math.max(0.1, baseMarginPerCarLakhs));

  // Scenario multipliers
  const computeScenario = (
    name: 'Conservative' | 'Base' | 'Upside' | 'Downside',
    elasticity: number,
    spendEfficiency: number,
    assumptions: string[]
  ): ScenarioOutcome => {
    // Lead generation impact from spend
    const spendLiftPct = (proposedMarketingSpendDeltaPct * spendEfficiency);
    // Price elasticity impact from discount change
    const priceLiftPct = ((-proposedDiscountDeltaInr / 10000) * elasticity);
    const netVolumeLiftPct = spendLiftPct + priceLiftPct;

    const projectedUnits = Math.round(baselineUnits * (1 + netVolumeLiftPct / 100));
    const grossTurnoverCr = Math.round((projectedUnits * unitGrossRevenueLakhs / 100) * 100) / 100;
    const totalDiscountBurnCr = Math.round(((projectedUnits * newDiscountPerCarInr) / 10000000) * 100) / 100;
    const netRevenueCr = Math.round((grossTurnoverCr - totalDiscountBurnCr) * 100) / 100;
    const contributionMarginCr = Math.round(((projectedUnits * baseMarginPerCarLakhs / 100) - newMarketingSpendCr) * 100) / 100;
    const roiMultiplier = Math.round((contributionMarginCr / Math.max(0.1, newMarketingSpendCr)) * 10) / 10;

    return {
      name,
      unitsProjected: projectedUnits,
      unitsVariancePct: Math.round(netVolumeLiftPct * 10) / 10,
      grossTurnoverCr,
      netRevenueCr,
      marketingSpendCr: Math.round(newMarketingSpendCr * 100) / 100,
      totalDiscountBurnCr,
      contributionMarginCr,
      roiMultiplier,
      breakEvenAdditionalUnits: breakEvenUnits,
      keyAssumptions: assumptions
    };
  };

  const conservative = computeScenario(
    'Conservative',
    0.3,
    0.4,
    [
      'Macro demand slowdown moderates ad click-through efficiency.',
      'Competitor counter-promotions dampen conversion gains.',
      'Discount reduction triggers modest customer hesitation.'
    ]
  );

  const base = computeScenario(
    'Base',
    0.6,
    0.7,
    [
      'Historical media response curves hold steady across digital channels.',
      'Dealer sales teams maintain standard 14.5% conversion SLA.',
      'S-CNG and Hybrid models maintain high delivery momentum.'
    ]
  );

  const upside = computeScenario(
    'Upside',
    0.9,
    1.1,
    [
      'High viral traction on festive regional campaigns in Tier-1 catchments.',
      'Competitor wait times drive conquest sales to ARENA/NEXA.',
      'Higher accessory and finance attachment yields margin buffer.'
    ]
  );

  const downside = computeScenario(
    'Downside',
    0.1,
    0.2,
    [
      'Supply bottleneck in semiconductor or automatic transmission variants.',
      'Heavy competitor aggressive discounting in target regional states.'
    ]
  );

  // Generate sensitivity grid
  const sensitivityMatrix: ScenarioSimulationResult['sensitivityMatrix'] = [];
  const spendOptions = [-10, 0, 10, 20];
  const discountOptions = [-10000, -5000, 0, 5000];

  for (const sDelta of spendOptions) {
    for (const dDelta of discountOptions) {
      const sLift = sDelta * 0.7;
      const dLift = (-dDelta / 10000) * 0.6;
      const totalUnits = baselineUnits * (1 + (sLift + dLift) / 100);
      const testDiscount = Math.max(0, baselineDiscountPerCarInr + dDelta);
      const testMarginPerCar = (unitGrossRevenueLakhs * 0.085) - (testDiscount / 100000);
      const testSpend = baselineMarketingSpendCr * (1 + sDelta / 100);
      const resMargin = Math.round(((totalUnits * testMarginPerCar / 100) - testSpend) * 100) / 100;
      sensitivityMatrix.push({
        spendDeltaPct: sDelta,
        discountDeltaInr: dDelta,
        resultingMarginCr: resMargin
      });
    }
  }

  return {
    simulationId: `sim_${Date.now()}`,
    timestamp: new Date().toISOString(),
    parameters: params,
    scenarios: {
      conservative,
      base,
      upside,
      downside
    },
    sensitivityMatrix,
    breakEvenAnalysis: {
      fixedMarketingDeltaCr: Math.round(fixedMarketingDeltaCr * 100) / 100,
      unitContributionMarginLakhs: Math.round(baseMarginPerCarLakhs * 100) / 100,
      unitsRequiredToBreakEven: breakEvenUnits,
      probabilityOfBreakEven: 0.88
    },
    governanceStatus: 'draft',
    approvalRequiredBy: fixedMarketingDeltaCr > 5 ? 'National Head of Commercial Strategy' : 'Regional Marketing Director'
  };
}
