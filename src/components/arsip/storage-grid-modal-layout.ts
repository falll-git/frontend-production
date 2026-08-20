export type StorageGridModalLayout = {
  gridClassName: string;
  maxWidth: "2xl" | "5xl";
};

export function resolveStorageGridModalLayout(
  totalItems: number,
): StorageGridModalLayout {
  const hasMultipleItems = totalItems > 1;

  return {
    gridClassName: hasMultipleItems
      ? "grid grid-cols-1 gap-6 md:grid-cols-2"
      : "grid grid-cols-1 gap-6",
    maxWidth: hasMultipleItems ? "5xl" : "2xl",
  };
}
