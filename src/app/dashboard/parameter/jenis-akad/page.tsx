"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { contractTypeParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function SetupJenisAkadPage() {
  return <ParameterMasterPage config={contractTypeParameterConfig} />;
}
