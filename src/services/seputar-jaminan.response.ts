// Pure module: also executed against real disposable API responses by the bank
// contract harness. No browser, environment, axios or application imports.
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// Validate the wire format before UI code uses states, versions, dates or counts.
// No coercion: false/0/null are facts; a malformed answer is not an empty result.
type Check = (value: unknown) => boolean;
const string: Check = (v) => typeof v === "string";
const boolean: Check = (v) => typeof v === "boolean";
const integer: Check = (v) => Number.isSafeInteger(v) && Number(v) >= 0;
const positive: Check = (v) => integer(v) && Number(v) > 0;
const date: Check = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const nullable = (check: Check): Check => (v) => v === null || check(v);
const optional = (check: Check): Check => (v) => v === undefined || check(v);
const array = (check: Check): Check => (v) => Array.isArray(v) && v.every(check);
const oneOf = (values: string): Check => (v) => typeof v === "string" && values.split(" ").includes(v);
const object = (fields: Record<string, Check>): Check => (v) => isRecord(v) && Object.entries(fields).every(([key, check]) => check(v[key]));
const fields = (names: string, check: Check) => Object.fromEntries(names.split(" ").map((name) => [name, check]));
const dictionary = (check: Check, keyCheck: Check = string): Check => (v) => isRecord(v) && Object.entries(v).every(([key, value]) => keyCheck(key) && check(value));
const state = oneOf("DRAFT IN_REVIEW REVISION_REQUIRED APPROVED PUBLISHED UNPUBLISHED ARCHIVED");
const sync = oneOf("NOT_QUEUED QUEUED SENDING ACKNOWLEDGED RETRYING FAILED QUARANTINED");
const category = oneOf("LAND BUILDING MACHINE_EQUIPMENT VEHICLE");
const scalar: Check = (v) => v === null || typeof v === "string" || (typeof v === "number" && Number.isFinite(v));
const observation:Check=v=>object({state:oneOf('NOT_LOADED'),reason:oneOf('OBSERVATION_AVAILABLE_IN_DETAIL')})(v)||object({state:oneOf('UNAVAILABLE'),reason:oneOf('OBSERVATION_CONTRACT_UNAVAILABLE')})(v);
const profilePage:Check=v=>{try{const u=new URL(String(v));return !u.username&&!u.password&&!u.search&&!u.hash&&/^\/bprs\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(u.pathname)
  &&(u.protocol==='https:'||(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)));}catch{return false;}};
const profileSnapshot=object({...fields('public_name short_description office_city_regency office_province',string),published_asset_count:integer,public_page_url:nullable(profilePage)});
const assetPage:Check=v=>{try{const u=new URL(String(v));return !u.username&&!u.password&&!u.search&&!u.hash&&/^\/aset\/SJ-[A-Z0-9]{8}$/.test(u.pathname)
  &&(u.protocol==='https:'||(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)));}catch{return false;}};
const publicationSnapshot=object({...fields('title description city_regency province',string),category:oneOf('TANAH BANGUNAN MESIN_PERALATAN KENDARAAN'),
  attributes:dictionary(v=>typeof v==='string'||typeof v==='number'&&Number.isFinite(v)&&v>=0,oneOf('land_area_m2 building_area_m2 floor_count manufacture_year mileage_km brand_or_manufacturer model_or_type brand public_capacity public_condition contour road_access public_usage transmission fuel_type')),
  photo_count:v=>positive(v)&&Number(v)<=10,public_updated_at:date,public_page_url:nullable(assetPage)});
const observationFact:Check=v=>object({id:string,state:oneOf("PENDING AVAILABLE NOT_FOUND FAILED"),started_at:date,checked_at:nullable(date),
  source_origin:string,public_identity:string,institution_slug:string,observed_version:nullable(positive),profile_snapshot:optional(nullable(profileSnapshot)),publication_snapshot:optional(nullable(publicationSnapshot)),failure_code:nullable(string)})(v)&&isRecord(v)
  &&!(v.profile_snapshot!=null&&v.publication_snapshot!=null)
  &&(v.observed_version===null||(v.state==='AVAILABLE'&&(isRecord(v.profile_snapshot)||isRecord(v.publication_snapshot))))
  &&(v.publication_snapshot==null||(v.state==='AVAILABLE'&&isRecord(v.publication_snapshot)&&(v.publication_snapshot.public_page_url===null||new URL(String(v.publication_snapshot.public_page_url)).pathname===`/aset/${encodeURIComponent(String(v.public_identity))}`)))
  &&(v.profile_snapshot==null||(v.state==='AVAILABLE'&&isRecord(v.profile_snapshot)&&(v.profile_snapshot.public_page_url===null||new URL(String(v.profile_snapshot.public_page_url)).pathname===`/bprs/${encodeURIComponent(String(v.institution_slug))}`)))&&(
    v.state==='PENDING'?v.checked_at===null&&v.failure_code===null:
      date(v.checked_at)&&Date.parse(String(v.checked_at))>=Date.parse(String(v.started_at))&&(
        v.state==='FAILED'?typeof v.failure_code==='string'&&v.failure_code.length>0:v.failure_code===null));
