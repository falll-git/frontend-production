"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { legalProcessTypeParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function JenisProsesLegalPage() {
  return <ParameterMasterPage config={legalProcessTypeParameterConfig} />;
}
