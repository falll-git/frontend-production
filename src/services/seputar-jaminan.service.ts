import api from "@/lib/axios";
import { validateSjResponse, type SjResponseKind } from "./seputar-jaminan.response";
import { isRecord } from "@/services/api.utils";
import type {
  SjSyncEvent,
  SjReconciliation,
  SjObservationEvidence,
  SjHistoryItem,
  SjCursorPage,
  SjContact,
  SjChangeRequest,
  SjChangeRequestAction,
  SjChangeRequestPage,
  SjDashboard,
  SjEligibleCollateral,
  SjMedia,
  SjProfile,
  SjPublication,
  SjPublicationDraftPayload,
  SjPublicationPage,
  SjReviewPublication,
  SjSettings,
  SjTaxonomy,
  SjSubmissionPage,
  SjSubmission,
} from "@/types/seputar-jaminan.types";

function unwrap(payload: unknown): unknown {
  if(!isRecord(payload)||!Object.hasOwn(payload,"data")||payload.success===false||payload.status===false)throw new Error("Jawaban server tidak lengkap.");
  return payload.data;
}

function nullableRecord<T>(payload: unknown, kind: SjResponseKind): T | null {
  const value=unwrap(payload);
  if(value===null)return null;
  if(!isRecord(value))throw new Error("Jawaban server tidak lengkap.");
  validateSjResponse(kind, value);
  return value as T;
}

function dataRecord<T>(payload: unknown, kind?: SjResponseKind): T {
  const record = unwrap(payload);
  if (!isRecord(record)) throw new Error("Jawaban server tidak lengkap.");
  if (kind) validateSjResponse(kind, record);
  return record as T;
}

function dataList<T>(payload: unknown, kind: SjResponseKind): T[] {
  const direct = unwrap(payload);
  if (!Array.isArray(direct)||!direct.every(isRecord))throw new Error("Jawaban server tidak lengkap.");
  direct.forEach((item) => validateSjResponse(kind, item));
  return direct as T[];
}

function dataPage<T>(payload: unknown, kind: SjResponseKind): T {
  const value=dataRecord<Record<string,unknown>>(payload),p=value.pagination;
  if(!Array.isArray(value.items)||!value.items.every(isRecord)||!isRecord(p)
    ||!Number.isSafeInteger(p.page)||Number(p.page)<1||!Number.isSafeInteger(p.limit)||Number(p.limit)<1||Number(p.limit)>100
    ||!Number.isSafeInteger(p.total)||Number(p.total)<0||p.total_pages!==Math.ceil(Number(p.total)/Number(p.limit))
    ||value.items.length>Number(p.limit)||value.items.length>Number(p.total))throw new Error("Jawaban server tidak lengkap.");
  value.items.forEach((item) => validateSjResponse(kind, item));
  return value as T;
}

const records = {
  dashboard: (payload: unknown) => dataRecord<SjDashboard>(payload, "dashboard"),
  settings: (payload: unknown) => dataRecord<SjSettings>(payload, "settings"),
  taxonomy: (payload: unknown) => dataRecord<SjTaxonomy>(payload, "taxonomy"),
  publication: (payload: unknown) => dataRecord<SjPublication>(payload, "publication"),
  profile: (payload: unknown) => dataRecord<SjProfile>(payload, "profile"),
  contact: (payload: unknown) => dataRecord<SjContact>(payload, "contact"),
  media: (payload: unknown) => dataRecord<SjMedia>(payload, "media"),
  change: (payload: unknown) => dataRecord<SjChangeRequest>(payload, "change"),
};
function cursorPage<T>(payload:unknown,kind:SjResponseKind):SjCursorPage<T>{
  const value=dataRecord<Record<string,unknown>>(payload),p=value.page_info;
  const order=kind==='submission'?'SUBMITTED_AT_DESC_CREATED_AT_DESC_ID_DESC_KIND_ASC':'CREATED_DESC_ID_DESC';
  if(!Array.isArray(value.items)||!isRecord(p)||!Number.isSafeInteger(p.limit)||Number(p.limit)<1||Number(p.limit)>100
    ||value.items.length>Number(p.limit)||typeof p.has_more!=='boolean'||p.count_scope!=='CURRENT_PAGE'||p.order!==order
    ||(p.has_more?typeof p.next_cursor!=='string'||!p.next_cursor.length:p.next_cursor!==null))throw new Error('Jawaban server tidak lengkap.');
  value.items.forEach(item=>validateSjResponse(kind,item));return value as SjCursorPage<T>;
}
const lists = {
  contact: (payload: unknown) => dataList<SjContact>(payload, "contact"),
  media: (payload: unknown) => dataList<SjMedia>(payload, "media"),
  review: (payload: unknown) => dataList<SjReviewPublication>(payload, "review"),
};
const pages = {
  publication: (payload: unknown) => dataPage<SjPublicationPage>(payload, "publication"),
  submission: (payload: unknown) => dataPage<SjSubmissionPage>(payload, "submission"),
  change: (payload: unknown) => dataPage<SjChangeRequestPage>(payload, "change"),
};

