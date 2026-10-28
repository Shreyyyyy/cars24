/**
 * Recommendations Management Store & Approval Lifecycle Engine
 * Handles action items with review, human approval, editing, measurable KPIs, and audit trails.
 */

export interface MarketingRecommendation {
  id: string;
  title: string;
  targetEntity: string;
  entityType: 'showroom' | 'model' | 'region' | 'campaign';
  category: 'inventory_reallocation' | 'lead_conversion' | 'media_optimization' | 'pricing_discount' | 'dealer_sla';
  summary: string;
  rationale: string;
  expectedImpact: {
    incrementalUnits: number;
    incrementalRevenueCr: number;
    expectedRoiMultiplier: number;
    paybackPeriodDays: number;
  };
  complexity: 'Low' | 'Medium' | 'High';
  timeframe: 'Immediate (0-14d)' | 'Short-Term (15-45d)' | 'Mid-Term (46-90d)';
  status: 'draft' | 'under_review' | 'approved' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo: string;
  reviewerNotes?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  kpiTargets: {
    metric: string;
    currentValue: string;
    targetValue: string;
  }[];
}

/** Starts empty: recommendations are only created from the uploaded data, never pre-seeded examples. */
export const INITIAL_RECOMMENDATIONS: MarketingRecommendation[] = [];

class RecommendationsStore {
  private recommendations: MarketingRecommendation[] = [...INITIAL_RECOMMENDATIONS];

  getAll(): MarketingRecommendation[] {
    return this.recommendations;
  }

  getById(id: string): MarketingRecommendation | undefined {
    return this.recommendations.find(r => r.id === id);
  }

  updateStatus(id: string, status: MarketingRecommendation['status'], reviewerNotes?: string, approvedBy?: string): boolean {
    const item = this.getById(id);
    if (!item) return false;
    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (reviewerNotes) item.reviewerNotes = reviewerNotes;
    if (approvedBy && status === 'approved') {
      item.approvedBy = approvedBy;
      item.approvedAt = new Date().toISOString();
    }
    return true;
  }

  create(rec: Omit<MarketingRecommendation, 'id' | 'createdAt' | 'updatedAt' | 'status'>): MarketingRecommendation {
    const newRec: MarketingRecommendation = {
      ...rec,
      id: `rec_${Date.now()}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.recommendations.unshift(newRec);
    return newRec;
  }
}

export const recommendationsStore = new RecommendationsStore();
