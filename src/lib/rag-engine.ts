import { DatasetMetadata, executeSQLiteQuery } from './sqlite-server';
import { computeResultFacts, formatMetric, humanizeColumn, ResultFacts } from './answer-facts';
import { getOutputModeConfig } from './output-mode';

export interface RAGChunk {
  id: string;
  category: 'schema_metadata' | 'marketing_playbook' | 'dealership_benchmark' | 'regional_pattern' | 'data_aggregate';
  title: string;
  content: string;
  metadata: Record<string, any>;
  score?: number;
}

export interface MarketingReasoning {
  executiveSummary: string;
  strategicTakeaways: string[];
  operationalAssessment?: string;
  marketingRecommendations: string[];
  retrievedChunks: RAGChunk[];
}

/*
 * There is deliberately no built-in "industry knowledge" corpus: hard-coded benchmarks would be quoted
 * as if they were facts about the user's business. Retrieval covers only the uploaded file
 * (its schema and any uploaded documents).
 */

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2)
  );
}

function calculateSimilarity(queryTokens: Set<string>, chunkText: string, chunkMeta: Record<string, any>): number {
  const chunkTokens = tokenize(chunkText);
  let matchCount = 0;

  queryTokens.forEach(token => {
    if (chunkTokens.has(token)) {
      matchCount += 2.0;
    } else {
      for (const ct of Array.from(chunkTokens)) {
        if (ct.startsWith(token) || token.startsWith(ct)) {
          matchCount += 1.0;
          break;
        }
      }
    }
  });

  const metaStr = JSON.stringify(chunkMeta).toLowerCase();
  queryTokens.forEach(token => {
    if (metaStr.includes(token)) {
      matchCount += 1.5;
    }
  });

  return matchCount / Math.max(queryTokens.size, 1);
}

const uploadedDocumentChunks: RAGChunk[] = [];

export function addUploadedDocumentChunks(chunks: RAGChunk[]): void {
  uploadedDocumentChunks.push(...chunks);
}

export function clearUploadedDocumentChunks(): void {
  uploadedDocumentChunks.length = 0;
}

export function getUploadedDocumentChunks(): RAGChunk[] {
  return [...uploadedDocumentChunks];
}

export function retrieveRelevantChunks(
  query: string,
  metadata: DatasetMetadata,
  limit: number = 5
): RAGChunk[] {
  const queryTokens = tokenize(query);
  const isSchemaInquiry = /\b(column|schema|field|data type|columns|table structure|data dictionary)\b/i.test(query);

  const schemaChunks: RAGChunk[] = isSchemaInquiry ? (metadata.schema || []).map(col => ({
    id: `schema_${col.column_name}`,
    category: 'schema_metadata',
    title: `Column: ${col.column_name}`,
    content: `Database column "${col.column_name}" of type ${col.column_type}.`,
    metadata: { columnName: col.column_name, type: col.column_type }
  })) : [];

  const allChunks: RAGChunk[] = [...schemaChunks, ...uploadedDocumentChunks];
  if (allChunks.length === 0) return [];

  const scoredChunks = allChunks.map(chunk => {
    const score = calculateSimilarity(queryTokens, `${chunk.title} ${chunk.content}`, chunk.metadata);
    return { ...chunk, score };
  });

  scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scoredChunks.filter(c => (c.score || 0) > 0.5).slice(0, limit);
}

export function resolveQueryColumns(
  query: string,
  columns: string[],
  columnProfiles: Record<string, any> = {}
) {
  const textCols = columns.filter(c => !columnProfiles[c]?.isNumeric);
  const numCols = columns.filter(c => columnProfiles[c]?.isNumeric);

  const showroomCol =
    columns.find(c => ['assigned_dealer', 'showroom_name', 'dealer_name', 'dealership', 'showroom', 'outlet_name', 'branch'].includes(c.toLowerCase())) ||
    textCols.find(c => c.includes('dealer') || c.includes('showroom') || c.includes('branch') || c.includes('outlet')) ||
    textCols[0];

  const modelCol =
    columns.find(c => ['model_of_interest', 'final_model', 'model_name', 'car_model', 'vehicle_model', 'model', 'product', 'car'].includes(c.toLowerCase())) ||
    textCols.find(c => c.includes('model') || c.includes('car') || c.includes('vehicle')) ||
    textCols[1] || textCols[0];

  const fuelCol =
    columns.find(c => ['preferred_fuel_type', 'final_fuel_type', 'fuel_type', 'fuel'].includes(c.toLowerCase())) ||
    textCols.find(c => c.includes('fuel'));

  const stateCol =
    columns.find(c => ['state', 'region', 'zone', 'territory'].includes(c.toLowerCase())) ||
    textCols.find(c => c.includes('state') || c.includes('region') || c.includes('zone'));

  const cityCol =
    columns.find(c => ['city', 'location', 'hub'].includes(c.toLowerCase())) ||
    textCols.find(c => c.includes('city') || c.includes('location'));

  const channelCol =
    columns.find(c => ['channel', 'sales_channel', 'lead_source_category', 'lead_source'].includes(c.toLowerCase())) ||
    textCols.find(c => c.includes('channel') || c.includes('source'));

  const targetCol =
    numCols.find(c => c.includes('target') || c.includes('achieve') || c.includes('quota') || c.includes('pct') || c.includes('percent'));

  const unitsCol =
    numCols.find(c => c === 'sales' || c === 'deliveries' || c === 'units' || c === 'volume' || c.includes('sale') || c.includes('unit') || c.includes('deliver') || c.includes('volume') || c.includes('qty')) ||
    numCols[0];

  const revCol =
    numCols.find(c => c.includes('turnover') || c.includes('revenue') || c.includes('amount') || c.includes('price') || c.includes('cr') || c.includes('lakh'));

  const convCol =
    numCols.find(c => c.includes('conversion') || c.includes('conv_rate') || c.includes('cvr'));

  const discountCol =
    numCols.find(c => c.includes('discount'));

  return {
    showroomCol,
    modelCol,
    fuelCol,
    stateCol,
    cityCol,
    channelCol,
    targetCol,
    unitsCol,
    revCol,
    convCol,
    discountCol,
    textCols,
    numCols
  };
}

