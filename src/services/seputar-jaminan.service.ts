import api from "@/lib/axios";
import { extractList, extractRecord, isRecord } from "@/services/api.utils";
import type {
  SjContact,
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
} from "@/types/seputar-jaminan.types";

function dataRecord<T>(payload: unknown): T {
  const record = extractRecord(payload);
  if (!record) throw new Error("Jawaban server tidak lengkap.");
  return record as T;
}

function dataList<T>(payload: unknown): T[] {
  const direct = isRecord(payload) && "data" in payload ? payload.data : payload;
  if (Array.isArray(direct)) return direct as T[];
  return extractList(payload) as T[];
}

export const seputarJaminanService = {
  getDashboard: async () =>
    dataRecord<SjDashboard>((await api.get("/seputar-jaminan/dashboard")).data),

  getSettings: async () => {
    const response = await api.get("/seputar-jaminan/settings");
    const payload = isRecord(response.data) ? response.data.data : null;
    return (payload ?? null) as SjSettings | null;
  },

  saveSettings: async (payload: Partial<SjSettings>) =>
    dataRecord<SjSettings>(
      (await api.patch("/seputar-jaminan/settings", payload)).data,
    ),

  getTaxonomy: async () =>
    dataRecord<SjTaxonomy>((await api.get("/seputar-jaminan/taxonomy")).data),

  getPublications: async (params: {
    page?: number;
    limit?: number;
    state?: string;
    category?: string;
    search?: string;
  } = {}) =>
    dataRecord<SjPublicationPage>(
      (await api.get("/seputar-jaminan/publications", { params })).data,
    ),

  getPublication: async (id: string) =>
    dataRecord<SjPublication>(
      (await api.get(`/seputar-jaminan/publications/${id}`)).data,
    ),

  createPublication: async (payload: SjPublicationDraftPayload) =>
    dataRecord<SjPublication>(
      (await api.post("/seputar-jaminan/publications", payload)).data,
    ),

  updatePublication: async (
    id: string,
    payload: Partial<SjPublicationDraftPayload> & { expected_version: number },
  ) =>
    dataRecord<SjPublication>(
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
    dataRecord<SjPublication>(
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
    dataRecord<SjPublication>(
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
    dataRecord<SjPublication>(
      (
        await api.post(`/seputar-jaminan/publications/${id}/unpublish`, {
          expected_version: expectedVersion,
          reason_code: reasonCode,
        })
      ).data,
    ),

  getReviews: async () =>
    dataList<SjReviewPublication>((await api.get("/seputar-jaminan/reviews")).data),

  getEligibleCollaterals: async (params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) =>
    dataRecord<{
      items: SjEligibleCollateral[];
      pagination: SjPublicationPage["pagination"];
    }>(
      (await api.get("/seputar-jaminan/eligible-collaterals", { params })).data,
    ),

  getProfile: async () => {
    const response = await api.get("/seputar-jaminan/profile");
    const payload = isRecord(response.data) ? response.data.data : null;
    return (payload ?? null) as SjProfile | null;
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
    dataRecord<SjProfile>(
      (await api.patch("/seputar-jaminan/profile/draft", payload)).data,
    ),

  profileCommand: async (
    command: "submit" | "verify",
    expectedVersion: number,
  ) =>
    dataRecord<SjProfile>(
      (
        await api.post(`/seputar-jaminan/profile/${command}`, {
          expected_version: expectedVersion,
        })
      ).data,
    ),

  requestProfileRevision: async (expectedVersion: number, reason: string) =>
    dataRecord<SjProfile>(
      (
        await api.post("/seputar-jaminan/profile/request-revision", {
          expected_version: expectedVersion,
          reason,
        })
      ).data,
    ),

  getContacts: async () =>
    dataList<SjContact>((await api.get("/seputar-jaminan/contacts")).data),

  createContact: async (payload: { label: string; phone_e164: string }) =>
    dataRecord<SjContact>(
      (await api.post("/seputar-jaminan/contacts", payload)).data,
    ),

  updateContact: async (
    id: string,
    payload: { expected_version: number; label: string; phone_e164: string },
  ) =>
    dataRecord<SjContact>(
      (await api.patch(`/seputar-jaminan/contacts/${id}/draft`, payload)).data,
    ),

  contactCommand: async (
    id: string,
    command: "submit" | "verify" | "set-default",
    expectedVersion: number,
  ) =>
    dataRecord<SjContact>(
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
    dataRecord<SjContact>(
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
    return dataRecord<SjMedia>(
      (
        await api.post("/seputar-jaminan/media", form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data,
    );
  },

  getMedia: async (purpose?: "BPRS_PUBLIC_MARK" | "PUBLICATION_IMAGE") =>
    dataList<SjMedia>(
      (await api.get("/seputar-jaminan/media", { params: { purpose } })).data,
    ),

  getMediaBlob: async (id: string) =>
    (
      await api.get<Blob>(`/seputar-jaminan/media/${id}/content`, {
        responseType: "blob",
      })
    ).data,

  createReconciliation: async () =>
    dataRecord<Record<string, unknown>>(
      (await api.post("/seputar-jaminan/reconciliation")).data,
    ),
};
