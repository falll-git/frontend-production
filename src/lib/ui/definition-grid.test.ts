import { describe, expect, it } from "vitest";

import { completeDefinitionGridRows } from "./definition-grid";

describe("completeDefinitionGridRows", () => {
  it("keeps complete pairs and full-width rows unchanged", () => {
    expect(completeDefinitionGridRows([false, false, true])).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("promotes a lone item before a full-width row", () => {
    expect(completeDefinitionGridRows([false, true])).toEqual([true, true]);
  });

  it("promotes a final item without a pair", () => {
    expect(completeDefinitionGridRows([false, false, false])).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("handles consecutive incomplete groups without leaving a hole", () => {
    expect(
      completeDefinitionGridRows([true, false, true, false, false, false]),
    ).toEqual([true, true, true, false, false, true]);
  });
});
