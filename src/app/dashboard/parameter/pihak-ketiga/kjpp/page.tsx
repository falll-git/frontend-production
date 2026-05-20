"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { kjppParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function SetupKjppPage() {
  return <ParameterMasterPage config={kjppParameterConfig} />;
}
