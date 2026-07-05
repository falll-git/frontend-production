"use client";

import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Edit2, Save, ToggleLeft, ToggleRight, Trash2, type LucideIcon } from "lucide-react";

import { useAppToast } from "@/components/ui/AppToastProvider";
import DashboardModal from "@/components/ui/DashboardModal";
import DeleteConfirmModal from "@/components/ui/DeleteConfirmModal";
import FeatureHeader from "@/components/ui/FeatureHeader";
import Pagination from "@/components/ui/Pagination";
import SetupActionMenu from "@/components/ui/SetupActionMenu";
import SetupAddButton from "@/components/ui/SetupAddButton";
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
  SetupTableCard,
} from "@/components/ui/SetupDataTable";
import SetupSearchInput from "@/components/ui/SetupSearchInput";
import SetupSelect from "@/components/ui/SetupSelect";
import SetupStatusBadge from "@/components/ui/SetupStatusBadge";
import SetupTextarea from "@/components/ui/SetupTextarea";
import SetupTextInput from "@/components/ui/SetupTextInput";
import {
  getSetupPageEmptyStateCopy,
  SETUP_PAGE_MODERN_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_CELL_CLASS,
  SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_CELL_CLASS,
  SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS,
  SETUP_PAGE_MODERN_TABLE_CLASS,
  SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS,
  SETUP_PAGE_MODERN_TABLE_ROW_CLASS,
  SETUP_PAGE_WIDTH_XL_CLASS,
  SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS,
  SETUP_PARAMETER_PAGE_WIDTH_SM_CLASS,
  SETUP_PARAMETER_PAGE_WIDTH_MD_CLASS,
  SETUP_PAGE_SEARCH_CARD_CLASS,
} from "@/components/ui/setupPageStyles";
import { useProtectedAction } from "@/hooks/useProtectedAction";
import { useClientPagination } from "@/hooks/useClientPagination";
import { SETUP_TABLE_PAGE_SIZE } from "@/lib/pagination";
import {
  createParameterMasterService,
  type ParameterMasterPayload,
  type ParameterMasterRecord,
  type ParameterMasterValue,
} from "@/services/parameter-master.service";

type FieldType = "text" | "number" | "textarea" | "select" | "boolean" | "status";
type ColumnType = "text" | "number" | "code" | "boolean" | "status";

export type ParameterMasterOption = {
  label: string;
  value: string;
};

export type ParameterMasterField = {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: ParameterMasterOption[];
  defaultValue?: string | number | boolean;
  colSpan?: "single" | "full";
};

export type ParameterMasterColumn = {
  key: string;
  label: string;
  type?: ColumnType;
  widthClassName?: string;
  className?: string;
};

export type ParameterMasterPageConfig = {
  title: string;
  subtitle: string;
  entityLabel: string;
  endpoint: string;
  menuUrl?: string;
  icon: LucideIcon;
  addLabel: string;
  searchPlaceholder: string;
  fields: ParameterMasterField[];
  columns: ParameterMasterColumn[];
  filters?: Record<string, string | number | boolean>;
  fixedPayload?: ParameterMasterPayload;
  tableMinWidthClassName?: string;
  sortKey?: string;
  headerWidthClassName?: string;
  layoutWidthClassName?: string;
  tableWidthClassName?: string;
};

function valueToText(value: ParameterMasterValue | undefined): string {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return String(value);
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return ["true", "1", "aktif", "ya", "yes"].includes(
      value.trim().toLowerCase(),
    );
  }
  return fallback;
}

function createEmptyForm(fields: ParameterMasterField[]): ParameterMasterPayload {
  return Object.fromEntries(
    fields.map((field) => {
      if (field.defaultValue !== undefined) return [field.key, field.defaultValue];
      if (field.type === "status") return [field.key, true];
      if (field.type === "boolean") return [field.key, false];
      return [field.key, ""];
    }),
  );
}

