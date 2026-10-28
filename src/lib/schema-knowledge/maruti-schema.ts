/**
 * Business dictionary for the Maruti Suzuki simulated data model (workbook "maruti_schema_simulated_v1").
 * 36 sheets from DLITE (dealer DMS), SPEAR (dealer lead app), Salesforce (SFDC lead centre),
 * SFMC (email marketing), the marutisuzuki.com website and GA4.
 *
 * Column meanings are keyed by the header exactly as it appears in the workbook; relationships were
 * verified against the data (share of key values that actually match is noted), so the model knows
 * which joins are complete, which are partial, and which look plausible but do not match at all.
 */

export type SheetDomain =
  | 'sales'            // funnel records with outcomes: enquiries, bookings, quotes, test drives, leads, opportunities
  | 'sales-activity'   // follow-up calls / activity logs on enquiries and leads
  | 'aftersales'       // workshop, service CRM, warranty, RSA, insurance, accessories, complaints
  | 'master'           // dealers, customers, vehicles, owners, staff
  | 'marketing'        // dealer events, email campaigns
  | 'digital';         // website forms and GA4 web analytics

export interface SheetKnowledge {
  sheet: string;
  system: string;
  domain: SheetDomain;
  /** What one row represents */
  grain: string;
  purpose: string;
  /** Words that signal a question is about this sheet */
  keywords: string[];
  /** "header: meaning" per line */
  columns: string;
}

export interface Relationship {
  from: [string, string];
  to: [string, string];
  cardinality: string;
  /** Verified match quality and how to use the join */
  note: string;
}

export const VP_SALES_PERSONA = `You are the Vice President - Sales of Maruti Suzuki India Ltd (MSIL), advising the national sales leadership.
You think in enquiries, bookings, retail (invoicing), conversion ratios at every funnel stage, zone / dealer / sales-consultant
performance, schemes and discounts, lost sales to competition, digital lead quality, and what to do next month to sell more cars.
You speak plainly to business people, lead with the answer and the number, and always end with the action you would take.
You use ONLY the uploaded data: never invent figures, benchmarks, market shares, targets or competitor facts.`;

/** Columns that appear in most sheets, described once. */
export const COMMON_COLUMNS: Record<string, string> = {
  time: 'Record date (YYYY-MM-DD) used as the partition/reporting date; use for daily/monthly trends when no better date exists',
  created_on: 'Timestamp the record was created in the source system',
  updated_on: 'Date the record was last updated',
  first_name: 'Customer/person first name (PII)',
  last_name: 'Customer/person last name (PII)',
  city: 'City',
  state: 'State',
  pincode: 'PIN code',
  dealer_code: 'Dealer outlet code (e.g. AW1018); joins to DLITE_Dealer Table.dealer_code',
  vin: 'Vehicle Identification Number; joins vehicle-level sheets'
};

