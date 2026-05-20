"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { documentChecklistParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function SetupChecklistDokumenPage() {
  return <ParameterMasterPage config={documentChecklistParameterConfig} />;
}
