/**
 * The built-in Maruti Suzuki dictionary (schema-knowledge/maruti-schema.ts) as a mapping document.
 * It is the starting point for the Maruti workbook until someone saves their own version, and its
 * prompts are the same as the dictionary produced before mappings were editable.
 */

import {
  MARUTI_SHEETS,
  MARUTI_RELATIONSHIPS,
  NON_RELATIONSHIPS,
  COMMON_COLUMNS,
  VP_SALES_PERSONA,
  VP_SALES_KPIS,
  CANONICAL_DEFINITIONS
} from '../schema-knowledge/maruti-schema';
import { MAPPING_FORMAT, SchemaMappingDoc } from './model';

/** The built-in dictionary is used only when at least this many of its sheets are in the upload */
export const BUILTIN_MIN_MATCHED_SHEETS = 5;

let cached: SchemaMappingDoc | null = null;

export function builtinMappingDoc(): SchemaMappingDoc {
  if (cached) return structuredClone(cached);
  const kpiGuide = VP_SALES_KPIS.startsWith(CANONICAL_DEFINITIONS)
    ? VP_SALES_KPIS.slice(CANONICAL_DEFINITIONS.length).replace(/^\n+/, '')
    : VP_SALES_KPIS;
  cached = {
    format: MAPPING_FORMAT,
    name: 'Maruti Suzuki sales & marketing data model',
    description: 'Built-in dictionary for the maruti_schema_simulated_v1 workbook (36 sheets).',
    persona: VP_SALES_PERSONA,
    sourceSystems: 'DLITE (dealer DMS), SPEAR (dealer lead app), Salesforce (MSIL digital lead centre), Salesforce Marketing Cloud, the marutisuzuki.com website and GA4',
    sqlNamingNote: 'the next two sections use workbook sheet/column headers; map them to the SQL names in the TABLE sections above ' +
      '(e.g. sheet "DLITE_Contract table" -> "sheet_dlite_contract_table", header "dealercode__c" -> "dealercode_c", header "id" -> "id_2").',
    defaultSheets: ['DLITE_Enquiry table', 'DLITE_Contract table', 'DLITE_Dealer Table'],
    commonColumns: { ...COMMON_COLUMNS },
    sheets: MARUTI_SHEETS.map(s => ({
      sheet: s.sheet,
      system: s.system,
      domain: s.domain,
      grain: s.grain,
      purpose: s.purpose,
      keywords: [...s.keywords],
      columns: s.columns.trim().split('\n').map(line => {
        const i = line.indexOf(':');
        return { header: line.slice(0, i).trim(), meaning: line.slice(i + 1).trim() };
      }).filter(c => c.header),
      origin: 'builtin' as const
    })),
    relationships: MARUTI_RELATIONSHIPS.map(r => ({
      from: { sheet: r.from[0], column: r.from[1] },
      to: { sheet: r.to[0], column: r.to[1] },
      cardinality: r.cardinality,
      note: r.note,
      origin: 'builtin' as const
    })),
    nonRelationships: [...NON_RELATIONSHIPS],
    definitions: [
      { name: 'Canonical metric definitions', kind: 'metric', definition: CANONICAL_DEFINITIONS, verbatim: true, origin: 'builtin' },
      { name: 'KPI definitions & use-case procedures', kind: 'guide', definition: kpiGuide, verbatim: true, origin: 'builtin' }
    ]
  };
  return structuredClone(cached);
}
