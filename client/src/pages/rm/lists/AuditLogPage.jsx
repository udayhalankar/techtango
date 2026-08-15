import React from "react";
import RMListPage from "../components/RMListPage";
export default function AuditLogPage() {
  return (
    <RMListPage
      title="Audit Log"
      endpoint="/api/rm/audit-log"
      columns={[
        { key: "action", label: "Action" },
        { key: "entity_type", label: "Entity" },
        { key: "entity_id", label: "Entity Id" },
        { key: "ts", label: "When" },
      ]}
      fields={[
        { key: "action", label: "Action", lockOnEdit: true },
        { key: "entity_type", label: "Entity", lockOnEdit: true },
        { key: "entity_id", label: "Entity Id", lockOnEdit: true },
        { key: "before", label: "Before", lockOnEdit: true },
        { key: "after", label: "After", lockOnEdit: true },
      ]}
    />
  );
}
