"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Mail,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAppToast } from "@/components/ui/AppToastProvider";
import FeatureHeader from "@/components/ui/FeatureHeader";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import UiverseCheckbox from "@/components/ui/UiverseCheckbox";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import {
  RBAC_DENIED_MESSAGE,
  getDashboardRouteDecision,
  ROLES,
  mapRoleLikeToAppRole,
} from "@/lib/rbac";
import {
  SETUP_PAGE_ADD_BUTTON_CLASS,
  SETUP_PAGE_ACTION_CELL_CLASS,
  SETUP_PAGE_ACTION_HEADER_CELL_CLASS,
  SETUP_PAGE_EMPTY_STATE_CELL_CLASS,
  SETUP_PAGE_NUMBER_CELL_CLASS,
  SETUP_PAGE_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_ICON_CLASS,
  SETUP_PAGE_SEARCH_INPUT_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_SEARCH_WRAPPER_CLASS,
  SETUP_PAGE_TABLE_BODY_CLASS,
  SETUP_PAGE_TABLE_CARD_CLASS,
  SETUP_PAGE_TABLE_CLASS,
  SETUP_PAGE_TABLE_CELL_CLASS,
  SETUP_PAGE_TABLE_HEADER_CELL_CLASS,
  SETUP_PAGE_TABLE_HEAD_CLASS,
  SETUP_PAGE_TABLE_ROW_CLASS,
  SETUP_PAGE_TABLE_SCROLL_CLASS,
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
  is_restrict: boolean;
  password: string;
};

const EMPTY_FORM: UserFormState = {
  name: "",
  username: "",
  email: "",
  phone: "",
  division_id: "",
  role_id: "",
  is_restrict: false,
  password: "",
};
const PILL_BASE_CLASS =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold";
const ACTION_ICON_BUTTON_CLASS =
  "inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors";
const MIN_USER_PASSWORD_LENGTH = 8;
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

function normalizeTextInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

function getBooleanPillClass(isEnabled: boolean) {
  return isEnabled
    ? `${PILL_BASE_CLASS} border-emerald-200 bg-emerald-50 text-emerald-700`
    : `${PILL_BASE_CLASS} border-gray-200 bg-gray-100 text-gray-700`;
}

