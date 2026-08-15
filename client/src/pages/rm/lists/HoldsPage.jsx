import React from "react";
import RMListPage from "../components/RMListPage";
export default function HoldsPage() {
  return (
    <RMListPage
      title="Holds"
      endpoint="/api/rm/holds"
      columns={[
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
      ]}
      fields={[
        // { key: "tenant_id", label: "Tenant Id", type: "number" , lockOnEdit: true },
        { key: "title", label: "Title", lockOnEdit: true },
        { key: "reason", label: "Reason" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
