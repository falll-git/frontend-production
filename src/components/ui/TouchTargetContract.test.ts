import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(process.cwd(), "src");

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function collectProductionTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectProductionTsxFiles(path);
    if (!entry.name.endsWith(".tsx") || entry.name.includes(".test.")) return [];
    return [path];
  });
}

describe("touch target contract", () => {
  it(
    "menolak ukuran atau padding kecil pada button langsung tanpa target 44px",
    () => {
      const findings: string[] = [];
      const undersizedDimension =
        /\b(?:size-(?:[1-9]|10)|h-(?:[1-9]|10)|min-h-(?:[1-9]|10))\b/;
      const compactPadding =
        /\b(?:p-(?:0\.5|1|1\.5|2|2\.5)|py-(?:0\.5|1|1\.5|2|2\.5))\b/;
      const explicitTarget = /\b(?:size-11|h-11|min-h-11|min-w-11)\b/;
      const knownSharedTarget =
        /uiverse-modal-button|nav-notif-btn|notif-|logout-btn|\bbutton\b/;

      for (const file of collectProductionTsxFiles(SRC_ROOT)) {
        const source = readFileSync(file, "utf8");
        const sourceFile = ts.createSourceFile(
          file,
          source,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );

        const visit = (node: ts.Node) => {
          if (
            (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
            node.tagName.getText(sourceFile) === "button"
          ) {
            const className = node.attributes.properties.find(
              (property) =>
                ts.isJsxAttribute(property) &&
                property.name.getText(sourceFile) === "className",
            );
            const rawClassName =
              className?.getText(sourceFile).replace(/\s+/g, " ") ?? "";
            const hasSmallDimension = undersizedDimension.test(rawClassName);
            const hasCompactPadding = compactPadding.test(rawClassName);
            const hasMinimumTarget =
              explicitTarget.test(rawClassName) || knownSharedTarget.test(rawClassName);

            if ((hasSmallDimension || hasCompactPadding) && !hasMinimumTarget) {
              const position = sourceFile.getLineAndCharacterOfPosition(
                node.getStart(sourceFile),
              );
              findings.push(
                `${relative(process.cwd(), file)}:${position.line + 1} ${rawClassName}`,
              );
            }
          }

          ts.forEachChild(node, visit);
        };

        visit(sourceFile);
      }

      expect(findings).toEqual([]);
    },
    15_000,
  );

  it("menjaga kontrol bersama dan kontrol padat utama minimal 44px", () => {
    const setupPageStyles = readSource("src/components/ui/setupPageStyles.ts");
    const sidebarStyles = readSource("src/components/styles/dashboard-sidebar.css");
    const roleMenu = readSource("src/app/dashboard/parameter/role-menu/page.tsx");
    const accountSecurity = readSource("src/app/dashboard/account/security/page.tsx");
    const dispositionHistory = readSource(
      "src/app/dashboard/arsip-digital/disposisi/historis/page.tsx",
    );
    const watermark = readSource(
      "src/app/dashboard/parameter/watermark-dokumen/page.tsx",
    );
    const ideb = readSource(
      "src/components/informasi-debitur/DebtorIdebReportClient.tsx",
    );
    const debtorDetail = readSource(
      "src/components/informasi-debitur/DebtorWorkflowDetailClient.tsx",
    );
    const collateralDetailSource = debtorDetail.slice(
      debtorDetail.indexOf("function AgunanDetailModal"),
      debtorDetail.indexOf("function AgunanTab"),
    );

    expect(setupPageStyles).toContain(
      "inline-flex min-h-11 items-center justify-center whitespace-nowrap",
    );
    expect(sidebarStyles.match(/min-height: 44px/g)).toHaveLength(2);
    expect(roleMenu).toContain("inline-flex size-11 items-center justify-center");
    expect(roleMenu).not.toContain("inline-flex size-7 items-center justify-center");
    expect(accountSecurity).toContain("inline-flex min-h-11 items-center");
    expect(dispositionHistory.match(/inline-flex min-h-11/g)).toHaveLength(3);
    expect(watermark).toContain("inline-flex min-h-11 items-center justify-center");
    expect(ideb).toContain("inline-flex min-h-11 items-center justify-center");
    expect(collateralDetailSource).toContain(
      'className="uiverse-modal-button uiverse-modal-button--neutral"',
    );
  });

  it("memperbesar area klik preview, file, toast, select, dan auth tanpa memperbesar ikon", () => {
    const preview = readSource("src/components/ui/DocumentPreviewContext.tsx");
    const multiFile = readSource("src/components/ui/MultiFileUploadField.tsx");
    const toast = readSource("src/components/ui/Toast.tsx");
    const select = readSource("src/components/ui/SearchableSelect.tsx");
    const login = readSource("src/app/page.tsx");
    const passwordAction = readSource("src/components/auth/PasswordActionPage.tsx");

    expect(preview.match(/inline-flex size-11 items-center justify-center/g)).toHaveLength(2);
    expect(preview.match(/flex min-h-11 items-center gap-2/g)).toHaveLength(3);
    expect(preview).toContain('<Minus className="h-4 w-4');
    expect(preview).toContain('<Plus className="h-4 w-4');
    expect(preview).toContain('<Download className="h-5 w-5"');
    expect(multiFile).toContain("inline-flex size-11 shrink-0 items-center");
    expect(multiFile).toContain('<Trash2 className="h-4 w-4"');
    expect(toast).toContain("inline-flex size-11 shrink-0 items-center");
    expect(toast).toContain('<X className="h-4 w-4"');
    expect(select).toContain("flex min-h-11 w-full items-start");
    expect(login).toContain("inline-flex size-11 -translate-y-1/2");
    expect(login).not.toContain("inline-flex size-10 -translate-y-1/2");
    expect(passwordAction.match(/inline-flex size-11 -translate-y-1\/2/g)).toHaveLength(2);
    expect(passwordAction).not.toContain("inline-flex size-10 -translate-y-1/2");
  });
});
