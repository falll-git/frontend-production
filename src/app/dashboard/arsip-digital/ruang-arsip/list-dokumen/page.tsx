"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import {
  SetupDataTable,
  SetupDataTableHead,
  SetupDataTableBody,
  SetupDataTableRow,
  SetupDataTableHeaderCell,
  SetupDataTableCell,
  SetupDataTableEmptyRow,
  SetupDataTableColGroup,
  SetupDataTableCol,
  SetupTableCard,
} from "@/components/ui/SetupDataTable";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Eye,
  FileText,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import InputDokumenSectionTitle from "@/components/arsip-digital/input-dokumen/InputDokumenSectionTitle";
import RelatedUsersPicker from "@/components/arsip-digital/input-dokumen/RelatedUsersPicker";
import FileUploadField from "@/components/ui/FileUploadField";
import { formatDateOnly } from "@/lib/utils/date";
import { exportToExcel } from "@/lib/utils/exportExcel";
import { validateDigitalArchiveFile } from "@/lib/utils/file";
import { useAppToast } from "@/components/ui/AppToastProvider";
import { useDocumentPreviewContext } from "@/components/ui/DocumentPreviewContext";
import DashboardModal from "@/components/ui/DashboardModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import Pagination from "@/components/ui/Pagination";
import SetupViewButton from "@/components/ui/SetupViewButton";
import SetupExcelButton from "@/components/ui/SetupExcelButton";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupTextInput from "@/components/ui/SetupTextInput";
import SetupTextarea from "@/components/ui/SetupTextarea";
import SetupActionMenu, {
  type SetupActionMenuItem,
} from "@/components/ui/SetupActionMenu";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupModalDetailLayout from "@/components/ui/SetupModalDetailLayout";
import SetupRecordDetailSection from "@/components/ui/SetupRecordDetailSection";
import {
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
  SETUP_PAGE_SEARCH_LABEL_CLASS,
  SETUP_PAGE_WIDTH_2XL_CLASS,
} from "@/components/ui/setupPageStyles";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useClientPagination } from "@/hooks/useClientPagination";
import { OPERATIONAL_TABLE_PAGE_SIZE } from "@/lib/pagination";
import { useArsipDigitalMasterData } from "@/components/arsip-digital/ArsipDigitalMasterDataProvider";
import { useArsipDigitalWorkflow } from "@/components/arsip-digital/ArsipDigitalWorkflowProvider";
import { arsipService, type CreateDokumenPayload } from "@/services/arsip.service";
import { divisionService } from "@/services/division.service";
import { userService } from "@/services/user.service";
import type { UserRecord } from "@/types/auth.types";
import type {
  ArsipDivisionSummary,
  ArsipUserSummary,
  Dokumen,
} from "@/types/arsip.types";
import type { Division } from "@/types/master.types";
import type { WatermarkFileMeta } from "@/types/watermark.types";

const LIST_DOKUMEN_MENU_URL = "/dashboard/arsip-digital/ruang-arsip/list-dokumen";

const LIST_DOKUMEN_TABLE_COLUMN_WIDTHS = [
  "56px",
  "176px",
  "124px",
  null,
  null,
  "144px",
  "108px",
  "112px",
  "88px",
] as const;

const formatPersonName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const EMPTY_LABEL = "-";

const getUserDisplayName = (user?: ArsipUserSummary | null) =>
  user?.name?.trim() || user?.username?.trim() || EMPTY_LABEL;

const formatDocumentDate = (value: string | null | undefined) =>
  formatDateOnly(value, EMPTY_LABEL);

const getUserMeta = (user?: ArsipUserSummary | null) => {
  if (!user) return null;

  const parts = [user.username, user.email].filter(
    (item): item is string => Boolean(item?.trim()),
  );

  return parts.length > 0 ? parts.join(" | ") : null;
};

