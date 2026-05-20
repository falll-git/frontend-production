"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { numberingTemplateParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function SetupTemplatePenomoranPage() {
  return <ParameterMasterPage config={numberingTemplateParameterConfig} />;
}
