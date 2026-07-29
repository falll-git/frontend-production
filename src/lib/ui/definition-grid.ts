/**
 * Completes every two-column definition row without leaving a visual hole.
 * A lone regular item before a full-width item, or at the end of the list,
 * becomes full-width as well.
 */
export function completeDefinitionGridRows(wideItems: boolean[]) {
  const completed = [...wideItems];
  let pendingRegularIndex: number | null = null;

  completed.forEach((isWide, index) => {
    if (isWide) {
      if (pendingRegularIndex !== null) {
        completed[pendingRegularIndex] = true;
        pendingRegularIndex = null;
      }
      return;
    }

    if (pendingRegularIndex === null) {
      pendingRegularIndex = index;
      return;
    }

    pendingRegularIndex = null;
  });

  if (pendingRegularIndex !== null) {
    completed[pendingRegularIndex] = true;
  }

  return completed;
}
