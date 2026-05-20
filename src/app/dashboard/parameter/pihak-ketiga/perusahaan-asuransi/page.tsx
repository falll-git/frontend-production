"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { insuranceParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function SetupPerusahaanAsuransiPage() {
  return <ParameterMasterPage config={insuranceParameterConfig} />;
}