const observationEvidence:Check=v=>object({scope:oneOf('SJ_PUBLIC_API'),version_evidence:oneOf('UNAVAILABLE SOURCE_PROFILE_EVENT SOURCE_PUBLICATION_EVENT'),freshness:oneOf('CHECK_TIME_ONLY'),
  last_success:nullable(observationFact),latest_attempt:nullable(observationFact)})(v)&&isRecord(v)&&(
    v.last_success===null||(isRecord(v.last_success)&&['AVAILABLE','NOT_FOUND'].includes(String(v.last_success.state))))
  && (v.last_success===null||isRecord(v.latest_attempt))
  &&(v.version_evidence==='UNAVAILABLE'?(v.last_success===null||isRecord(v.last_success)&&v.last_success.observed_version===null):
    isRecord(v.last_success)&&positive(v.last_success.observed_version)&&isRecord(v.last_success[v.version_evidence==='SOURCE_PROFILE_EVENT'?'profile_snapshot':'publication_snapshot']));
const summaryFact:Check=v=>object({state:oneOf('PENDING AVAILABLE NOT_FOUND FAILED'),started_at:date,checked_at:nullable(date),observed_version:nullable(positive)})(v)&&isRecord(v)
  &&(v.observed_version===null||v.state==='AVAILABLE')
  &&(v.state==='PENDING'?v.checked_at===null:date(v.checked_at)&&Date.parse(String(v.checked_at))>=Date.parse(String(v.started_at)));
const observationSummary:Check=v=>object({scope:oneOf('SJ_PUBLIC_API'),freshness:oneOf('CHECK_TIME_ONLY'),last_success:nullable(summaryFact),latest_attempt:nullable(summaryFact)})(v)&&isRecord(v)
  &&(v.last_success===null||isRecord(v.last_success)&&['AVAILABLE','NOT_FOUND'].includes(String(v.last_success.state))&&isRecord(v.latest_attempt)
    &&Date.parse(String(v.latest_attempt.started_at))>=Date.parse(String(v.last_success.started_at)));
const settings = object({
  entry_actions:optional(v=>object({scope:oneOf('START_ACTION'),expected_version:n=>n===null,revalidated_on_submit:n=>n===true,
    actions:object(fields('create_publication create_contact create_profile upload_media reconcile',actionState))})(v)),
  ...fields("institution_id installation_id key_id central_base_url", string),
  ...fields("contract_version taxonomy_version", positive),
  connection_state: oneOf("PENDING ACTIVE SUSPENDED REVOKED"), review_authority: oneOf("local central"),
  ...fields("module_visible draft_enabled review_enabled review_submission_ready sync_enabled publish_enabled filesystem_upload_enabled s3_upload_enabled", boolean),
  last_success_at: nullable(date), last_error_at: nullable(date), last_error_code: nullable(string),
});
const media = object({
  action_availability:optional(v=>object({scope:oneOf('START_ACTION'),expected_version:n=>n===null,revalidated_on_submit:n=>n===true,
    actions:object({request_revoke:actionState})})(v)),
  ...fields("id file_name mime_type preview_url", string),
  state: oneOf("DRAFT UPLOAD_PENDING UPLOADED PROCESSING READY REJECTED REVOKED DELETION_PENDING DELETED"),
  purpose: oneOf("BPRS_PUBLIC_MARK PUBLICATION_IMAGE"),
  size_bytes: integer, width: positive, height: positive, central_ready: boolean, created_at: date,
  sort_order: optional(integer), is_cover: optional(boolean), alt_text: optional(nullable(string)),
});
const version = object({
  ...fields("id state title description city_regency province profile_version_id", string),
  version_number: positive, taxonomy_version: positive, subcategory: nullable(string), availability: oneOf("AVAILABLE"),
  whatsapp_contact: nullable(object(fields("id version_id label phone_ending", string))),
  attributes: dictionary(scalar), media: array(media),
  submitted_at: nullable(date), approved_at: nullable(date), rejection_reason: nullable(string), created_at: date,
});
const actionState:Check=v=>object({available:boolean,reason:nullable(string),reason_code:nullable(string),mode:oneOf('DIRECT REQUEST_CONTROL')})(v)&&isRecord(v)&&
  (v.available===true?v.reason===null&&v.reason_code===null:typeof v.reason==='string'&&v.reason.length>0&&typeof v.reason_code==='string'&&v.reason_code.length>0);