export const MARUTI_SHEETS: SheetKnowledge[] = [
  // =====================================================================
  // DLITE - SALES FUNNEL
  // =====================================================================
  {
    sheet: 'DLITE_Enquiry table',
    system: 'DLITE (dealer DMS)',
    domain: 'sales',
    grain: 'one row per vehicle purchase enquiry (prospect) registered at a dealer',
    purpose: 'The core sales funnel: every enquiry with source, model/variant, dealer, zone, consultant, status (Open/Booked/Invoiced/Lost/Closed), lost reason and competitor bought.',
    keywords: ['enquiry', 'enquiries', 'prospect', 'funnel', 'conversion', 'lost', 'competitor', 'source', 'walk-in', 'walkin', 'zone', 'consultant', 'retail', 'booking', 'model', 'variant', 'exchange', 'finance'],
    columns: `
address: Customer address (PII)
asset_id: Customer asset id; matches DLITE_Customer table.asset_id for existing customers
city: Customer city
color: Preferred colour
created_on: Enquiry creation timestamp
creation_date: Enquiry date (YYYY-MM-DD); main date for enquiry trends
customer_id: Customer id; matches DLITE_Customer table.customer_id for ~43% of customers
customer_visited_with_family: Yes/No, customer visited the showroom with family (buying-intent signal)
dealer_code: Dealer outlet that owns the enquiry
dealer_name: Dealer outlet name (same values as DLITE_Dealer Table.dealer_brand_name)
dealer_zone: MSIL sales zone of the dealer (NORTH1, NORTH2, SOUTH1, SOUTH2, EAST, WEST1, WEST2)
eligibilty_for_corporate_discount: Yes/No eligible for a corporate discount
email_address: Customer email (PII)
enquiry_id: Enquiry id (primary key); joins Contract, Performa, test drive, salesfollowup, SPEAR and SFDC leads
enquiry_status: Funnel status: Open, Booked, Invoiced (retailed = sale done), Lost, Closed
event_id__if_any_: Dealer event that generated the enquiry (almost never matches DLITE_event addition; do not join)
exchange_required: Yes/No customer wants to exchange an old car
expected_purchase_date: Customer's expected purchase date
first_capture_mode: How the enquiry was first captured: Walk-in, Digital, Database, Event, Tele-in, Referral, Workshop
first_name: Customer first name (PII)
ho_zo: Who created the enquiry: Dealer, Zonal Office or Head Office
last_name: Customer last name (PII)
lost_model: Competitor model the customer bought when the enquiry was lost
lost_sales_reason: Why the enquiry was lost (Bought competitor vehicle, Waiting period too long, Postponed purchase, Finance not approved, Price / budget issue, Bought Maruti from another dealer, Exchange value not satisfactory, Not contactable, Waiting for GST price revision)
manufacturer: Competitor brand bought when lost (e.g. Tata, Hyundai)
model: Maruti model of interest (e.g. SWIFT, BREZZA)
order_date: Booking / sales-order date when the enquiry converted
order_id: Sales order id when booked (NA otherwise)
phone__c: Customer phone (PII)
pincode: Customer PIN code
repurchase_type: Buyer type: First time, Upgrade, Replacement, Additional car
requirement_for_finance: Yes/No customer needs a car loan
sales_consultant: Sales consultant name (upper case)
sales_consultant_id: Sales consultant DMS user id (MS...); equals DLITE_salesfollowup table.owner and partly DLITE_Payment Table.user_id
sales_consultant_name: Sales consultant name (proper case)
sales_ord: Sales order number when booked
source: Detailed lead source (Showroom walk-in, Website, Social media - Meta lead form, Google lead form, Database activity, Outdoor event / mela, Aggregator - CarDekho/CarWale, Tele-in / call centre, Customer referral, Rural activation camp, Service to sales)
state: Customer state
time: Record date
type: Variant of interest (e.g. BREZZA ZXI MT 1.5L)
uio_customer: Yes/No customer already owns a Maruti (units in operation) - loyalty / repeat buyer
updated_on: Last update date
vin_: VIN allotted/invoiced against the enquiry (only for retailed enquiries)`
  },
  {
    sheet: 'DLITE_Contract table',
    system: 'DLITE (dealer DMS)',
    domain: 'sales',
    grain: 'one row per vehicle booking (sales contract) created from an enquiry',
    purpose: 'Bookings with status Booked / Cancelled / Invoiced, scheme applied, loyalty discount, expected delivery and cancellation reason.',
    keywords: ['booking', 'bookings', 'contract', 'cancel', 'cancellation', 'invoice', 'invoiced', 'retail', 'scheme', 'offer', 'loyalty', 'delivery', 'order'],
    columns: `
cancellation_date: Date the booking was cancelled (NA if not cancelled)
color: Booked colour
contact_first_name: Customer first name (PII)
contact_last_name: Customer last name (PII)
contract_id: Booking / contract id (primary key)
created_on: Booking creation timestamp
creation_date: Booking date (YYYY-MM-DD); main date for booking trends
dealer_code: Booking dealer outlet
dealer_name: Booking dealer outlet name
enquiry_creation_date: Date the source enquiry was created (booking date minus this = enquiry-to-booking days)
enquiry_id: Source enquiry; joins DLITE_Enquiry table.enquiry_id (all bookings match)
expected_delivery_date: Promised delivery date (minus creation_date = waiting period)
loyalty_discount_applicable: Yes/No loyalty discount for an existing Maruti owner
loyalty_relationship: Relationship to the owner of the loyalty vehicle (Self, Spouse, Parent, ...; NA if none)
loyalty_vehicle_vin: VIN of the existing Maruti used for the loyalty benefit
model: Booked model
model_type: Booked variant description
option: Scheme / offer applied: Consumer offer, Corporate offer, Exchange bonus, Scrappage bonus, Festive offer - Navratri, Rural offer (Gramin), GST benefit pass-through, No scheme
phone: Customer phone (PII)
reason_for_cancellation: Why the booking was cancelled (Postponed purchase, Waiting period too long, Finance not approved, Bought competitor vehicle)
status: Booking status: Booked (active, not yet retailed), Invoiced (retailed = sale), Cancelled
time: Record date
updated_on: Last update date`
  },
  {
    sheet: 'DLITE_Performa table',
    system: 'DLITE (dealer DMS)',
    domain: 'sales',
    grain: 'one row per proforma invoice (price quotation) issued against an enquiry',
    purpose: 'On-road price quotes with dealer discount, insurance, extended warranty and RSA components.',
    keywords: ['proforma', 'performa', 'quote', 'quotation', 'on-road', 'on road', 'price', 'discount', 'insurance', 'warranty', 'rsa'],
    columns: `
created_on: Quote creation timestamp
enquiry_id: Enquiry quoted; joins DLITE_Enquiry table.enquiry_id (all match)
extended_warranty: Extended-warranty amount in the quote (INR; 0 = not included)
insurance: Insurance premium in the quote (INR)
manual_discount_amount: Dealer discount given (INR)
on_road_price: Total on-road price quoted (INR)
product: Model-variant-colour code (MTOC, e.g. GVZETACM15); matches DLITE_RSA table.mtoc
proforma_id: Proforma id (primary key)
roadside_assistance: RSA amount in the quote (INR; 0 = not included)
time: Record date
updated_on: Last update date`
  },
  {
    sheet: 'DLITE_test drive',
    system: 'DLITE (dealer DMS)',
    domain: 'sales',
    grain: 'one row per test-drive appointment for an enquiry',
    purpose: 'Showroom and home test drives with appointment vs actual times and outcome (Completed, Cancelled, No show, Rescheduled).',
    keywords: ['test drive', 'test-drive', 'td', 'demo', 'home test drive', 'no show'],
    columns: `
actual_end_date: Actual test-drive end timestamp
actual_start_date: Actual test-drive start timestamp
appointment_end_date: Scheduled end timestamp
appointment_start_date: Scheduled start timestamp
category: Showroom Test Drive or Home Test Drive
created_on: Appointment creation timestamp
demo_car_vin: VIN of the demo car used (does not match customer VINs)
enquiry_id: Enquiry; joins DLITE_Enquiry table.enquiry_id (all match)
status: Outcome: Completed, Cancelled, No Show, Rescheduled
time: Record date
updated_on: Last update date`
  },
  {
    sheet: 'DLITE_salesfollowup table',
    system: 'DLITE (dealer DMS)',
    domain: 'sales-activity',
    grain: 'one row per follow-up call task by a sales consultant on an enquiry',
    purpose: 'Enquiry follow-up discipline: planned vs done calls, connect outcome, consultant, remarks.',
    keywords: ['follow up', 'follow-up', 'followup', 'call', 'connected', 'switched off', 'consultant productivity', 'callback'],
    columns: `
call_back1_time: First call-back attempt timestamp
call_back2_time: Second call-back attempt timestamp
communication_request: Customer's preferred channel (Call, WhatsApp, SMS, No preference)
created_on: Task creation timestamp (DD-MM-YYYY HH:MM)
crm_zone: CRM zone of the dealer
crm_zone_2: CRM zone (sales) of the dealer
dealer: Dealer outlet name
dealer_code: Dealer outlet code
due_date: Task due date
end_date: Task completion date
enquiry_date: Date of the enquiry being followed up
enquiry_id: Enquiry; joins DLITE_Enquiry table.enquiry_id (all tasks match)
first_name: Customer first name (PII)
last_name: Customer last name (PII)
model: Model of interest
owner: Consultant DMS user id; equals DLITE_Enquiry table.sales_consultant_id
phone: Customer phone (PII)
planned_call_date: Planned call date
remarks: Call notes (dd/mm-free text)
sales_consultant: Consultant name
start_date: Task start date
status: Open (pending) or Done
sub_status: Call outcome: Connected, Not connected, Switched off, Call back
sub_type: Follow-up type (Enquiry Follow Up, ...)
time: Record date
type: Activity type (Follow Up)
updated_on: Last update date`
  },

  // =====================================================================
  // SPEAR - DEALER LEAD APP
  // =====================================================================
  {
    sheet: 'spear_new_enquiry_prod_table',
    system: 'SPEAR (dealer lead management app)',
    domain: 'sales-activity',
    grain: 'one row per enquiry as first created in SPEAR (all Open)',
    purpose: 'Snapshot of new enquiries at creation: first contact point, needs (finance/exchange/discount), consultant, tentative buying date.',
    keywords: ['spear', 'new enquiry', 'first contact point', 'tentative buying'],
    columns: `
active: 1 = active record
activestatus: Status at creation (Open)
address: Customer address (PII)
city: Customer city
colour: Preferred colour
consumer_name: Customer name with salutation (PII)
createtime: Creation timestamp
dealer_code: Dealer outlet code
discount_accountname: Special-discount segment (Corporate - IT/ITES, Bank employees, Doctors (IMA), ...; NA = none)
enquiry_source: Source group (Digital, Walk-in, Referral, Database, ...)
enquiry_status: Status at creation (Open)
first_contact_point: Detailed first touch (Google lead form, Website, Showroom walk-in, Customer referral, ...)
group_name: Event group (Enquiry Created)
id: Enquiry id; equals DLITE_Enquiry table.enquiry_id (all match)
is_eligiblefor_discount: 1 = eligible for special discount
is_exchange: 1 = wants exchange
is_finance: 1 = needs finance
isvisitedwithfamily: 1 = visited with family
model: Model of interest
organization_name: Dealer outlet name
remarks: Customer need noted (home test drive required, looking for CNG, ...)
sc_name: Sales consultant first name
sc_username: Consultant login; joins spear_manpower_prod_table.username
state: Customer state
tentativebuyingdate: Customer's tentative buying date
time: Record date
variant: Variant of interest`
  },
  {
    sheet: 'spear_update_enquiry_prod_table',
    system: 'SPEAR (dealer lead management app)',
    domain: 'sales',
    grain: 'one row per enquiry with its latest status in SPEAR',
    purpose: 'Latest enquiry outcomes (Open, Booked, Invoiced, Lost, Closed) with source, needs and consultant.',
    keywords: ['spear', 'enquiry status', 'lost', 'booked', 'invoiced'],
    columns: `
active: 1 = still active, 0 = closed out
activestatus: Latest status (Open, Booked, Invoiced, Lost, Closed)
address: Customer address (PII)
city: Customer city
colour: Preferred colour
consumer_name: Customer name with salutation (PII)
createtime: Enquiry creation timestamp
dealer_code: Dealer outlet code
discount_accountname: Special-discount segment (NA = none)
enquiry_source: Source group (Digital, Walk-in, Referral, Database, ...)
enquiry_status: Latest status (Open, Booked, Invoiced, Lost, Closed)
first_contact_point: Detailed first touch
group_name: Latest event group (Enquiry Created, Enquiry Booked, Enquiry Lost, ...)
id: Enquiry id; equals DLITE_Enquiry table.enquiry_id (all match)
is_eligiblefor_discount: 1 = eligible for special discount
is_exchange: 1 = wants exchange
is_finance: 1 = needs finance
isvisitedwithfamily: 1 = visited with family
model: Model of interest
organization_name: Dealer outlet name
remarks: Customer need noted (price enquiry, looking for CNG, needs automatic, ...)
sc_name: Sales consultant first name
sc_username: Consultant login; joins spear_manpower_prod_table.username
state: Customer state
tentativebuyingdate: Tentative buying date
time: Date of the latest update
variant: Variant of interest`
  },
  {
    sheet: 'spear_lms_followup_update',
    system: 'SPEAR (dealer lead management app)',
    domain: 'sales-activity',
    grain: 'one row per follow-up activity logged in SPEAR against an enquiry',
    purpose: 'Funnel activities: home visit, test drive scheduled, quote shared, finance login, booking done, lost, not reachable.',
    keywords: ['activity', 'home visit', 'quote shared', 'finance login', 'booking done', 'spear follow'],
    columns: `
endtime: Activity end timestamp
enquiryid: Enquiry; joins DLITE_Enquiry table.enquiry_id (all match)
id: Activity id
remarks: Activity note
scheduletime: Scheduled timestamp
starttime: Activity start timestamp
state: Activity outcome: HOME_VISIT, TD_SCHEDULED, QUOTE_SHARED, FINANCE_LOGIN, BOOKING_DONE, LOST, NOT_REACHABLE, GNTD_CBS (code not documented)
time: Record date
updated_on: Last update date`
  },
  {
    sheet: 'spear_manpower_prod_table',
    system: 'SPEAR (dealer lead management app)',
    domain: 'master',
    grain: 'one row per dealer sales staff member using SPEAR',
    purpose: 'Sales manpower: consultants and team leaders by dealer and city, active flag, reporting manager.',
    keywords: ['manpower', 'staff', 'consultant', 'team leader', 'headcount', 'sales force'],
    columns: `
active: 1 = active user
dealer_city: Dealer city
dealer_code: Dealer outlet code
dealer_organization_name: Dealer outlet name
email_id: Staff email (PII)
first_name: Staff first name
last_name: Staff last name
last_sync_date: Last app sync date
last_sync_time: Last app sync time
mobile_number: Staff mobile (PII)
reporting_manager_id: Manager's user id
role: Role (Sales Consultant, Team Leader - Sales, ...)
time: Record date
user_id: SPEAR internal user id
username: Login id; joins spear_*_enquiry_prod_table.sc_username`
  },

  // =====================================================================
  // SALESFORCE LEAD CENTRE (digital leads handled by MSIL call centre)
  // =====================================================================
  {
    sheet: 'SFDC_leads_table',
    system: 'Salesforce (MSIL digital lead centre)',
    domain: 'sales',
    grain: 'one row per digital lead (web, social, aggregator, missed call) before it is pushed to a dealer',
    purpose: 'Digital lead quality and conversion: source/campaign/ad, speed of first contact, disposition, intent score, conversion to dealer enquiry and opportunity.',
    keywords: ['lead', 'leads', 'digital', 'campaign', 'utm', 'facebook', 'google', 'meta', 'ad', 'adset', 'call centre', 'disposition', 'converted', 'first contact', 'intent', 'propensity', 'hot', 'warm', 'cold'],
    columns: `
address: Address as JSON (city, country, ...) (PII)
address__c: Address text (PII)
adid__c: Ad id that generated the lead
adname__c: Ad name (model | creative)
adset__c: Ad set / audience (In-market, Lookalike, ...)
amaze_mmc__c: Unused field (NA)
attributes: Salesforce record metadata (JSON)
call_status__c: Latest call status (Connected / Not connected)
campaign_id__c: Internal campaign number
campaignid__c: Ad-platform campaign id
city: Lead city
city__c: Lead city (upper case)
color__c: Preferred colour
comments__c: Customer query noted (on-road price, EMI, exchange, ...)
company: Company name for corporate leads
convert_status__c: Converted to Enquiry / Not Converted
converted_date_time__c: Timestamp lead was converted to a dealer enquiry
convertedaccountid: Salesforce account created on conversion
convertedcontactid: Salesforce contact created on conversion
converteddate: Date lead was converted
convertedopportunityid: Opportunity created on conversion; joins SFDC_opportunity_table.Opportunity_ID (all match)
corporate_name__c: Corporate programme name
country: Country
create_pc__c: Flag (unused, 0)
createdatetime__c: Lead creation timestamp
createdbyid: Creating integration user
createddate: Lead creation timestamp; main date for lead trends
cti_status_code__c: Latest call-centre (CTI) outcome code
customer__c: Customer account id after conversion
customer_intent_score__c: Intent score 1-10 (higher = more likely to buy)
customer_type__c: First Time Buyer, Replacement, Additional Car, ...
db_created_date_without_time__c: Lead creation date
db_lead_age__c: Lead age in days
dealer__c: Salesforce dealer record id
dealercode__c: Dealer the lead was allocated to; joins DLITE_Dealer Table.dealer_code
device_platform__c: Device (Mobile - Android, Mobile - iOS, Desktop)
disposition__c: Latest agent disposition (Interested - price/offer, Interested - test drive, Call back, Not interested, Already purchased, Ringing - no response, ...)
disposition_count__c: Number of dispositions logged
disposition_time__c: Latest disposition timestamp
disposition_updated_by__c: Agent who updated the disposition
disposition_updated_date_time__c: Latest disposition update timestamp
duplicate_reason__c: Reason marked duplicate
email: Lead email (PII)
email_valid__c: Email validity (Valid/Invalid)
email_valid_report__c: Email deliverability result
emailbounceddate: Email bounce date
emailbouncedreason: Email bounce reason
escalation_level__c: Escalation level
escalation_type__c: Escalation type
et4ae5__hasoptedoutofmobile__c: 1 = opted out of SMS
et4ae5__mobile_country_code__c: Mobile country code
event_id__c: Event id for event leads (does not match DLITE_event addition)
expected_purchase_date__c: Expected purchase date
externalidphone__c: Phone used as external id (PII)
fb_leadgen_missed_info__c: Field missing from Facebook lead form
first_connected_at__c: Timestamp of first connected call
first_connected_in__c: Minutes from lead creation to first connected call (speed to lead)
first_connected_within__c: Speed-to-lead bucket (15-60 mins, 1-4 hrs, ...)
first_contact_point__c: First contact point (Web lead, Facebook lead, Google lead, ...)
first_dialed_at__c: Timestamp of first dial
first_disposition_date_time__c: Timestamp of first disposition
first_propensity_datetime__c: Timestamp propensity was first scored
firstname: First name (PII)
followup_date_time__c: Scheduled follow-up timestamp
followup_status__c: Follow-up Completed / Pending
fuel_type__c: Preferred fuel (Petrol, CNG, Diesel, NA)
gclid__c: Google click id (paid search)
geocodeaccuracy: Geocode accuracy (Zip / City)
hasoptedoutofemail: 1 = opted out of email
id: Lead id (18-char, primary key); joins agent_disposition.lead__c, call_summary.lead__c, opportunity.Lead_ID (all match)
industry: Industry (corporate leads)
isclosed__c: 1 = lead closed
isconverted: 1 = converted to a dealer enquiry (key lead-conversion flag)
isdeleted: 1 = deleted
isduplicate__c: 1 = duplicate lead
iseligiblefordiscount__c: Yes/No eligible for special discount
isexchange__c: Yes/No wants exchange
isfinance__c: Yes/No needs finance
isunreadbyowner: 1 = not yet opened by owner
jigsaw: Unused
jigsawcontactid: Unused
key_query__c: Main query (Offers, Features, Mileage, Price, ...)
lastactivitydate: Last activity date
lastmodifiedbyid: Last modifying user
lastmodifieddate: Last modified timestamp
lastname: Last name (PII)
lastreferenceddate: Last referenced timestamp
lastvieweddate: Last viewed timestamp
latitude: Latitude
lead_created_within_business_hour__c: 1 = created in business hours
lead_id_18_digit__c: 18-char lead id (same as id)
lead_score__c: Lead score (0-10)
lead_scoring_time__c: Timestamp the lead was scored
leadgenid__c: Facebook lead-gen id
leadid__c: 15-char lead id; joins SFDC_call_summary_table.leadid__c
leads_not_pushed_to_cti__c: Reason lead was not pushed to the dialler
leadsource: Lead source group (Web_Paid, Social_Paid, Web_Organic, Web_Direct, Aggregator, Missed_Call)
lms_enquiry_id__c: Dealer enquiry created on conversion; joins DLITE_Enquiry table.enquiry_id (all match)
longitude: Longitude
make__c: Make (Maruti Suzuki)
masterrecordid: Master record after merge
middlename: Middle name
mobilephone: Mobile (PII)
model__c: Model of interest
name: Full name (PII)
numberofemployees: Employees (corporate)
ownerid: Owning agent id (shared with call_summary / agent_disposition ownerid)
parent_lead__c: Original lead when this is a repeat lead
phone: Phone (PII)
photourl: Photo url
pincode__c: PIN code
pincode_related__c: PIN-code record id
postalcode: Postal code
propensity_score__c: Propensity band P1 (highest) to P4 (lowest)
qualify__c: 1 = qualified lead
qualify_new__c: 1 = qualified (new rule)
rating: Hot / Warm / Cold
received_model__c: Model received in the lead
recordtypeid: Record type
remarks__c: Agent remarks (asked for home test drive, comparing with competitor, ...)
repurchase_type__c: First Time Buyer, Replacement, Additional Car
salutation: Salutation
salutation__c: Salutation
source__c: Source platform (Google, Facebook, Instagram, CarDekho, ...)
spear_response__c: Response from SPEAR when the enquiry was pushed
spear_retry_api_count__c: Push retry count
spear_status_code__c: HTTP status of the push (200 = success)
state: State
state__c: State (upper case)
status: Lead status (Converted, Qualified, Contacted, Attempted, Nurture, Closed - Not Converted, Duplicate, Junk)
status__c: Lead status (same as status)
street: Street address (PII)
sub_source__c: Detailed sub-source (Meta lead form, Google discovery / demand gen, ...)
systemmodstamp: System modified timestamp
td_client_id__c: Tag-manager client id (does not match Website_data or GA4 ids)
test_drive_required__c: Yes/No test drive requested
time: Record date
title: Job title
to_qualify__c: 1 = pending qualification
transmission__c: Preferred transmission (MT, AMT/AGS, AT, CVT)
type__c: Lead type (Sales)
uio_customer__c: Yes/No existing Maruti owner
uio_flag__c: Existing-owner flag
uio_flag_cdp__c: Existing-owner flag from CDP
updated_disposition_date__c: Date of latest disposition
use_dealer_pincode__c: 1 = dealer PIN used for allocation
utm_campaign__c: UTM campaign (e.g. msil_navratri_offers_sep25); partly matches GA4.campaign
utm_content__c: UTM content (creative)
utm_medium__c: UTM medium (paid_social, display, cpc, ...)
utm_term__c: UTM term (keyword)
variant__c: Variant of interest
visitedwithfamily__c: Visited with family (Yes/No/NA)
webpage__c: Page type where lead was captured (carModel, home, ...)
website: Website where lead was captured
when_are_you_planning_to_purchase__c: Purchase timeline code (within_15_days, within_30_days, ..., just_researching)
when_are_you_planning_to_purchase_report__c: Purchase timeline label (Within 15 Days, ..., Just Researching)`
  },
  {
    sheet: 'SFDC_opportunity_table',
    system: 'Salesforce (MSIL digital lead centre)',
    domain: 'sales',
    grain: 'one row per sales opportunity created from a digital lead',
    purpose: 'Opportunity pipeline by stage (Prospecting -> Test Drive -> Proposal/Quote -> Negotiation/Booking -> Closed Won/Lost) with deal value.',
    keywords: ['opportunity', 'opportunities', 'pipeline', 'stage', 'closed won', 'win rate', 'deal value', 'amount'],
    columns: `
Opportunity_ID: Opportunity id (primary key); equals SFDC_leads_table.convertedopportunityid
Lead_ID: Source lead; joins SFDC_leads_table.id (all match)
phone__c: Customer phone (PII)
Stage: Pipeline stage: Prospecting, Test Drive, Proposal / Quote, Negotiation / Booking, Closed Won, Closed Lost
Amount: Deal value (INR)
CreateDate: Opportunity creation date`
  },
  {
    sheet: 'SFDC_call_summary_table',
    system: 'Salesforce (MSIL digital lead centre)',
    domain: 'sales-activity',
    grain: 'one row per call-centre call on a lead',
    purpose: 'Call-centre calls: inbound/outbound, connected or not, talk time, disposition, speed to connect.',
    keywords: ['call', 'calls', 'call centre', 'agent', 'talk time', 'connected'],
    columns: `
agent_id__c: Agent id
agent_name__c: Agent name
attributes: Salesforce record metadata (JSON)
call_connected_at__c: Timestamp the call connected
call_connected_within_10_mins__c: 1 = connected within 10 minutes of lead creation
call_not_created_on_same_day__c: 1 = first call not on lead-creation day
call_released_at__c: Call end timestamp
call_summary_time_in_sec__c: Talk time (seconds)
call_type__c: Connected Call / Non-connected Call
calling_type__c: Outbound / Inbound
connected_call__c: 1 = connected
connectedat__c: Connected timestamp
created_on_lead_created_date__c: 1 = call on lead-creation day
createdbyid: Creating user
createddate: Call creation timestamp
dialed_at__c: Dial timestamp
disposition__c: Disposition recorded on this call
end_at__c: Call end timestamp
id: Call record id
isdeleted: 1 = deleted
lastmodifiedbyid: Last modifying user
lastmodifieddate: Last modified timestamp
lastreferenceddate: Last referenced timestamp
lastvieweddate: Last viewed timestamp
latest_call_status__c: Latest call status on the lead
latest_call_type__c: Latest call type on the lead
latest_calling_type__c: Latest calling type on the lead
latest_disposition__c: Latest disposition on the lead
lead__c: Lead; joins SFDC_leads_table.id (all match)
lead_created_date__c: Lead creation timestamp
leadid__c: 15-char lead id; joins SFDC_leads_table.leadid__c
name: Call summary number (CS-...)
non_connected_call__c: 1 = not connected
ownerid: Agent owner id
phone__c: Customer phone (PII)
releasedat__c: Release timestamp
systemmodstamp: System modified timestamp
time: Record date
ucid__c: Telephony unique call id`
  },
  {
    sheet: 'SFDC_agent_disposition_table',
    system: 'Salesforce (MSIL digital lead centre)',
    domain: 'sales-activity',
    grain: 'one row per agent disposition logged on a lead',
    purpose: 'Disposition history: what each call concluded and the lead qualification status after it.',
    keywords: ['disposition', 'agent', 'qualified', 'attempted'],
    columns: `
attributes: Salesforce record metadata (JSON)
comments__c: Agent comment
createdbyid: Agent id
createddate: Disposition timestamp
disposition__c: Disposition (Interested - test drive, Ringing - no response, Switched off, Not interested, ...)
followup_date_time__c: Follow-up scheduled
id: Disposition record id
isdeleted: 1 = deleted
lastmodifiedbyid: Last modifying user
lastmodifieddate: Last modified timestamp
lastreferenceddate: Last referenced timestamp
lastvieweddate: Last viewed timestamp
lead__c: Lead; joins SFDC_leads_table.id (all match)
name: Disposition number (AD-...)
ownerid: Agent owner id
status__c: Lead status after the disposition (Qualified, Attempted, Contacted, ...)
systemmodstamp: System modified timestamp
time: Record date`
  },

  // =====================================================================
  // MASTERS
  // =====================================================================
  {
    sheet: 'DLITE_Dealer Table',
    system: 'DLITE (dealer DMS)',
    domain: 'master',
    grain: 'one row per dealer outlet (sales, service, True Value, commercial)',
    purpose: 'Dealer master: channel (ARENA / NEXA / service / True Value / Commercial), zone, tier, sales & service category, area managers, status.',
    keywords: ['dealer', 'dealers', 'outlet', 'arena', 'nexa', 'true value', 'zone', 'tier', 'area manager', 'dealer category', 'network'],
    columns: `
account_type: Account type (Dealer)
account_head_email_flag: Accounts-head email (PII)
active_user_id_count: Active DMS users at the outlet
address: Outlet address
am_sales: MSIL Area Manager - Sales responsible (NA if none)
am_service: MSIL Area Manager - Service responsible
ceo_email_flag: Dealer CEO email (PII)
cin_no_: Company CIN
city: Outlet city
create_rsa: Y = outlet can issue RSA
create_warranty: Y = outlet can issue warranty
created_on: Outlet onboarding timestamp (DD-MM-YYYY)
crm_zone_sales_: Sales zone (NORTH1, NORTH2, SOUTH1, SOUTH2, EAST, WEST1, WEST2)
cst_number: CST registration
dcsi_flag: Y = included in dealer CSI survey
dealer_brand_name: Outlet display name; matches dealer_name / dealers / dealer / selling_dealer in other sheets
dealer_category___sales: Sales performance category (A, B, C; NA for non-sales outlets)
dealer_category___service: Service category (A, B, C)
dealer_code: Dealer outlet code (primary key)
dealer_id: Dealer number D...; equals Website_data.dealer
dealer_tier: Metro, Urban or Rural
dealer_type: ARENA, NEXA, ARENA SERVICE, NEXA SERVICE, TRUE VALUE (pre-owned), COMMERCIAL
eligible_for_e_invoicing: Y = e-invoicing enabled
eligible_for_e_invoicing__sales_: Y = e-invoicing enabled for sales
email___dealer121: Customer-care email
email___part: Parts email
email___sales: Sales email (NA for non-sales outlets)
ewa: 1 = authorised to sell extended warranty
fsc_termination_flag: Y = free-service coupon facility terminated
gm_service_email_flag: GM service email
gstin: GSTIN
iws_dealer: Y = on iWorkshop
lms_dealer: Y = on the lead-management system (receives digital leads)
location: Outlet location key (code_locality)
lst: LST number
main_fax: Fax
merchant_id: Payment-gateway merchant id
new: Y = newly added outlet
organization: Dealer group company
pan: Company PAN
phone___dealer121: Customer-care phone
phone___part: Parts phone
phone___sales: Sales phone
phone___service: Service phone
plca: Numeric outlet attribute (PLCA; meaning not documented)
psf_flag: Y = post-service follow-up enabled
registered_company_name: Registered company name
sales_outlet: Y = outlet sells new cars
service_manager_email_flag: Service manager email
service_tax: Service-tax registration
stage: Operational or Terminated
status: Active or Inactive
time: Record date
tin: TIN
updated_on: Last update date
user_threshold: Licensed DMS users
warranty_incharge_email_flag: Warranty in-charge email
website: Dealer website
zone: MSIL zone`
  },
  {
    sheet: 'DLITE_Customer table',
    system: 'DLITE (dealer DMS)',
    domain: 'master',
    grain: 'one row per customer (with their vehicle asset)',
    purpose: 'Customer master: demographics (age via date_of_birth, gender, marital status, occupation), location and registering dealer.',
    keywords: ['customer', 'customers', 'demographic', 'age', 'gender', 'occupation', 'marital'],
    columns: `
address_line_1: Address line 1 (PII)
address_line_2: Address line 2 (PII)
asset_id: Vehicle asset id; matches DLITE_Enquiry table.asset_id
city: Customer city
created_on: Customer creation timestamp (DD-MM-YYYY)
customer_id: Customer id (primary key); matches DLITE_Enquiry table.customer_id (partial) and DLITE_vin table.primary_contact_id (few)
date_of_birth: Date of birth (derive age)
dealer_code: Registering dealer
first_name: First name (PII)
gender: M / F
last_name: Last name (PII)
marital_status: Married / Single
occupation: Occupation (Businessman, Salaried, Self employed, ...)
pan: PAN (PII)
pincode: PIN code
primary_email: Email (PII)
primary_phone: Phone (PII)
state: State
time: Record date
updated_on: Last update date`
  },
  {
    sheet: 'DLITE_vin table',
    system: 'DLITE (dealer DMS)',
    domain: 'master',
    grain: 'one row per vehicle in operation (VIN)',
    purpose: 'Vehicle master: model, selling dealer, sale/warranty date, last and next service, odometer.',
    keywords: ['vehicle', 'vin', 'uio', 'car parc', 'selling dealer', 'service due'],
    columns: `
asset_row_id: Asset row id
created_on: Vehicle record creation (DD-MM-YYYY HH:MM)
last_pm_service_date: Last periodic-maintenance service date
last_service_date: Last service date
last_servicing_dealer: Dealer that last serviced the car (outlet name)
model: Model
next_service_due_date: Next service due date
odometer_reading: Latest odometer (km)
primary_contact_id: Owner contact id (rarely matches DLITE_Customer table.customer_id)
selling_dealer: Dealer that sold the car (outlet name)
time: Record date
uio_status: Active = vehicle in operation
updated_on: Last update date
vin: VIN (primary key)
warranty_start_date: Warranty start = retail (sale) date`
  },
  {
    sheet: 'DLITE_Ownership table',
    system: 'DLITE (dealer DMS)',
    domain: 'master',
    grain: 'one row per owner/contact linked to a VIN',
    purpose: 'Vehicle ownership contacts: owner type, occupation, preferred communication.',
    keywords: ['owner', 'ownership'],
    columns: `
address: Address (PII)
contact_type: Owner, Co-owner, Driver, ...
email_id: Email (PII)
first_name: First name (PII)
gstin: GSTIN for company-owned cars
h_connect: 1 = connected-car subscriber
job_title: Occupation (Self employed, Salaried - Private, Housewife, ...)
last_name: Last name (PII)
legal_name: Legal name (PII)
owner: 1 = current owner
pan: PAN (PII)
phone_number: Phone (PII)
primary_communication: Preferred channel code (1, 2, 3)
time: Record date
vin: VIN`
  },
  {
    sheet: 'DLITE_Payment Table',
    system: 'DLITE (dealer DMS)',
    domain: 'master',
    grain: 'one row per dealer employee with payout bank details',
    purpose: 'Dealer staff master (sales consultants, team leaders, service advisors) with role, department, outlet and cluster.',
    keywords: ['employee', 'staff', 'team leader', 'service advisor', 'cluster', 'payout', 'incentive'],
    columns: `
account_name: Bank account holder (PII)
account_type: Bank account type
alias: Staff alias
bank_account_number: Bank account (PII)
bank_name: Bank
cluster_name: MSIL cluster (zone - city cluster)
employee_type: Dealer employee
first_name: First name
hcil_department: Department (Sales, Service, ...; legacy field name)
hcil_division: Division (Showroom sales, Mechanical, ...)
honda_staff_id: Staff id (legacy field name)
ifsc_code: IFSC (PII)
integration_user_flag: 1 = system integration user
job_title: Job title (Sales Consultant, Team Leader - Sales, Service Advisor, ...)
last_name: Last name
organization: Dealer outlet name
pan_number: PAN (PII)
position: Position code (dealer-role-number)
responsibility: DMS responsibility
siebel_user: 1 = DMS user
time: Record date
user_id: DMS user id (MS...); matches DLITE_Enquiry table.sales_consultant_id (partial), salesfollowup.owner, SDR.assigned_to, PSF.closed_by`
  },

  // =====================================================================
  // AFTERSALES
  // =====================================================================
  {
    sheet: 'DLITE_RO_table',
    system: 'DLITE (dealer DMS)',
    domain: 'aftersales',
    grain: 'one row per workshop repair order (job card)',
    purpose: 'Workshop service jobs with labour, parts and total value by service type.',
    keywords: ['service', 'workshop', 'repair order', 'ro', 'job card', 'labour', 'parts', 'pms', 'running repair'],
    columns: `
address_line_2: Customer locality (PII)
address1: Customer address (PII)
city: Customer city
contact_first_name: Customer first name (PII)
contact_last_name: Customer last name (PII)
created_on: RO creation timestamp
dealer_code: Servicing workshop
labor_total: Labour charges (INR)
odometer_reading: Odometer at service (km)
order_close_date: RO closed/invoiced date
order_date: RO opened date
order_num: Repair-order number JC-<dealer>-<FY>-<n>; joins DLITE_Tyre_battery table.ro_number (~64%)
parts_total: Parts charges (INR)
phone__: Customer phone (PII)
pincode: Customer PIN code
registraion_number: Vehicle registration number; matches DLITE_SDR table.vehicle_reg_number and Website_data.registrationnumber (partial)
ro_sub_type: Sub-type (Paid Service, Running Repair, 1st/2nd Free Service, ...)
ro_total: Total RO value = labour + parts (INR)
ro_type: PMS = periodic maintenance, RR = running repair, FREE = free service, BR = body repair, ACC = accessory fitment
service_request_number: Service request; joins DLITE_PSF table.sr_number (~62%)
sr_close_date: Service request close date
sr_open_date: Service request open date
sr_status: Service request status
sr_type: Service request type (Mechanical, ...)
state: Customer state
time: Record date
updated_on: Last update date
vin: VIN`
  },
  {
    sheet: 'DLITE_PSF table',
    system: 'DLITE (dealer DMS)',
    domain: 'aftersales',
    grain: 'one row per post-service follow-up (3rd-day PSF) call',
    purpose: 'Service satisfaction: CSI (1-10), NPS (0-10), satisfied/dissatisfied, experience rating by dealer and model.',
    keywords: ['psf', 'csi', 'nps', 'satisfaction', 'service experience'],
    columns: `
activity_id: PSF activity id
call_back1_time: First call-back timestamp
call_back2_time: Second call-back timestamp
closed_by: User who closed the call (DMS user id)
communication_request: Preferred channel
crm_zone: CRM zone
crm_zone__sales_: CRM sales zone
csi: Customer satisfaction index score (1-10)
dealer_code: Servicing dealer
dealers: Servicing dealer outlet name
due_date: Call due date
email: Customer email (PII)
end_date: Call end date
expiry_date: Activity expiry date
first_name: Customer first name (PII)
jdp_ssi_: 1 = in JD Power SSI sample
last_name: Customer last name (PII)
last_sms_sent: Last SMS sent (Reminder1, Reminder2, Thank You SMS)
model: Model
nps: Net promoter score 0-10 (9-10 promoter, 0-6 detractor)
online_due_date: Online survey due date
online_psf: Y = online survey sent
overall_service_experience_with_the_dealership: Rating (Excellent, Very Good, Good, Average, Poor, ...)
phone_number: Customer phone (PII)
planned_call_date: Planned call date
remarks: Call remarks
reminder1_date: First reminder date
sr_mode: How the car came in (Appointment, Walk-in, Pick-up & Drop, ...)
sr_number: Service request; joins DLITE_RO_table.service_request_number (~62%)
sr_priority: Priority
sr_type: Service request type
start_date: Call start date
status: Call status
sub_status: Satisfied / Dissatisfied / ...
sub_type: 3rd Day PSF Call
template_name: Survey template
time: Record date
type: Activity type (Follow Up)
vin: VIN
warranty_start_date: Vehicle sale date`
  },
  {
    sheet: 'DLITE_SDR table',
    system: 'DLITE (dealer DMS)',
    domain: 'aftersales',
    grain: 'one row per service-due reminder call',
    purpose: 'Service appointment generation: reminder calls, appointments booked, reporting to workshop.',
    keywords: ['sdr', 'service due', 'reminder', 'appointment', 'service appointment'],
    columns: `
account: Customer name (PII)
activity_id: Reminder activity id
appointed: 1 = service appointment booked
appointed_date: Date appointment was booked
assigned_to: CRE (caller) DMS user id
crm_zone: CRM zone
crm_zone__sales_: CRM sales zone
csi: CSI score if captured
dealer_code: Dealer
dealers: Dealer outlet name
due_date: Service due date
end_date: Activity end date
first_name: Customer first name (PII)
hconnect_id: Connected-car id
iworkshop_date: Date the car reported to the workshop
jdp_ssi_: JD Power SSI sample flag
last_name: Customer last name (PII)
model: Model
odometer_reading: Odometer (km)
owner: Activity owner user id
phone_number: Customer phone (PII)
planned_call_date: Planned call date
priority: 1-ASAP, 2-High, 3-Medium
pud_applicable: 1 = pick-up & drop offered
remarks: Call notes
ro_sub_type: Service due (1st Free Service, Paid Service, ...)
service_appointment_date: Appointment date
start_date: Activity start date
status: Activity status
sub_status: Outcome (Appointment Booked, Not Reachable, ...)
sub_type: Service Appointment Call
time: Record date
type: Activity type (Follow Up)
vehicle_reg_number: Registration number
vin: VIN
warranty_start_date: Vehicle sale date`
  },
  {
    sheet: 'DLITE_et_atw table',
    system: 'DLITE (dealer DMS)',
    domain: 'aftersales',
    grain: 'one row per extended-warranty policy sold',
    purpose: 'Extended warranty (EW) sales: programme, price vs list, sold with the new car (Showroom) or later (Workshop).',
    keywords: ['extended warranty', 'ew', 'warranty', 'platinum', 'attach'],
    columns: `
cancellation_date: EW cancellation date
cancellation_reason: EW cancellation reason
created_on: Policy creation timestamp
current_odometer_reading: Odometer at purchase (km)
dealer_code: Selling dealer
model: Model
mrp: EW price charged (INR)
mrp_before_discount: EW list price (INR)
order_creation_date: Order date
payment_due: Amount outstanding (INR)
policy_end_date: Cover end date
policy_endkm: Cover km limit
policy_period: Cover (e.g. 5 Years / 1,40,000 km)
policy_purchase_date: Purchase date
policy_start_date: Cover start (after standard warranty ends)
policy_status: Active / Cancelled
primary_contact_name: Customer name (PII)
program_type: Programme (Gold, Platinum, Royal Platinum)
ro_status: Linked order status
sold_through: Showroom (sold with the new car = sales attach) or Workshop (sold later)
std_warranty_start_date: Standard warranty start = sale date
time: Record date
updated_on: Last update date
vin: VIN
warranty_type: Extended Warranty`
  },
  {
    sheet: 'DLITE_RSA table',
    system: 'DLITE (dealer DMS)',
    domain: 'aftersales',
    grain: 'one row per roadside-assistance (RSA) policy invoice',
    purpose: 'RSA plan sales with GST e-invoice details.',
    keywords: ['rsa', 'roadside', 'roadside assistance'],
    columns: `
acknowledgement_date: E-invoice acknowledgement timestamp
acknowledgement_number: E-invoice acknowledgement number
booking_date: RSA booking date
cancellation_date: Cancellation date
cancellation_reason: Cancellation reason
cgst_percent: CGST %
credit_note_number: Credit note for cancellations
dealer_code: Selling dealer
dealer_name: Selling dealer outlet name
einvoice_status: Generated / Failed / ...
error_code: E-invoice error code (0 = none)
error_message: E-invoice message
gst_cess_percent: GST cess %
igst_percent: IGST %
info: Plan description (RSA 1/2 Year Plan - model)
invoice_date: Invoice date
invoice_number: Invoice number
invoice_signature: Signed invoice (technical)
irn_number: E-invoice IRN
issue_type: Paid or Free
kfc_percent: Kerala flood cess %
legal_name: Customer name (PII)
mtoc: Model-variant code; matches DLITE_Performa table.product
nic_message: NIC response (ACT / ERR)
policy_end_date: Cover end date
policy_number: Policy number
policy_period: 1 Year / 2 Years / ...
policy_purchase_date: Purchase date
policy_start_date: Cover start date
qr_code: E-invoice QR (technical)
service_provider: RSA provider
sgst_percent: SGST %
state: State
status: Policy status
status_2: Invoice status (Invoiced / Cancelled)
time: Record date
utgst_percent: UTGST %
vin: VIN
warranty_start_date: Vehicle sale date`
  },
  {
    sheet: 'DLITE_insurance table',
    system: 'DLITE (dealer DMS)',
    domain: 'aftersales',
    grain: 'one row per motor-insurance policy issued through Maruti Insurance',
    purpose: 'Insurance policies (new and renewal) by insurer and model.',
    keywords: ['insurance', 'insurer', 'policy', 'renewal'],
    columns: `
created_on: Policy record timestamp
customer_name: Customer (PII)
email: Email (PII)
insurance_company: Insurer (MI-HDFC ERGO, MI-Go Digit, ...)
model_variant: Model variant
phone: Phone (PII)
policy_expiry_date: Expiry date
policy_inception_date: Cover start date
policy_issue_date: Issue date
policy_number: Policy number
policy_type: NEW / RENEWAL / ...
time: Record date
updated_on: Last update date
vin: VIN`
  },
  {
    sheet: 'DLITE_accessories table',
    system: 'DLITE (dealer DMS)',
    domain: 'aftersales',
    grain: 'one row per accessory fitment job',
    purpose: 'Accessories sold and fitted (floor mats, mud flaps, seat covers, ...) with value.',
    keywords: ['accessory', 'accessories', 'fitment'],
    columns: `
created_on: Job timestamp
part_description: Accessory
part_number: Part number
quantity_requested: Quantity
ro_number: Accessory job-card number (does not match DLITE_RO_table.order_num)
ro_subtype: Accessory Fitment
ro_type: ACC
rtlp: Retail list price (INR)
service_dealer_code: Fitting dealer; joins DLITE_Dealer Table.dealer_code
time: Record date
total_ro_amount: Total job value (INR)
updated_on: Last update date
vin: VIN`
  },
  {
    sheet: 'DLITE_Tyre_battery table',
    system: 'DLITE (dealer DMS)',
    domain: 'aftersales',
    grain: 'one row per tyre/battery line item on a repair order',
    purpose: 'Tyre and battery replacement sales at workshops.',
    keywords: ['tyre', 'tire', 'battery'],
    columns: `
created_on: Line timestamp (DD-MM-YYYY)
line_item_amount: Line value (INR)
part_description: Part (e.g. BATTERY 45AH AMARON)
part_number: Part number
quantity_requested: Quantity
ro_number: Repair order; joins DLITE_RO_table.order_num (~64%)
ro_subtype: RO sub-type
ro_type: RO type (PMS, RR, ...)
rtlp: Retail list price (INR)
service_dealer_code: Workshop; joins DLITE_Dealer Table.dealer_code
time: Record date
updated_on: Last update date
vin: VIN`
  },
  {
    sheet: 'DLITE_Complaint table',
    system: 'DLITE (dealer DMS)',
    domain: 'aftersales',
    grain: 'one row per customer complaint / feedback case',
    purpose: 'Complaints by area (Service, Sales, Product, Finance, Insurance, EW, Connected car), classification, source and resolution.',
    keywords: ['complaint', 'complaints', 'grievance', 'feedback', 'escalation'],
    columns: `
area: Area (Service, Sales, Product, Extended Warranty, Finance, Insurance, Connected Car)
classification: Issue classification (Staff behaviour, EW policy, ...)
communication_id: Communication id
created_on: Case creation (DD-MM-YYYY HH:MM)
cust_voice: Customer's complaint in their words
dealer_code: Dealer concerned
feedback_type: Complaint / Query / Suggestion
open_dt: Case open timestamp
remarks: Resolution remarks
source: Channel (Website, Toll free, Email, Social media, ...)
sr_row_id: Case id
status: Open / In Progress / Closed / ...
sub_class: Sub-classification (Workshop, Showroom, ...)
sub_status: Resolved / Under investigation / ...
time: Record date
updated_on: Last update date
vin: VIN`
  },

  // =====================================================================
  // MARKETING & DIGITAL
  // =====================================================================
  {
    sheet: 'DLITE_event addition',
    system: 'DLITE (dealer DMS)',
    domain: 'marketing',
    grain: 'one row per dealer marketing event',
    purpose: 'Dealer events (launches, outdoor displays/melas, service camps) by dealer and date.',
    keywords: ['event', 'events', 'mela', 'launch', 'activation', 'camp'],
    columns: `
created_on: Event creation timestamp
dealer_code: Organising dealer
end_date: Event end date
event_id: Event id (EV-dealer-yymm-n); enquiry/lead event ids almost never match it
event_name: Event name
event_row_id: Event row id
event_type: Launch Event, Outdoor Event, Service Camp, ...
remarks: Event notes
start_date: Event start date
time: Record date
updated_on: Last update date`
  },
  {
    sheet: 'Website_data',
    system: 'marutisuzuki.com (tag manager + forms)',
    domain: 'digital',
    grain: 'one row per website form submission',
    purpose: 'Website enquiries by nature (book a service, EW renewal, on-road price, test drive, callback, online booking, accessories, insurance) with car, dealer and device.',
    keywords: ['website', 'web', 'online', 'form', 'on-road price', 'book a service', 'online booking'],
    columns: `
address: Address (PII)
amount_payable: Amount payable for online purchase (INR)
carmodel: Owned/interested car model (upper case)
city: City
communicationid: Submission id
dealer: Dealer number; equals DLITE_Dealer Table.dealer_id
dealer_city: Dealer city
dealercode: Dealer code; joins DLITE_Dealer Table.dealer_code
dealername: Dealer outlet name
discount: Discount shown (INR)
email: Email (PII)
estimated_price: Estimated on-road price (INR)
ex_showroom_price: Ex-showroom price (INR)
existinguser: Yes = existing Maruti owner
feedbackarea: Feedback area
feedbackmessage: Feedback message
feedbacksubarea: Feedback sub-area
feedbacktype: Feedback type
fuel: Fuel
hondacustornot: Existing-customer flag (legacy field name)
make: Make
message: Customer message
mobile: Mobile (PII)
model: Model (proper case)
name: Name (PII)
natureofenquiry: Form purpose (Book a Service, Extended Warranty Renewal, Get On-Road Price, Book a Test Drive, Request a Callback, Online Booking, Accessories Enquiry, Insurance Renewal, Feedback / Complaint)
odometer_reading: Odometer (km)
offer: Offer applied
partner_id: Partner id
pincode: PIN code
preferreddate: Preferred appointment date
product: Product selected (e.g. EW plan)
purchase_year: Car purchase year
purchasedate: Car purchase date
purchaseyear: Car purchase year
registrationnumber: Registration number
selectedcity: City selected on the site
service: Service type selected
state: State
td_browser: Browser
td_browser_version: Browser version
td_charset: Charset
td_client_id: Tag-manager client id (does not match GA4 or SFDC ids)
td_color: Screen colour depth
td_description: Page description
td_global_id: Global visitor id
td_host: Site host
td_ip: IP address
td_language: Browser language
td_os: Operating system
td_os_version: OS version
td_path: Page path
td_platform: Device platform
td_referrer: Referrer (google, instagram, ...)
td_screen: Screen size
td_title: Page title
td_url: Page URL
td_user_agent: User agent
td_version: Tag version
td_viewport: Viewport size
time: Submission date
transmission: Transmission
ud_testdrivecar: Test-drive car requested
variant: Variant
vehiclenumber: Registration number
vehicleregistrationnumber: Registration number
vinnumber: VIN (matches DLITE vehicle VINs partially)
warrantyperiod: Warranty period
year: Car year`
  },
  {
    sheet: 'GA4',
    system: 'Google Analytics 4',
    domain: 'digital',
    grain: 'one row per website analytics event',
    purpose: 'Website behaviour: model pages viewed, searches, brochure downloads, configurator, lead forms, traffic source/campaign.',
    keywords: ['ga4', 'analytics', 'traffic', 'session', 'page view', 'brochure', 'configurator', 'search term', 'engagement'],
    columns: `
banner_id: Banner id
banner_text: Banner text
batch_ordering_id: Batch order
batch_page_id: Batch page id
campaign: Campaign (e.g. msil_nexa_always_on_search, (direct), (organic)); partly matches SFDC_leads_table.utm_campaign__c
campaign_id: Campaign id
click_text: Clicked text
collected_traffic_source_dclid: DV360 click id
collected_traffic_source_gclid: Google click id
collected_traffic_source_manual_campaign_id: Campaign id
collected_traffic_source_manual_campaign_name: Campaign name
collected_traffic_source_manual_content: Ad content
collected_traffic_source_manual_medium: Medium
collected_traffic_source_manual_source: Source
collected_traffic_source_manual_term: Keyword
color: Colour selected
content: Ad content
current_page: Current page number
current_step: Configurator/form step
dclid: DV360 click id
destination_page_url: Destination URL
device_browser: Browser
device_category: mobile / desktop
device_language: Language
device_mobile_brand_name: Phone brand
device_mobile_marketing_name: Phone model
device_mobile_model_name: Phone model code
device_operating_system: OS
device_web_info_browser: Browser
element: Element index
engaged_session_event: 1 = engaged session
engagement_time_msec: Engagement time (ms)
entrances: 1 = landing event
event_date: Event date (YYYYMMDD)
event_name: Event (page_view, scroll, brochure_download, configurator_step, form_start, form_submit, generate_lead, ...)
event_params_section: Page section (Offers, Features, ...)
event_previous_timestamp: Previous event timestamp (micros)
event_timestamp: Event timestamp (micros)
fields_submitted: Form fields submitted
form_field: Form field
form_field_submitted: Field submitted
form_type: Form type
ga_client_id: GA client id
ga_session_id: Session id
ga_session_number: Visitor's session number
gclid: Google click id
geo_city: City
geo_continent: Continent
geo_country: Country
geo_metro: Metro
geo_region: State
geo_sub_continent: Sub-continent
impression_type: Impression type
interaction_type: Interaction type
is_active_user: 1 = active user
last_click_campaign_name: Last-click campaign
last_click_content: Last-click content
last_click_medium: Last-click medium
last_click_source: Last-click source
last_click_term: Last-click keyword
link_url: Link URL
loading_time_sec: Page load time (s)
login_trigger: Login trigger
medium: Medium (organic, cpc, paid_social, ...)
model_name: Model page viewed
model_price: Model price shown (INR)
page_location: Page URL
page_referrer: Referrer
page_title: Page title
pagetype: model_page / search_page / ...
percent_scrolled: Scroll %
platform: WEB
pop_up_type: Pop-up type
previous_page_url: Previous page
scroll_depth: Scroll depth (0-1)
search_query: On-site search query
search_term: Search term
sequence: Event sequence in session
session_engaged: 1 = engaged session
sfmc_activity_id: SFMC activity id
sfmc_activity_name: SFMC activity name
sfmc_asset_id: SFMC asset id
sfmc_channel: SFMC channel
sfmc_journey_id: SFMC journey id
sfmc_journey_name: SFMC journey name
source: Source (google, facebook, (direct), ...)
source_page_url: Source page
srsltid: Google Merchant id
step_name: Step name
stream_id: GA stream
sub_section: Feature section (360 View Camera, Smart Hybrid, ...)
td_client_id: Tag-manager client id (does not match Website_data or SFDC)
term: Keyword
time: Event date (YYYY-MM-DD)
total_elements: Elements shown
total_page: Pages
total_search_results: Search results count
total_steps: Total steps
traffic_source_medium: First-touch medium
traffic_source_name: First-touch campaign
traffic_source_source: First-touch source
unique_search_term: 1 = unique search term
user_first_touch_timestamp: First visit timestamp (micros)
user_id: Logged-in user id
user_pseudo_id: Anonymous user id
vr_interaction_type: 360/VR interaction`
  },
  {
    sheet: 'SFMC_data_view_jobs',
    system: 'Salesforce Marketing Cloud',
    domain: 'marketing',
    grain: 'one row per email send job',
    purpose: 'Email sends: campaign/journey name, subject, category, schedule and audience size.',
    keywords: ['email', 'sfmc', 'journey', 'send job'],
    columns: `
_createddate: Record created
_customerkey: Data-view key
_description: Email/campaign description
_folderid: Folder
_issendable: Sendable flag
_istestable: Testable flag
_modifieddate: Record modified
_name: Data view name
_objectid: Data-view object id
accountuserid: Sending user
bccemail: BCC
category: Campaigns - Sales / Campaigns - Service / Journeys / ...
characterset: Character set
createddate: Job created
deduplicatebyemail: De-duplicated by email
deliveredtime: Delivery time
dynamicemailsubject: Personalised subject
emailid: Email asset id
emailname: Email name (e.g. Lead_Nurture_TD_Invite); matches email_name in the SFMC event sheets
emailsenddefinition: Send definition
emailsubject: Subject
eventid: Triggered-send event
fromemail: From address
fromname: From name
ipaddress: Sending IP
ismultipart: Multipart
iswrapped: Links wrapped
jobid: Send job id (primary key); joins job_id in sends/opens/clicks/bounce sheets (all match)
jobstatus: Complete
jobtype: MULTIPLE_SEND or TRIGGERED_SEND
modifiedby: Modifying user
modifieddate: Modified
originalschedtime: Original schedule
pickuptime: Pick-up time
resolvelinkswithcurrentdata: Link resolution flag
salesforceerrorsubscribercount: Error subscribers
salesforcetotalsubscribercount: Audience size
schedtime: Scheduled time
sendclassification: Send classification id
sendclassificationtype: Commercial / Transactional
sendtype: Send type
suppresstracking: Tracking suppressed
testemailaddr: Test address
time: Record date
triggeredsendcustomerkey: Triggered-send key
triggerersenddefinitionobjectid: Triggered-send definition`
  },
  ...['SFMC_sends_events_data', 'SFMC_opens_events_data', 'SFMC_clicks_events_data', 'SFMC_bounce_events_data'].map(sheet => ({
    sheet,
    system: 'Salesforce Marketing Cloud',
    domain: 'marketing' as SheetDomain,
    grain: `one row per ${sheet.split('_')[1].replace(/s$/, '')} event with the parent send job's totals`,
    purpose: 'Email performance per send job: targeted, delivered, opens, clicks, bounces, unsubscribes by email name.',
    keywords: ['email', 'sfmc', 'open rate', 'click rate', 'ctr', 'bounce', 'unsubscribe', 'newsletter', 'nurture'],
    columns: `
additional: Journey or Campaign
created_date: Event timestamp
delivered: Emails delivered in the job
duplicates: Duplicates removed
email_name: Email (Lead_Nurture_TD_Invite, Navratri_Offers_Sep25, GST_Benefit_Sep25, Victoris_Launch_Sep25, Service_Reminder_Due, PSF_Survey, Insurance_Renewal_30D, EW_Renewal_Reminder, Welcome_New_Owner, ...)
errored: Errored sends
event_detail: JSON with SUBSCRIBER_KEY, EVENT_DATE, EVENT_ID (use json_extract)
event_type: Event (Sent / Open / Click / HardBounce / SoftBounce)
excluded: Excluded subscribers
existing_unsubscribes: Already-unsubscribed contacts skipped
forwarded: Forwards
from_address: From address
from_name: From name
hard_bounces: Hard bounces
invalid_addresses: Invalid addresses
job_id: Send job; joins SFMC_data_view_jobs.jobid (all match)
missing_addresses: Missing addresses
modified_date: Modified timestamp
other_bounces: Other bounces
preview_url: Email preview link
send_date: Send timestamp
send_limit: Send limit
sent: Emails sent
sent_date: Send timestamp
soft_bounces: Soft bounces
status: Job status
subject: Subject line
targeted: Audience targeted
time: Record date
undeliverables: Undeliverable
unique_clicks: Unique clicks (CTR = unique_clicks / delivered)
unique_opens: Unique opens (open rate = unique_opens / delivered)
unsubscribes: Unsubscribes`
  })),
  {
    sheet: 'SFMC_all_campaigns_contact',
    system: 'Salesforce Marketing Cloud',
    domain: 'marketing',
    grain: 'one row per contact in the All_Contact list',
    purpose: 'Email audience membership by prospect/owner type.',
    keywords: ['subscriber', 'contact list', 'audience'],
    columns: `
_createddate: Added to list
_customerkey: List key
_description: Contact type (Prospect - Web Lead, Prospect - Showroom Enquiry, Owner, ...)
_folderid: Folder
_issendable: Sendable
_istestable: Testable
_modifieddate: Modified
_name: List name (All_Contact)
_objectid: List object id
subscriberkey: Subscriber key (also inside SFMC event_detail JSON)
time: Record date`
  }
];