const getRelatedUserMeta = (user?: ArsipUserSummary | null) => {
  if (!user) return null;

  const displayName = getUserDisplayName(user).trim().toLowerCase();
  const roleName = user.role?.name?.trim() ?? "";
  const divisionName = user.division?.name?.trim() ?? "";
  const parts: string[] = [];

  if (roleName && roleName.toLowerCase() !== displayName) {
    parts.push(roleName);
  }

  if (divisionName) {
    parts.push(divisionName);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
};

type DokumenRow = {
  id: string;
  kode: string;
  documentTypeId?: string;
  jenisDokumen: string;
  namaDokumen: string;
  detail: string;
  tglInput: string;
  userInput: string;
  tempatPenyimpananId?: string;
  statusPinjam: Dokumen["statusPinjam"];
  restrict: boolean;
  locationLabel: string;
  officeCode: string;
  officeName: string;
  cabinetCode: string;
  rackName: string;
  fileUrl: string | null;
  fileName: string | null;
  watermark?: WatermarkFileMeta | null;
  creator?: ArsipUserSummary | null;
  owner?: ArsipUserSummary | null;
  ownerDivision?: ArsipDivisionSummary | null;
  relatedUsers: ArsipUserSummary[];
};

type RestrictOption = "Ya" | "Tidak";

type EditFormState = {
  storage_id: string;
  document_type_id: string;
  document_name: string;
  description: string;
  is_restricted: RestrictOption;
  owner_user_id: string;
  owner_division_id: string;
  related_user_ids: string[];
};

const INITIAL_EDIT_FORM_STATE: EditFormState = {
  storage_id: "",
  document_type_id: "",
  document_name: "",
  description: "",
  is_restricted: "Tidak",
  owner_user_id: "",
  owner_division_id: "",
  related_user_ids: [],
};

const getDocumentOwner = (doc: DokumenRow) => doc.owner ?? doc.creator ?? null;

const getDocumentOwnerDivision = (doc: DokumenRow) =>
  doc.ownerDivision?.name ??
  doc.owner?.division?.name ??
  doc.creator?.division?.name ??
  EMPTY_LABEL;

const getDocumentOwnerDivisionId = (doc: DokumenRow) =>
  doc.ownerDivision?.id ??
  doc.owner?.division_id ??
  "";

export default function ListDokumenPage() {
  const { showToast } = useAppToast();
  const { openPreview } = useDocumentPreviewContext();
  const { user } = useAuth();
  const { hasCapability, hasFeature, ensureCapability } = useProtectedAction();
  const { tempatPenyimpanan, jenisDokumen } = useArsipDigitalMasterData();
  const { dokumen, peminjaman, refreshWorkflowData } = useArsipDigitalWorkflow();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterJenis, setFilterJenis] = useState("Semua");
  const [selectedDoc, setSelectedDoc] = useState<DokumenRow | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isOwnershipLoading, setIsOwnershipLoading] = useState(true);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editDragOver, setEditDragOver] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editFormData, setEditFormData] =
    useState<EditFormState>(INITIAL_EDIT_FORM_STATE);
  const canUpdateDokumen = hasCapability(LIST_DOKUMEN_MENU_URL, "update");
  const canDeleteDokumen = hasCapability(LIST_DOKUMEN_MENU_URL, "delete");
  const canManageAllDokumen = hasFeature(LIST_DOKUMEN_MENU_URL, "manage_all");

  const requireUpdateDokumenAction = () =>
    ensureCapability(LIST_DOKUMEN_MENU_URL, "update", {
      message: "Anda tidak memiliki akses untuk mengubah dokumen.",
    });

  const requireDeleteDokumenAction = () =>
    ensureCapability(LIST_DOKUMEN_MENU_URL, "delete", {
      message: "Anda tidak memiliki akses untuk menghapus dokumen.",
    });

  useEffect(() => {
    let ignore = false;

    if (!canUpdateDokumen) {
      setUsers([]);
      setDivisions([]);
      setIsOwnershipLoading(false);
      return () => {
        ignore = true;
      };
    }

    async function loadOwnershipOptions() {
      setIsOwnershipLoading(true);
      try {
        const [userRows, divisionRows] = await Promise.all([
          userService.getAssignableAll(),
          divisionService.getAll(),
        ]);

        if (ignore) return;

        setUsers(
          userRows
            .filter((item) => item.is_active)
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        setDivisions(
          [...divisionRows].sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : "Gagal memuat data PIC dokumen.",
            "error",
          );
        }
      } finally {
        if (!ignore) setIsOwnershipLoading(false);
      }
    }

    void loadOwnershipOptions();

    return () => {
      ignore = true;
    };
  }, [canUpdateDokumen, showToast]);

  const allDokumen = useMemo<DokumenRow[]>(() => {
    return dokumen.map((item) => ({
      id: item.id,
      kode: item.kode,
      documentTypeId: item.documentTypeId,
      jenisDokumen: item.jenisDokumen,
      namaDokumen: item.namaDokumen,
      detail: item.detail,
      tglInput: item.tglInput,
      userInput: item.creator?.username ?? item.creator?.name ?? item.userInput,
      tempatPenyimpananId: item.tempatPenyimpananId,
      statusPinjam: item.statusPinjam,
      restrict: item.restrict,
      locationLabel: item.storage?.locationLabel ?? item.tempatPenyimpanan ?? "-",
      officeCode: item.storage?.officeCode ?? "-",
      officeName: item.storage?.officeName ?? "-",
      cabinetCode: item.storage?.cabinetCode ?? "-",
      rackName: item.storage?.rackName ?? "-",
      fileUrl: item.fileUrl ?? null,
      fileName: item.fileName ?? null,
      watermark: item.watermark ?? null,
      creator: item.creator ?? null,
      owner: item.owner ?? null,
      ownerDivision: item.ownerDivision ?? item.owner?.division ?? null,
      relatedUsers: item.relatedUsers ?? [],
    }));
  }, [dokumen]);

  const tempatPenyimpananList = useMemo(() => {
    return tempatPenyimpanan
      .filter(
        (item) =>
          item.status === "Aktif" ||
          String(item.id) === selectedDoc?.tempatPenyimpananId,
      )
      .map((item) => ({
        id: String(item.id),
        kodeKantor: item.kodeKantor,
        namaKantor: item.namaKantor,
        kodeLemari: item.kodeLemari,
        rak: item.rak,
        status: item.status,
      }));
  }, [selectedDoc?.tempatPenyimpananId, tempatPenyimpanan]);

  const jenisDokumenOptions = useMemo(() => {
    return jenisDokumen
      .filter(
        (item) =>
          item.status === "Aktif" ||
          String(item.id) === selectedDoc?.documentTypeId,
      )
      .map((item) => ({
        id: String(item.id),
        kode: item.kode,
        nama: item.nama,
        status: item.status,
      }));
  }, [jenisDokumen, selectedDoc?.documentTypeId]);

  const selectedEditOwnerUser = useMemo(
    () => users.find((item) => item.id === editFormData.owner_user_id) ?? null,
    [editFormData.owner_user_id, users],
  );

  const canManageDokumenRecord = (doc: DokumenRow | null) => {
    if (!doc || !user?.id) return false;
    if (canManageAllDokumen) return true;
    return doc.creator?.id === user.id || doc.owner?.id === user.id;
  };

  const jenisDokumenFilterList = useMemo(() => {
    return [
      "Semua",
      ...jenisDokumen.filter((item) => item.status === "Aktif").map((item) => item.nama),
    ];
  }, [jenisDokumen]);

  const historisPeminjaman = useMemo(() => {
    if (!selectedDoc) return [];
    return peminjaman
      .filter((item) => item.dokumenId === selectedDoc.id)
      .map((item) => ({
        id: item.id,
        peminjam: item.peminjam,
        tglPinjam: item.tglPinjam,
        tglKembali: item.tglKembali,
        status: item.status,
      }));
  }, [peminjaman, selectedDoc]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const kode = new URLSearchParams(window.location.search).get("kode");
    if (!kode) return;

    const timeoutId = window.setTimeout(() => {
      setSearchTerm(kode);
      const doc = allDokumen.find(
        (item) => item.kode.toLowerCase() === kode.toLowerCase(),
      );
      if (doc) {
        setSelectedDoc(doc);
        setShowDetail(true);
      } else {
        showToast("Dokumen tidak ditemukan.", "warning");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [allDokumen, showToast]);

  const filteredDokumen = allDokumen.filter((doc) => {
    const matchSearch =
      doc.namaDokumen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.kode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchJenis = filterJenis === "Semua" || doc.jenisDokumen === filterJenis;
    return matchSearch && matchJenis;
  });
  const {
    paginatedItems: paginatedDokumen,
    meta: paginationMeta,
    setPage,
    resetPage,
  } = useClientPagination(filteredDokumen, OPERATIONAL_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [filterJenis, resetPage, searchTerm]);

  const handleRowClick = (doc: DokumenRow) => {
    setSelectedDoc(doc);
    setShowDetail(true);
  };

  const openDocDeleteModal = (doc: DokumenRow) => {
    if (!requireDeleteDokumenAction()) return;
    if (!canManageDokumenRecord(doc)) return;
    setSelectedDoc(doc);
    setShowDelete(true);
  };

  const openDocEditModal = (doc: DokumenRow) => {
    if (!requireUpdateDokumenAction()) return;
    if (!canManageDokumenRecord(doc)) return;
    setSelectedDoc(doc);
    setEditFormData({
      storage_id: doc.tempatPenyimpananId ?? "",
      document_type_id: doc.documentTypeId ?? "",
      document_name: doc.namaDokumen,
      description: doc.detail,
      is_restricted: doc.restrict ? "Ya" : "Tidak",
      owner_user_id: doc.owner?.id ?? "",
      owner_division_id: getDocumentOwnerDivisionId(doc),
      related_user_ids: doc.relatedUsers.map((item) => item.id),
    });
    setEditFile(null);
    setEditDragOver(false);
    setShowEdit(true);
  };

  const handleEditOwnerUserChange = (value: string) => {
    const owner = users.find((item) => item.id === value);
    setEditFormData((prev) => ({
      ...prev,
      owner_user_id: value,
      owner_division_id: owner?.division_id ?? prev.owner_division_id,
      related_user_ids: prev.related_user_ids.filter((id) => id !== value),
    }));
  };

  const handleEditRelatedUserToggle = (userId: string) => {
    setEditFormData((prev) => ({
      ...prev,
      related_user_ids: prev.related_user_ids.includes(userId)
        ? prev.related_user_ids.filter((item) => item !== userId)
        : [...prev.related_user_ids, userId],
    }));
  };

  const clearEditFileSelection = () => {
    setEditFile(null);
    setEditDragOver(false);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  const handleEditFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationMessage = validateDigitalArchiveFile(file);

    if (validationMessage) {
      showToast(validationMessage, "error");
      event.target.value = "";
      return;
    }

    setEditFile(file);
  };

  const handleEditFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setEditDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    const validationMessage = validateDigitalArchiveFile(file);

    if (validationMessage) {
      showToast(validationMessage, "error");
      return;
    }

    setEditFile(file);
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    if (!requireDeleteDokumenAction()) return;
    if (!canManageDokumenRecord(selectedDoc)) return;
    setIsDeleting(true);
    try {
      await arsipService.remove(selectedDoc.id);
      showToast("Dokumen berhasil dihapus.", "success");
      setShowDetail(false);
      setShowDelete(false);
      void refreshWorkflowData({ force: true });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Dokumen gagal dihapus.",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDoc) return;

    if (!editFormData.storage_id || !editFormData.document_type_id) {
      showToast("Tempat penyimpanan dan jenis dokumen wajib dipilih.", "warning");
      return;
    }

    if (editFormData.document_name.trim().length < 3) {
      showToast("Nama dokumen minimal 3 karakter.", "warning");
      return;
    }

    setIsEditing(true);
    try {
      const updateData: Partial<CreateDokumenPayload> = {
        storage_id: editFormData.storage_id,
        document_type_id: editFormData.document_type_id,
        document_name: editFormData.document_name.trim(),
        description: editFormData.description.trim(),
        is_restricted: editFormData.is_restricted === "Ya",
        owner_user_id: editFormData.owner_user_id || undefined,
        owner_division_id: editFormData.owner_division_id || undefined,
        related_user_ids: editFormData.related_user_ids,
      };
      if (editFile) {
        updateData.file = editFile;
      }
      await arsipService.update(selectedDoc.id, updateData);
      showToast("Dokumen berhasil diperbarui.", "success");
      setShowEdit(false);
      setShowDetail(false);
      setEditFile(null);
      setEditDragOver(false);
      void refreshWorkflowData({ force: true });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Dokumen gagal diperbarui.",
        "error",
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleExport = async () => {
    await exportToExcel({
      filename: "list-dokumen-digital",
      sheetName: "List Dokumen",
      title: "Daftar Dokumen Digital",
      columns: [
        { header: "No", key: "no", width: 6 },
        { header: "Kode", key: "kode", width: 15 },
        { header: "Jenis Dokumen", key: "jenisDokumen", width: 20 },
        { header: "Nama Dokumen", key: "namaDokumen", width: 30 },
        { header: "Keterangan", key: "detail", width: 40 },
        { header: "Tgl Input", key: "tglInput", width: 22 },
        { header: "User Input", key: "userInput", width: 15 },
        { header: "PIC Pemilik", key: "ownerName", width: 22 },
        { header: "Divisi Pemilik", key: "ownerDivision", width: 22 },
        { header: "User Terkait", key: "relatedUsers", width: 32 },
        { header: "Status", key: "statusPinjam", width: 18 },
      ],
      data: filteredDokumen.map((doc, idx) => ({
        no: idx + 1,
        kode: doc.kode,
        jenisDokumen: doc.jenisDokumen,
        namaDokumen: doc.namaDokumen,
        detail: doc.detail,
        tglInput: formatDocumentDate(doc.tglInput),
        userInput: doc.userInput,
        ownerName: getUserDisplayName(getDocumentOwner(doc)),
        ownerDivision: getDocumentOwnerDivision(doc),
        relatedUsers:
          doc.relatedUsers.map((item) => getUserDisplayName(item)).join(", ") ||
          EMPTY_LABEL,
        statusPinjam: doc.statusPinjam,
      })),
    });
  };

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title="Daftar Dokumen"
        subtitle="Daftar seluruh dokumen yang tersimpan dalam sistem."
        icon={<FileText />}
        actions={
          <SetupExcelButton onClick={handleExport} />
        }
      />

      <div className={`${SETUP_PAGE_SEARCH_CARD_CLASS} ${SETUP_PAGE_WIDTH_2XL_CLASS}`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <SetupSearchInput
              label="Cari Dokumen"
              placeholder="Cari berdasarkan nama, kode, atau keterangan..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="document-type-filter"
              className={SETUP_PAGE_SEARCH_LABEL_CLASS}
            >
              Filter Jenis Dokumen
            </label>
            <SetupSelect
              id="document-type-filter"
              value={filterJenis}
              onChange={(event) => setFilterJenis(event.target.value)}
            >
              {jenisDokumenFilterList.map((jenis) => (
                <option key={jenis} value={jenis}>
                  {jenis}
                </option>
              ))}
            </SetupSelect>
          </div>
        </div>
      </div>

      <SetupTableCard variant="document" className="mx-auto max-w-[1280px]">
          <SetupDataTable variant="document" density="compact" className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
            <SetupDataTableColGroup>
              {LIST_DOKUMEN_TABLE_COLUMN_WIDTHS.map((width, index) => (
                <SetupDataTableCol
                  key={`${index}-${width ?? "flex"}`}
                  style={width ? { width } : undefined}
                />
              ))}
            </SetupDataTableColGroup>
            <SetupDataTableHead className="ltr:text-left rtl:text-right">
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Kode
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Jenis
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Nama Dokumen
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Keterangan
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  Input
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                  User
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Status
                </SetupDataTableHeaderCell>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody className="divide-y divide-gray-200">
              {filteredDokumen.length > 0 ? (
                paginatedDokumen.map((doc, idx) => (
                  <SetupDataTableRow
                    key={doc.id}
                    onDoubleClick={() => handleRowClick(doc)}
                    className={`${SETUP_PAGE_MODERN_TABLE_ROW_CLASS} cursor-pointer hover:bg-gray-50`}
                  >
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                      {(paginationMeta.page - 1) * paginationMeta.limit + idx + 1}
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                      <span
                        className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 tabular-nums"
                        title={doc.kode}
                      >
                        {doc.kode}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-medium text-gray-700`}>
                      <span
                        className="block truncate"
                        title={doc.jenisDokumen || EMPTY_LABEL}
                      >
                        {doc.jenisDokumen || EMPTY_LABEL}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                      <span
                        className="block truncate"
                        title={doc.namaDokumen || EMPTY_LABEL}
                      >
                        {doc.namaDokumen || EMPTY_LABEL}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                      <span
                        className="block truncate"
                        title={doc.detail || EMPTY_LABEL}
                      >
                        {doc.detail || EMPTY_LABEL}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} text-gray-600`}>
                      <span
                        className="block truncate tabular-nums"
                        title={formatDocumentDate(doc.tglInput)}
                      >
                        {formatDocumentDate(doc.tglInput)}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={`${SETUP_PAGE_MODERN_CELL_CLASS} font-semibold text-gray-900`}>
                      <span
                        className="block truncate"
                        title={formatPersonName(doc.userInput)}
                      >
                        {formatPersonName(doc.userInput)}
                      </span>
                    </SetupDataTableCell>
                    <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                      <SetupStatusBadge status={doc.statusPinjam} />
                    </SetupDataTableCell>
                    <SetupDataTableCell
                      className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                    >
                      {(() => {
                        const actionItems: SetupActionMenuItem[] = [
                          {
                            key: "detail",
                            label: "Detail",
                            icon: Eye,
                            tone: "blue" as const,
                            onClick: () => handleRowClick(doc),
                          },
                        ];

                        if (canUpdateDokumen && canManageDokumenRecord(doc)) {
                          actionItems.push({
                            key: "edit",
                            label: "Edit",
                            icon: Pencil,
                            tone: "blue" as const,
                            onClick: () => openDocEditModal(doc),
                          });
                        }

                        if (canDeleteDokumen && canManageDokumenRecord(doc)) {
                          actionItems.push({
                            key: "delete",
                            label: "Hapus",
                            icon: Trash2,
                            tone: "red" as const,
                            onClick: () => openDocDeleteModal(doc),
                          });
                        }

                        return actionItems.length > 0 ? (
                          <SetupActionMenu
                            items={actionItems}
                            label={`Buka aksi untuk dokumen ${doc.kode}`}
                            menuLabel={`Aksi dokumen ${doc.kode}`}
                          />
                        ) : (
                          <span className="text-sm text-slate-300">-</span>
                        );
                      })()}
                    </SetupDataTableCell>
                  </SetupDataTableRow>
                ))
              ) : (
                <SetupDataTableEmptyRow
                  colSpan={9}
                  icon={FileText}
                  isFiltered={searchTerm.trim().length > 0 || filterJenis !== "Semua"}
                  description={
                    searchTerm.trim() || filterJenis !== "Semua"
                      ? "Ubah kata kunci atau jenis dokumen untuk melihat arsip lain."
                      : "Dokumen arsip yang sudah diinput akan muncul di tabel ini."
                  }
                >
                  Tidak ada dokumen arsip ditemukan.
                </SetupDataTableEmptyRow>
              )}
            </SetupDataTableBody>
          </SetupDataTable>
        <Pagination
          page={paginationMeta.page}
          lastPage={paginationMeta.lastPage}
          total={paginationMeta.total}
          limit={paginationMeta.limit}
          onPageChange={setPage}
        />
      </SetupTableCard>

      {showDetail && selectedDoc ? (
        <DashboardModal
          isOpen={showDetail}
          title="Detail Dokumen"
          description={selectedDoc.kode}
          onClose={() => setShowDetail(false)}
          maxWidth="5xl"
          bodyClassName="space-y-6 p-4 sm:p-5"
          footer={
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="uiverse-modal-button uiverse-modal-button--neutral"
            >
              Tutup
            </button>
          }
        >
          <SetupModalDetailLayout
            information={
              <SetupRecordDetailSection
                title="Informasi Utama"
                description="Identitas, klasifikasi, status peminjaman, dan akses dokumen."
                rows={[
                  { label: "Nama Dokumen", value: selectedDoc.namaDokumen },
                  { label: "Kode Dokumen", value: selectedDoc.kode },
                  {
                    label: "Status Peminjaman",
                    value: <SetupStatusBadge status={selectedDoc.statusPinjam} />,
                  },
                  {
                    label: "Akses",
                    value: (
                      <SetupStatusBadge
                        status={selectedDoc.restrict ? "Restrict" : "Non-restrict"}
                        tone={selectedDoc.restrict ? "blue" : "slate"}
                      />
                    ),
                  },
                  {
                    label: "Tanggal Input",
                    value: formatDocumentDate(selectedDoc.tglInput),
                  },
                  {
                    label: "User Input",
                    value: formatPersonName(selectedDoc.userInput),
                  },
                  { label: "Jenis Dokumen", value: selectedDoc.jenisDokumen },
                  { label: "Keterangan", value: selectedDoc.detail || EMPTY_LABEL },
                ]}
              />
            }
            details={
              <div className="space-y-6">

                <SetupRecordDetailSection
                  title="Detail Kepemilikan dan Akses"
                  description="PIC, pembuat, divisi, dan pengguna yang berelasi dengan dokumen."
                  rows={[
                    {
                      label: "PIC / Pemilik",
                      value: (
                        <span>
                          {getUserDisplayName(getDocumentOwner(selectedDoc))}
                          {getUserMeta(getDocumentOwner(selectedDoc)) ? (
                            <span className="mt-1 block text-xs font-normal text-gray-500">
                              {getUserMeta(getDocumentOwner(selectedDoc))}
                            </span>
                          ) : null}
                        </span>
                      ),
                    },
                    {
                      label: "Dibuat Oleh",
                      value: (
                        <span>
                          {getUserDisplayName(selectedDoc.creator)}
                          {getUserMeta(selectedDoc.creator) ? (
                            <span className="mt-1 block text-xs font-normal text-gray-500">
                              {getUserMeta(selectedDoc.creator)}
                            </span>
                          ) : null}
                        </span>
                      ),
                    },
                    {
                      label: "Divisi Pemilik",
                      value: getDocumentOwnerDivision(selectedDoc),
                    },
                    {
                      label: "User Terkait",
                      value:
                        selectedDoc.relatedUsers.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedDoc.relatedUsers.map((item) => {
                              const meta = getRelatedUserMeta(item);
                              return (
                                <span
                                  key={item.id}
                                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                                >
                                  <span className="truncate">{getUserDisplayName(item)}</span>
                                  {meta ? (
                                    <span className="truncate text-sky-600/80">{meta}</span>
                                  ) : null}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="font-medium text-gray-500">
                            Tidak ada user terkait.
                          </span>
                        ),
                    },
                  ]}
                />

                <SetupRecordDetailSection
                  title="Detail Lokasi Penyimpanan"
                  description="Jalur penyimpanan fisik dokumen di kantor, lemari, dan rak."
                  rows={[
                    {
                      label: "Jalur Lokasi",
                      value:
                        [
                          selectedDoc.officeName,
                          selectedDoc.cabinetCode,
                          selectedDoc.rackName,
                        ]
                          .filter((value) => value && value !== EMPTY_LABEL)
                          .join(" > ") || EMPTY_LABEL,
                    },
                    {
                      label: "Kode Kantor",
                      value: selectedDoc.officeCode || EMPTY_LABEL,
                    },
                    {
                      label: "Kantor",
                      value: selectedDoc.officeName || EMPTY_LABEL,
                    },
                    {
                      label: "Lemari",
                      value: selectedDoc.cabinetCode || EMPTY_LABEL,
                    },
                    {
                      label: "Rak",
                      value: selectedDoc.rackName || EMPTY_LABEL,
                    },
                    {
                      label: "Lokasi",
                      value: selectedDoc.locationLabel || EMPTY_LABEL,
                    },
                  ]}
                />

            {historisPeminjaman.length > 0 ? (
              <section className="space-y-4">
                <InputDokumenSectionTitle
                  title="Riwayat Peminjaman"
                  description="Catatan peminjaman yang pernah terkait dengan dokumen ini."
                />
                <SetupTableCard variant="nested">
                          <SetupDataTable variant="nested" density="compact" className={`${SETUP_PAGE_MODERN_TABLE_CLASS}`}>
                      <SetupDataTableHead className="ltr:text-left rtl:text-right">
                        <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                            Peminjam
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                            Tgl Pinjam
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_HEADER_CELL_CLASS}>
                            Tgl Kembali
                          </SetupDataTableHeaderCell>
                          <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                            Status
                          </SetupDataTableHeaderCell>
                        </SetupDataTableRow>
                      </SetupDataTableHead>
                      <SetupDataTableBody className="divide-y divide-gray-200">
                        {historisPeminjaman.map((item) => (
                          <SetupDataTableRow key={item.id} className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}>
                            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                              {formatPersonName(item.peminjam)}
                            </SetupDataTableCell>
                            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                              {formatDocumentDate(item.tglPinjam)}
                            </SetupDataTableCell>
                            <SetupDataTableCell className={SETUP_PAGE_MODERN_CELL_CLASS}>
                              {formatDocumentDate(item.tglKembali)}
                            </SetupDataTableCell>
                            <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                              <SetupStatusBadge status={item.status} />
                            </SetupDataTableCell>
                          </SetupDataTableRow>
                        ))}
                      </SetupDataTableBody>
                    </SetupDataTable>
                </SetupTableCard>
              </section>
            ) : null}
              </div>
            }
            attachments={
              <SetupRecordDetailSection
                title="Lampiran"
                description="File digital dan status watermark yang terkait dengan dokumen."
                rows={[
                  {
                    label: "Nama File",
                    value:
                      selectedDoc.fileName ||
                      selectedDoc.namaDokumen ||
                      EMPTY_LABEL,
                  },
                  {
                    label: "Status Watermark",
                    value: (
                      <SetupStatusBadge
                        status={
                          selectedDoc.watermark?.applied ||
                          selectedDoc.watermark?.status_key === "APPLIED" ||
                          selectedDoc.watermark?.file_url
                            ? "Aktif"
                            : "Nonaktif"
                        }
                      />
                    ),
                  },
                  {
                    label: "Aksi",
                    value: (
                      <SetupViewButton
                        onClick={() =>
                          selectedDoc.fileUrl
                            ? openPreview(
                                selectedDoc.fileUrl,
                                selectedDoc.fileName || selectedDoc.namaDokumen,
                              )
                            : undefined
                        }
                        disabled={!selectedDoc.fileUrl}
                        label="Preview"
                        title={
                          selectedDoc.fileUrl
                            ? "Preview dokumen"
                            : "File dokumen belum tersedia"
                        }
                      />
                    ),
                  },
                ]}
              />
            }
          />
        </DashboardModal>
      ) : null}

      {selectedDoc ? (
        <DeleteConfirmModal
          isOpen={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDelete}
          isLoading={isDeleting}
          title="Hapus Dokumen"
          itemName={selectedDoc.namaDokumen}
          entityLabel="dokumen"
        />
      ) : null}

      {showEdit && selectedDoc ? (
        <DashboardModal
          isOpen={showEdit}
          title="Edit Dokumen"
          description={`Perbarui informasi dokumen digital ${selectedDoc.kode}.`}
          onClose={() => {
            if (isEditing) return;
            setShowEdit(false);
          }}
          closeDisabled={isEditing}
          maxWidth="2xl"
          bodyClassName="max-h-[calc(90vh-164px)] overflow-y-auto grid grid-cols-1 gap-4 p-6 md:grid-cols-2"
          footer={
            <>
              <button
                onClick={() => setShowEdit(false)}
                className="uiverse-modal-button uiverse-modal-button--neutral"
                disabled={isEditing}
                type="button"
              >
                Batal
              </button>
              <button
                type="submit"
                form="edit-dokumen-form"
                disabled={isEditing}
                className="uiverse-modal-button uiverse-modal-button--primary"
              >
                {isEditing ? (
                  <>
                    <div
                      className="button-spinner uiverse-modal-button__spinner"
                      style={
                        {
                          ["--spinner-size"]: "18px",
                          ["--spinner-border"]: "2px",
                        } as CSSProperties
                      }
                      aria-hidden="true"
                    />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" aria-hidden="true" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </>
          }
        >
          <form
            id="edit-dokumen-form"
            onSubmit={handleEditSubmit}
            className="contents"
          >
            <div className="md:col-span-2">
              <InputDokumenSectionTitle
                title="Informasi Arsip"
                description="Perbarui lokasi penyimpanan fisik, jenis dokumen, dan status akses dokumen."
              />
            </div>

            <div>
              <label
                htmlFor="edit_storage_id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tempat Penyimpanan <span className="text-red-500">*</span>
              </label>
              <SetupSelect
                id="edit_storage_id"
                value={editFormData.storage_id}
                onChange={(event) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    storage_id: event.target.value,
                  }))
                }
                disabled={isEditing}
                required
              >
                <option value="">Pilih tempat penyimpanan</option>
                {tempatPenyimpananList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {`${item.kodeKantor} - ${item.namaKantor} | ${item.kodeLemari} (${item.rak})`}
                  </option>
                ))}
              </SetupSelect>
            </div>

            <div>
              <label
                htmlFor="edit_document_type_id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Jenis Dokumen <span className="text-red-500">*</span>
              </label>
              <SetupSelect
                id="edit_document_type_id"
                value={editFormData.document_type_id}
                onChange={(event) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    document_type_id: event.target.value,
                  }))
                }
                disabled={isEditing}
                required
              >
                <option value="">Pilih jenis dokumen</option>
                {jenisDokumenOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {`${item.nama} (${item.kode})`}
                  </option>
                ))}
              </SetupSelect>
            </div>

            <div>
              <label
                htmlFor="edit_is_restricted"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Dokumen Restrict <span className="text-red-500">*</span>
              </label>
              <SetupSelect
                id="edit_is_restricted"
                value={editFormData.is_restricted}
                onChange={(event) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    is_restricted: event.target.value as RestrictOption,
                  }))
                }
                disabled={isEditing}
              >
                <option value="Tidak">Tidak</option>
                <option value="Ya">Ya</option>
              </SetupSelect>
              <p className="mt-2 text-xs text-slate-500">
                Aktifkan jika dokumen hanya boleh dilihat user tertentu.
              </p>
            </div>

            <div className="md:col-span-2">
              <InputDokumenSectionTitle
                title="Kepemilikan dan Akses"
                description="Pilih PIC jika dokumen ini milik user lain. User terkait bisa melihat dokumen tanpa pengajuan akses."
              />
            </div>

            <div>
              <label
                htmlFor="edit_owner_user_id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                PIC / Pemilik Dokumen
              </label>
              <SetupSelect
                id="edit_owner_user_id"
                value={editFormData.owner_user_id}
                onChange={(event) =>
                  handleEditOwnerUserChange(event.target.value)
                }
                disabled={isEditing || isOwnershipLoading}
              >
                <option value="">
                  {isOwnershipLoading
                    ? "Memuat user..."
                    : "Pertahankan PIC dokumen saat ini"}
                </option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {`${item.name} (${item.username})`}
                  </option>
                ))}
              </SetupSelect>
              <p className="mt-2 text-xs text-slate-500">
                {selectedEditOwnerUser?.division_name
                  ? `Divisi PIC saat ini: ${selectedEditOwnerUser.division_name}.`
                  : "Kosongkan jika kepemilikan dokumen tidak diubah."}
              </p>
            </div>

            <div>
              <label
                htmlFor="edit_owner_division_id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Divisi Pemilik Dokumen
              </label>
              <SetupSelect
                id="edit_owner_division_id"
                value={editFormData.owner_division_id}
                onChange={(event) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    owner_division_id: event.target.value,
                  }))
                }
                disabled={
                  isEditing ||
                  isOwnershipLoading ||
                  !editFormData.owner_user_id ||
                  Boolean(selectedEditOwnerUser)
                }
              >
                <option value="">
                  {isOwnershipLoading
                    ? "Memuat divisi..."
                    : "Ikuti divisi PIC dokumen"}
                </option>
                {divisions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </SetupSelect>
              <p className="mt-2 text-xs text-slate-500">
                Jika PIC dipilih, divisi mengikuti data user tersebut.
              </p>
            </div>

            <div className="md:col-span-2">
              <RelatedUsersPicker
                disabled={isEditing}
                isLoading={isOwnershipLoading}
                excludeUserId={editFormData.owner_user_id || undefined}
                selectedIds={editFormData.related_user_ids}
                onToggle={handleEditRelatedUserToggle}
              />
            </div>

            <div className="md:col-span-2">
              <InputDokumenSectionTitle
                title="Detail Dokumen"
                description="Isi identitas dokumen yang akan tampil di daftar arsip digital."
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="edit_nama"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nama Dokumen <span className="text-red-500">*</span>
              </label>
              <SetupTextInput
                id="edit_nama"
                value={editFormData.document_name}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    document_name: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="edit_keterangan"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Keterangan
              </label>
              <SetupTextarea
                id="edit_keterangan"
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
                className="resize-none"
                rows={4}
              />
              <p className="mt-2 text-xs text-slate-500">
                Tambahkan catatan singkat jika diperlukan.
              </p>
            </div>

            <div className="md:col-span-2">
              <InputDokumenSectionTitle
                title="File Dokumen"
                description="File lama tetap digunakan jika Anda tidak mengunggah pengganti."
              />
            </div>

            <div className="md:col-span-2">
              <FileUploadField
                id="edit-dokumen-file-input"
                inputRef={editFileInputRef}
                disabled={isEditing}
                isDragActive={editDragOver}
                file={editFile}
                label="File Dokumen (Opsional)"
                required={false}
                title={editFile ? "Ganti file dokumen" : "Pilih file pengganti"}
                description="Klik area ini atau drag & drop file"
                helperText="Jika tidak upload file baru, file dokumen yang ada saat ini tetap dipakai."
                onChange={handleEditFileChange}
                onClear={clearEditFileSelection}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (isEditing) return;
                  setEditDragOver(true);
                }}
                onDragLeave={() => setEditDragOver(false)}
                onDrop={handleEditFileDrop}
              />
            </div>
          </form>
        </DashboardModal>
      ) : null}
    </DashboardPageShell>
  );
}