const actionAvailability=(names:string):Check=>object({scope:oneOf('START_ACTION'),expected_version:integer,revalidated_on_submit:v=>v===true,actions:object(fields(names,actionState))});
  const publicationFields = {
    observation_summary:optional(nullable(observationSummary)),
    media_actions:optional(v=>isRecord(v)&&Object.values(v).every(a=>object({scope:oneOf('START_ACTION'),expected_version:n=>n===null,revalidated_on_submit:n=>n===true,actions:object({request_revoke:actionState})})(a))),
  action_availability:optional(actionAvailability('edit_draft submit request_revision approve unpublish reconfirm archive check_public')),
  review_history:optional(object({mode:oneOf('PAGED'),loaded:v=>v===false})),
  ...fields("id reference_code", string), source_type: oneOf("COLLATERAL MANUAL"), source_collateral_id: nullable(string),
  owner_division: nullable(object(fields("id name", string))), asset_category: category, state, sync_state: sync,
  aggregate_version: integer, lock_version: integer,
  next_reconfirmation_at: nullable(date), last_confirmed_at: nullable(date),
  ...fields("last_sync_error_code title city_regency province", nullable(string)),
  cover: nullable(media), current_version: nullable(version), published_version: nullable(version),
  created_at: date, updated_at: date,
  version_semantics: optional(object({current_version: oneOf("WORKING_VERSION"), published_version: oneOf("BANK_APPROVED_VERSION"), public_version: oneOf("UNOBSERVED")})),
  public_observation: optional(observation),
  workflow_eligibility: optional(object({
    withdrawal: (v) => isRecord(v) && (
      (v.eligible === true && v.reason === null) ||
      (v.eligible === false && typeof v.reason === "string" && v.reason.length > 0)
    ),
  })),
  reviews: optional(array(object({id: string, action: string, reason: nullable(string), reviewer_id: nullable(string), created_at: date}))),
};
const publication = object(publicationFields);
const approvedProfile = {id: string, version_number: positive, payload: dictionary(nullable(string)), checksum: string};
const approvedContact = {...fields("id label phone_e164 checksum", string), version_number: positive};
const sharedIdentity = {
  id: string, sync_state: sync, aggregate_version: integer, lock_version: integer,
  current_version_id: nullable(string), draft_version_id: nullable(string), rejection_reason: nullable(string),
  created_at: date, updated_at: date,
};
const profile = object({
  action_availability:optional(actionAvailability('edit_draft submit request_revision verify request_hide check_public')),
  ...sharedIdentity,
  ...fields("display_name public_slug city_regency province short_description logo_media_id", string),
  state: oneOf("DRAFT IN_REVIEW VERIFIED REVISION_REQUIRED HIDDEN"),
  logo_ready: boolean, logo_preview_url: nullable(string), website_url: nullable(string),
  approved_version: optional(nullable(object(approvedProfile))),
  pending_version: optional(nullable(object({...approvedProfile, state: string}))),
});
const contact = object({
  action_availability:optional(actionAvailability('edit_draft submit request_revision verify set_default revoke')),
  ...sharedIdentity, label: string, phone_e164: string, is_default: boolean,
  state: oneOf("DRAFT IN_REVIEW VERIFIED REJECTED REVOKED"), last_verified_at: nullable(date), revoked_at: nullable(date),
  approved_version: optional(nullable(object(approvedContact))),
  pending_version: optional(nullable(object({...approvedContact, state: string}))),
});
const collateral = object({id: string, ...fields("collateral_number collateral_type location_city_code description period_month", nullable(string))});
const review = object({...publicationFields, review_source: (v) => isRecord(v) && (
  v.type === "COLLATERAL" ? nullable(collateral)(v.collateral) : v.type === "MANUAL" && nullable(string)(v.reason)
    && nullable(object({id: string, document_number: string, document_name: string, description: nullable(string)}))(v.evidence_document)
)});
const submission = object({
  ...fields("id resource_id resource_label payload_checksum", string), reference_code: optional(string),
  kind: oneOf("PROFILE CONTACT PUBLICATION"), request_kind: oneOf("CREATE CHANGE"),
  submitted_by: nullable(object(fields("id name", string))), submitted_at: date, version_number: positive,
  review_state: oneOf("IN_REVIEW REVISION_REQUIRED APPROVED VERIFIED"), reviewer_note: nullable(string),
  delivery_state: oneOf("NOT_SENT SENDING_TO_CONTROL RECEIVED_BY_CONTROL DELIVERY_FAILED UNKNOWN"),
  bank_application_state: oneOf("WAITING_FOR_DECISION APPLIED_BY_BANK DECISION_REJECTED_BY_BANK"),
  // Actual bank source has no public observation contract. Do not accept a
  // PUBLIC_CONFIRMED claim just because the TypeScript compatibility union has it.
  public_state: oneOf("NOT_APPLICABLE PUBLIC_UNKNOWN"), snapshot: isRecord,
});
const change = object({
  action_availability:optional(actionAvailability('resubmit')),
  ...fields("id resource_id reason expected_resource_checksum impact_checksum", string),
  action: oneOf("UNPUBLISH_PUBLICATION ARCHIVE_PUBLICATION HIDE_PROFILE REVOKE_CONTACT REVOKE_MEDIA RECONFIRM_PUBLICATION"),
  resource_kind: oneOf("PUBLICATION PROFILE CONTACT MEDIA"), state: oneOf("IN_REVIEW REVISION_REQUIRED REJECTED APPLIED COMPLETED FAILED"),
  request_version: positive, expected_resource_version: integer,
  impact: object({target_label: string, current_state: string, expected_public_visibility: oneOf("visible not_visible not_applicable"),
    blockers: array(string), affected_publications: integer, affected_media: integer, central_synced: boolean, reference_code: nullable(string), public_slug: nullable(string)}),
  ...fields("reviewer_note decided_by_subject sync_event_id failure_code", nullable(string)),
  ...fields("decided_at applied_at completed_at", nullable(date)), submitted_at: date, updated_at: date,
});

