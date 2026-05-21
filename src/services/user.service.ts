import api from "@/lib/axios";
import {
  extractList,
  extractPaginationMeta,
  extractRecord,
  readBoolean,
  readNumber,
  readString,
} from "@/services/api.utils";
import { MAX_TABLE_PAGE_SIZE, SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import type { PageQuery, PaginatedResult } from "@/types/api.types";
import type {
  InvitationRecord,
  UserDeleteImpact,
  UserDeleteImpactReason,
  UserMutationResult,
  UserPayload,
  UserRecord,
} from "@/types/auth.types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function mapUser(record: UnknownRecord): UserRecord | null {
  const roleRecord = asRecord(record.role);
  const divisionRecord = asRecord(record.division);
  const id = readString(record, "id");
  const username = readString(record, "username");
  const email = readString(record, "email") ?? "";
  const name =
    readString(record, "name", "full_name", "fullName") ?? username ?? null;
  const roleId =
    readString(record, "role_id", "roleId") ??
    (roleRecord ? readString(roleRecord, "id") : null);
  const divisionId =
    readString(record, "division_id", "divisionId") ??
    (divisionRecord ? readString(divisionRecord, "id") : null);

  if (!id || !username || !name || !roleId || !divisionId) {
    return null;
  }

  return {
    id,
    username,
    email,
    name,
    role_id: roleId,
    division_id: divisionId,
    can_access_restricted_documents: readBoolean(
      record,
      "can_access_restricted_documents",
      "canAccessRestrictedDocuments",
      "is_restrict",
      "isRestrict",
    ),
    is_restrict: readBoolean(
      record,
      "can_access_restricted_documents",
      "canAccessRestrictedDocuments",
      "is_restrict",
      "isRestrict",
    ),
    is_active:
      !("is_active" in record || "isActive" in record) ||
      readBoolean(record, "is_active", "isActive"),
    phone:
      readString(
        record,
        "phone",
        "phone_number",
        "phoneNumber",
        "whatsapp_number",
        "whatsappNumber",
        "no_hp",
        "noHp",
        "no_handphone",
        "noHandphone",
      ) ?? undefined,
    phone_number:
      readString(
        record,
        "phone",
        "phone_number",
        "phoneNumber",
        "whatsapp_number",
        "whatsappNumber",
        "no_hp",
        "noHp",
        "no_handphone",
        "noHandphone",
      ) ?? undefined,
    role_name:
      readString(record, "role_name", "roleName") ??
      (roleRecord
        ? readString(
            roleRecord,
            "name",
            "label",
            "role_name",
            "roleName",
          ) ?? undefined
        : undefined),
    division_name:
      readString(record, "division_name", "divisionName") ??
      (divisionRecord
        ? readString(
            divisionRecord,
            "name",
            "label",
            "division_name",
            "divisionName",
          ) ?? undefined
        : undefined),
    email_verified_at:
      readString(record, "email_verified_at", "emailVerifiedAt") ?? null,
    password_set_at:
      readString(record, "password_set_at", "passwordSetAt") ?? null,
    deactivated_at:
      readString(record, "deactivated_at", "deactivatedAt") ?? null,
    deactivated_by:
      readString(record, "deactivated_by", "deactivatedBy") ?? null,
    deactivation_reason:
      readString(record, "deactivation_reason", "deactivationReason") ?? null,
    reactivated_at:
      readString(record, "reactivated_at", "reactivatedAt") ?? null,
    reactivated_by:
      readString(record, "reactivated_by", "reactivatedBy") ?? null,
    reactivation_reason:
      readString(record, "reactivation_reason", "reactivationReason") ?? null,
    invitation_pending:
      "invitation_pending" in record || "invitationPending" in record
        ? readBoolean(record, "invitation_pending", "invitationPending")
        : undefined,
    onboarding_status: (() => {
      const status = readString(record, "onboarding_status", "onboardingStatus");
      if (
        status === "ACTIVE" ||
        status === "PENDING_ACTIVATION" ||
        status === "NOT_ACTIVATED"
      ) {
        return status;
      }

      return undefined;
    })(),
  };
}

function mapInvitation(record: UnknownRecord | null): InvitationRecord | null {
  if (!record) return null;

  const type = readString(record, "type");
  if (type !== "INVITE") return null;

  const deliveryRecord = asRecord(record.delivery);

  return {
    type: "INVITE",
    token: readString(record, "token") ?? undefined,
    path: readString(record, "path") ?? undefined,
    url: readString(record, "url") ?? null,
    expires_at: readString(record, "expires_at", "expiresAt") ?? undefined,
    delivery: deliveryRecord
      ? {
          channel: readString(deliveryRecord, "channel") ?? undefined,
          status: readString(deliveryRecord, "status") ?? undefined,
          reason: readString(deliveryRecord, "reason") ?? undefined,
          error: readString(deliveryRecord, "error") ?? undefined,
          message_id:
            readString(deliveryRecord, "message_id", "messageId") ?? null,
          accepted: Array.isArray(deliveryRecord.accepted)
            ? deliveryRecord.accepted.filter(
                (item): item is string => typeof item === "string",
              )
            : undefined,
          rejected: Array.isArray(deliveryRecord.rejected)
            ? deliveryRecord.rejected.filter(
                (item): item is string => typeof item === "string",
              )
            : undefined,
        }
      : undefined,
  };
}

