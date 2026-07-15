export const IDEB_FACILITY_FILTERS = [
  { value: "ALL", label: "Semua", fileSuffix: "semua" },
  { value: "ACTIVE", label: "Aktif", fileSuffix: "aktif" },
  { value: "PAID_OFF", label: "Lunas", fileSuffix: "lunas" },
  { value: "PROBLEM", label: "Macet / Hapus Buku", fileSuffix: "macet-hapus-buku" },
  { value: "ARREARS", label: "Ada Tunggakan", fileSuffix: "ada-tunggakan" },
] as const;

export type IdebFacilityFilter = (typeof IDEB_FACILITY_FILTERS)[number]["value"];

export function getIdebFacilityFilterLabel(filter: IdebFacilityFilter) {
  return (
    IDEB_FACILITY_FILTERS.find((option) => option.value === filter)?.label ??
    IDEB_FACILITY_FILTERS[0].label
  );
}