function createFormFromRecord(
  fields: ParameterMasterField[],
  record: ParameterMasterRecord,
): ParameterMasterPayload {
  return Object.fromEntries(
    fields.map((field) => {
      const value = record[field.key];
      if (value === undefined || value === null) {
        if (field.defaultValue !== undefined) return [field.key, field.defaultValue];
        if (field.type === "status") return [field.key, true];
        if (field.type === "boolean") return [field.key, false];
        return [field.key, ""];
      }

      if (field.type === "status" || field.type === "boolean") {
        return [field.key, toBoolean(value, field.type === "status")];
      }

      return [field.key, value];
    }),
  );
}

function normalizeTextInput(key: string, value: unknown): string {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return key === "code" ? text.toUpperCase() : text;
}

function buildPayload(
  fields: ParameterMasterField[],
  form: ParameterMasterPayload,
  fixedPayload?: ParameterMasterPayload,
): ParameterMasterPayload {
  const payload = Object.fromEntries(
    fields.map((field) => {
      const value = form[field.key];
      if (field.type === "status" || field.type === "boolean") {
        return [field.key, toBoolean(value, field.type === "status")];
      }

      if (field.type === "number") {
        if (value === "" || value === null || value === undefined) {
          return [field.key, undefined];
        }
        return [field.key, Number(value)];
      }

      return [field.key, normalizeTextInput(field.key, value)];
    }),
  );

  return {
    ...payload,
    ...(fixedPayload ?? {}),
  };
}

function compareRecords(left: ParameterMasterRecord, right: ParameterMasterRecord, key: string) {
  const leftValue = valueToText(left[key]).toLowerCase();
  const rightValue = valueToText(right[key]).toLowerCase();
  return leftValue.localeCompare(rightValue, "id", { numeric: true });
}

function matchesSearch(
  record: ParameterMasterRecord,
  columns: ParameterMasterColumn[],
  query: string,
) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;

  return columns.some((column) =>
    valueToText(record[column.key]).toLowerCase().includes(keyword),
  );
}

function getDefaultTableMinWidthClass(columnCount: number) {
  if (columnCount <= 2) return "min-w-[420px]";
  if (columnCount <= 3) return "min-w-[560px]";
  if (columnCount <= 4) return "min-w-[720px]";
  if (columnCount <= 5) return "min-w-[860px]";
  return "min-w-[920px]";
}

function getDefaultParameterWidthClass(columnCount: number) {
  if (columnCount <= 2) return SETUP_PARAMETER_PAGE_WIDTH_SM_CLASS;
  if (columnCount <= 4) return SETUP_PARAMETER_PAGE_WIDTH_MD_CLASS;
  return SETUP_PARAMETER_PAGE_WIDTH_LG_CLASS;
}

function renderCell(record: ParameterMasterRecord, column: ParameterMasterColumn) {
  const value = record[column.key];

  if (column.type === "status") {
    return <SetupStatusBadge status={toBoolean(value, true) ? "Aktif" : "Nonaktif"} />;
  }

  if (column.type === "boolean") {
    return <SetupStatusBadge status={toBoolean(value) ? "Ya" : "Tidak"} />;
  }

  if (column.type === "code") {
    return (
      <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium tabular-nums text-gray-700">
        {valueToText(value)}
      </span>
    );
  }

  return valueToText(value);
}

