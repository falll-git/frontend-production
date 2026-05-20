"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { collectibilityParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function SetupKolektibilitasPage() {
  return <ParameterMasterPage config={collectibilityParameterConfig} />;
}
