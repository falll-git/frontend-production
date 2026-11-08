export type SjPublicationState =
  | "DRAFT"
  | "IN_REVIEW"
  | "REVISION_REQUIRED"
  | "APPROVED"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "ARCHIVED";

export type SjSyncState =
  | "NOT_QUEUED"
  | "QUEUED"
  | "SENDING"
  | "ACKNOWLEDGED"
  | "RETRYING"
  | "FAILED"
  | "QUARANTINED";

export type SjAssetCategory =
  | "LAND"
  | "BUILDING"
  | "MACHINE_EQUIPMENT"
  | "VEHICLE";

export type SjSourceType = "COLLATERAL" | "MANUAL";

export type SjSettings = {
  entry_actions?: Omit<SjActionAvailability, 'expected_version'> & {expected_version:null};
  institution_id: string;
  installation_id: string;
  key_id: string;
  central_base_url: string;
  contract_version: number;
  taxonomy_version: number;
  connection_state: "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  module_visible: boolean;
  draft_enabled: boolean;
  review_enabled: boolean;
  review_authority: "local" | "central";
  review_submission_ready: boolean;
  sync_enabled: boolean;
  publish_enabled: boolean;
  filesystem_upload_enabled: boolean;
  s3_upload_enabled: boolean;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_code: string | null;
};

export type SjDashboard = {
  count_scope?: "ACCESSIBLE_BANK_RECORDS";
  synchronization_scope?: "SJ_AND_CONTROL_OUTBOX";
  public_observation?: SjPublicObservation;
  connection: SjSettings | null;
  publications: Partial<Record<SjPublicationState, number>>;
  need_confirmation_soon: number;
  synchronization: Partial<Record<SjSyncState, number>>;
};

export type SjTaxonomyItem = {
  id: string;
  code: string;
  label: string;
  required_fields: string[];
};

export type SjTaxonomyCategory = {
  code: SjAssetCategory;
  items: SjTaxonomyItem[];
};

export type SjTaxonomy = {
  version: number | null;
  categories: SjTaxonomyCategory[];
  vocabularies: {
    public_condition: string[];
    contour: string[];
    road_access: string[];
    public_usage: string[];
    transmission: string[];
    fuel_type: string[];
  };
};

export type SjMedia = {
  action_availability?: Omit<SjActionAvailability,'expected_version'> & {expected_version:null};
  id: string;
  purpose: "BPRS_PUBLIC_MARK" | "PUBLICATION_IMAGE";
  state: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number;
  height: number;
  central_ready: boolean;
  preview_url: string;
  created_at: string;
  sort_order?: number;
  is_cover?: boolean;
  alt_text?: string;
};

