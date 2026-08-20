import type { PaginationMeta } from "@/types/api.types";

export type ActivityCentreOption = {
  value: string;
  label: string;
};

export type ActivityCentreActorOption = ActivityCentreOption & {
  username: string | null;
  role: string | null;
  division: string | null;
};

export type ActivityCentreActor = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: { id: string; name: string } | null;
  division: { id: string; name: string } | null;
};

export type ActivityCentreLog = {
  id: string;
  actor_id: string | null;
  actor: ActivityCentreActor | null;
  module: string;
  module_label: string;
  action: string;
  action_label: string;
  created_at: string;
};

export type ActivityCentreDetailField = {
  key: string;
  label: string;
  value: string;
};

export type ActivityCentreDetailContext = {
  kind:
    | "AUTH"
    | "IMPORT"
    | "EXPORT"
    | "DOCUMENT"
    | "WORKFLOW"
    | "ACCESS"
    | "PARAMETER"
    | "CHANGE"
    | "GENERAL";
  title: string;
  fields: ActivityCentreDetailField[];
  changed_fields: string[];
  target_path: string | null;
  target_label: string | null;
};

export type ActivityCentreDetail = ActivityCentreLog & {
  title: string | null;
  summary: string | null;
  result_label: string;
  result_tone: "emerald" | "red" | "slate";
  context: ActivityCentreDetailContext;
};

export type ActivityCentreSummaryItem = ActivityCentreOption & {
  total: number;
};

export type ActivityCentreSummary = {
  total: number;
  modules: ActivityCentreSummaryItem[];
  actions: ActivityCentreSummaryItem[];
};

export type ActivityCentreOptions = {
  modules: ActivityCentreOption[];
  actions: ActivityCentreOption[];
  actors: ActivityCentreActorOption[];
};

export type ActivityCentreQuery = {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
  action?: string;
  actor_id?: string;
  date_from?: string;
  date_to?: string;
  sort?: "newest" | "oldest";
};

export type ActivityCentreListResult = {
  items: ActivityCentreLog[];
  meta: PaginationMeta;
};
