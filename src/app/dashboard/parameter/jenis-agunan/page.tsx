"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { collateralTypeParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function JenisAgunanPage() {
  return <ParameterMasterPage config={collateralTypeParameterConfig} />;
}