export default function ParameterMasterPage({ config }: { config: ParameterMasterPageConfig }) {
  const pathname = usePathname();
  const { showToast } = useAppToast();
  const { hasCapability, ensureCapability } = useProtectedAction();
  const service = useMemo(
    () => createParameterMasterService(config.endpoint),
    [config.endpoint],
  );
  const menuUrl = config.menuUrl ?? pathname ?? "";

  const [items, setItems] = useState<ParameterMasterRecord[]>([]);
  const [query, setQuery] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ParameterMasterRecord | null>(null);
  const [form, setForm] = useState<ParameterMasterPayload>(() =>
    createEmptyForm(config.fields),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ParameterMasterRecord | null>(null);

  const canCreate = hasCapability(menuUrl, "create");
  const canUpdate = hasCapability(menuUrl, "update");
  const canDelete = hasCapability(menuUrl, "delete");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        setIsFetching(true);
        const data = await service.getAll(config.filters);
        if (!ignore) {
          setItems(
            [...data].sort((left, right) =>
              compareRecords(left, right, config.sortKey ?? "code"),
            ),
          );
        }
      } catch (error) {
        if (!ignore) {
          showToast(
            error instanceof Error
              ? error.message
              : `Gagal memuat ${config.entityLabel}`,
            "error",
          );
        }
      } finally {
        if (!ignore) setIsFetching(false);
      }
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [config.entityLabel, config.filters, config.sortKey, service, showToast]);

  const filtered = useMemo(
    () => items.filter((record) => matchesSearch(record, config.columns, query)),
    [config.columns, items, query],
  );

  const {
    paginatedItems,
    meta: paginationMeta,
    setPage,
    resetPage,
  } = useClientPagination(filtered, SETUP_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [query, resetPage]);

  const openCreate = () => {
    if (!ensureCapability(menuUrl, "create")) return;
    setEditingItem(null);
    setForm(createEmptyForm(config.fields));
    setIsModalOpen(true);
  };

  const openEdit = (record: ParameterMasterRecord) => {
    if (!ensureCapability(menuUrl, "update")) return;
    setEditingItem(record);
    setForm(createFormFromRecord(config.fields, record));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setForm(createEmptyForm(config.fields));
  };

  const validateForm = () => {
    for (const field of config.fields) {
      const value = form[field.key];

      if (field.required && field.type === "number") {
        if (value === "" || value === null || value === undefined) {
          return `${field.label} wajib diisi.`;
        }

        if (!Number.isFinite(Number(value))) {
          return `${field.label} harus berupa angka.`;
        }
      }

      if (
        field.required &&
        field.type !== "number" &&
        field.type !== "boolean" &&
        field.type !== "status" &&
        !String(value ?? "").trim()
      ) {
        return `${field.label} wajib diisi.`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      showToast(validationMessage, "warning");
      return;
    }

    const payload = buildPayload(config.fields, form, config.fixedPayload);

    setIsSaving(true);
    try {
      if (editingItem) {
        const updated = await service.update(editingItem.id, payload);
        setItems((prev) =>
          prev
            .map((item) =>
              item.id === editingItem.id ? { ...item, ...updated } : item,
            )
            .sort((left, right) =>
              compareRecords(left, right, config.sortKey ?? "code"),
            ),
        );
        showToast(`${config.entityLabel} diperbarui`, "success");
      } else {
        const created = await service.create(payload);
        setItems((prev) =>
          [...prev, created].sort((left, right) =>
            compareRecords(left, right, config.sortKey ?? "code"),
          ),
        );
        showToast(`${config.entityLabel} ditambahkan`, "success");
      }

      closeModal();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : `Gagal menyimpan ${config.entityLabel}`,
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    if (!ensureCapability(menuUrl, "delete")) return;

    setIsDeleting(true);
    try {
      await service.remove(deleteItem.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteItem.id));
      setDeleteItem(null);
      showToast(`${config.entityLabel} dihapus`, "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : `Gagal menghapus ${config.entityLabel}`,
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const Icon = config.icon;
  const tableColSpan = config.columns.length + 2;
  const headerWidthClassName =
    config.headerWidthClassName ?? SETUP_PAGE_WIDTH_XL_CLASS;
  const defaultParameterWidthClass = getDefaultParameterWidthClass(
    config.columns.length,
  );
  const layoutWidthClassName =
    config.layoutWidthClassName ?? defaultParameterWidthClass;
  const tableWidthClassName =
    config.tableWidthClassName ?? layoutWidthClassName;
  const tableMinWidthClassName =
    config.tableMinWidthClassName ??
    getDefaultTableMinWidthClass(config.columns.length);

  return (
    <DashboardPageShell spacing="md">
      <FeatureHeader
        title={config.title}
        subtitle={config.subtitle}
        icon={<Icon />}
        className={headerWidthClassName}
        actions={
          canCreate ? <SetupAddButton label={config.addLabel} onClick={openCreate} /> : null
        }
      />

      <div className={layoutWidthClassName}>
        <div className={SETUP_PAGE_SEARCH_CARD_CLASS}>
          <SetupSearchInput
            label="Cari Data"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={config.searchPlaceholder}
          />
        </div>
      </div>

      <div className={tableWidthClassName}>
        <SetupTableCard variant="crud">
          <SetupDataTable
            variant="crud"
            density="compact"
            className={`${SETUP_PAGE_MODERN_TABLE_CLASS} ${tableMinWidthClassName}`}
          >
            <SetupDataTableColGroup>
              <SetupDataTableCol className="w-[56px]" />
              {config.columns.map((column) => (
                <SetupDataTableCol
                  key={column.key}
                  className={column.widthClassName}
                />
              ))}
              <SetupDataTableCol className="w-[88px]" />
            </SetupDataTableColGroup>
            <SetupDataTableHead>
              <SetupDataTableRow className={SETUP_PAGE_MODERN_TABLE_HEADER_ROW_CLASS}>
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_NUMBER_HEADER_CELL_CLASS}>
                  No
                </SetupDataTableHeaderCell>
                {config.columns.map((column) => (
                  <SetupDataTableHeaderCell
                    key={column.key}
                    className={
                      column.type === "status" || column.type === "boolean"
                        ? SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS
                        : SETUP_PAGE_MODERN_HEADER_CELL_CLASS
                    }
                  >
                    {column.label}
                  </SetupDataTableHeaderCell>
                ))}
                <SetupDataTableHeaderCell className={SETUP_PAGE_MODERN_CENTER_HEADER_CELL_CLASS}>
                  Aksi
                </SetupDataTableHeaderCell>
              </SetupDataTableRow>
            </SetupDataTableHead>
            <SetupDataTableBody>
              {paginatedItems.map((record, index) => (
                <SetupDataTableRow
                  key={record.id}
                  className={SETUP_PAGE_MODERN_TABLE_ROW_CLASS}
                >
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_NUMBER_CELL_CLASS}>
                    {(paginationMeta.page - 1) * paginationMeta.limit + index + 1}
                  </SetupDataTableCell>
                  {config.columns.map((column) => (
                    <SetupDataTableCell
                      key={column.key}
                      className={[
                        column.type === "status" || column.type === "boolean"
                          ? SETUP_PAGE_MODERN_CENTER_CELL_CLASS
                          : SETUP_PAGE_MODERN_CELL_CLASS,
                        column.className,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      title={valueToText(record[column.key])}
                    >
                      {renderCell(record, column)}
                    </SetupDataTableCell>
                  ))}
                  <SetupDataTableCell className={SETUP_PAGE_MODERN_CENTER_CELL_CLASS}>
                    <SetupActionMenu
                      label={`Buka aksi ${config.entityLabel}`}
                      menuLabel={`Aksi untuk ${valueToText(record.name)}`}
                      items={[
                        {
                          key: "edit",
                          label: "Edit",
                          icon: Edit2,
                          tone: "blue",
                          disabled: !canUpdate,
                          onClick: () => openEdit(record),
                        },
                        {
                          key: "toggle-status",
                          label: toBoolean(record.is_active, true)
                            ? "Nonaktifkan"
                            : "Aktifkan",
                          icon: toBoolean(record.is_active, true)
                            ? ToggleRight
                            : ToggleLeft,
                          tone: toBoolean(record.is_active, true) ? "red" : "emerald",
                          disabled:
                            !canUpdate ||
                            !config.fields.some((field) => field.key === "is_active"),
                          onClick: () =>
                            void service
                              .update(record.id, {
                                is_active: !toBoolean(record.is_active, true),
                              })
                              .then((updated) => {
                                setItems((prev) =>
                                  prev.map((item) =>
                                    item.id === record.id
                                      ? { ...item, ...updated }
                                      : item,
                                  ),
                                );
                                showToast("Status diperbarui", "success");
                              })
                              .catch((error) => {
                                showToast(
                                  error instanceof Error
                                    ? error.message
                                    : "Gagal memperbarui status",
                                  "error",
                                );
                              }),
                        },
                        {
                          key: "delete",
                          label: "Hapus",
                          icon: Trash2,
                          tone: "red",
                          disabled: !canDelete,
                          onClick: () => setDeleteItem(record),
                        },
                      ]}
                    />
                  </SetupDataTableCell>
                </SetupDataTableRow>
              ))}

              {isFetching ? (
                <SetupDataTableEmptyRow colSpan={tableColSpan}>
                  Memuat data {config.entityLabel}...
                </SetupDataTableEmptyRow>
              ) : null}

              {!isFetching && filtered.length === 0 ? (
                <SetupDataTableEmptyRow
                  colSpan={tableColSpan}
                  tone="parameter"
                  isFiltered={Boolean(query.trim())}
                  description={
                    query.trim()
                      ? "Coba ubah kata kunci pencarian."
                      : "Tambahkan parameter agar pilihan ini tersedia di modul terkait."
                  }
                  action={
                    !query.trim() && canCreate ? (
                      <SetupAddButton label={config.addLabel} onClick={openCreate} />
                    ) : undefined
                  }
                >
                  {query.trim()
                    ? `Tidak ada ${config.entityLabel} yang cocok dengan pencarian.`
                    : getSetupPageEmptyStateCopy(config.entityLabel)}
                </SetupDataTableEmptyRow>
              ) : null}
            </SetupDataTableBody>
          </SetupDataTable>
        <Pagination
          page={paginationMeta.page}
          lastPage={paginationMeta.lastPage}
          total={paginationMeta.total}
          limit={paginationMeta.limit}
          isLoading={isFetching}
          onPageChange={setPage}
        />
        </SetupTableCard>
      </div>

      <DashboardModal
        isOpen={isModalOpen}
        title={editingItem ? `Edit ${config.entityLabel}` : `Tambah ${config.entityLabel}`}
        onClose={closeModal}
        closeDisabled={isSaving}
        maxWidth="3xl"
        bodyClassName="grid grid-cols-1 gap-4 p-6 md:grid-cols-2"
        footer={
          <>
            <button
              onClick={closeModal}
              className="uiverse-modal-button uiverse-modal-button--neutral"
              disabled={isSaving}
              type="button"
            >
              Batal
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="uiverse-modal-button uiverse-modal-button--primary"
              type="button"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>{isSaving ? "Menyimpan..." : "Simpan"}</span>
            </button>
          </>
        }
      >
        {config.fields.map((field) => {
          const value = form[field.key];
          const fieldId = `field-${field.key}`;

          return (
            <div
              key={field.key}
              className={field.colSpan === "full" ? "md:col-span-2" : ""}
            >
              <label
                htmlFor={fieldId}
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                {field.label}
                {field.required ? <span className="text-red-500"> *</span> : null}
              </label>

              {field.type === "textarea" ? (
                <SetupTextarea
                  id={fieldId}
                  value={String(value ?? "")}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  rows={4}
                />
              ) : field.type === "select" ? (
                <SetupSelect
                  id={fieldId}
                  value={String(value ?? "")}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                >
                  <option value="">Pilih {field.label.toLowerCase()}</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SetupSelect>
              ) : field.type === "boolean" || field.type === "status" ? (
                <SetupSelect
                  id={fieldId}
                  value={toBoolean(value, field.type === "status") ? "true" : "false"}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [field.key]: event.target.value === "true",
                    }))
                  }
                >
                  {field.type === "status" ? (
                    <>
                      <option value="true">Aktif</option>
                      <option value="false">Nonaktif</option>
                    </>
                  ) : (
                    <>
                      <option value="true">Ya</option>
                      <option value="false">Tidak</option>
                    </>
                  )}
                </SetupSelect>
              ) : (
                <SetupTextInput
                  id={fieldId}
                  type={field.type === "number" ? "number" : "text"}
                  value={String(value ?? "")}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                />
              )}
            </div>
          );
        })}
      </DashboardModal>

      <DeleteConfirmModal
        isOpen={deleteItem !== null}
        title={`Hapus ${config.entityLabel}?`}
        entityLabel={config.entityLabel}
        itemName={valueToText(deleteItem?.name)}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={isDeleting}
      />
    </DashboardPageShell>
  );
}
