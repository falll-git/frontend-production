import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

const ACTION_COMPONENTS = new Set([
  "SetupActionMenu",
  "CorrespondenceActionMenu",
  "ReportDocumentActionButton",
]);

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function tagName(node: ts.JsxOpeningLikeElement): string {
  return node.tagName.getText();
}

function findAttribute(
  node: ts.JsxOpeningLikeElement,
  name: string,
): ts.JsxAttribute | undefined {
  return node.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText() === name,
  );
}

function containsAnyTag(node: ts.Node, names: Set<string>): boolean {
  let found = false;
  const visit = (child: ts.Node) => {
    if (found) return;
    if (
      (ts.isJsxElement(child) &&
        names.has(tagName(child.openingElement))) ||
      (ts.isJsxSelfClosingElement(child) && names.has(tagName(child)))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

function findTable(node: ts.Node): ts.JsxElement | undefined {
  let current = node.parent;
  while (current) {
    if (
      ts.isJsxElement(current) &&
      ["SetupDataTable", "table"].includes(tagName(current.openingElement))
    ) {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

function hasActionHeader(table: ts.JsxElement | undefined): boolean {
  if (!table) return false;

  let found = false;
  const visit = (child: ts.Node) => {
    if (found) return;
    if (
      (ts.isJsxElement(child) &&
        ["SetupDataTableHeaderCell", "th"].includes(
          tagName(child.openingElement),
        ) &&
        child.getText().includes("Aksi")) ||
      (ts.isJsxSelfClosingElement(child) &&
        ["SetupDataTableHeaderCell", "th"].includes(tagName(child)) &&
        child.getText().includes("Aksi"))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(table, visit);
  return found;
}

test("setiap baris tabel dengan detail double-click memiliki menu Aksi berlabel", () => {
  const sourceRoot = join(process.cwd(), "src");
  const files = walk(sourceRoot).filter((file) => file.endsWith(".tsx"));
  const auditedRows: string[] = [];
  const violations: string[] = [];

  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node)) {
        const rowName = tagName(node.openingElement);
        if (["SetupDataTableRow", "tr"].includes(rowName)) {
          const doubleClick = findAttribute(node.openingElement, "onDoubleClick");
          const handler = doubleClick?.initializer?.getText() ?? "";

          if (doubleClick && !handler.includes("stopPropagation")) {
            const line =
              source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
            const location = `${relative(process.cwd(), file)}:${line}`;
            auditedRows.push(location);

            if (!hasActionHeader(findTable(node))) {
              violations.push(`${location} tidak memiliki kolom Aksi`);
            }
            if (!containsAnyTag(node, ACTION_COMPONENTS)) {
              violations.push(`${location} tidak memiliki menu aksi berlabel`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  expect(auditedRows.length).toBeGreaterThan(0);
  expect(violations).toEqual([]);
}, 30_000);
