export type AnchorRect = Pick<
  DOMRect,
  "bottom" | "left" | "right" | "top" | "width"
>;

export type AnchoredPopupOptions = {
  estimatedHeight: number;
  preferredWidth: number;
  viewportHeight: number;
  viewportWidth: number;
  gap?: number;
  minimumUsableHeight?: number;
  minimumWidth?: number;
  viewportPadding?: number;
};

export type AnchoredPopupPosition = {
  bottom?: number;
  left: number;
  maxHeight: number;
  top?: number;
  width: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

/**
 * Positions a floating control without allowing it to escape the viewport.
 * When neither side of the trigger is usable, the popup becomes a scrollable
 * viewport overlay instead of overflowing or changing the document layout.
 */
export function getAnchoredPopupPosition(
  anchor: AnchorRect,
  {
    estimatedHeight,
    preferredWidth,
    viewportHeight,
    viewportWidth,
    gap = 8,
    minimumUsableHeight = 160,
    minimumWidth = 240,
    viewportPadding = 12,
  }: AnchoredPopupOptions,
): AnchoredPopupPosition {
  const availableWidth = Math.max(0, viewportWidth - viewportPadding * 2);
  const safeMinimumWidth = Math.min(minimumWidth, availableWidth);
  const width = clamp(preferredWidth, safeMinimumWidth, availableWidth);
  const maximumLeft = Math.max(viewportPadding, viewportWidth - viewportPadding - width);
  const left = clamp(anchor.left, viewportPadding, maximumLeft);

  const fullViewportHeight = Math.max(0, viewportHeight - viewportPadding * 2);
  const desiredHeight = Math.min(estimatedHeight, fullViewportHeight);
  const spaceBelow = Math.max(
    0,
    viewportHeight - viewportPadding - anchor.bottom - gap,
  );
  const spaceAbove = Math.max(0, anchor.top - viewportPadding - gap);
  const usableHeight = Math.min(minimumUsableHeight, desiredHeight);

  if (spaceBelow >= desiredHeight) {
    return {
      left,
      maxHeight: desiredHeight,
      top: anchor.bottom + gap,
      width,
    };
  }

  if (spaceAbove >= desiredHeight) {
    return {
      bottom: viewportHeight - anchor.top + gap,
      left,
      maxHeight: desiredHeight,
      width,
    };
  }

  const openBelow = spaceBelow >= spaceAbove;
  const selectedSpace = openBelow ? spaceBelow : spaceAbove;

  if (selectedSpace >= usableHeight) {
    return openBelow
      ? {
          left,
          maxHeight: selectedSpace,
          top: anchor.bottom + gap,
          width,
        }
      : {
          bottom: viewportHeight - anchor.top + gap,
          left,
          maxHeight: selectedSpace,
          width,
        };
  }

  return {
    left,
    maxHeight: fullViewportHeight,
    top: viewportPadding,
    width,
  };
}