/**
 * Builds high-precision, syntactically guaranteed SQL query based on resolved columns & intent
 */
export function compileRAGSQL(
  question: string,
  metadata: DatasetMetadata
): { sql: string; categoryCol: string; valueCol: string; chartType: 'bar' | 'pie' | 'line'; chartTitle: string; isGenericFallback?: boolean } {
  // Singularise common business nouns so "top cities" matches the city template
  const q = question
    .toLowerCase()
    .replace(/\bcities\b/g, 'city')
    .replace(/\b(model|showroom|dealer|dealership|channel|state|region|source|campaign|outlet|branch|vehicle|car)s\b/g, '$1');
  const cols = metadata.columns || [];

  const isUnderperformance =
    q.includes('worst') ||
    q.includes('lowest') ||
    q.includes('underperform') ||
    q.includes('lagging') ||
    q.includes('poor') ||
    q.includes('bottom') ||
    q.includes('least') ||
    q.includes('drop') ||
    q.includes('decline') ||
    q.includes('deficit') ||
    q.includes('lost');

  const orderDir = isUnderperformance ? 'ASC' : 'DESC';
  const limitCount = 10;

  // Identify available columns in uploaded_data
  const hasCol = (name: string) => cols.includes(name);
  const stateCol = cols.find(c => ['state', 'region', 'zone', 'territory'].includes(c.toLowerCase()));
  const cityCol = cols.find(c => ['city', 'location', 'hub'].includes(c.toLowerCase()));
  const modelCol = cols.find(c => ['model', 'model_name', 'car_model', 'vehicle_model', 'product'].includes(c.toLowerCase()));
  const fuelCol = cols.find(c => ['fuel_type', 'fuel', 'preferred_fuel_type'].includes(c.toLowerCase()));
  const networkCol = cols.find(c => ['dealer_network', 'network'].includes(c.toLowerCase()));
  const channelCol = cols.find(c => ['sales_channel', 'lead_source', 'channel'].includes(c.toLowerCase()));
  const lostReasonCol = cols.find(c => ['lost_reason', 'lost_lead_reason', 'drop_reason'].includes(c.toLowerCase()));
  const bodyCol = cols.find(c => ['body_type', 'body', 'segment'].includes(c.toLowerCase()));
  const showroomCol = cols.find(c => ['showroom_name', 'dealer_name', 'dealership', 'outlet_name', 'assigned_dealer', 'dealer', 'showroom'].includes(c.toLowerCase()));
  const customerCol = cols.find(c => ['customer_type', 'customer'].includes(c.toLowerCase()));
  const campaignCol = cols.find(c => ['campaign_id', 'campaign'].includes(c.toLowerCase()));
  const testDriveCol = cols.find(c => ['test_drive_status', 'test_drive'].includes(c.toLowerCase()));
  const bookingCol = cols.find(c => ['booking_status', 'booking'].includes(c.toLowerCase()));
  const deliveryCol = cols.find(c => ['delivery_status', 'delivery'].includes(c.toLowerCase()));
  const unitsCol = cols.find(c => ['sales', 'units', 'volume', 'deliveries', 'sales_units'].includes(c.toLowerCase()));
  const salesValueCol = cols.find(c => ['sales_value_inr', 'sales_value', 'revenue', 'turnover', 'sales'].includes(c.toLowerCase()));
  const ratingCol = cols.find(c => ['satisfaction_rating_5', 'rating', 'satisfaction', 'csat'].includes(c.toLowerCase()));
  const priceCol = cols.find(c => ['estimated_ex_showroom_price_inr', 'price', 'ex_showroom_price'].includes(c.toLowerCase()));
  const dateCol = cols.find(c => ['lead_created_at', 'created_at', 'booking_date', 'delivery_date', 'date'].includes(c.toLowerCase()));

  // Dynamic filter detection
  const whereClauses: string[] = [];

  // Filter: State
  const stateMappings: Record<string, string> = {
    'maharashtra': 'Maharashtra',
    'gujarat': 'Gujarat',
    'delhi': 'Delhi',
    'karnataka': 'Karnataka',
    'rajasthan': 'Rajasthan',
    'haryana': 'Haryana',
    'uttar pradesh': 'Uttar Pradesh',
    'kerala': 'Kerala',
    'tamil nadu': 'Tamil Nadu',
    'punjab': 'Punjab',
    'madhya pradesh': 'Madhya Pradesh',
    'west bengal': 'West Bengal'
  };

  if (stateCol) {
    for (const [key, stateName] of Object.entries(stateMappings)) {
      if (new RegExp(`\\b${key}\\b`, 'i').test(q)) {
        whereClauses.push(`LOWER("${stateCol}") LIKE '%${stateName.toLowerCase()}%'`);
        break;
      }
    }
  }

  // Filter: Specific City
  const knownCities = ['mumbai', 'ghaziabad', 'gurugram', 'delhi', 'pune', 'bangalore', 'bengaluru', 'ahmedabad', 'surat', 'jaipur', 'chennai', 'hyderabad', 'kolkata', 'lucknow', 'chandigarh', 'nagpur', 'indore', 'bhopal', 'vadodara', 'rajkot', 'nashik', 'thane', 'noida', 'faridabad'];
  if (cityCol) {
    for (const city of knownCities) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(q)) {
        whereClauses.push(`LOWER("${cityCol}") = '${city}'`);
        break;
      }
    }
  }

  // Filter: Specific Model(s)
  const knownModels = ['grand vitara', 'alto k10', 's-presso', 'swift', 'brezza', 'baleno', 'dzire', 'ertiga', 'fronx', 'jimny', 'wagonr', 'alto', 'invicto', 'xl6', 'ciaz', 'ignis', 'celerio'];
  if (modelCol) {
    const matchedModels: string[] = [];
    for (const m of knownModels) {
      if (new RegExp(`\\b${m}\\b`, 'i').test(q)) {
        if (!matchedModels.some(existing => existing.includes(m))) {
          matchedModels.push(m);
        }
      }
    }
    if (matchedModels.length === 1) {
      whereClauses.push(`LOWER("${modelCol}") LIKE '%${matchedModels[0]}%'`);
    } else if (matchedModels.length > 1) {
      const orConditions = matchedModels.map(m => `LOWER("${modelCol}") LIKE '%${m}%'`).join(' OR ');
      whereClauses.push(`(${orConditions})`);
    }
  }

  // Filter: Specific Fuel (Avoid single fuel filter if query is comparing fuels or asking for fuel distribution)
  const isComparingFuels = (q.includes('vs') || q.includes('compare') || q.includes('mix') || q.includes('powertrain') || q.includes('fuel type')) &&
    (/\bcng\b/i.test(q) || /\bpetrol\b/i.test(q) || /\bhybrid\b/i.test(q));

  if (fuelCol && !isComparingFuels && !q.includes('fuel mix') && !q.includes('powertrain')) {
    if (/\bcng\b/i.test(q)) whereClauses.push(`LOWER("${fuelCol}") = 'cng'`);
    else if (/\bpetrol\b/i.test(q)) whereClauses.push(`LOWER("${fuelCol}") = 'petrol'`);
    else if (/\bdiesel\b/i.test(q)) whereClauses.push(`LOWER("${fuelCol}") = 'diesel'`);
    else if (/\bhybrid\b/i.test(q)) whereClauses.push(`LOWER("${fuelCol}") LIKE '%hybrid%'`);
    else if (/\bev\b|\belectric\b/i.test(q)) whereClauses.push(`(LOWER("${fuelCol}") LIKE '%ev%' OR LOWER("${fuelCol}") LIKE '%electric%')`);
  }

  // Filter: Network (Avoid single network filter if comparing networks or asking for network breakdown)
  const isComparingNetworks = (q.includes('vs') || q.includes('compare') || q.includes('network')) && (q.includes('arena') && q.includes('nexa'));
  if (networkCol && !isComparingNetworks && !q.includes('dealer network') && !q.includes('arena vs nexa')) {
    if (/\bnexa\b/i.test(q)) whereClauses.push(`LOWER("${networkCol}") = 'nexa'`);
    else if (/\barena\b/i.test(q)) whereClauses.push(`LOWER("${networkCol}") = 'arena'`);
  }

  const buildWhere = (extraClause?: string) => {
    const list = [...whereClauses];
    if (extraClause) list.push(extraClause);
    return list.length > 0 ? `WHERE ${list.join(' AND ')}` : '';
  };

  // Determine requested metric
  const asksRevenue = q.includes('revenue') || q.includes('sales value') || q.includes('sales amount') || q.includes('turnover') || q.includes('inr') || q.includes('money') || q.includes('cr') || q.includes('crore') || q.includes('lakh');
  const asksRating = q.includes('rating') || q.includes('satisfaction') || q.includes('csat') || q.includes('nps') || q.includes('feedback');
  const asksPrice = (q.includes('price') || q.includes('cost') || q.includes('ticket')) && !asksRevenue;
  const asksBooking = q.includes('booking') || q.includes('booked');
  const asksDelivery = q.includes('delivery') || q.includes('delivered');
  const asksTestDrive = q.includes('test drive') || q.includes('testdrive') || q.includes('test-drive');

  // 1. Overall Scalar Totals ("What is total sales?", "Overall revenue?", "Total bookings?", "Total leads?")
  const isScalarQuery =
    (q.includes('total') || q.includes('overall') || q.includes('sum') || q.includes('how many') || q.includes('average')) &&
    !q.includes('by ') && !q.includes('each ') && !q.includes('breakdown') && !q.includes('compare') && !q.includes('top') && !q.includes('lowest') && !q.includes('worst') && !q.includes('which');

  if (isScalarQuery) {
    if (asksRevenue && salesValueCol) {
      return {
        sql: `SELECT SUM("${salesValueCol}") as "total_revenue_inr", AVG("${salesValueCol}") as "avg_sales_value", COUNT(*) as "total_records" FROM uploaded_data ${buildWhere()};`,
        categoryCol: 'total',
        valueCol: 'total_revenue_inr',
        chartType: 'bar',
        chartTitle: 'Total Sales Revenue (INR)'
      };
    }
    if (asksRating && ratingCol) {
      return {
        sql: `SELECT ROUND(AVG("${ratingCol}"), 2) as "avg_satisfaction_rating", COUNT(*) as "total_rated_leads" FROM uploaded_data ${buildWhere(`"${ratingCol}" IS NOT NULL`)};`,
        categoryCol: 'average',
        valueCol: 'avg_satisfaction_rating',
        chartType: 'bar',
        chartTitle: 'Average Customer Satisfaction Rating'
      };
    }
    if (asksPrice && priceCol) {
      return {
        sql: `SELECT ROUND(AVG("${priceCol}"), 0) as "avg_ex_showroom_price", MIN("${priceCol}") as "min_price", MAX("${priceCol}") as "max_price" FROM uploaded_data ${buildWhere()};`,
        categoryCol: 'average',
        valueCol: 'avg_ex_showroom_price',
        chartType: 'bar',
        chartTitle: 'Average Ex-Showroom Price'
      };
    }
    if (asksBooking && bookingCol) {
      return {
        sql: `SELECT COUNT(CASE WHEN "${bookingCol}" = 'Booked' THEN 1 END) as "total_bookings", COUNT(*) as "total_leads" FROM uploaded_data ${buildWhere()};`,
        categoryCol: 'total',
        valueCol: 'total_bookings',
        chartType: 'bar',
        chartTitle: 'Total Booking Count'
      };
    }
    if (asksDelivery && deliveryCol) {
      return {
        sql: `SELECT COUNT(CASE WHEN "${deliveryCol}" = 'Delivered' THEN 1 END) as "total_deliveries", COUNT(*) as "total_leads" FROM uploaded_data ${buildWhere()};`,
        categoryCol: 'total',
        valueCol: 'total_deliveries',
        chartType: 'bar',
        chartTitle: 'Total Delivery Count'
      };
    }

    // Default scalar: Total leads & sales
    if (salesValueCol) {
      return {
        sql: `SELECT COUNT(*) as "total_leads", SUM("${salesValueCol}") as "total_sales_value", COUNT(CASE WHEN "${bookingCol || 'booking_status'}" = 'Booked' THEN 1 END) as "total_bookings" FROM uploaded_data ${buildWhere()};`,
        categoryCol: 'total',
        valueCol: 'total_leads',
        chartType: 'bar',
        chartTitle: 'Total Volume Overview'
      };
    }
  }

  // 2. Lost Lead Reasons / Churn
  if (lostReasonCol && (q.includes('lost') || q.includes('drop') || q.includes('reason') || q.includes('churn') || q.includes('cancel') || q.includes('deferred') || q.includes('budget') || isUnderperformance)) {
    const whereStr = buildWhere(`"${lostReasonCol}" IS NOT NULL AND "${lostReasonCol}" != ''`);
    return {
      sql: `SELECT "${lostReasonCol}", COUNT(*) as "lost_count" FROM uploaded_data ${whereStr} GROUP BY "${lostReasonCol}" ORDER BY "lost_count" DESC LIMIT 8;`,
      categoryCol: lostReasonCol,
      valueCol: 'lost_count',
      chartType: 'bar',
      chartTitle: 'Primary Reasons for Lost Leads'
    };
  }

  // 3. Test Drive / Booking / Delivery Status Funnel
  if (testDriveCol && (q.includes('test drive') || q.includes('testdrive') || q.includes('drive'))) {
    const whereStr = buildWhere(`"${testDriveCol}" IS NOT NULL`);
    return {
      sql: `SELECT "${testDriveCol}", COUNT(*) as "count" FROM uploaded_data ${whereStr} GROUP BY "${testDriveCol}" ORDER BY "count" DESC;`,
      categoryCol: testDriveCol,
      valueCol: 'count',
      chartType: 'pie',
      chartTitle: 'Test Drive Execution Status'
    };
  }

  if (bookingCol && (q.includes('booking') || q.includes('booked'))) {
    const whereStr = buildWhere(`"${bookingCol}" IS NOT NULL`);
    return {
      sql: `SELECT "${bookingCol}", COUNT(*) as "count" FROM uploaded_data ${whereStr} GROUP BY "${bookingCol}" ORDER BY "count" DESC;`,
      categoryCol: bookingCol,
      valueCol: 'count',
      chartType: 'pie',
      chartTitle: 'Booking Conversion Status'
    };
  }

  if (deliveryCol && (q.includes('delivery') || q.includes('delivered'))) {
    const whereStr = buildWhere(`"${deliveryCol}" IS NOT NULL`);
    return {
      sql: `SELECT "${deliveryCol}", COUNT(*) as "count" FROM uploaded_data ${whereStr} GROUP BY "${deliveryCol}" ORDER BY "count" DESC;`,
      categoryCol: deliveryCol,
      valueCol: 'count',
      chartType: 'pie',
      chartTitle: 'Vehicle Delivery Fulfillment Status'
    };
  }

  // 4. Fuel Type Distribution
  if (fuelCol && (q.includes('fuel') || q.includes('cng') || q.includes('petrol') || q.includes('diesel') || q.includes('hybrid') || q.includes('ev') || q.includes('powertrain'))) {
    const whereStr = buildWhere(`"${fuelCol}" IS NOT NULL`);
    return {
      sql: `SELECT "${fuelCol}", COUNT(*) as "fuel_count" FROM uploaded_data ${whereStr} GROUP BY "${fuelCol}" ORDER BY "fuel_count" DESC;`,
      categoryCol: fuelCol,
      valueCol: 'fuel_count',
      chartType: 'pie',
      chartTitle: 'Fuel Mix Breakdown (CNG vs Petrol vs Hybrid)'
    };
  }

  // 5. Dealer Network (Arena vs Nexa)
  if (networkCol && (q.includes('network') || q.includes('arena') || q.includes('nexa'))) {
    const whereStr = buildWhere(`"${networkCol}" IS NOT NULL`);
    return {
      sql: `SELECT "${networkCol}", COUNT(*) as "total_leads", SUM(COALESCE("${salesValueCol || 'sales_value_inr'}", 0)) as "total_sales" FROM uploaded_data ${whereStr} GROUP BY "${networkCol}" ORDER BY "total_leads" DESC;`,
      categoryCol: networkCol,
      valueCol: 'total_leads',
      chartType: 'pie',
      chartTitle: 'Dealer Network Performance (Arena vs Nexa)'
    };
  }

  // 6. Sales Channel / Lead Source
  if (channelCol && (q.includes('channel') || q.includes('source') || q.includes('referral') || q.includes('website') || q.includes('search') || q.includes('social') || q.includes('walk-in') || q.includes('acquisition'))) {
    const whereStr = buildWhere(`"${channelCol}" IS NOT NULL`);
    return {
      sql: `SELECT "${channelCol}", COUNT(*) as "channel_leads", SUM(COALESCE("${salesValueCol || 'sales_value_inr'}", 0)) as "channel_sales" FROM uploaded_data ${whereStr} GROUP BY "${channelCol}" ORDER BY "channel_leads" DESC;`,
      categoryCol: channelCol,
      valueCol: 'channel_leads',
      chartType: 'bar',
      chartTitle: 'Lead Acquisition Channel Breakdown'
    };
  }

  // 7. Showroom / Dealership queries (Checked before city grouping so state filters apply to showrooms)
  if (showroomCol && (q.includes('showroom') || q.includes('dealer') || q.includes('outlet') || q.includes('branch'))) {
    const whereStr = buildWhere(`"${showroomCol}" IS NOT NULL`);
    if (unitsCol) {
      return {
        sql: `SELECT "${showroomCol}", SUM("${unitsCol}") as "total_units" FROM uploaded_data ${whereStr} GROUP BY "${showroomCol}" ORDER BY "total_units" ${isUnderperformance ? 'ASC' : 'DESC'} LIMIT ${limitCount};`,
        categoryCol: showroomCol,
        valueCol: 'total_units',
        chartType: 'bar',
        chartTitle: `${isUnderperformance ? 'Lowest' : 'Top'} Showrooms by Sales Volume`
      };
    }
    if (asksRevenue && salesValueCol) {
      return {
        sql: `SELECT "${showroomCol}", SUM("${salesValueCol}") as "total_revenue" FROM uploaded_data ${whereStr} GROUP BY "${showroomCol}" ORDER BY "total_revenue" ${isUnderperformance ? 'ASC' : 'DESC'} LIMIT ${limitCount};`,
        categoryCol: showroomCol,
        valueCol: 'total_revenue',
        chartType: 'bar',
        chartTitle: `${isUnderperformance ? 'Lowest' : 'Top'} Showrooms by Sales Value`
      };
    }
    return {
      sql: `SELECT "${showroomCol}", COUNT(*) as "record_count" FROM uploaded_data ${whereStr} GROUP BY "${showroomCol}" ORDER BY "record_count" ${isUnderperformance ? 'ASC' : 'DESC'} LIMIT ${limitCount};`,
      categoryCol: showroomCol,
      valueCol: 'record_count',
      chartType: 'bar',
      chartTitle: 'Showrooms Volume Breakdown'
    };
  }

  // 8. Vehicle Model Breakdown
  if (modelCol && (q.includes('car') || q.includes('model') || q.includes('vehicle') || q.includes('product') || q.includes('swift') || q.includes('brezza') || q.includes('baleno') || q.includes('dzire') || q.includes('ertiga') || q.includes('fronx') || q.includes('vitara') || q.includes('wagonr') || q.includes('alto') || q.includes('invicto'))) {
    const whereStr = buildWhere(`"${modelCol}" IS NOT NULL`);
    if (unitsCol) {
      return {
        sql: `SELECT "${modelCol}", SUM("${unitsCol}") as "total_units" FROM uploaded_data ${whereStr} GROUP BY "${modelCol}" ORDER BY "total_units" ${isUnderperformance ? 'ASC' : 'DESC'} LIMIT ${limitCount};`,
        categoryCol: modelCol,
        valueCol: 'total_units',
        chartType: 'bar',
        chartTitle: 'Vehicle Model Volume Distribution'
      };
    }
    if (asksRevenue && salesValueCol) {
      return {
        sql: `SELECT "${modelCol}", SUM("${salesValueCol}") as "total_revenue" FROM uploaded_data ${whereStr} GROUP BY "${modelCol}" ORDER BY "total_revenue" ${isUnderperformance ? 'ASC' : 'DESC'} LIMIT ${limitCount};`,
        categoryCol: modelCol,
        valueCol: 'total_revenue',
        chartType: 'bar',
        chartTitle: 'Vehicle Model Revenue Contribution'
      };
    }
    return {
      sql: `SELECT "${modelCol}", COUNT(*) as "unit_count", SUM(COALESCE("${salesValueCol || 'sales_value_inr'}", 0)) as "total_sales" FROM uploaded_data ${whereStr} GROUP BY "${modelCol}" ORDER BY "unit_count" ${isUnderperformance ? 'ASC' : 'DESC'} LIMIT ${limitCount};`,
      categoryCol: modelCol,
      valueCol: 'unit_count',
      chartType: 'bar',
      chartTitle: 'Vehicle Model Volume Ranking'
    };
  }

  // 9. City / Regional Breakdown (When city is the dimension or explicitly grouped)
  if (cityCol && (q.includes('city') || q.includes('location') || q.includes('state') || q.includes('region') || q.includes('hub'))) {
    const whereStr = buildWhere(`"${cityCol}" IS NOT NULL`);
    if (asksRevenue && salesValueCol) {
      return {
        sql: `SELECT "${cityCol}", SUM("${salesValueCol}") as "total_revenue" FROM uploaded_data ${whereStr} GROUP BY "${cityCol}" ORDER BY "total_revenue" ${isUnderperformance ? 'ASC' : 'DESC'} LIMIT ${limitCount};`,
        categoryCol: cityCol,
        valueCol: 'total_revenue',
        chartType: 'bar',
        chartTitle: 'City-wise Sales Revenue (INR)'
      };
    }
    return {
      sql: `SELECT "${cityCol}", COUNT(*) as "lead_count", SUM(COALESCE("${salesValueCol || 'sales_value_inr'}", 0)) as "total_sales" FROM uploaded_data ${whereStr} GROUP BY "${cityCol}" ORDER BY "lead_count" ${isUnderperformance ? 'ASC' : 'DESC'} LIMIT ${limitCount};`,
      categoryCol: cityCol,
      valueCol: 'lead_count',
      chartType: 'bar',
      chartTitle: 'City-wise Lead & Sales Distribution'
    };
  }

  // 11. Customer Type
  if (customerCol && (q.includes('customer') || q.includes('buyer') || q.includes('new vs existing'))) {
    const whereStr = buildWhere(`"${customerCol}" IS NOT NULL`);
    return {
      sql: `SELECT "${customerCol}", COUNT(*) as "customer_count" FROM uploaded_data ${whereStr} GROUP BY "${customerCol}" ORDER BY "customer_count" DESC;`,
      categoryCol: customerCol,
      valueCol: 'customer_count',
      chartType: 'pie',
      chartTitle: 'Customer Intake Mix (New vs Existing)'
    };
  }

  // 12. Campaign Analysis
  if (campaignCol && (q.includes('campaign') || q.includes('promo'))) {
    const whereStr = buildWhere(`"${campaignCol}" IS NOT NULL`);
    return {
      sql: `SELECT "${campaignCol}", COUNT(*) as "leads_generated", SUM(COALESCE("${salesValueCol || 'sales_value_inr'}", 0)) as "total_sales" FROM uploaded_data ${whereStr} GROUP BY "${campaignCol}" ORDER BY "leads_generated" DESC LIMIT 10;`,
      categoryCol: campaignCol,
      valueCol: 'leads_generated',
      chartType: 'bar',
      chartTitle: 'Campaign Conversion & Volume Performance'
    };
  }

  // 13. Dynamic Fallback: Pick first informative text column
  const candidateCols = [modelCol, cityCol, fuelCol, networkCol, channelCol, showroomCol, cols[0]].filter(Boolean) as string[];
  const chosenCat = candidateCols[0] || cols[0];
  const chosenVal = salesValueCol || cols.find(c => c.includes('price') || c.includes('count')) || 'lead_id';

  const whereStr = buildWhere(`"${chosenCat}" IS NOT NULL`);
  return {
    sql: `SELECT "${chosenCat}", COUNT(*) as "total_count" FROM uploaded_data ${whereStr} GROUP BY "${chosenCat}" ORDER BY "total_count" ${orderDir} LIMIT 10;`,
    categoryCol: chosenCat,
    valueCol: 'total_count',
    chartType: 'bar',
    chartTitle: `${chosenCat} Breakdown`,
    // No template matched the question: a count by the first column, not an answer to it
    isGenericFallback: true
  };
}

