import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FileUploadField from "@/components/ui/FileUploadField";
import MultiFileUploadField from "@/components/ui/MultiFileUploadField";

import { validateSjPublicImage } from "./SeputarJaminanMedia";

vi.mock("@/components/ui/AppToastProvider", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

function invalidFile() {
  return new File(["bukan gambar"], "catatan.txt", { type: "text/plain" });
}

describe("Seputar Jaminan upload validation feedback", () => {
  it("forwards single-file validation errors to the module without calling upload", () => {
    const onChange = vi.fn();
    const onValidationError = vi.fn();
    const { container } = render(
      <FileUploadField
        id="logo-test"
        file={null}
        onChange={onChange}
        onValidationError={onValidationError}
        validateFile={validateSjPublicImage}
      />,
    );

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [invalidFile()] },
    });

    expect(onValidationError).toHaveBeenCalledWith(
      "Gunakan gambar JPG, PNG, atau WebP yang valid.",
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("forwards multi-file validation errors to the module without calling upload", () => {
    const onChange = vi.fn();
    const onValidationError = vi.fn();
    const { container } = render(
      <MultiFileUploadField
        id="media-test"
        files={[]}
        onChange={onChange}
        onValidationError={onValidationError}
        validateFile={validateSjPublicImage}
      />,
    );

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [invalidFile()] },
    });

    expect(onValidationError).toHaveBeenCalledWith(
      "Gunakan gambar JPG, PNG, atau WebP yang valid.",
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
