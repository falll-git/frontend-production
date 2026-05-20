"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { branchParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function SetupCabangPage() {
  return <ParameterMasterPage config={branchParameterConfig} />;
}
