"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { notaryParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function SetupNotarisPage() {
  return <ParameterMasterPage config={notaryParameterConfig} />;
}
