import React from "react";
import RMListPage from "../components/RMListPage";
export default function ClassificationsPage() {
  return (
    <RMListPage
      title="Classifications"
      endpoint="/api/rm/classifications"
      columns={[
        { key: "code", label: "Code" },
        { key: "label", label: "Label" },
        { key: "rank", label: "Rank" },
      ]}
      fields={[
        // { key: "tenant_id", label: "Tenant Id", type: "number" , lockOnEdit: true },
        { key: "code", label: "Code", lockOnEdit: true },
        { key: "label", label: "Label", lockOnEdit: true },
        { key: "description", label: "Description" },
        { key: "rank", label: "Rank", type: "number" },
        { key: "is_default", label: "Default", type: "boolean" },
      ]}
    />
  );
}
