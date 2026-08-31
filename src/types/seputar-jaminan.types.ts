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
  sync_enabled: boolean;
  publish_enabled: boolean;
  filesystem_upload_enabled: boolean;
  s3_upload_enabled: boolean;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_code: string | null;
};

export type SjDashboard = {
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
  state: "DRAFT" | "IN_REVIEW" | "VERIFIED" | "REVISION_REQUIRED";
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

export type SjPublication = {
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
  published_version: SjPublicationVersion | null;
  reviews?: Array<{
    id: string;
    action: string;
    reason: string | null;
    reviewer_id: string;
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
  };
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
