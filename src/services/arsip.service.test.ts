import { describe, expect, it } from "vitest";

import { mapDigitalDocument } from "@/services/arsip.service";
import type {
  DokumenAvailabilityKey,
  DokumenAvailabilityLabel,
} from "@/types/arsip.types";

function buildDocumentRecord(
  statusKey: string,
  statusLabel?: string,
): Record<string, unknown> {
  return {
    id: "document-1",
    document_number: "DOC-001",
    document_name: "Dokumen Uji",
    description: "Dokumen untuk menguji kontrak status peminjaman",
    availability_status_key: statusKey,
    ...(statusLabel ? { availability_status_label: statusLabel } : {}),
  };
}

describe("mapDigitalDocument", () => {
  it.each<{
    key: DokumenAvailabilityKey;
    label: DokumenAvailabilityLabel;
  }>([
    { key: "AVAILABLE", label: "Tersedia" },
    { key: "REQUESTED", label: "Diajukan" },
    { key: "PROCESSING", label: "Dalam Proses" },
    { key: "BORROWED", label: "Dipinjam" },
  ])("memetakan status $key dari key API yang stabil", ({ key, label }) => {
    const document = mapDigitalDocument(buildDocumentRecord(key));

    expect(document).toMatchObject({
      statusPinjamKey: key,
      statusPinjam: label,
      statusPeminjaman: label,
    });
  });

  it("tidak menjadikan dokumen tersedia hanya karena label API kosong atau tidak konsisten", () => {
    const requested = mapDigitalDocument(
      buildDocumentRecord("REQUESTED", "Tersedia"),
    );

    expect(requested).toMatchObject({
      statusPinjamKey: "REQUESTED",
      statusPinjam: "Diajukan",
    });
  });

  it("menolak status key yang tidak dikenal agar dokumen tidak dapat dipinjam secara keliru", () => {
    expect(mapDigitalDocument(buildDocumentRecord("UNKNOWN", "Tersedia"))).toBeNull();
  });
});