/**
 * Deterministic Marketing Synthesis (LLM-free fallback)
 * Every number shown is computed from the returned rows; nothing is hardcoded.
 */
export function synthesizeMarketingReasoning(
  question: string,
  rows: Record<string, any>[],
  columns: string[],
  retrievedChunks: RAGChunk[],
  isUnderperformance: boolean,
  categoryHint?: string,
  valueHint?: string,
  outputMode?: string
): MarketingReasoning {
  if (!rows || rows.length === 0) {
    return {
      executiveSummary: 'No matching records were found in your uploaded file for this question.',
      strategicTakeaways: [],
      marketingRecommendations: [],
      retrievedChunks
    };
  }

  return synthesizeFromFacts(question, rows, columns, retrievedChunks, isUnderperformance, categoryHint, valueHint, outputMode);
}

/**
 * Dimension-aware, evidence-linked recommendation for the leader / laggard of a ranking.
 * Every recommendation states its "Why" using a computed fact, and none invent KPI targets.
 */
function recommendationsForDimension(dimension: string, facts: ResultFacts, maxRecs: number = 2): string[] {
  const d = dimension.toLowerCase();
  const recs: string[] = [];
  const { leader, laggard, valueCol, top3SharePct } = facts;
  if (!leader) return recs;

  const leaderVal = formatMetric(leader.value, valueCol);
  const leaderShare = leader.sharePct !== undefined ? ` (${leader.sharePct}% of returned volume)` : '';
  const laggardLine = laggard && facts.leaderToLaggardRatio !== undefined
    ? `${laggard.label} is at ${formatMetric(laggard.value, valueCol)}; the leader is ${facts.leaderToLaggardRatio}x that level`
    : '';

  if (/lost|reason|drop/.test(d)) {
    recs.push(`**Prioritise "${leader.label}" in lead recovery** (Sales & CRM, next 2 weeks). Why: it is the largest loss reason at ${leaderVal}${leaderShare}.`);
    if (top3SharePct !== undefined) {
      recs.push(`**Build win-back scripts for the top 3 loss reasons only** (Marketing). Why: they cover ${top3SharePct}% of lost leads returned; the long tail is lower yield.`);
    }
  } else if (/model|car|product|vehicle/.test(d)) {
    recs.push(`**Protect stock and test-drive availability for ${leader.label}** (Zonal Supply). Why: it leads with ${leaderVal}${leaderShare}, so any stock-out costs the most.`);
    if (laggardLine) recs.push(`**Review pricing, stock and positioning for ${laggard!.label} before adding spend** (Product Marketing). Why: ${laggardLine}.`);
  } else if (/city|state|region|location|hub/.test(d)) {
    recs.push(`**Keep lead-response SLAs and inventory tight in ${leader.label}** (Regional Sales). Why: it is the largest market at ${leaderVal}${leaderShare}.`);
    if (laggardLine) recs.push(`**Diagnose ${laggard!.label} (demand vs. coverage vs. follow-up) before reallocating budget** (Regional Marketing). Why: ${laggardLine}.`);
  } else if (/fuel|powertrain/.test(d)) {
    recs.push(`**Match showroom allocation to the ${leader.label} mix** (Zonal Supply). Why: ${leader.label} leads with ${leaderVal}${leaderShare}.`);
  } else if (/channel|source|campaign/.test(d)) {
    recs.push(`**Hold budget on ${leader.label} and test incremental spend there first**. Why: it delivers ${leaderVal}${leaderShare}.`);
    if (laggardLine) recs.push(`**Cap or re-test ${laggard!.label}**. Why: ${laggardLine}; check cost per lead before cutting.`);
  } else if (/network|arena|nexa/.test(d)) {
    recs.push(`**Benchmark the lower-volume network against ${leader.label} on conversion, not volume alone**. Why: ${leader.label} leads with ${leaderVal}${leaderShare}; networks differ in price band.`);
  } else if (/showroom|dealer|outlet|branch/.test(d)) {
    recs.push(`**Codify ${leader.label}'s practices for peer outlets**. Why: it leads with ${leaderVal}${leaderShare}.`);
    if (laggardLine) recs.push(`**Run a funnel review at ${laggard!.label}** (within 2 weeks). Why: ${laggardLine}.`);
  } else {
    recs.push(`**Focus the next action on ${leader.label}**. Why: it leads with ${leaderVal}${leaderShare}.`);
    if (laggardLine) recs.push(`**Investigate ${laggard!.label}** before reallocating resources. Why: ${laggardLine}.`);
  }
  return recs.slice(0, maxRecs);
}