export type SjContact = {
  action_availability?: SjActionAvailability;
  /** Immutable bank-approved/pending content, not public-page evidence. */
  approved_version?: {id:string;version_number:number;label:string;phone_e164:string;checksum:string} | null;
  pending_version?: {id:string;version_number:number;state:string;label:string;phone_e164:string;checksum:string} | null;
  id: string;
  label: string;
  phone_e164: string;
  state: "DRAFT" | "IN_REVIEW" | "VERIFIED" | "REJECTED" | "REVOKED";
  is_default: boolean;
  sync_state: SjSyncState;
  aggregate_version: number;
  lock_version: number;
  current_version_id: string | null;
  draft_version_id: string | null;
  rejection_reason: string | null;
  last_verified_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SjProfile = {
  action_availability?: SjActionAvailability;
  approved_version?: {id:string;version_number:number;payload:SjProfilePayload;checksum:string} | null;
  pending_version?: {id:string;version_number:number;state:string;payload:SjProfilePayload;checksum:string} | null;
  id: string;
  display_name: string;
  public_slug: string;
  city_regency: string;
  province: string;
  short_description: string;
  logo_media_id: string;
  logo_ready: boolean;
  logo_preview_url: string | null;
  website_url: string | null;
  state: "DRAFT" | "IN_REVIEW" | "VERIFIED" | "REVISION_REQUIRED" | "HIDDEN";
  sync_state: SjSyncState;
  aggregate_version: number;
  lock_version: number;
  current_version_id: string | null;
  draft_version_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type SjPublicationVersion = {
  id: string;
  version_number: number;
  state: string;
  taxonomy_version: number;
  subcategory: string | null;
  title: string;
  description: string;
  city_regency: string;
  province: string;
  availability: "AVAILABLE";
  whatsapp_contact: {
    id: string;
    version_id: string;
    label: string;
    phone_ending: string;
  } | null;
  profile_version_id: string;
  attributes: Record<string, string | number | null>;
  media: SjMedia[];
  submitted_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export type SjProfilePayload = Partial<Record<"institution_id"|"public_name"|"public_mark"|"short_description"|"office_city_regency"|"office_province"|"profile_updated_at"|"public_slug"|"logo_media_id"|"website_url",string|null>>;
/** Contract unavailable is a capability fact, not an observation. No fabricated timestamp. */
export type SjPublicObservation = {state:"NOT_LOADED";reason:"OBSERVATION_AVAILABLE_IN_DETAIL"} | {state:"UNAVAILABLE";reason:"OBSERVATION_CONTRACT_UNAVAILABLE"};
export type SjHistoryItem = {id:string;kind:'VERSION';version_number:number;state:string;created_at:string;submitted_at:string|null;approved_at:string|null;rejection_reason:string|null;checksum:string;bank_working_version:boolean|null;bank_approved_version:boolean;public_version_evidence:'UNAVAILABLE'} | {id:string;kind:'REVIEW';publication_version_id:string;action:string;reason:string|null;created_at:string};
export type SjObservationSummaryFact = Pick<SjObservationFact,'state'|'started_at'|'checked_at'|'observed_version'>;
export type SjPublicationObservationSummary = {
  scope:'SJ_PUBLIC_API';freshness:'CHECK_TIME_ONLY';
  last_success:SjObservationSummaryFact|null;latest_attempt:SjObservationSummaryFact|null;
};
export type SjObservationFact = {
  id:string; state:"PENDING"|"AVAILABLE"|"NOT_FOUND"|"FAILED";
  started_at:string; checked_at:string|null; source_origin:string;
  public_identity:string; institution_slug:string; observed_version:number|null; failure_code:string|null;
  profile_snapshot?: {public_name:string;short_description:string;office_city_regency:string;office_province:string;published_asset_count:number;public_page_url:string|null}|null;
  publication_snapshot?: SjPublicationSnapshot|null;
};
export type SjPublicationSnapshot = {title:string;description:string;category:'TANAH'|'BANGUNAN'|'MESIN_PERALATAN'|'KENDARAAN';city_regency:string;province:string;attributes:Record<string,string|number>;photo_count:number;public_updated_at:string;public_page_url:string|null};
export type SjObservationEvidence = {
  scope:"SJ_PUBLIC_API"; version_evidence:"UNAVAILABLE"|"SOURCE_PROFILE_EVENT"|"SOURCE_PUBLICATION_EVENT"; freshness:"CHECK_TIME_ONLY";
  last_success:SjObservationFact|null; latest_attempt:SjObservationFact|null;
};
export type SjCursorPage<T>={items:T[];page_info:{limit:number;has_more:boolean;next_cursor:string|null;count_scope:'CURRENT_PAGE';order:'CREATED_DESC_ID_DESC'|'UPDATED_AT_DESC_ID_DESC'|'SUBMITTED_AT_DESC_CREATED_AT_DESC_ID_DESC_KIND_ASC'}};
export type SjSyncEvent = {
  id:string; event_id:string; aggregate_type:string; aggregate_id:string; aggregate_version:number;
  event_type:string; state:string; attempt_count:number; last_error_code:string|null;
  available_at:string; created_at:string; acknowledged_at:string|null;
  action_availability:Omit<SjActionAvailability,'expected_version'> & {expected_version:null};
};
export type SjReconciliation = {
  id:string; state:'PENDING'|'RUNNING'|'MATCHED'|'MISMATCH'|'FAILED';
  count_checked:number; count_mismatch:number; started_at:string; finished_at:string|null;
};
export type SjActionAvailability = {
  scope:'START_ACTION';expected_version:number;revalidated_on_submit:true;
  actions:Record<string,{available:boolean;reason:string|null;reason_code:string|null;mode:'DIRECT'|'REQUEST_CONTROL'}>;
};
export type SjPublication = {
  observation_summary?: SjPublicationObservationSummary|null;
  media_actions?: Record<string, NonNullable<SjMedia['action_availability']>>;
  review_history?: {mode:'PAGED';loaded:false};
  action_availability?: SjActionAvailability;
  version_semantics?: {current_version:"WORKING_VERSION";published_version:"BANK_APPROVED_VERSION";public_version:"UNOBSERVED"};
  /** Workflow eligibility only; permission and authority remain enforced by the API. */
  workflow_eligibility?: {
    withdrawal: { eligible: boolean; reason: string | null };
  };
  public_observation?: SjPublicObservation;
  id: string;
  reference_code: string;
  source_type: SjSourceType;
  source_collateral_id: string | null;
  owner_division: { id: string; name: string } | null;
  asset_category: SjAssetCategory;
  state: SjPublicationState;
  sync_state: SjSyncState;
  aggregate_version: number;
  lock_version: number;
  next_reconfirmation_at: string | null;
  last_confirmed_at: string | null;
  last_sync_error_code: string | null;
  title: string | null;
  city_regency: string | null;
  province: string | null;
  cover: SjMedia | null;
  current_version: SjPublicationVersion | null;
  /** Compatibility name: bank-approved version, NOT proof of what SJ displays. */
  published_version: SjPublicationVersion | null;
  reviews?: Array<{
    id: string;
    action: string;
    reason: string | null;
    reviewer_id: string | null;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
};

export type SjReviewPublication = SjPublication & {
  review_source:
    | {
        type: "MANUAL";
        reason: string | null;
        evidence_document: {
          id: string;
          document_number: string;
          document_name: string;
          description: string | null;
        } | null;
      }
    | {
        type: "COLLATERAL";
        collateral: SjEligibleCollateral | null;
      };
};

export type SjEligibleCollateral = {
  id: string;
  collateral_number: string | null;
  collateral_type: string | null;
  location_city_code: string | null;
  description: string | null;
  period_month: string | null;
};

export type SjPublicationPage = {
  items: SjPublication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    total_scope?: "ACCESSIBLE_FILTERED_RECORDS";
  };
};

export type SjSubmission = {
  id: string;
  kind: "PROFILE" | "CONTACT" | "PUBLICATION";
  request_kind: "CREATE" | "CHANGE";
  resource_id: string;
  resource_label: string;
  reference_code?: string;
  submitted_by: { id: string; name: string } | null;
  submitted_at: string;
  version_number: number;
  payload_checksum: string;
  review_state: "IN_REVIEW" | "REVISION_REQUIRED" | "APPROVED" | "VERIFIED";
  reviewer_note: string | null;
  delivery_state:
    | "NOT_SENT"
    | "SENDING_TO_CONTROL"
    | "RECEIVED_BY_CONTROL"
    | "DELIVERY_FAILED"
    | "UNKNOWN";
  bank_application_state:
    | "WAITING_FOR_DECISION"
    | "APPLIED_BY_BANK"
    | "DECISION_REJECTED_BY_BANK";
  public_state:
    | "NOT_APPLICABLE"
    | "NOT_PUBLIC"
    | "PUBLIC_PENDING"
    | "PUBLIC_CONFIRMED"
    | "PUBLIC_FAILED"
    | "PUBLIC_UNKNOWN";
  snapshot: Record<string, unknown>;
};

export type SjSubmissionPage = {
  items: SjSubmission[];
  pagination: SjPublicationPage["pagination"];
};

export type SjChangeRequestAction =
  | "UNPUBLISH_PUBLICATION"
  | "ARCHIVE_PUBLICATION"
  | "HIDE_PROFILE"
  | "REVOKE_CONTACT"
  | "REVOKE_MEDIA"
  | "RECONFIRM_PUBLICATION";

export type SjChangeRequest = {
  action_availability?: SjActionAvailability;
  id: string;
  action: SjChangeRequestAction;
  resource_kind: "PUBLICATION" | "PROFILE" | "CONTACT" | "MEDIA";
  resource_id: string;
  reason: string;
  state: "IN_REVIEW" | "REVISION_REQUIRED" | "REJECTED" | "APPLIED" | "COMPLETED" | "FAILED";
  request_version: number;
  expected_resource_version: number;
  expected_resource_checksum: string;
  impact: {
    target_label: string;
    current_state: string;
    expected_public_visibility: "visible" | "not_visible" | "not_applicable";
    blockers: string[];
    affected_publications: number;
    affected_media: number;
    central_synced: boolean;
    reference_code: string | null;
    public_slug: string | null;
  };
  impact_checksum: string;
  reviewer_note: string | null;
  decided_by_subject: string | null;
  decided_at: string | null;
  applied_at: string | null;
  completed_at: string | null;
  sync_event_id: string | null;
  failure_code: string | null;
  submitted_at: string;
  updated_at: string;
};

export type SjChangeRequestPage = {
  items: SjChangeRequest[];
  pagination: SjPublicationPage["pagination"];
};

export type SjMediaDraft = {
  media_asset_id: string;
  sort_order: number;
  is_cover: boolean;
  alt_text: string;
};

export type SjPublicationDraftPayload = {
  source_type: SjSourceType;
  source_collateral_id?: string;
  manual_reason?: string;
  manual_evidence_document_id?: string;
  asset_category: SjAssetCategory;
  taxonomy_item_id: string;
  title: string;
  description: string;
  city_regency: string;
  province: string;
  whatsapp_contact_version_id: string;
  profile_version_id: string;
  attributes: Record<string, string | number>;
  media: SjMediaDraft[];
};