export const MARUTI_RELATIONSHIPS: Relationship[] = [
  // Sales funnel spine: enquiry_id
  { from: ['DLITE_Enquiry table', 'enquiry_id'], to: ['DLITE_Contract table', 'enquiry_id'], cardinality: '1 enquiry : 0..1 booking', note: 'all bookings match; bookings/enquiries = enquiry-to-booking conversion' },
  { from: ['DLITE_Enquiry table', 'enquiry_id'], to: ['DLITE_Performa table', 'enquiry_id'], cardinality: '1 : 0..1 quote', note: 'all quotes match' },
  { from: ['DLITE_Enquiry table', 'enquiry_id'], to: ['DLITE_test drive', 'enquiry_id'], cardinality: '1 : 0..n test drives', note: 'all test drives match' },
  { from: ['DLITE_Enquiry table', 'enquiry_id'], to: ['DLITE_salesfollowup table', 'enquiry_id'], cardinality: '1 : 0..n follow-up calls', note: 'all follow-ups match' },
  { from: ['DLITE_Enquiry table', 'enquiry_id'], to: ['spear_update_enquiry_prod_table', 'id'], cardinality: '1 : 0..1', note: 'all match (same enquiry in SPEAR)' },
  { from: ['DLITE_Enquiry table', 'enquiry_id'], to: ['spear_new_enquiry_prod_table', 'id'], cardinality: '1 : 0..1', note: 'all match' },
  { from: ['DLITE_Enquiry table', 'enquiry_id'], to: ['spear_lms_followup_update', 'enquiryid'], cardinality: '1 : 0..n activities', note: 'all match' },
  { from: ['SFDC_leads_table', 'lms_enquiry_id__c'], to: ['DLITE_Enquiry table', 'enquiry_id'], cardinality: 'converted lead : 1 enquiry', note: 'all converted leads match: digital lead -> dealer enquiry -> booking' },
  { from: ['DLITE_Contract table', 'enquiry_id'], to: ['DLITE_test drive', 'enquiry_id'], cardinality: 'booking : test drives', note: 'test-drive-to-booking analysis' },
  // Digital lead centre spine
  { from: ['SFDC_leads_table', 'id'], to: ['SFDC_opportunity_table', 'Lead_ID'], cardinality: '1 lead : 0..1 opportunity', note: 'all match' },
  { from: ['SFDC_leads_table', 'convertedopportunityid'], to: ['SFDC_opportunity_table', 'Opportunity_ID'], cardinality: '1 : 1', note: 'all match' },
  { from: ['SFDC_leads_table', 'id'], to: ['SFDC_call_summary_table', 'lead__c'], cardinality: '1 lead : 0..n calls', note: 'all match' },
  { from: ['SFDC_leads_table', 'id'], to: ['SFDC_agent_disposition_table', 'lead__c'], cardinality: '1 lead : 0..n dispositions', note: 'all match' },
  // People
  { from: ['DLITE_Enquiry table', 'sales_consultant_id'], to: ['DLITE_salesfollowup table', 'owner'], cardinality: 'consultant', note: 'all match' },
  { from: ['DLITE_Payment Table', 'user_id'], to: ['DLITE_Enquiry table', 'sales_consultant_id'], cardinality: 'employee : enquiries', note: 'partial (~400 consultants): staff role/department for enquiry owners' },
  { from: ['spear_manpower_prod_table', 'username'], to: ['spear_update_enquiry_prod_table', 'sc_username'], cardinality: 'staff : enquiries', note: 'partial (~45%)' },
  // Dealer master
  { from: ['DLITE_Dealer Table', 'dealer_code'], to: ['*', 'dealer_code'], cardinality: '1 dealer : n records', note: 'every dealer_code / dealercode__c / dealercode / service_dealer_code in any sheet matches the master; use it for channel (ARENA/NEXA), zone, tier and category' },
  { from: ['DLITE_Dealer Table', 'dealer_id'], to: ['Website_data', 'dealer'], cardinality: '1 : n', note: 'all match' },
  { from: ['DLITE_Dealer Table', 'dealer_brand_name'], to: ['*', 'dealer_name'], cardinality: 'name match', note: 'dealer_name / dealers / dealer / selling_dealer / last_servicing_dealer / organization_name hold the same outlet names; prefer dealer_code joins' },
  // Customers and vehicles (partial by design of the sample)
  { from: ['DLITE_Customer table', 'customer_id'], to: ['DLITE_Enquiry table', 'customer_id'], cardinality: '1 : n', note: 'partial (~43% of customers)' },
  { from: ['DLITE_vin table', 'vin'], to: ['*', 'vin'], cardinality: '1 vehicle : n records', note: 'VIN links RO, PSF, SDR, EW, RSA, insurance, accessories, tyre/battery, complaints, ownership, Website_data.vinnumber, Contract.loyalty_vehicle_vin and Enquiry.vin_, but overlaps are partial (10-70%): joined counts cover only matching vehicles' },
  { from: ['DLITE_RO_table', 'order_num'], to: ['DLITE_Tyre_battery table', 'ro_number'], cardinality: '1 RO : n lines', note: '~64% match' },
  { from: ['DLITE_RO_table', 'service_request_number'], to: ['DLITE_PSF table', 'sr_number'], cardinality: '1 : 0..1', note: '~62% match' },
  { from: ['DLITE_Performa table', 'product'], to: ['DLITE_RSA table', 'mtoc'], cardinality: 'model-variant code', note: '~89% of codes shared' },
  // Marketing
  { from: ['SFMC_data_view_jobs', 'jobid'], to: ['SFMC_sends_events_data', 'job_id'], cardinality: '1 job : n events', note: 'all match; same for opens/clicks/bounce' },
  { from: ['GA4', 'campaign'], to: ['SFDC_leads_table', 'utm_campaign__c'], cardinality: 'campaign name', note: 'partial (~2/3 of campaigns): compare web traffic with leads by campaign, not row-level' }
];