function mapUserMutationResult(record: UnknownRecord | null): UserMutationResult | null {
  if (!record) return null;

  const directUser = mapUser(record);
  const nestedUserRecord = asRecord(record.user);
  const nestedUser = nestedUserRecord ? mapUser(nestedUserRecord) : null;
  const user = nestedUser ?? directUser;

  if (!user) return null;

  return {
    user,
    invitation: mapInvitation(asRecord(record.invitation)),
  };
}

function mapUserDeleteImpact(record: UnknownRecord | null): UserDeleteImpact {
  const reason = readString(record ?? {}, "reason") as UserDeleteImpactReason;

  return {
    can_delete: record ? readBoolean(record, "can_delete", "canDelete") : false,
    has_activity: record ? readBoolean(record, "has_activity", "hasActivity") : false,
    dependency_count:
      (record
        ? readNumber(record, "dependency_count", "dependencyCount")
        : null) ?? 0,
    requires_access_closure: record
      ? readBoolean(record, "requires_access_closure", "requiresAccessClosure")
      : false,
    can_close_access: record
      ? readBoolean(record, "can_close_access", "canCloseAccess")
      : false,
    reason,
    message:
      (record ? readString(record, "message") : null) ??
      "Status penghapusan pengguna tidak tersedia.",
  };
}

async function getUsersPage({
  page = 1,
  limit = SETUP_TABLE_PAGE_SIZE,
  search,
}: PageQuery = {}): Promise<PaginatedResult<UserRecord>> {
  const res = await api.get("/users", {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
    },
  });
  const items = extractList(res.data)
    .map((record) => mapUser(record))
    .filter((item): item is UserRecord => item !== null);

  return {
    items,
    meta: extractPaginationMeta(res.data, {
      page,
      limit,
      total: items.length,
    }),
  };
}

export const userService = {
  getPage: getUsersPage,
  getAll: async (): Promise<UserRecord[]> => {
    const first = await getUsersPage({ page: 1, limit: MAX_TABLE_PAGE_SIZE });
    const all = [...first.items];

    for (let page = 2; page <= first.meta.lastPage; page += 1) {
      const next = await getUsersPage({ page, limit: MAX_TABLE_PAGE_SIZE });
      all.push(...next.items);
    }

    return all;
  },
  getMe: async (): Promise<UserRecord | null> => {
    const res = await api.get("/users/me");
    const record = extractRecord(res.data);
    return record ? mapUser(record) : null;
  },
  getById: async (id: string): Promise<UserRecord | null> => {
    const res = await api.get(`/users/${id}`);
    const record = extractRecord(res.data);
    return record ? mapUser(record) : null;
  },
  create: async (data: UserPayload): Promise<UserMutationResult> => {
    const res = await api.post("/users", data);
    const mapped = mapUserMutationResult(extractRecord(res.data));

    if (!mapped) {
      throw new Error("Respons create user dari server tidak valid");
    }

    return mapped;
  },
  update: async (id: string, data: UserPayload): Promise<UserRecord> => {
    const res = await api.put(`/users/${id}`, data);
    const record = extractRecord(res.data);
    const mapped = record ? mapUser(record) : null;

    if (!mapped) {
      throw new Error("Respons update user dari server tidak valid");
    }

    return mapped;
  },
  sendInvite: async (id: string): Promise<UserMutationResult> => {
    const res = await api.post(`/users/${id}/send-invite`);
    const mapped = mapUserMutationResult(extractRecord(res.data));

    if (!mapped) {
      throw new Error("Respons kirim undangan dari server tidak valid");
    }

    return mapped;
  },
  closeAccess: async (id: string, reason: string): Promise<UserRecord> => {
    const res = await api.post(`/users/${id}/close-access`, { reason });
    const record = extractRecord(res.data);
    const mapped = record ? mapUser(record) : null;

    if (!mapped) {
      throw new Error("Respons tutup akses dari server tidak valid");
    }

    return mapped;
  },
  reactivateAccess: async (id: string, reason: string): Promise<UserRecord> => {
    const res = await api.post(`/users/${id}/reactivate-access`, { reason });
    const record = extractRecord(res.data);
    const mapped = record ? mapUser(record) : null;

    if (!mapped) {
      throw new Error("Respons aktivasi ulang dari server tidak valid");
    }

    return mapped;
  },
  getDeleteImpact: async (id: string): Promise<UserDeleteImpact> => {
    const res = await api.get(`/users/${id}/delete-impact`);
    return mapUserDeleteImpact(extractRecord(res.data));
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