export const seputarJaminanService = {
  getSyncEventPage:async(params:{cursor?:string;limit?:number;state?:string;event_id?:string}={})=>
    cursorPage<SjSyncEvent>((await api.get('/seputar-jaminan/sync-events',{params})).data,'syncEvent'),
  retrySyncEvent:async(id:string)=>dataRecord<SjSyncEvent>((await api.post(`/seputar-jaminan/sync-events/${id}/retry`)).data,'syncEvent'),
  getLatestReconciliation:async()=>nullableRecord<SjReconciliation>((await api.get('/seputar-jaminan/reconciliation/latest')).data,'reconciliation'),
  getMediaRecord:async(id:string)=>records.media((await api.get(`/seputar-jaminan/media/${id}/status`)).data),
  getContactPage:async(params:{cursor?:string;limit?:number;state?:string;search?:string}={})=>
    cursorPage<SjContact>((await api.get('/seputar-jaminan/contacts',{params:{...params,paged:true}})).data,'contact'),
  getMediaPage:async(params:{cursor?:string;limit?:number;purpose?:string}={})=>
    cursorPage<SjMedia>((await api.get('/seputar-jaminan/media',{params:{...params,paged:true}})).data,'media'),
  getReviewPage:async(params:{cursor?:string;limit?:number}={})=>
    cursorPage<SjReviewPublication>((await api.get('/seputar-jaminan/reviews',{params:{...params,paged:true}})).data,'review'),
  getPublicationPage:async(params:{cursor?:string;limit?:number;state?:string;category?:string;search?:string;confirmation?:string}={})=>
    cursorPage<SjPublication>((await api.get('/seputar-jaminan/publications',{params:{...params,paged:true}})).data,'publication'),
  getSubmissionPage:async(params:{cursor?:string;limit?:number;kind?:string;state?:string}={})=>
    cursorPage<SjSubmission>((await api.get('/seputar-jaminan/submissions',{params:{...params,paged:true}})).data,'submission'),
  getChangeRequestPage:async(params:{cursor?:string;limit?:number;state?:string;action?:string}={})=>
    cursorPage<SjChangeRequest>((await api.get('/seputar-jaminan/change-requests',{params:{...params,paged:true}})).data,'change'),
  getPublicObservation: async (kind:"profile"|"publication",id?:string) =>
    dataRecord<SjObservationEvidence>((await api.get(`/seputar-jaminan/${kind==='profile'?'profile':`publications/${id}`}/public-observation`)).data,'observationEvidence'),
  checkPublicObservation: async (kind:"profile"|"publication",id?:string) =>
    dataRecord<SjObservationEvidence>((await api.post(`/seputar-jaminan/${kind==='profile'?'profile':`publications/${id}`}/public-observation`,{})).data,'observationEvidence'),
  getDashboard: async () =>
    records.dashboard((await api.get("/seputar-jaminan/dashboard")).data),
  getHistory:async(kind:'profile'|'publication'|'contact',id:string|null,params:{limit?:number;cursor?:string;stream?:'versions'|'reviews'}={})=>{
    if(kind!=='profile'&&!id)throw new Error('Data riwayat belum dipilih.');
    return cursorPage<SjHistoryItem>((await api.get(`/seputar-jaminan/${kind==='profile'?'profile':`${kind==='contact'?'contacts':'publications'}/${id}`}/history`,{params})).data,'history');
  },

  getSettings: async () => {
    const response = await api.get("/seputar-jaminan/settings");
    return nullableRecord<SjSettings>(response.data, "settings");
  },

  saveSettings: async (payload: Partial<SjSettings>) =>
    records.settings(
      (await api.patch("/seputar-jaminan/settings", payload)).data,
    ),

  getTaxonomy: async () =>
    records.taxonomy((await api.get("/seputar-jaminan/taxonomy")).data),

  getPublications: async (params: {
    page?: number;
    limit?: number;
    state?: string;
    category?: string;
    search?: string;
  } = {}) =>
    pages.publication(
      (await api.get("/seputar-jaminan/publications", { params })).data,
    ),

  getPublication: async (id: string) =>
    records.publication(
      (await api.get(`/seputar-jaminan/publications/${id}`,{params:{history:'paged'}})).data,
    ),

  createPublication: async (payload: SjPublicationDraftPayload) =>
    records.publication(
      (await api.post("/seputar-jaminan/publications", payload)).data,
    ),

  updatePublication: async (
    id: string,
    payload: Partial<SjPublicationDraftPayload> & { expected_version: number },
  ) =>
    records.publication(
      (await api.patch(`/seputar-jaminan/publications/${id}/draft`, payload)).data,
    ),

  publicationCommand: async (
    id: string,
    command:
      | "submit"
      | "approve-and-publish"
      | "reconfirm"
      | "archive",
    expectedVersion: number,
  ) =>
    records.publication(
      (
        await api.post(`/seputar-jaminan/publications/${id}/${command}`, {
          expected_version: expectedVersion,
        })
      ).data,
    ),

  requestPublicationRevision: async (
    id: string,
    expectedVersion: number,
    reason: string,
  ) =>
    records.publication(
      (
        await api.post(`/seputar-jaminan/publications/${id}/request-revision`, {
          expected_version: expectedVersion,
          reason,
        })
      ).data,
    ),

  unpublishPublication: async (
    id: string,
    expectedVersion: number,
    reasonCode: string,
  ) =>
    records.publication(
      (
        await api.post(`/seputar-jaminan/publications/${id}/unpublish`, {
          expected_version: expectedVersion,
          reason_code: reasonCode,
        })
      ).data,
    ),

  getReviews: async () =>
    lists.review((await api.get("/seputar-jaminan/reviews")).data),

  getSubmissions: async (params: {
    page?: number;
    limit?: number;
    kind?: string;
    state?: string;
  } = {}) =>
    pages.submission(
      (await api.get("/seputar-jaminan/submissions", { params })).data,
    ),

  getEligibleCollaterals: async (params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) =>
    dataPage<{
      items: SjEligibleCollateral[];
      pagination: SjPublicationPage["pagination"];
    }>(
      (await api.get("/seputar-jaminan/eligible-collaterals", { params })).data, "collateral",
    ),

  getProfile: async () => {
    const response = await api.get("/seputar-jaminan/profile");
    return nullableRecord<SjProfile>(response.data, "profile");
  },

  saveProfile: async (payload: {
    expected_version?: number;
    display_name: string;
    public_slug: string;
    city_regency: string;
    province: string;
    short_description: string;
    logo_media_id: string;
    website_url: string | null;
  }) =>
    records.profile(
      (await api.patch("/seputar-jaminan/profile/draft", payload)).data,
    ),

  profileCommand: async (
    command: "submit" | "verify",
    expectedVersion: number,
  ) =>
    records.profile(
      (
        await api.post(`/seputar-jaminan/profile/${command}`, {
          expected_version: expectedVersion,
        })
      ).data,
    ),

  requestProfileRevision: async (expectedVersion: number, reason: string) =>
    records.profile(
      (
        await api.post("/seputar-jaminan/profile/request-revision", {
          expected_version: expectedVersion,
          reason,
        })
      ).data,
    ),

  getContacts: async () =>
    lists.contact((await api.get("/seputar-jaminan/contacts")).data),

  getContact: async (id: string) => {
    const contact = records.contact((await api.get(`/seputar-jaminan/contacts/${encodeURIComponent(id)}`)).data);
    if (contact.id !== id) throw new Error('Identitas kontak tidak sesuai. Muat ulang untuk mencoba lagi.');
    return contact;
  },

  createContact: async (payload: { label: string; phone_e164: string }) =>
    records.contact(
      (await api.post("/seputar-jaminan/contacts", payload)).data,
    ),

  updateContact: async (
    id: string,
    payload: { expected_version: number; label: string; phone_e164: string },
  ) =>
    records.contact(
      (await api.patch(`/seputar-jaminan/contacts/${id}/draft`, payload)).data,
    ),

  contactCommand: async (
    id: string,
    command: "submit" | "verify" | "set-default",
    expectedVersion: number,
  ) =>
    records.contact(
      (
        await api.post(`/seputar-jaminan/contacts/${id}/${command}`, {
          expected_version: expectedVersion,
        })
      ).data,
    ),

  requestContactRevision: async (
    id: string,
    expectedVersion: number,
    reason: string,
  ) =>
    records.contact(
      (
        await api.post(`/seputar-jaminan/contacts/${id}/request-revision`, {
          expected_version: expectedVersion,
          reason,
        })
      ).data,
    ),

  uploadMedia: async (
    file: File,
    purpose: "BPRS_PUBLIC_MARK" | "PUBLICATION_IMAGE",
  ) => {
    const form = new FormData();
    form.append("image", file);
    form.append("purpose", purpose);
    return records.media(
      (
        await api.post("/seputar-jaminan/media", form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data,
    );
  },

  getMedia: async (purpose?: "BPRS_PUBLIC_MARK" | "PUBLICATION_IMAGE") =>
    lists.media(
      (await api.get("/seputar-jaminan/media", { params: { purpose } })).data,
    ),

  getMediaBlob: async (id: string, variant?: "thumbnail") =>
    (
      await api.get<Blob>(`/seputar-jaminan/media/${id}/content`, {
        responseType: "blob",
        ...(variant ? { params: { variant } } : {}),
      })
    ).data,

  createReconciliation: async () =>
    dataRecord<SjReconciliation>(
      (await api.post("/seputar-jaminan/reconciliation")).data,'reconciliation',
    ),

  createPublicationChangeRequest: async (
    id: string,
    action: Extract<SjChangeRequestAction, "UNPUBLISH_PUBLICATION" | "ARCHIVE_PUBLICATION" | "RECONFIRM_PUBLICATION">,
    expectedVersion: number,
    reason: string,
  ) => records.change((await api.post(`/seputar-jaminan/publications/${id}/change-requests`, {
    action,
    expected_version: expectedVersion,
    reason,
  })).data),

  createProfileRemovalRequest: async (expectedVersion: number, reason: string) =>
    records.change((await api.post("/seputar-jaminan/profile/change-requests", {
      expected_version: expectedVersion,
      reason,
    })).data),

  createContactRemovalRequest: async (id: string, expectedVersion: number, reason: string) =>
    records.change((await api.post(`/seputar-jaminan/contacts/${id}/change-requests`, {
      expected_version: expectedVersion,
      reason,
    })).data),

  createMediaRemovalRequest: async (id: string, reason: string) =>
    records.change((await api.post(`/seputar-jaminan/media/${id}/change-requests`, { reason })).data),

  getChangeRequests: async (params: { page?: number; limit?: number; state?: string; action?: string } = {}) =>
    pages.change((await api.get("/seputar-jaminan/change-requests", { params })).data),

  resubmitChangeRequest: async (id: string, expectedVersion: number, reason: string) =>
    records.change((await api.post(`/seputar-jaminan/change-requests/${id}/resubmit`, {
      expected_version: expectedVersion,
      reason,
    })).data),
};
