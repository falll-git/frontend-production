"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { depositTypeParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function SetupJenisTitipanPage() {
  return <ParameterMasterPage config={depositTypeParameterConfig} />;
}
