"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Clock3,
  Mail,
  Pencil,
  Save,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import DashboardModal from "@/components/ui/DashboardModal";
import DashboardNotice from "@/components/ui/DashboardNotice";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import {
  SetupDataTable,
  SetupDataTableBody,
  SetupDataTableCell,
  SetupDataTableCol,
  SetupDataTableColGroup,
  SetupDataTableEmptyRow,
  SetupDataTableHead,
  SetupDataTableHeaderCell,
  SetupDataTableRow,
} from "@/components/ui/SetupDataTable";
import SetupActionMenu, {
  type SetupActionMenuItem,
} from "@/components/ui/SetupActionMenu";
import SetupAddButton from "@/components/ui/SetupAddButton";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import {
  RBAC_DENIED_MESSAGE,
  getDashboardRouteDecision,
} from "@/lib/rbac";
import {
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_WIDTH_2XL_CLASS,
} from "@/components/ui/setupPageStyles";
import { divisionService } from "@/services/division.service";
import { roleService } from "@/services/role.service";
import { userService } from "@/services/user.service";
import type {
  InvitationRecord,
  UserPayload,
  UserRecord,
} from "@/types/auth.types";
import type { Division, RoleRecord } from "@/types/master.types";

type UserFormState = {
  name: string;
  username: string;
  email: string;
  phone: string;
  division_id: string;
  role_id: string;
  can_access_restricted_documents: boolean;
};

