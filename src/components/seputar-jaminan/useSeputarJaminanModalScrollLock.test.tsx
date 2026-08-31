import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import useSeputarJaminanModalScrollLock from "./useSeputarJaminanModalScrollLock";

function Harness({ enabled }: { enabled: boolean }) {
  useSeputarJaminanModalScrollLock(enabled);
  return null;
}

describe("useSeputarJaminanModalScrollLock", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("mengunci scroll hanya ketika modal SJ terbuka dan memulihkan nilai sebelumnya", () => {
    document.body.style.overflow = "auto";
    const { rerender, unmount } = render(<Harness enabled={false} />);

    expect(document.body.style.overflow).toBe("auto");
    rerender(<Harness enabled />);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });
});