const validators = {
  syncEvent:object({...fields('id event_id aggregate_type aggregate_id event_type',string),aggregate_version:integer,
    state:oneOf('QUEUED SENDING ACKNOWLEDGED RETRYING FAILED QUARANTINED'),attempt_count:integer,
    last_error_code:nullable(string),available_at:date,created_at:date,acknowledged_at:nullable(date),
    action_availability:object({scope:oneOf('START_ACTION'),expected_version:v=>v===null,revalidated_on_submit:v=>v===true,actions:object({retry:actionState})})}),
  reconciliation:object({id:string,state:oneOf('PENDING RUNNING MATCHED MISMATCH FAILED'),count_checked:integer,count_mismatch:integer,started_at:date,finished_at:optional(nullable(date))}),
  history:(v:unknown)=>object({id:string,kind:oneOf('VERSION'),version_number:positive,state:oneOf('DRAFT IN_REVIEW REVISION_REQUIRED APPROVED VERIFIED'),created_at:date,submitted_at:nullable(date),approved_at:nullable(date),rejection_reason:nullable(string),checksum:string,bank_working_version:nullable(boolean),bank_approved_version:boolean,public_version_evidence:oneOf('UNAVAILABLE')})(v)||object({id:string,kind:oneOf('REVIEW'),publication_version_id:string,action:string,reason:nullable(string),created_at:date})(v),
  settings, media, publication, profile, contact, collateral, review, submission, change, observationEvidence,
  dashboard: object({connection: nullable(settings), publications: dictionary(integer, state), synchronization: dictionary(integer, sync), need_confirmation_soon: integer,
    count_scope: optional(oneOf("ACCESSIBLE_BANK_RECORDS")), synchronization_scope: optional(oneOf("SJ_AND_CONTROL_OUTBOX")), public_observation: optional(observation)}),
  taxonomy: object({version: nullable(positive), categories: array(object({code: category, items: array(object({id: string, code: string, label: string, required_fields: array(string)}))})),
    vocabularies: object(fields("public_condition contour road_access public_usage transmission fuel_type", array(string)))}),
};
export type SjResponseKind = keyof typeof validators;
export function validateSjResponse(kind: SjResponseKind, value: unknown): void {
  if (!validators[kind](value)) throw new Error("Jawaban server tidak lengkap.");
}
