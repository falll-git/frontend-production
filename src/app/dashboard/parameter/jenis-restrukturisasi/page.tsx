"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { restructuringTypeParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function JenisRestrukturisasiPage() {
  return <ParameterMasterPage config={restructuringTypeParameterConfig} />;
}
