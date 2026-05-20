import { LegalPrintClient } from "@/components/legal/LegalModuleClients";

export default function HaftsheetPage() {
  return <LegalPrintClient documentType="HAFTSHEET" title="Haftsheet" />;
}