/** Highest-vs-lowest gap (%) below which a ranking is treated as "no clear winner". */
const FLAT_SPREAD_PCT = 25;

/**
 * Deterministic, data-only synthesis used when the LLM is unavailable.
 * Supports output modes: small (~2-3 lines), medium (standard), and large (full detailed).
 */
function synthesizeFromFacts(
  question: string,
  rows: Record<string, any>[],
  columns: string[],
  retrievedChunks: RAGChunk[],
  isUnderperformance: boolean,
  categoryHint?: string,
  valueHint?: string,
  outputMode?: string
): MarketingReasoning {
  const modeConfig = getOutputModeConfig(outputMode);
  const facts = computeResultFacts(rows, columns, categoryHint, valueHint);
  const metric = humanizeColumn(facts.valueCol);

  if (facts.isScalar) {
    const summary = modeConfig.mode === 'small'
      ? `**Result:** ${facts.statements.slice(0, 2).join(' · ')}.`
      : `**Result:** ${facts.statements.slice(0, modeConfig.mode === 'large' ? 6 : 4).join(' · ')}.`;

    return {
      executiveSummary: summary,
      strategicTakeaways: facts.statements.slice(modeConfig.mode === 'small' ? 2 : 4, (modeConfig.mode === 'small' ? 2 : 4) + modeConfig.maxTakeawaysCount),
      marketingRecommendations: [
        'Break this total down by model, city or channel to find where to act. A single aggregate does not show where the gap is.'
      ].slice(0, modeConfig.maxRecommendationsCount),
      operationalAssessment: `Computed from ${rows.length} aggregate row(s).`,
      retrievedChunks
    };
  }

  const { leader, laggard } = facts;
  const dimension = humanizeColumn(facts.categoryCol);

  // Near-ties are common in real data; calling a 1% gap a "leader" would mislead decision-makers
  const isEvenlySpread = facts.spreadPct !== undefined && facts.spreadPct < FLAT_SPREAD_PCT;
  if (isEvenlySpread && leader && laggard) {
    const spreadPct = facts.spreadPct!;
    // Identical values (often 1 per row from grouping by many columns) cannot be ranked; say so, don't interpret
    const execSummary = leader.value === laggard.value
      ? `**These ${facts.rowCount} rows cannot be ranked on ${metric}:** every one has **${formatMetric(leader.value, facts.valueCol)}**. ` +
        `The breakdown is too fine to separate them; ask for one dimension at a time (for example by state, or by dealer) to see where the volume is.`
      : `**No ${dimension} clearly stands out on ${metric}.** All ${facts.rowCount} are within ${spreadPct}% of each other: ` +
        `${leader.label} is highest at **${formatMetric(leader.value, facts.valueCol)}** and ${laggard.label} lowest at **${formatMetric(laggard.value, facts.valueCol)}**.`;

    const recs = [
      `**Don't reallocate budget on ${metric} alone** (Marketing Head). Why: the spread is only ${spreadPct}%, too small to separate winners from noise.`,
      `**Rank on a sharper measure instead, such as booking rate or sales value per lead** (Marketing BI). Why: when volume is flat, conversion and value show where returns differ.`
    ];

    return {
      executiveSummary: execSummary,
      strategicTakeaways: facts.statements.filter(s => !/^(Leader|Lowest|Narrow spread):/.test(s)).slice(0, modeConfig.maxTakeawaysCount),
      marketingRecommendations: recs.slice(0, modeConfig.maxRecommendationsCount),
      operationalAssessment: `Computed from ${rows.length} result rows; no external figures used.`,
      retrievedChunks
    };
  }

  const focus = isUnderperformance && laggard ? laggard : leader;
  let headline = focus
    ? `**${focus.label}** ${focus === laggard ? 'is lowest' : 'leads'} on ${metric} with **${formatMetric(focus.value, facts.valueCol)}**` +
      (focus.sharePct !== undefined ? ` (${focus.sharePct}% of the ${facts.rowCount} groups returned)` : '') + '.'
    : `Returned ${facts.rowCount} rows.`;

  if (modeConfig.mode === 'large' && leader && laggard && leader !== laggard) {
    headline += ` Top performer **${leader.label}** (${formatMetric(leader.value, facts.valueCol)}) outperforms **${laggard.label}** (${formatMetric(laggard.value, facts.valueCol)}) by ${facts.leaderToLaggardRatio ? `${facts.leaderToLaggardRatio}x` : 'a significant margin'}. Total returned volume is distributed across ${facts.rowCount} distinct entities in the database.`;
  }

  const recommendations = recommendationsForDimension(facts.categoryCol || '', facts, modeConfig.maxRecommendationsCount);
  if (modeConfig.mode !== 'small') {
    recommendations.push(
      'Before moving budget, check the trend over time (for example by month). This result is one snapshot and cannot show direction.'
    );
  }

  return {
    executiveSummary: headline,
    strategicTakeaways: facts.statements.filter(s => !s.startsWith('Leader:')).slice(0, modeConfig.maxTakeawaysCount),
    marketingRecommendations: recommendations.slice(0, modeConfig.maxRecommendationsCount),
    operationalAssessment: `Computed from ${rows.length} result rows; no external figures used.`,
    retrievedChunks
  };
}

