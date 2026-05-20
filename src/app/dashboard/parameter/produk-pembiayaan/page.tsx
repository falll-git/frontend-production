"use client";

import ParameterMasterPage from "@/components/parameter/ParameterMasterPage";
import { financingProductParameterConfig } from "@/components/parameter/parameterMasterConfigs";

export default function SetupProdukPembiayaanPage() {
  return <ParameterMasterPage config={financingProductParameterConfig} />;
}
