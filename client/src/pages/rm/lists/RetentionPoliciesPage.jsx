import React from "react";
import RMListPage from "../components/RMListPage";

export default function RetentionPoliciesPage() {
  return (
    <RMListPage
      title="Retention Policies"
      endpoint="/api/rm/retention-policies"
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Policy Name" },
        { key: "trigger_event", label: "Trigger Event" },
        { key: "period_years", label: "Years" },
        { key: "period_months", label: "Months" },
        { key: "cutoff_on_event", label: "Cutoff Event" },
      ]}
      fields={[
        // { key: "tenant_id", label: "Tenant Id", type: "number", lockOnEdit: false },
        { key: "code", label: "Code", required: true, lockOnEdit: true },
        { key: "name", label: "Name", required: true, lockOnEdit: true },
        { key: "trigger_event", label: "Trigger Event" },
        { key: "period_years", label: "Years", type: "number" },
        { key: "period_months", label: "Months", type: "number" },
        { key: "cutoff_on_event", label: "Cutoff On Event", type: "boolean" },
        { key: "disposition_action", label: "Disposition Action" }, // optional
        { key: "is_default", label: "Default", type: "boolean" },
      ]}
    />
  );
}
