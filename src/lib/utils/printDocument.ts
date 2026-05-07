export function printDocument(fileUrl: string): boolean {
  if (typeof window === "undefined" || !fileUrl.trim()) {
    return false;
  }

  const printWindow = window.open(fileUrl, "_blank");

  if (!printWindow) {
    return false;
  }

  let printTriggered = false;

  const triggerPrint = () => {
    if (printTriggered) return;
    printTriggered = true;

    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  printWindow.addEventListener("load", triggerPrint, { once: true });
  printWindow.addEventListener(
    "afterprint",
    () => {
      printWindow.close();
    },
    { once: true },
  );

  window.setTimeout(triggerPrint, 1500);

  return true;
}