const EMPTY_FORM: UserFormState = {
  name: "",
  username: "",
  email: "",
  phone: "",
  division_id: "",
  role_id: "",
  can_access_restricted_documents: false,
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ManualInvitationState = {
  userName: string;
  url: string | null;
  reason?: string;
};

type AccessActionState = {
  user: UserRecord;
  action: "close" | "reactivate";
};

type UserStatusFilter = "active" | "inactive" | "all";

const DELETE_HISTORY_CLOSE_REASON =
  "Menutup akses karena pengguna memiliki riwayat aktivitas.";

function normalizeTextInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

function getOnboardingBadgeMeta(status: UserRecord["onboarding_status"]) {
  if (status === "PENDING_ACTIVATION") {
    return { tone: "amber" as const, icon: Clock3 };
  }

  if (status === "NOT_ACTIVATED") {
    return { tone: "gray" as const, icon: AlertTriangle };
  }

  return status === "ACTIVE"
    ? { tone: "emerald" as const, icon: CheckCircle2 }
    : { tone: "gray" as const, icon: AlertTriangle };
}

function getOnboardingLabel(user: UserRecord) {
  if (user.onboarding_status === "PENDING_ACTIVATION") {
    return "Menunggu";
  }

  if (user.onboarding_status === "NOT_ACTIVATED") {
    return "Belum Aktivasi";
  }

  if (user.invitation_pending) {
    return "Menunggu";
  }

  return "Aktif";
}

function canResendInvitation(user: UserRecord) {
  return (
    user.invitation_pending ||
    user.onboarding_status === "PENDING_ACTIVATION" ||
    user.onboarding_status === "NOT_ACTIVATED"
  );
}

function getInvitationToastFeedback(
  invitation: InvitationRecord | null,
  action: "create" | "resend",
  userName: string,
) {
  if (!invitation) {
    return {
      type: "success" as const,
      message:
        action === "create"
          ? "Pengguna berhasil ditambahkan."
          : "Undangan berhasil diperbarui.",
      manualInvitation: null as ManualInvitationState | null,
    };
  }

  const deliveryStatus = invitation.delivery?.status;
  const deliveryReason = invitation.delivery?.reason;

  if (deliveryStatus === "sent") {
    return {
      type: "success" as const,
      message:
        action === "create"
          ? `Pengguna berhasil ditambahkan dan undangan telah dikirim ke email ${userName}.`
          : `Undangan aktivasi berhasil dikirim ulang ke email ${userName}.`,
      manualInvitation: null as ManualInvitationState | null,
    };
  }

  if (deliveryReason === "SMTP_NOT_CONFIGURED") {
    return {
      type: "warning" as const,
      message:
        action === "create"
          ? "Pengguna berhasil ditambahkan, tetapi email undangan belum dikirim karena SMTP belum dikonfigurasi."
          : "Undangan berhasil dibuat ulang, tetapi email belum dikirim karena SMTP belum dikonfigurasi.",
      manualInvitation: {
        userName,
        url: invitation.url ?? null,
        reason: deliveryReason,
      },
    };
  }

  if (deliveryReason === "FRONTEND_URL_NOT_CONFIGURED") {
    return {
      type: "warning" as const,
      message:
        action === "create"
          ? "Pengguna berhasil ditambahkan, tetapi link aktivasi belum siap karena FRONTEND_URL belum dikonfigurasi."
          : "Undangan berhasil dibuat ulang, tetapi link aktivasi belum siap karena FRONTEND_URL belum dikonfigurasi.",
      manualInvitation: {
        userName,
        url: invitation.url ?? null,
        reason: deliveryReason,
      },
    };
  }

  return {
    type: "warning" as const,
    message:
      action === "create"
        ? "Pengguna berhasil ditambahkan, tetapi email undangan belum berhasil dikirim."
        : "Undangan berhasil dibuat ulang, tetapi email belum berhasil dikirim.",
    manualInvitation: {
      userName,
      url: invitation.url ?? null,
      reason: deliveryReason,
    },
  };
}

export default function ManajemenUserPage() {
  const router = useRouter();
  const { role, user: authUser } = useAuth();
  const { showToast } = useAppToast();
  const { ensureCapability, hasCapability } = useProtectedAction();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [formData, setFormData] = useState<UserFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);
  const [manualInvitation, setManualInvitation] =
    useState<ManualInvitationState | null>(null);
  const [accessAction, setAccessAction] = useState<AccessActionState | null>(
    null,
  );
  const [accessReason, setAccessReason] = useState("");
  const [isAccessSubmitting, setIsAccessSubmitting] = useState(false);
  const [deleteImpactLoadingId, setDeleteImpactLoadingId] = useState<
    string | null
  >(null);
  const [statusFilter, setStatusFilter] =
    useState<UserStatusFilter>("active");

  const usersRouteDecision = useMemo(
    () => getDashboardRouteDecision("/dashboard/users", role, authUser?.role_id),
    [authUser?.role_id, role],
  );
  const canReadUsers = usersRouteDecision.allowed;
  const canCreateUsers = hasCapability("/dashboard/users", "create");
  const canUpdateUsers = hasCapability("/dashboard/users", "update");
  const canDeleteUsers = hasCapability("/dashboard/users", "delete");

  const roleNameById = useMemo(
    () => new Map(roles.map((item) => [item.id, item.name])),
    [roles],
  );
  const divisionNameById = useMemo(
    () => new Map(divisions.map((item) => [item.id, item.name])),
    [divisions],
  );

  const getResolvedRoleName = useCallback(
    (user: UserRecord) => user.role_name ?? roleNameById.get(user.role_id) ?? user.role_id,
    [roleNameById],
  );
  const getResolvedDivisionName = useCallback(
    (user: UserRecord) =>
      user.division_name ?? divisionNameById.get(user.division_id) ?? user.division_id,
    [divisionNameById],
  );
  const loadData = useCallback(async () => {
    setIsFetching(true);

    try {
      const [userList, divisionList, roleList] = await Promise.all([
        userService.getAll(),
        divisionService.getAll(),
        roleService.getAll(),
      ]);

      setUsers(userList);
      setDivisions(divisionList);
      setRoles(roleList);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal memuat data pengguna",
        "error",
      );
    } finally {
      setIsFetching(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!role) return;
    if (usersRouteDecision.allowed) {
      void loadData();
      return;
    }

    showToast(RBAC_DENIED_MESSAGE, "warning");
    router.replace("/dashboard");
  }, [loadData, role, router, showToast, usersRouteDecision.allowed]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const scopedUsers = users.filter((user) => {
      if (statusFilter === "active") return user.is_active;
      if (statusFilter === "inactive") return !user.is_active;
      return true;
    });

    if (!term) return scopedUsers;

    return scopedUsers.filter((user) => {
      const resolvedRoleName = getResolvedRoleName(user).toLowerCase();
      const resolvedDivisionName = getResolvedDivisionName(user).toLowerCase();

      return (
        user.name.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.phone ?? user.phone_number ?? "").toLowerCase().includes(term) ||
        resolvedDivisionName.includes(term) ||
        resolvedRoleName.includes(term)
      );
    });
  }, [
    getResolvedDivisionName,
    getResolvedRoleName,
    searchTerm,
    statusFilter,
    users,
  ]);
  const {
    paginatedItems: paginatedUsers,
    meta: paginationMeta,
    setPage,
    resetPage,
  } = useClientPagination(filteredUsers, SETUP_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [resetPage, searchTerm, statusFilter]);

  const requireCreateUserAction = () =>
    ensureCapability("/dashboard/users", "create", {
      redirectTo: "/dashboard",
    });

  const requireUpdateUserAction = () =>
    ensureCapability("/dashboard/users", "update", {
      redirectTo: "/dashboard",
    });

  const requireDeleteUserAction = () =>
    ensureCapability("/dashboard/users", "delete", {
      redirectTo: "/dashboard",
    });

  const resetForm = () => setFormData(EMPTY_FORM);

  const handleAdd = () => {
    if (!requireCreateUserAction()) return;
    setEditUser(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (user: UserRecord) => {
    if (!requireUpdateUserAction()) return;

    setEditUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone ?? user.phone_number ?? "",
      division_id: user.division_id,
      role_id: user.role_id,
      can_access_restricted_documents:
        user.can_access_restricted_documents ?? user.is_restrict,
    });
    setShowModal(true);
  };

  const handleDelete = async (user: UserRecord) => {
    if (!requireDeleteUserAction()) return;

    if (user.id === authUser?.id) {
      showToast("Anda tidak dapat menghapus akun sendiri.", "warning");
      return;
    }

    setDeleteImpactLoadingId(user.id);

    try {
      const impact = await userService.getDeleteImpact(user.id);

      if (impact.can_delete) {
        setDeleteUser(user);
        setShowDelete(true);
        return;
      }

      if (impact.requires_access_closure) {
        if (!canUpdateUsers) {
          showToast(impact.message, "warning");
          return;
        }

        showToast(impact.message, "warning");
        setAccessAction({
          user,
          action: "close",
        });
        setAccessReason(DELETE_HISTORY_CLOSE_REASON);
        return;
      }

      showToast(impact.message, "warning");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal mengecek status penghapusan pengguna",
        "error",
      );
    } finally {
      setDeleteImpactLoadingId(null);
    }
  };

  const handleOpenAccessAction = (user: UserRecord) => {
    if (!requireUpdateUserAction()) return;

    if (user.is_active && user.id === authUser?.id) {
      showToast("Anda tidak dapat menutup akses akun sendiri.", "warning");
      return;
    }

    setAccessAction({
      user,
      action: user.is_active ? "close" : "reactivate",
    });
    setAccessReason("");
  };

  const handleConfirmAccessAction = async () => {
    if (!requireUpdateUserAction()) return;
    if (!accessAction) return;

    const reason = normalizeTextInput(accessReason);
    if (reason.length < 5) {
      showToast("Alasan minimal 5 karakter.", "warning");
      return;
    }

    setIsAccessSubmitting(true);

    try {
      const updatedUser =
        accessAction.action === "close"
          ? await userService.closeAccess(accessAction.user.id, reason)
          : await userService.reactivateAccess(accessAction.user.id, reason);

      setUsers((prev) =>
        prev.map((item) =>
          item.id === updatedUser.id
            ? {
                ...updatedUser,
                role_name: roleNameById.get(updatedUser.role_id),
                division_name: divisionNameById.get(updatedUser.division_id),
              }
            : item,
        ),
      );
      showToast(
        accessAction.action === "close"
          ? "Akses pengguna berhasil ditutup."
          : "Akses pengguna berhasil diaktifkan kembali.",
        "success",
      );
      setAccessAction(null);
      setAccessReason("");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui akses pengguna",
        "error",
      );
    } finally {
      setIsAccessSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!requireDeleteUserAction()) return;
    if (!deleteUser) return;

    try {
      await userService.remove(deleteUser.id);
      setUsers((prev) => prev.filter((user) => user.id !== deleteUser.id));
      showToast("Pengguna berhasil dihapus.", "success");
      setShowDelete(false);
      setDeleteUser(null);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus pengguna",
        "error",
      );
    }
  };

  const handleResendInvite = async (user: UserRecord) => {
    if (!requireUpdateUserAction()) return;
    if (!canResendInvitation(user)) {
      showToast("Pengguna ini sudah aktif dan tidak memerlukan undangan baru.", "warning");
      return;
    }

    setInviteLoadingId(user.id);

    try {
      const result = await userService.sendInvite(user.id);
      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? result.user : item)),
      );

      const feedback = getInvitationToastFeedback(
        result.invitation,
        "resend",
        result.user.email,
      );
      showToast(feedback.message, feedback.type);
      if (feedback.manualInvitation) {
        setManualInvitation(feedback.manualInvitation);
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal mengirim ulang undangan",
        "error",
      );
    } finally {
      setInviteLoadingId(null);
    }
  };

  const handleSubmit = async () => {
    if (editUser) {
      if (!requireUpdateUserAction()) return;
    } else if (!requireCreateUserAction()) {
      return;
    }

    if (!normalizeTextInput(formData.name)) {
      showToast("Nama lengkap wajib diisi.", "warning");
      return;
    }

    if (!formData.username.trim()) {
      showToast("Username wajib diisi.", "warning");
      return;
    }

    if (!formData.email.trim()) {
      showToast("Email wajib diisi.", "warning");
      return;
    }

    if (!formData.division_id) {
      showToast("Divisi wajib dipilih.", "warning");
      return;
    }

    if (!formData.role_id) {
      showToast("Role wajib dipilih.", "warning");
      return;
    }

    const normalizedUsername = formData.username.trim().toLowerCase();
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (/\s/.test(normalizedUsername)) {
      showToast("Username tidak boleh mengandung spasi.", "warning");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      showToast("Format email belum valid.", "warning");
      return;
    }

    const duplicateUsername = users.some(
      (user) =>
        user.id !== editUser?.id &&
        user.username.trim().toLowerCase() === normalizedUsername,
    );

    if (duplicateUsername) {
      showToast("Username sudah digunakan.", "warning");
      return;
    }

    const duplicateEmail = users.some(
      (user) =>
        user.id !== editUser?.id &&
        user.email.trim().toLowerCase() === normalizedEmail,
    );

    if (duplicateEmail) {
      showToast("Email sudah digunakan.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UserPayload = {
        name: normalizeTextInput(formData.name),
        username: normalizedUsername,
        email: normalizedEmail,
        phone: formData.phone.trim() || undefined,
        can_access_restricted_documents:
          formData.can_access_restricted_documents,
        role_id: formData.role_id,
        division_id: formData.division_id,
      };

      const mutationResult = editUser
        ? { user: await userService.update(editUser.id, payload), invitation: null }
        : await userService.create(payload);

      const savedUser = mutationResult.user;

      const nextUser: UserRecord = {
        ...savedUser,
        role_name: roleNameById.get(payload.role_id),
        division_name: divisionNameById.get(payload.division_id),
      };

      setUsers((prev) => {
        if (editUser) {
          return prev.map((user) => (user.id === editUser.id ? nextUser : user));
        }
        return [...prev, nextUser];
      });

      if (editUser) {
        showToast("Pengguna berhasil diperbarui.", "success");
      } else {
        const feedback = getInvitationToastFeedback(
          mutationResult.invitation,
          "create",
          savedUser.email,
        );
        showToast(feedback.message, feedback.type);
        if (feedback.manualInvitation) {
          setManualInvitation(feedback.manualInvitation);
        }
      }

      setShowModal(false);
      setEditUser(null);
      resetForm();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menyimpan pengguna",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserActionItems = (user: UserRecord): SetupActionMenuItem[] => {
    const items: SetupActionMenuItem[] = [];

    if (canUpdateUsers && canResendInvitation(user)) {
      items.push({
        key: "invite",
        label: "Kirim Ulang Undangan",
        icon: Mail,
        tone: "amber",
        disabled: inviteLoadingId === user.id,
        onClick: () => {
          void handleResendInvite(user);
        },
      });
    }

    if (canUpdateUsers) {
      items.push({
        key: user.is_active ? "close-access" : "reactivate-access",
        label: user.is_active ? "Tutup Akses" : "Aktifkan Kembali",
        icon: user.is_active ? ShieldOff : ShieldCheck,
        tone: user.is_active ? "red" : "emerald",
        onClick: () => {
          handleOpenAccessAction(user);
        },
      });

      items.push({
        key: "edit",
        label: "Edit",
        icon: Pencil,
        tone: "blue",
        onClick: () => {
          handleEdit(user);
        },
      });
    }

    if (canDeleteUsers) {
      items.push({
        key: "delete",
        label: "Hapus",
        icon: Trash2,
        tone: "red",
        disabled: user.id === authUser?.id || deleteImpactLoadingId === user.id,
        onClick: () => {
          void handleDelete(user);
        },
      });
    }

    return items;
  };

  if (!canReadUsers) return null;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Manajemen User"
        subtitle="Kelola pengguna, role, dan akses sistem"
        icon={<Users />}
        actions={
          <SetupAddButton
            label="Tambah User"
            onClick={handleAdd}
            disabled={isFetching || roles.length === 0 || !canCreateUsers}
          />
        }
      />

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_2XL_CLASS}`}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
          <SetupSearchInput
            label="Cari Data"
            labelClassName={SETUP_PAGE_SEARCH_LABEL_CLASS}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari berdasarkan nama, username, email, no. handphone, divisi, atau role..."
          />
          <div>
            <label className={`block ${SETUP_PAGE_SEARCH_LABEL_CLASS}`}>
              Status User
            </label>
            <SetupSelect
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as UserStatusFilter)
              }
            >
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="all">Semua</option>
            </SetupSelect>
          </div>
        </div>
      </div>

      <div className={`${SETUP_PAGE_TABLE_CARD_CLASS} mx-auto max-w-[1240px]`}>
        <div className="overflow-x-auto">
          <SetupDataTable className="min-w-[1200px] table-fixed">
            <SetupDataTableColGroup>
              <SetupDataTableCol className="w-[48px]" />
              <SetupDataTableCol className="w-[146px]" />
              <SetupDataTableCol className="w-[110px]" />
              <SetupDataTableCol className="w-[200px]" />
              <SetupDataTableCol className="w-[136px]" />
              <SetupDataTableCol className="w-[76px]" />
              <SetupDataTableCol className="w-[92px]" />
              <SetupDataTableCol className="w-[112px]" />
              <SetupDataTableCol className="w-[96px]" />
              <SetupDataTableCol className="w-[116px]" />
              <SetupDataTableCol className="w-[48px]" />
            </SetupDataTableColGroup>
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Nama
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Username
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Email
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  No. Handphone
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Divisi
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Role
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Akses Restrict
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aktivasi Akun
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {paginatedUsers.map((user, index) => {
                const resolvedRoleName = getResolvedRoleName(user);
                const resolvedDivisionName = getResolvedDivisionName(user);
                const rowNumber =
                  (paginationMeta.page - 1) * paginationMeta.limit + index + 1;
                const canAccessRestrictedDocuments =
                  user.can_access_restricted_documents ?? user.is_restrict;
                const onboardingBadge = getOnboardingBadgeMeta(
                  user.onboarding_status,
                );

                return (
                  <SetupDataTableRow
                    key={user.id}
                    className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                  >
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                      {rowNumber}
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CELL_CLASS} truncate font-semibold text-gray-900`}
                      title={user.name}
                    >
                      {user.name}
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CELL_CLASS} truncate text-gray-900`}
                      title={user.username}
                    >
                      {user.username}
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CELL_CLASS} truncate text-gray-700`}
                      title={user.email}
                    >
                      {user.email}
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CENTER_CELL_CLASS} truncate text-gray-700`}
                      title={user.phone ?? user.phone_number ?? "-"}
                    >
                      {user.phone ?? user.phone_number ?? "-"}
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CENTER_CELL_CLASS} truncate text-gray-700`}
                      title={resolvedDivisionName}
                    >
                      {resolvedDivisionName}
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={`${SETUP_PAGE_MODERN_CENTER_CELL_CLASS} truncate text-gray-700`}
                      title={resolvedRoleName}
                    >
                      {resolvedRoleName}
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupStatusBadge
                        status={canAccessRestrictedDocuments ? "Ya" : "Tidak"}
                        label={canAccessRestrictedDocuments ? "Ya" : "Tidak"}
                        tone={canAccessRestrictedDocuments ? "emerald" : "gray"}
                        icon={
                          canAccessRestrictedDocuments
                            ? ShieldCheck
                            : ShieldOff
                        }
                      />
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupStatusBadge status={user.is_active ? "Aktif" : "Nonaktif"} />
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupStatusBadge
                        status={getOnboardingLabel(user)}
                        label={getOnboardingLabel(user)}
                        tone={onboardingBadge.tone}
                        icon={onboardingBadge.icon}
                      />
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupActionMenu
                        label="Buka aksi user"
                        menuLabel={`Aksi untuk ${user.name}`}
                        items={getUserActionItems(user)}
                      />
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                );
              })}
              {!isFetching && filteredUsers.length === 0 && (
                <SetupDataTableEmptyRow colSpan={11}>
                  Tidak ada user yang cocok.
                </SetupDataTableEmptyRow>
              )}
              {isFetching && (
                <SetupDataTableEmptyRow colSpan={11}>
                  Memuat data user...
                </SetupDataTableEmptyRow>
              )}
            </SetupDataTableBody>
          </SetupDataTable>
        </div>
        <Pagination
          page={paginationMeta.page}
          lastPage={paginationMeta.lastPage}
          total={paginationMeta.total}
          limit={paginationMeta.limit}
          isLoading={isFetching}
          onPageChange={setPage}
        />
      </div>

      <DashboardModal
        isOpen={showModal}
        title={editUser ? "Edit Pengguna" : "Tambah Pengguna"}
        description={
          editUser
            ? "Perbarui data akun, divisi, role, dan akses dokumen pengguna."
            : "Buat akun pengguna baru dan kirim link aktivasi lewat email."
        }
        onClose={() => setShowModal(false)}
        maxWidth="2xl"
        bodyClassName="grid grid-cols-1 gap-4 p-6 md:grid-cols-2"
        footer={
          <>
            <button
              onClick={() => setShowModal(false)}
              className="uiverse-modal-button uiverse-modal-button--neutral"
              type="button"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                !formData.name.trim() ||
                !formData.username.trim() ||
                !formData.email.trim() ||
                !formData.division_id ||
                !formData.role_id ||
                isSubmitting
              }
              className="uiverse-modal-button uiverse-modal-button--primary"
              type="button"
            >
              {isSubmitting ? (
                <>
                  <div
                    className="button-spinner uiverse-modal-button__spinner"
                    style={
                      {
                        ["--spinner-size"]: "18px",
                        ["--spinner-border"]: "2px",
                      } as React.CSSProperties
                    }
                    aria-hidden="true"
                  />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {editUser ? "Simpan" : "Simpan & Kirim Undangan"}
                  </span>
                </>
              )}
            </button>
          </>
        }
      >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <SetupTextInput
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Masukkan nama pengguna"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Nama ini akan tampil di sistem.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <SetupTextInput
                  value={formData.username}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  placeholder="Masukkan username"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Gunakan username yang unik dan tanpa spasi.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <SetupTextInput
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="Masukkan email pengguna"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Email ini dipakai untuk undangan dan reset password.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  No. Handphone
                </label>
                <SetupTextInput
                  type="tel"
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="Masukkan nomor telepon"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Boleh dikosongkan.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Divisi <span className="text-red-500">*</span>
                </label>
                <SetupSelect
                  value={formData.division_id}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      division_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Pilih divisi</option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </SetupSelect>
                <p className="mt-2 text-xs text-slate-500">
                  Pilih divisi tempat pengguna bertugas.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <SetupSelect
                  value={formData.role_id}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      role_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Pilih role</option>
                  {roles.map((roleOption) => (
                    <option key={roleOption.id} value={roleOption.id}>
                      {roleOption.name}
                    </option>
                  ))}
                </SetupSelect>
                <p className="mt-2 text-xs text-slate-500">
                  Role menentukan menu dan aksi yang bisa diakses.
                </p>
              </div>

              <DashboardNotice
                title="Akses Dokumen Restrict"
                description="Aktifkan kalau pengguna boleh melihat dokumen restrict."
              >
                <div className="pt-1">
                  <UiverseCheckbox
                    checked={formData.can_access_restricted_documents}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        can_access_restricted_documents: checked,
                      }))
                    }
                    label={
                      formData.can_access_restricted_documents ? "Ya" : "Tidak"
                    }
                  />
                </div>
              </DashboardNotice>

              {!editUser ? (
                <DashboardNotice
                  title="Undangan aktivasi otomatis"
                  description="Link aktivasi akan dikirim ke email pengguna. Pengguna membuat password dari link tersebut."
                  icon={<Mail className="h-5 w-5" />}
                  className="md:col-span-2"
                />
              ) : null}

      </DashboardModal>

      <DashboardModal
        isOpen={manualInvitation !== null}
        title="Undangan Siap Dibagikan"
        description="Email undangan belum terkirim otomatis, tetapi link aktivasi sudah siap dibagikan."
        onClose={() => setManualInvitation(null)}
        maxWidth="xl"
        bodyClassName="space-y-4 p-6"
        footer={
          <>
            {manualInvitation?.url ? (
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(manualInvitation.url ?? "");
                    showToast("Link aktivasi berhasil disalin.", "success");
                  } catch {
                    showToast("Gagal menyalin link aktivasi.", "error");
                  }
                }}
                className="uiverse-modal-button uiverse-modal-button--primary"
                type="button"
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>Salin Link</span>
              </button>
            ) : null}
            <button
              onClick={() => setManualInvitation(null)}
              className="uiverse-modal-button uiverse-modal-button--neutral"
              type="button"
            >
              Tutup
            </button>
          </>
        }
      >
        {manualInvitation ? (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-800">
                {manualInvitation.userName}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Bagikan link berikut agar pengguna bisa membuat password pertama.
              </p>
            </div>

            {manualInvitation.url ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Link Aktivasi
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="break-all text-sm text-slate-700">
                    {manualInvitation.url}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-900">
                  Link aktivasi belum tersedia
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Periksa konfigurasi URL frontend agar link aktivasi bisa dibuat.
                </p>
              </div>
            )}
          </>
        ) : null}
      </DashboardModal>

      <DashboardModal
        isOpen={accessAction !== null}
        title={
          accessAction?.action === "close"
            ? "Tutup Akses Pengguna"
            : "Aktifkan Kembali Pengguna"
        }
        description={
          accessAction
            ? `${accessAction.user.name} - ${accessAction.user.email}`
            : undefined
        }
        onClose={() => setAccessAction(null)}
        closeDisabled={isAccessSubmitting}
        maxWidth="lg"
        bodyClassName="space-y-4 p-6"
        footer={
          <>
            <button
              onClick={() => setAccessAction(null)}
              className="uiverse-modal-button uiverse-modal-button--neutral"
              disabled={isAccessSubmitting}
              type="button"
            >
              Batal
            </button>
            <button
              onClick={() => void handleConfirmAccessAction()}
              disabled={
                isAccessSubmitting || normalizeTextInput(accessReason).length < 5
              }
              className={
                accessAction?.action === "close"
                  ? "uiverse-modal-button uiverse-modal-button--danger"
                  : "uiverse-modal-button uiverse-modal-button--success"
              }
              type="button"
            >
              {isAccessSubmitting ? (
                <>
                  <span
                    className="button-spinner"
                    style={
                      {
                        ["--spinner-size"]: "18px",
                        ["--spinner-border"]: "2px",
                      } as React.CSSProperties
                    }
                    aria-hidden="true"
                  />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>
                  {accessAction?.action === "close"
                    ? "Tutup Akses"
                    : "Aktifkan Kembali"}
                </span>
              )}
            </button>
          </>
        }
      >
        {accessAction ? (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-800">
                {accessAction.action === "close"
                  ? "Pengguna tidak bisa login setelah akses ditutup."
                  : "Pengguna bisa login kembali setelah akses diaktifkan."}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Riwayat pengguna tetap tersimpan untuk audit dan laporan.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan <span className="text-red-500">*</span>
              </label>
              <SetupTextarea
                value={accessReason}
                onChange={(event) => setAccessReason(event.target.value)}
                className="min-h-28 resize-none"
                placeholder={
                  accessAction.action === "close"
                    ? "Tuliskan alasan penutupan akses."
                    : "Tuliskan alasan pembukaan akses."
                }
                disabled={isAccessSubmitting}
              />
              <p className="mt-2 text-xs text-slate-500">
                Minimal 5 karakter. Alasan disimpan sebagai catatan perubahan akses.
              </p>
            </div>
          </>
        ) : null}
      </DashboardModal>

      <DeleteConfirmModal
        isOpen={showDelete && deleteUser !== null}
        title="Hapus Pengguna?"
        entityLabel="pengguna"
        itemName={deleteUser?.name ?? ""}
        onClose={() => setShowDelete(false)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