/** Links that look plausible by name but do not match in the data. */
export const NON_RELATIONSHIPS = [
  'td_client_id in Website_data, GA4 and SFDC_leads_table never match each other (no visitor-level web-to-lead join).',
  'DLITE_accessories table.ro_number does not match DLITE_RO_table.order_num.',
  'DLITE_test drive.demo_car_vin does not match customer VINs.',
  'DLITE_Enquiry table.event_id__if_any_ and SFDC_leads_table.event_id__c almost never match DLITE_event addition.event_id.',
  'DLITE_Enquiry table.order_id / sales_ord do not match DLITE_Contract table.contract_id: link bookings through enquiry_id.'
];

export const CANONICAL_DEFINITIONS = `CANONICAL METRIC DEFINITIONS (verified against the data; ONE source per metric, use these every time so every answer agrees):
- Population: DLITE_Enquiry table is the complete sales funnel (one row per enquiry). Its enquiry_status is the current stage: Open, Booked, Invoiced, Lost, Closed.
  DLITE_Contract table is a SUBSET of those bookings (same statuses: Booked / Invoiced / Cancelled) and is used only for what the enquiry table lacks: cancellations, cancellation reasons, expected delivery dates, options and loyalty.
- Enquiries = COUNT(*) of DLITE_Enquiry table, dated by creation_date.
- Bookings (cumulative) = enquiries with LOWER(enquiry_status) IN ('booked', 'invoiced').
- Pending / open orders (booked, not yet invoiced) = enquiries with LOWER(enquiry_status) = 'booked'. As-of date = the latest date in the data.
- Retail sales / invoiced / deliveries = enquiries with LOWER(enquiry_status) = 'invoiced', dated by order_date. "Last N months" = the N months ending at the latest order_date.
- Lost sales = enquiries with LOWER(enquiry_status) = 'lost', reasons in lost_sales_reason, competitor in manufacturer / lost_model.
- Booking cancellations = DLITE_Contract table LOWER(status) = 'cancelled' (reasons in reason_for_cancellation); cancellation % is over contract rows, and say it covers the contract sample.
- Fuel type: the enquiry "type" column is the full variant name; fuel = 'CNG' when UPPER(type) LIKE '%CNG%', 'Hybrid' when LIKE '%HYBRID%', otherwise 'Petrol'. Never join SFDC leads just to get fuel.
- Region: dealer_zone (NORTH1, NORTH2, SOUTH1, SOUTH2, EAST, WEST1, WEST2) and state are on the enquiry row. Channel ARENA / NEXA = DLITE_Dealer Table.dealer_type joined on dealer_code (covers every enquiry dealer).
- Email (SFMC) totals: every row of an SFMC event sheet repeats its send job's totals, and each event sheet holds a different subset of jobs. Use ONE sheet, the send log: sheet_sfmc_sends_events_data reduced to one row per job
  (SELECT DISTINCT job_id, email_name, subject, sent, delivered, unique_opens, unique_clicks, hard_bounces, soft_bounces, unsubscribes FROM sheet_sfmc_sends_events_data), then aggregate. Never add or join totals across the event sheets. Campaign = email_name.
- Waiting time of a pending order = julianday(<latest date in the data>) - julianday(order_date) on the enquiry row; contracted delivery wait = julianday(expected_delivery_date) - julianday(creation_date) in DLITE_Contract table; overdue = Booked contracts whose expected_delivery_date is before the latest date.
- Digital leads = every row of SFDC_leads_table (the whole table is the MSIL digital lead centre); never filter it by source to find "digital" leads.
- Opportunity win rate = Closed Won / (Closed Won + Closed Lost) in SFDC_opportunity_table.stage; open pipeline = the other stages.`;