function getOnboardingPillClass(status: UserRecord["onboarding_status"]) {
  if (status === "PENDING_ACTIVATION") {
    return `${PILL_BASE_CLASS} border-amber-200 bg-amber-50 text-amber-700`;
  }

  if (status === "NOT_ACTIVATED") {
    return `${PILL_BASE_CLASS} border-gray-200 bg-gray-100 text-gray-700`;
  }

  return status === "ACTIVE"
    ? `${PILL_BASE_CLASS} border-emerald-200 bg-emerald-50 text-emerald-700`
    : `${PILL_BASE_CLASS} border-gray-200 bg-gray-100 text-gray-700`;
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
          ? "User berhasil ditambahkan."
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
          ? `User berhasil ditambahkan dan undangan telah dikirim ke email ${userName}.`
          : `Undangan aktivasi berhasil dikirim ulang ke email ${userName}.`,
      manualInvitation: null as ManualInvitationState | null,
    };
  }

  if (deliveryReason === "SMTP_NOT_CONFIGURED") {
    return {
      type: "warning" as const,
      message:
        action === "create"
          ? "User berhasil ditambahkan, tetapi email undangan belum dikirim karena SMTP belum dikonfigurasi."
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
          ? "User berhasil ditambahkan, tetapi link aktivasi belum siap karena FRONTEND_URL belum dikonfigurasi."
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
        ? "User berhasil ditambahkan, tetapi email undangan belum berhasil dikirim."
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
  const getResolvedAppRole = useCallback(
    (user: UserRecord) => mapRoleLikeToAppRole(getResolvedRoleName(user)),
    [getResolvedRoleName],
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
        error instanceof Error ? error.message : "Gagal memuat data user",
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

  const activeItCount = useMemo(
    () =>
      users.filter(
        (user) => user.is_active && getResolvedAppRole(user) === ROLES.IT,
      )
        .length,
    [getResolvedAppRole, users],
  );

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
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
  }, [getResolvedDivisionName, getResolvedRoleName, searchTerm, users]);

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
      is_restrict: user.is_restrict,
      password: "",
    });
    setShowModal(true);
  };

  const handleDelete = (user: UserRecord) => {
    if (!requireDeleteUserAction()) return;

    if (
      getResolvedAppRole(user) === ROLES.IT &&
      user.is_active &&
      activeItCount <= 1
    ) {
      showToast("Tidak bisa menghapus akun IT aktif terakhir.", "warning");
      return;
    }

    setDeleteUser(user);
    setShowDelete(true);
  };

  const handleOpenAccessAction = (user: UserRecord) => {
    if (!requireUpdateUserAction()) return;

    if (user.is_active && user.id === authUser?.id) {
      showToast("Anda tidak dapat menutup akses akun sendiri.", "warning");
      return;
    }

    if (
      user.is_active &&
      getResolvedAppRole(user) === ROLES.IT &&
      activeItCount <= 1
    ) {
      showToast("Tidak bisa menutup akses akun IT aktif terakhir.", "warning");
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
      showToast("User berhasil dihapus!", "success");
      setShowDelete(false);
      setDeleteUser(null);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Gagal menghapus user",
        "error",
      );
    }
  };

  const handleResendInvite = async (user: UserRecord) => {
    if (!requireUpdateUserAction()) return;
    if (!canResendInvitation(user)) {
      showToast("User ini sudah aktif dan tidak memerlukan undangan baru.", "warning");
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
    const hasPasswordInput = formData.password.length > 0;

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

    if (hasPasswordInput && !/\S/.test(formData.password)) {
      showToast("Password tidak boleh hanya berisi spasi.", "warning");
      return;
    }

    if (
      hasPasswordInput &&
      formData.password.length < MIN_USER_PASSWORD_LENGTH
    ) {
      showToast(
        `Password minimal ${MIN_USER_PASSWORD_LENGTH} karakter.`,
        "warning",
      );
      return;
    }

    const nextAppRole = mapRoleLikeToAppRole(roleNameById.get(formData.role_id));
    if (
      editUser &&
      getResolvedAppRole(editUser) === ROLES.IT &&
      editUser.is_active &&
      nextAppRole !== ROLES.IT &&
      activeItCount <= 1
    ) {
      showToast("Tidak bisa mengubah role akun IT aktif terakhir.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UserPayload = {
        name: normalizeTextInput(formData.name),
        username: normalizedUsername,
        email: normalizedEmail,
        phone: formData.phone.trim() || undefined,
        is_restrict: formData.is_restrict,
        role_id: formData.role_id,
        division_id: formData.division_id,
        ...(editUser && hasPasswordInput ? { password: formData.password } : {}),
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
        showToast("User berhasil diupdate!", "success");
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
        error instanceof Error ? error.message : "Gagal menyimpan user",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canReadUsers) return null;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <FeatureHeader
        title="Manajemen User"
        subtitle="Kelola pengguna, role, dan akses sistem"
        icon={<Users />}
        actions={
          <button
            onClick={handleAdd}
            className={`${SETUP_PAGE_ADD_BUTTON_CLASS} w-full lg:w-auto`}
            disabled={isFetching || roles.length === 0 || !canCreateUsers}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Tambah User</span>
          </button>
        }
      />

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_2XL_CLASS}`}>
        <p className={SETUP_PAGE_SEARCH_LABEL_CLASS}>Cari Data</p>
        <div className={SETUP_PAGE_SEARCH_WRAPPER_CLASS}>
          <Search
            className={SETUP_PAGE_SEARCH_ICON_CLASS}
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari berdasarkan nama, username, email, no. handphone, divisi, atau role..."
            className={SETUP_PAGE_SEARCH_INPUT_CLASS}
          />
        </div>
      </div>

      <div className={`${SETUP_PAGE_TABLE_CARD_CLASS} ${SETUP_PAGE_WIDTH_2XL_CLASS}`}>
        <div className={SETUP_PAGE_TABLE_SCROLL_CLASS}>
          <table className={`${SETUP_PAGE_TABLE_CLASS} min-w-[1280px]`}>
            <colgroup>
              <col className="w-[56px]" />
              <col className="w-[130px]" />
              <col className="w-[110px]" />
              <col className="w-[260px]" />
              <col className="w-[120px]" />
              <col className="w-[80px]" />
              <col className="w-[80px]" />
              <col className="w-[120px]" />
              <col className="w-[96px]" />
              <col className="w-[120px]" />
              <col className="w-[108px]" />
            </colgroup>
            <thead className={SETUP_PAGE_TABLE_HEAD_CLASS}>
              <tr>
                <th className={SETUP_PAGE_NUMBER_HEADER_CELL_CLASS}>
                  No
                </th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                  Nama
                </th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                  Username
                </th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                  Email
                </th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                  No. Handphone
                </th>
                <th className={SETUP_PAGE_TABLE_HEADER_CELL_CLASS}>
                  Divisi
                </th>
                <th
                  className={`${SETUP_PAGE_TABLE_HEADER_CELL_CLASS} w-36 !text-center`}
                >
                  Role
                </th>
                <th
                  className={`${SETUP_PAGE_TABLE_HEADER_CELL_CLASS} w-36 !text-center`}
                >
                  Akses Restrict
                </th>
                <th
                  className={`${SETUP_PAGE_TABLE_HEADER_CELL_CLASS} w-32 !text-center`}
                >
                  Status
                </th>
                <th
                  className={`${SETUP_PAGE_TABLE_HEADER_CELL_CLASS} w-40 !text-center`}
                >
                  Aktivasi Akun
                </th>
                <th className={SETUP_PAGE_ACTION_HEADER_CELL_CLASS}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className={SETUP_PAGE_TABLE_BODY_CLASS}>
              {filteredUsers.map((user, index) => {
                const resolvedRoleName = getResolvedRoleName(user);
                const resolvedDivisionName = getResolvedDivisionName(user);

                return (
                  <tr key={user.id} className={SETUP_PAGE_TABLE_ROW_CLASS}>
                    <td className={SETUP_PAGE_NUMBER_CELL_CLASS}>
                      {index + 1}
                    </td>
                    <td
                      className={`${SETUP_PAGE_TABLE_CELL_CLASS} whitespace-nowrap text-sm font-semibold text-gray-900`}
                    >
                      {user.name}
                    </td>
                    <td className={`${SETUP_PAGE_TABLE_CELL_CLASS} whitespace-nowrap text-sm text-gray-900`}>
                      {user.username}
                    </td>
                    <td className={`${SETUP_PAGE_TABLE_CELL_CLASS} whitespace-nowrap text-sm text-gray-700`}>
                      {user.email}
                    </td>
                    <td className={`${SETUP_PAGE_TABLE_CELL_CLASS} whitespace-nowrap text-sm text-gray-700`}>
                      {user.phone ?? user.phone_number ?? "-"}
                    </td>
                    <td className={`${SETUP_PAGE_TABLE_CELL_CLASS} whitespace-nowrap text-sm text-gray-700`}>
                      {resolvedDivisionName}
                    </td>
                    <td className={`${SETUP_PAGE_TABLE_CELL_CLASS} whitespace-nowrap !text-center`}>
                      <span className="text-sm text-gray-700">
                        {resolvedRoleName}
                      </span>
                    </td>
                    <td className={`${SETUP_PAGE_TABLE_CELL_CLASS} !text-center`}>
                      <span className={getBooleanPillClass(user.is_restrict)}>
                        {user.is_restrict ? "Ya" : "Tidak"}
                      </span>
                    </td>
                    <td className={`${SETUP_PAGE_TABLE_CELL_CLASS} !text-center`}>
                      <span className={getBooleanPillClass(user.is_active)}>
                        {user.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className={`${SETUP_PAGE_TABLE_CELL_CLASS} !text-center`}>
                      <span className={getOnboardingPillClass(user.onboarding_status)}>
                        {getOnboardingLabel(user)}
                      </span>
                    </td>
                    <td className={SETUP_PAGE_ACTION_CELL_CLASS}>
                      <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                        {canUpdateUsers && canResendInvitation(user) ? (
                          <button
                            onClick={() => void handleResendInvite(user)}
                            className={`${ACTION_ICON_BUTTON_CLASS} text-amber-600 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-70`}
                            title="Kirim Ulang Undangan"
                            disabled={inviteLoadingId === user.id}
                          >
                            {inviteLoadingId === user.id ? (
                              <span
                                className="button-spinner"
                                aria-hidden="true"
                                style={
                                  {
                                    ["--spinner-size"]: "16px",
                                    ["--spinner-border"]: "2px",
                                    ["--spinner-track"]: "rgba(217, 119, 6, 0.2)",
                                    ["--spinner-head"]: "#d97706",
                                  } as React.CSSProperties
                                }
                              />
                            ) : (
                              <Mail className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        ) : null}
                        {canUpdateUsers ? (
                          <button
                            onClick={() => handleOpenAccessAction(user)}
                            className={`${ACTION_ICON_BUTTON_CLASS} ${
                              user.is_active
                                ? "text-red-600 hover:bg-red-50 hover:text-red-700"
                                : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                            title={
                              user.is_active
                                ? "Tutup Akses"
                                : "Aktifkan Kembali"
                            }
                          >
                            {user.is_active ? (
                              <ShieldOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        ) : null}
                        {canUpdateUsers ? (
                          <button
                            onClick={() => handleEdit(user)}
                            className={`${ACTION_ICON_BUTTON_CLASS} text-blue-600 hover:bg-blue-50 hover:text-blue-700`}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                        ) : null}
                        {canDeleteUsers ? (
                          <button
                            onClick={() => handleDelete(user)}
                            className={`${ACTION_ICON_BUTTON_CLASS} text-red-600 hover:bg-red-50 hover:text-red-700`}
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isFetching && filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                  >
                    Tidak ada user yang cocok.
                  </td>
                </tr>
              )}
              {isFetching && (
                <tr>
                  <td
                    colSpan={11}
                    className={SETUP_PAGE_EMPTY_STATE_CELL_CLASS}
                  >
                    Memuat data user...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div
          data-dashboard-overlay="true"
          className="fixed inset-0 p-4"
          style={{
            background: "rgba(0, 0, 0, 0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editUser ? "Edit User" : "Tambah User"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editUser
                    ? "Perbarui data akun pengguna sistem."
                    : "Isi data akun. Aktivasi password nanti dikirim lewat email."}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-ghost btn-sm"
                title="Tutup"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="input"
                  placeholder="Masukkan nama lengkap"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Nama ini akan tampil di sistem.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.username}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  className="input"
                  placeholder="Masukkan username"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Username harus beda dan tanpa spasi.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="input"
                  placeholder="Masukkan email"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Email ini dipakai untuk undangan dan reset password.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  No. Handphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  className="input"
                  placeholder="Contoh: 0896786875"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Boleh dikosongkan.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Divisi <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.division_id}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      division_id: event.target.value,
                    }))
                  }
                  className="select"
                >
                  <option value="">Pilih divisi</option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Pilih divisi user ini.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role_id}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      role_id: event.target.value,
                    }))
                  }
                  className="select"
                >
                  <option value="">Pilih role</option>
                  {roles.map((roleOption) => (
                    <option key={roleOption.id} value={roleOption.id}>
                      {roleOption.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Role menentukan akses user.
                </p>
              </div>

              <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Akses Restrict
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Nyalakan kalau akses user memang dibatasi.
                    </p>
                  </div>
                  <UiverseCheckbox
                    checked={formData.is_restrict}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_restrict: checked }))
                    }
                    label={formData.is_restrict ? "Ya" : "Tidak"}
                  />
                </div>
              </div>

	              {!editUser ? (
	                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-4 md:col-span-2">
	                  <div className="flex items-start gap-3">
	                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center text-[#157ec3]">
	                      <Mail className="h-5 w-5" aria-hidden="true" />
	                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Undangan aktivasi otomatis
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Akun baru akan langsung dikirim lewat email undangan. Setelah itu user bikin password sendiri dari link yang diterima.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {editUser ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password{" "}
                    {editUser ? (
                      <span className="text-gray-400">(Opsional)</span>
                    ) : (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    className="input"
                    placeholder={
                      editUser
                        ? "Kosongkan jika tidak diubah"
                        : "Masukkan password"
                    }
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {editUser
                      ? "Isi kalau passwordnya mau diganti."
                      : `Minimal ${MIN_USER_PASSWORD_LENGTH} karakter.`}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-outline"
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
                className={editUser ? "btn btn-primary" : "btn btn-upload"}
              >
                {isSubmitting ? (
                  <>
                    <div
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
                  <>
                    <Save className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {editUser ? "Simpan" : "Simpan & Kirim Undangan"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {manualInvitation ? (
        <div
          data-dashboard-overlay="true"
          className="fixed inset-0 p-4"
          style={{
            background: "rgba(0, 0, 0, 0.55)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setManualInvitation(null)}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Undangan Siap Dibagikan
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Email undangan belum terkirim otomatis, tetapi link aktivasi siap dibagikan ke user.
                </p>
              </div>
              <button
                onClick={() => setManualInvitation(null)}
                className="btn btn-ghost btn-sm"
                title="Tutup"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-800">
                  {manualInvitation.userName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Bagikan link berikut ke user agar mereka bisa menyetel password pertama.
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
                    Link belum tersedia
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Pastikan konfigurasi frontend sudah benar agar backend bisa membentuk link aktivasi.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
              {manualInvitation.url ? (
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(manualInvitation.url ?? "");
                      showToast("Link aktivasi berhasil disalin.", "success");
                    } catch {
                      showToast("Gagal menyalin link aktivasi.", "error");
                    }
                  }}
                  className="btn btn-upload"
                >
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Salin Link</span>
                </button>
              ) : null}
              <button
                onClick={() => setManualInvitation(null)}
                className="btn btn-outline"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {accessAction ? (
        <div
          data-dashboard-overlay="true"
          className="fixed inset-0 p-4"
          style={{
            background: "rgba(0, 0, 0, 0.55)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => {
            if (!isAccessSubmitting) setAccessAction(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-sm w-full max-w-lg overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {accessAction.action === "close"
                    ? "Tutup Akses Pengguna"
                    : "Aktifkan Kembali Pengguna"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {accessAction.user.name} - {accessAction.user.email}
                </p>
              </div>
              <button
                onClick={() => setAccessAction(null)}
                className="btn btn-ghost btn-sm"
                title="Tutup"
                disabled={isAccessSubmitting}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-800">
                  {accessAction.action === "close"
                    ? "Akun ini tidak bisa login setelah akses ditutup."
                    : "Akun ini bisa login kembali setelah diaktifkan."}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Riwayat data pengguna tetap tersimpan untuk audit dan laporan.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alasan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={accessReason}
                  onChange={(event) => setAccessReason(event.target.value)}
                  className="input min-h-28 resize-none"
                  placeholder={
                    accessAction.action === "close"
                      ? "Contoh: Pengguna sudah tidak bertugas di unit ini."
                      : "Contoh: Pengguna kembali bertugas dan akses perlu dibuka."
                  }
                  disabled={isAccessSubmitting}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Minimal 5 karakter. Alasan ini disimpan sebagai catatan perubahan akses.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setAccessAction(null)}
                className="btn btn-outline"
                disabled={isAccessSubmitting}
              >
                Batal
              </button>
              <button
                onClick={() => void handleConfirmAccessAction()}
                disabled={isAccessSubmitting || normalizeTextInput(accessReason).length < 5}
                className={
                  accessAction.action === "close"
                    ? "btn border-red-600 bg-red-600 text-white hover:bg-red-700"
                    : "btn border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                }
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
                    {accessAction.action === "close"
                      ? "Tutup Akses"
                      : "Aktifkan Kembali"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <DeleteConfirmModal
        isOpen={showDelete && deleteUser !== null}
        title="Hapus User?"
        entityLabel="user"
        itemName={deleteUser?.name ?? ""}
        onClose={() => setShowDelete(false)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
