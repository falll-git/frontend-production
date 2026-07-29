import { describe, expect, it } from "vitest";

import { getAnchoredPopupPosition } from "./anchored-popup";

const anchor = {
  bottom: 144,
  left: 24,
  right: 324,
  top: 100,
  width: 300,
};

describe("getAnchoredPopupPosition", () => {
  it("keeps popup width inside a narrow viewport", () => {
    const position = getAnchoredPopupPosition(anchor, {
      estimatedHeight: 420,
      minimumWidth: 260,
      preferredWidth: 320,
      viewportHeight: 800,
      viewportWidth: 240,
    });

    expect(position.left).toBe(12);
    expect(position.width).toBe(216);
    expect(position.left + position.width).toBeLessThanOrEqual(228);
  });

  it("opens below when the requested height fits", () => {
    const position = getAnchoredPopupPosition(anchor, {
      estimatedHeight: 320,
      preferredWidth: 300,
      viewportHeight: 800,
      viewportWidth: 360,
    });

    expect(position.top).toBe(152);
    expect(position.bottom).toBeUndefined();
    expect(position.maxHeight).toBe(320);
  });

  it("opens above when only the space above is sufficient", () => {
    const position = getAnchoredPopupPosition(
      { ...anchor, bottom: 744, top: 700 },
      {
        estimatedHeight: 320,
        preferredWidth: 300,
        viewportHeight: 800,
        viewportWidth: 360,
      },
    );

    expect(position.top).toBeUndefined();
    expect(position.bottom).toBe(108);
    expect(position.maxHeight).toBe(320);
  });

  it("limits height to the larger available side without overflow", () => {
    const position = getAnchoredPopupPosition(
      { ...anchor, bottom: 403, top: 359 },
      {
        estimatedHeight: 420,
        minimumUsableHeight: 280,
        preferredWidth: 320,
        viewportHeight: 800,
        viewportWidth: 360,
      },
    );

    expect(position.top).toBe(411);
    expect(position.maxHeight).toBe(377);
    expect((position.top ?? 0) + position.maxHeight).toBe(788);
  });

  it("uses a scrollable viewport overlay when both sides are too small", () => {
    const position = getAnchoredPopupPosition(
      { ...anchor, bottom: 124, top: 80 },
      {
        estimatedHeight: 320,
        minimumUsableHeight: 160,
        preferredWidth: 300,
        viewportHeight: 220,
        viewportWidth: 360,
      },
    );

    expect(position.top).toBe(12);
    expect(position.bottom).toBeUndefined();
    expect(position.maxHeight).toBe(196);
  });
});