export const VP_SALES_KPIS = `${CANONICAL_DEFINITIONS}

KPI DEFINITIONS & USE-CASE PROCEDURES (compute from the data; text values vary in case, so compare with LOWER()):

1. USECASE: FULL SALES FUNNEL & CONVERSION JOURNEY
- Stage 1 (Initial Demand / Enquiries): Total Enquiries = COUNT(*) of DLITE_Enquiry table (creation_date). SFDC_leads_table holds digital leads, a separate earlier stage.
- Stage 2 (Speed to Lead & Contact): Follow-up connect rate = DLITE_salesfollowup table sub_status 'connected' / total follow-up records. Speed to lead SLA = AVG(first_connected_in__c) in SFDC_leads_table (minutes).
- Stage 3 (Product Experience): Test-drive completion rate = DLITE_test drive status 'completed' / total test drives. Test-drive-to-booking rate = COUNT(DISTINCT enquiry_id) with completed test drive that converted to booking / total test-drive enquiries.
- Stage 4 (Sales Orders / Bookings): Bookings = enquiries with enquiry_status in ('booked', 'invoiced') (see CANONICAL METRIC DEFINITIONS). Enquiry-to-booking conversion % = bookings / enquiries.
- Stage 5 (Retail / Invoiced Deliveries): Retail Sales = enquiries with enquiry_status = 'invoiced'. Booking-to-retail conversion % = invoiced / bookings.
- Stage 6 (Leakage & Cancellations): Booking cancellation % = status 'cancelled' / total bookings. Funnel drop-off = compute stage-by-stage drop-off volume and percentage.
- Stage 7 (Lost Sales & Competitor Analysis): Lost sales = enquiry_status = 'lost' grouped by lost_sales_reason; competitor lost volume = manufacturer / lost_model.

2. USECASE: DEALER & SHOWROOM BENCHMARKING (ZONAL & NETWORK)
- Channel / Network: Join dealer_code to DLITE_Dealer Table.dealer_type (ARENA vs NEXA); group by dealer_zone (NORTH1, NORTH2, SOUTH1, SOUTH2, EAST, WEST1, WEST2), city, or dealer_brand_name.
- Outlet Throughput: Total enquiries, bookings, retail deliveries, and conversion % per showroom.
- Discount Intensity: Average manual discount = AVG(DLITE_Performa table.manual_discount_amount); discount as % of on_road_price.
- Delivery Efficiency & Waiting Period: Waiting period (days) = julianday(expected_delivery_date) - julianday(creation_date) in DLITE_Contract table.

3. USECASE: VEHICLE MODEL, POWERTRAIN & FUEL MIX
- Model Volume & Share: Group by model (e.g. SWIFT, BALENO, BREZZA, GRAND VITARA, ERTIGA, DZIRE) and variant.
- Fuel Mix: Petrol vs CNG vs Hybrid share of bookings and deliveries.
- Scheme & Option Mix: DLITE_Contract table.option shares; loyalty share = loyalty_discount_applicable = 'yes'.

4. USECASE: DIGITAL LEAD CENTER & MARKETING ATTRIBUTION
- Digital Lead Volume & Conversion: SFDC_leads_table converted rate = AVG(isconverted).
- Quality Segmentation: Group by rating, propensity_score__c, customer_intent_score__c, and lead_source__c.
- Speed to Lead SLA: AVG(first_connected_in__c) in minutes, segmented by source or agency.
- Pipeline & Win Rate: SFDC_opportunity_table win rate = Stage 'closed won' / closed (won + lost); pipeline value = SUM(Amount) of open stages.

5. USECASE: EMAIL MARKETING & SFMC CAMPAIGNS
- Email Job Totals: see CANONICAL METRIC DEFINITIONS (one row per job from sheet_sfmc_sends_events_data, then aggregate).
- Metrics: Open Rate = SUM(unique_opens)/SUM(delivered); Click-Through Rate (CTR) = SUM(unique_clicks)/SUM(delivered); Unsubscribe Rate = SUM(unsubscribes)/SUM(delivered).

6. USECASE: AFTERSALES, WORKSHOP (RO) & VALUE-ADDED SERVICES
- Workshop Throughput & Billing: DLITE_RO_table count of repair orders, SUM(total_bill_amount), SUM(labor_amount), SUM(parts_amount).
- Service CRM Retention: DLITE_service_crm retention rate and service due follow-up status.
- Value Added Attach: Extended Warranty attach rate = DLITE_et_atw table sold_through = 'showroom' share; MGA Accessories value = AVG(DLITE_accessories table amount per vehicle).

7. USECASE: CUSTOMER SATISFACTION (CSAT / CSI) & GRIEVANCE RESOLUTION
- CSAT / PSF Scores: DLITE_PSF table, DLITE_feedback table satisfaction rating average and distribution.
- Complaints Analysis: DLITE_complaints table count by category, sub_category, and resolution SLA days.`;
