import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

import {
  MODAL_CALLER_BASELINE,
  MODAL_RUNTIME_EVIDENCE,
  summarizeModalRuntimeEvidence,
} from "./modal-caller-baseline";

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function normalizeRelativePath(file: string) {
  return file.slice(process.cwd().length + 1).replaceAll("\\", "/");
}

function modalCallerKeysFromSource() {
  const sourceRoots = [
    join(process.cwd(), "src", "app"),
    join(process.cwd(), "src", "components"),
  ];

  return sourceRoots
    .flatMap(walk)
    .filter(
      (file) =>
        /\.(?:ts|tsx)$/.test(file) &&
        !/\.(?:test|spec)\.(?:ts|tsx)$/.test(file),
    )
    .flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      let count = 0;

      function visit(node: ts.Node) {
        if (
          (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
          node.tagName.getText(sourceFile) === "DashboardModal"
        ) {
          count += 1;
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      return Array.from(
        { length: count },
        (_, index) => `${normalizeRelativePath(file)}#${index + 1}`,
      );
    })
    .sort();
}

test("baseline mengunci seluruh 71 caller DashboardModal", () => {
  const sourceCallerKeys = modalCallerKeysFromSource();
  const baselineCallerKeys = MODAL_CALLER_BASELINE.map(
    (caller) => `${caller.source}#${caller.ordinal}`,
  ).sort();

  expect(sourceCallerKeys).toHaveLength(71);
  expect(MODAL_CALLER_BASELINE).toHaveLength(71);
  expect(new Set(baselineCallerKeys).size).toBe(71);
  expect(sourceCallerKeys).toEqual(baselineCallerKeys);
}, 20_000);

test("setiap caller memiliki route trigger tipe kondisi dan status viewport", () => {
  const ids = new Set<string>();
  const allowedViewportStatuses = new Set([
    "needs-fix",
    "not-verified",
    "passed",
  ]);
  const allowedModalKinds = new Set([
    "audit",
    "confirmation",
    "detail",
    "form",
    "picker",
    "summary",
    "workflow",
  ]);

  for (const caller of MODAL_CALLER_BASELINE) {
    expect(ids.has(caller.id), `ID ganda: ${caller.id}`).toBe(false);
    ids.add(caller.id);

    const callerPath = join(process.cwd(), caller.source);
    expect(existsSync(callerPath), caller.source).toBe(true);
    const callerSource = readFileSync(callerPath, "utf8");

    expect(caller.owner.trim(), `${caller.id}: owner`).not.toBe("");
    expect(callerSource, `${caller.id}: owner ${caller.owner}`).toContain(
      caller.owner,
    );
    expect(caller.title.trim(), `${caller.id}: title`).not.toBe("");
    expect(caller.routes.length, `${caller.id}: routes`).toBeGreaterThan(0);
    expect(caller.trigger.label.trim(), `${caller.id}: trigger label`).not.toBe(
      "",
    );
    expect(
      caller.trigger.tokens.length,
      `${caller.id}: trigger tokens`,
    ).toBeGreaterThan(0);
    expect(
      caller.dataConditions.length,
      `${caller.id}: data conditions`,
    ).toBeGreaterThan(0);
    expect(allowedModalKinds.has(caller.kind), `${caller.id}: modal kind`).toBe(
      true,
    );

    const triggerPath = join(
      process.cwd(),
      caller.trigger.source ?? caller.source,
    );
    expect(existsSync(triggerPath), `${caller.id}: trigger source`).toBe(true);
    const triggerSource = readFileSync(triggerPath, "utf8");
    for (const token of caller.trigger.tokens) {
      expect(triggerSource, `${caller.id}: trigger token ${token}`).toContain(
        token,
      );
    }

    for (const route of caller.routes) {
      if (route === "shared") continue;
      const pagePath = join(process.cwd(), "src", "app", route, "page.tsx");
      expect(existsSync(pagePath), `${caller.id}: route ${route}`).toBe(true);
    }

    for (const [viewport, status] of Object.entries(caller.viewport)) {
      expect(
        allowedViewportStatuses.has(status),
        `${caller.id}: ${viewport}`,
      ).toBe(true);
    }

    for (const viewport of ["desktop", "tablet", "mobile"] as const) {
      const references = caller.runtimeEvidence[viewport] ?? [];

      expect(
        caller.viewport[viewport] === "passed",
        `${caller.id}: status ${viewport} wajib mengikuti bukti runtime`,
      ).toBe(references.length > 0);

      for (const reference of references) {
        expect(
          existsSync(join(process.cwd(), reference)),
          `${caller.id}: bukti ${viewport} ${reference}`,
        ).toBe(true);
      }
    }

    if (caller.evidence === "source-only") {
      expect(Object.values(caller.runtimeEvidence)).toEqual([]);
      expect(Object.values(caller.viewport)).toEqual([
        "not-verified",
        "not-verified",
        "not-verified",
      ]);
    } else {
      expect(caller.evidence, `${caller.id}: evidence`).toBe("runtime-e2e");
      expect(
        Object.values(caller.runtimeEvidence).some(
          (references) => references && references.length > 0,
        ),
        `${caller.id}: runtime evidence`,
      ).toBe(true);
    }
  }
});

test("bukti runtime hanya mereferensikan caller yang terdaftar", () => {
  const callerIds = new Set(MODAL_CALLER_BASELINE.map((caller) => caller.id));
  expect(
    Object.keys(MODAL_RUNTIME_EVIDENCE).filter((id) => !callerIds.has(id)),
  ).toEqual([]);
});

test("ringkasan memisahkan 71 caller source dari kelulusan runtime", () => {
  expect(summarizeModalRuntimeEvidence()).toEqual({
    desktop: { passed: 71, notVerified: 0, total: 71 },
    tablet: { passed: 71, notVerified: 0, total: 71 },
    mobile: { passed: 71, notVerified: 0, total: 71 },
  });
});

test("setiap implementasi dialog modal memakai pengelola fokus bersama", () => {
  const sourceRoots = [
    join(process.cwd(), "src", "app"),
    join(process.cwd(), "src", "components"),
  ];
  const dialogFiles = sourceRoots
    .flatMap(walk)
    .filter((file) => /\.(?:ts|tsx)$/.test(file))
    .filter((file) => readFileSync(file, "utf8").includes('aria-modal="true"'));

  expect(dialogFiles.length).toBeGreaterThan(0);
  const unmanaged = dialogFiles.filter((file) => {
    const source = readFileSync(file, "utf8");
    return !source.includes("useAccessibleModal");
  });
  expect(unmanaged).toEqual([]);
});

test("overlay modal aplikasi hanya dibuat oleh komponen UI bersama", () => {
  const sourceRoots = [
    join(process.cwd(), "src", "app"),
    join(process.cwd(), "src", "components"),
  ];
  const overlayOwners = sourceRoots
    .flatMap(walk)
    .filter((file) => /\.(?:ts|tsx)$/.test(file))
    .filter((file) =>
      /data-dashboard-overlay="true"\s*\n\s*className=/.test(
        readFileSync(file, "utf8"),
      ),
    )
    .map((file) => file.slice(process.cwd().length + 1).replaceAll("\\", "/"))
    .sort();

  expect(overlayOwners).toEqual([
    "src/components/ui/DashboardModal.tsx",
    "src/components/ui/DocumentPreviewContext.tsx",
  ]);
});

test("modal detail lintas modul memakai urutan informasi detail dan lampiran bersama", () => {
  const expectedLayoutCounts: Record<string, number> = {
    "src/components/activity-centre/ActivityDetailContent.tsx": 1,
    "src/components/arsip-digital/laporan/ReportDocumentDetailModal.tsx": 1,
    "src/components/dashboard/LaporanAktivitasMarketingSection.tsx": 1,
    "src/components/informasi-debitur/DebiturModuleClients.tsx": 1,
    "src/components/informasi-debitur/DebtorIdebReportClient.tsx": 1,
    "src/components/informasi-debitur/DebtorWorkflowDetailClient.tsx": 2,
    "src/components/legal/LegalModuleClients.tsx": 1,
    "src/components/legal/LegalRecordDetailContent.tsx": 3,
    "src/components/manajemen-surat/CetakDokumenClient.tsx": 1,
    "src/components/manajemen-surat/LaporanPersuratanClient.tsx": 3,
    "src/app/dashboard/arsip-digital/ruang-arsip/list-dokumen/page.tsx": 1,
  };

  for (const [relativePath, minimumCount] of Object.entries(
    expectedLayoutCounts,
  )) {
    const source = readFileSync(join(process.cwd(), relativePath), "utf8");
    const usageCount = source.match(/<SetupModalDetailLayout\b/g)?.length ?? 0;
    expect(usageCount, relativePath).toBeGreaterThanOrEqual(minimumCount);
  }
});

test("metadata modal memakai definition grid berpembatas, bukan kumpulan card", () => {
  const centralizedDetailFiles = [
    "src/components/activity-centre/ActivityDetailContent.tsx",
    "src/components/arsip-digital/laporan/ReportDocumentDetailModal.tsx",
    "src/components/arsip-digital/peminjaman/LoanDetailContent.tsx",
    "src/components/dashboard/LaporanAktivitasMarketingSection.tsx",
    "src/components/informasi-debitur/DebtorIdebReportClient.tsx",
    "src/components/legal/LegalRecordDetailContent.tsx",
    "src/components/manajemen-surat/CetakDokumenClient.tsx",
    "src/app/dashboard/arsip-digital/ruang-arsip/list-dokumen/page.tsx",
  ];

  for (const relativePath of centralizedDetailFiles) {
    const source = readFileSync(join(process.cwd(), relativePath), "utf8");
    expect(source, relativePath).toContain("SetupRecordDetailSection");
  }

  const customDefinitionFiles = [
    "src/app/dashboard/arsip-digital/disposisi/historis/page.tsx",
    "src/app/dashboard/arsip-digital/historis/penyimpanan/page.tsx",
    "src/components/informasi-debitur/DebiturModuleClients.tsx",
    "src/components/manajemen-surat/LaporanPersuratanClient.tsx",
  ];

  for (const relativePath of customDefinitionFiles) {
    const source = readFileSync(join(process.cwd(), relativePath), "utf8");
    expect(source, relativePath).toContain('data-ui="modal-definition-cell"');
    expect(source, relativePath).toContain("gap-px overflow-hidden rounded-lg");
  }

  const timelineSource = readFileSync(
    join(
      process.cwd(),
      "src/components/informasi-debitur/DebtorWorkflowDetailClient.tsx",
    ),
    "utf8",
  );
  expect(timelineSource).toContain('data-ui-layout="compact-info-list"');
});

test("modal detail IDEB tidak menampilkan lampiran file sumber", () => {
  const reportSource = readFileSync(
    join(
      process.cwd(),
      "src/components/informasi-debitur/DebtorIdebReportClient.tsx",
    ),
    "utf8",
  );
  expect(reportSource).not.toContain("getIdebAttachmentFiles");
  expect(reportSource).not.toContain('title="Lampiran"');
  expect(reportSource).not.toContain("File sumber yang diunggah");

  const debtorDetailSource = readFileSync(
    join(
      process.cwd(),
      "src/components/informasi-debitur/DebtorWorkflowDetailClient.tsx",
    ),
    "utf8",
  );
  const idebTabStart = debtorDetailSource.indexOf("function IdebTab(");
  const idebTabEnd = debtorDetailSource.indexOf(
    "function HistorisKolTab(",
    idebTabStart,
  );
  expect(idebTabStart).toBeGreaterThanOrEqual(0);
  expect(idebTabEnd).toBeGreaterThan(idebTabStart);
  const idebTabSource = debtorDetailSource.slice(idebTabStart, idebTabEnd);
  expect(idebTabSource).not.toContain("attachments=");
  expect(idebTabSource).not.toContain("File Sumber");
  expect(debtorDetailSource).not.toContain("getIdebAttachmentFiles");
});
