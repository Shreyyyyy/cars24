/**
 * Evidence-Based Diagnostic Advisor
 * Explains why a segment (showroom, model, city, channel...) lags by comparing it with the rest
 * of the uploaded file. Strictly separates:
 * 1. Observed facts (numbers from the file)
 * 2. Possible explanations (differences found in the file; correlations, not proven causes)
 * 3. Recommended actions, each tied to one of those differences
 * 4. Limitations
 * Nothing is benchmarked against outside figures, and no targets are invented.
 */

import { DiagnosticPayload, DiagnosticRootCause, TurnaroundPhase } from '@/types/chat';
import { formatMetric } from './answer-facts';
import { businessLabel } from './formatters';
import { profileSegment, SegmentProfile } from './growth-opportunities';

export interface DiagnosticContext {
  /** Source column holding the segment (e.g. "city") */
  column: string;
  /** Table to prefer when several contain the column */
  table?: string;
}

function factsFromRow(metrics: Record<string, any>): string[] {
  return Object.entries(metrics)
    .filter(([k, v]) => k !== 'id' && typeof v === 'number' && Number.isFinite(v))
    .slice(0, 6)
    .map(([k, v]) => `${businessLabel(k)}: ${formatMetric(v, k)}`);
}

function severityOf(profile: SegmentProfile | null, metrics: Record<string, any>): DiagnosticPayload['severityLevel'] {
  const targetAch = metrics.target_achievement_pct ?? metrics.targetAchievementPct;
  if (targetAch !== undefined) {
    return Number(targetAch) < 85 ? 'Critical' : Number(targetAch) < 95 ? 'High' : 'Moderate';
  }
  if (profile?.segmentRate !== undefined && profile.overallRate) {
    const ratio = profile.segmentRate / profile.overallRate;
    return ratio < 0.7 ? 'Critical' : ratio < 0.85 ? 'High' : ratio < 1 ? 'Moderate' : 'Low';
  }
  return 'Moderate';
}

export function generateEvidenceBasedDiagnostic(
  subjectName: string,
  subjectType: 'showroom' | 'vehicle' | 'region' | 'channel',
  metrics: Record<string, any> = {},
  context?: DiagnosticContext
): DiagnosticPayload {
  const profile = context ? profileSegment(context.column, subjectName, context.table) : null;

  const observedFacts = [...factsFromRow(metrics), ...(profile?.facts || [])];
  if (observedFacts.length === 0) {
    observedFacts.push(`No numeric measures were returned for "${subjectName}".`);
  }

  const potentialExplanations: DiagnosticRootCause[] = (profile?.drivers || []).map(d => ({
    category: d.category,
    finding: d.finding,
    impact: 'A difference found in your data. It points to where to look, but does not prove the cause.',
    evidence: d.evidence,
    isHypothesis: true
  }));

  const turnaroundPlaybook: TurnaroundPhase[] = [];
  const drivers = profile?.drivers || [];
  if (drivers.length > 0) {
    const rateKpi = profile?.segmentRate !== undefined && profile.overallRate !== undefined
      ? `${businessLabel(profile.outcomeNoun || 'conversion')} rate: ${(profile.segmentRate * 100).toFixed(1)}% now, ${(profile.overallRate * 100).toFixed(1)}% file average`
      : undefined;

    turnaroundPlaybook.push({
      phase: 'Step 1: Confirm the cause',
      timeframe: 'Weeks 1–2',
      title: `Validate the top difference with the ${subjectName} team`,
      actionItems: drivers.slice(0, 2).map(d => `Check on the ground: ${d.finding}`),
      expectedOutcome: 'Agreement on which difference is driving results before money is moved.',
      responsibleRole: 'Sales / regional manager'
    });
    turnaroundPlaybook.push({
      phase: 'Step 2: Act on it',
      timeframe: 'Weeks 2–6',
      title: 'Fix the biggest gap first',
      actionItems: Array.from(new Set(drivers.map(d => d.action))).slice(0, 3),
      expectedOutcome: 'The gap to the file average starts closing.',
      responsibleRole: 'Sales & marketing leads',
      targetKpi: rateKpi
    });
    turnaroundPlaybook.push({
      phase: 'Step 3: Track and scale',
      timeframe: 'Weeks 6–12',
      title: 'Re-upload fresh data and compare',
      actionItems: [
        `Re-run this analysis on the next data extract and compare ${subjectName} with this baseline.`,
        'Roll out what worked to other segments with the same gap.'
      ],
      expectedOutcome: 'Evidence of whether the actions moved the numbers.',
      responsibleRole: 'Business analyst',
      targetKpi: rateKpi
    });
  }

  const assumptionsAndLimitations = [
    'Every figure comes from the uploaded file; no outside benchmarks are used.',
    'Explanations are differences observed in the data (correlations), not proven causes.'
  ];
  if (!profile) {
    assumptionsAndLimitations.push('Only the query result was available, so no comparison with the rest of the file could be made. Ask for a breakdown to find drivers.');
  }

  const unitsLift = profile?.missedWins
    ? `≈${profile.missedWins.toLocaleString('en-IN')} more ${profile.outcomeNoun} if ${subjectName} converted at the file average`
    : profile?.outcomeNoun
      ? `Not applicable: ${subjectName} already converts at or above the file average`
      : 'Not quantified: the file has no outcome column (e.g. booked/delivered) to size it';

  return {
    subjectName,
    subjectType,
    severityLevel: severityOf(profile, metrics),
    overallAssessment: drivers.length > 0
      ? `${subjectName} was compared with the rest of the file. The differences below are where it stands apart; confirm them before committing budget.`
      : `${subjectName}: the figures below come from your data. No other column shows a clear difference, so the cause is likely outside what this file records.`,
    observedFacts,
    potentialExplanations,
    turnaroundPlaybook,
    assumptionsAndLimitations,
    projectedRecovery: {
      unitsLift,
      revenueUplift: profile?.missedValue ? `≈${profile.missedValue} at the file's average value` : '',
      timeline: 'arithmetic on your data, not a forecast',
      confidenceScore: 'Not estimated',
      isScenarioEstimate: true
    }
  };
}

