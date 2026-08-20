import { describe, expect, it } from "vitest";

import { resolveStorageGridModalLayout } from "@/components/arsip/storage-grid-modal-layout";

describe("resolveStorageGridModalLayout", () => {
  it.each([0, 1])(
    "uses a medium single-column modal for %i item",
    (totalItems) => {
      expect(resolveStorageGridModalLayout(totalItems)).toEqual({
        gridClassName: "grid grid-cols-1 gap-6",
        maxWidth: "2xl",
      });
    },
  );

  it.each([2, 6, 12])(
    "uses a wide responsive grid for %i items",
    (totalItems) => {
      expect(resolveStorageGridModalLayout(totalItems)).toEqual({
        gridClassName: "grid grid-cols-1 gap-6 md:grid-cols-2",
        maxWidth: "5xl",
      });
    },
  );
});
