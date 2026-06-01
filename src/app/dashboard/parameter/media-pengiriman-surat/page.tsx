"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { mailDeliveryMediaParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function MediaPengirimanSuratPage() {
  return <ParameterMasterPage config={mailDeliveryMediaParameterConfig} />;
}
