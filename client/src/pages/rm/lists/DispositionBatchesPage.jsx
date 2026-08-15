import React from "react";
import RMListPage from "../components/RMListPage";
export default function DispositionBatchesPage() {
  return (
    <RMListPage
      title="Disposition Batches"
      endpoint="/api/rm/disposition-batches"
      columns={[
        { key: "status", label: "Status" },
        { key: "scheduled_date", label: "Scheduled" },
      ]}
      fields={[
        // { key: "tenant_id", label: "Tenant Id", type: "number" , lockOnEdit: true },
        { key: "status", label: "Status" },
        { key: "scheduled_date", label: "Scheduled Date" },
        { key: "notes", label: "Notes" },
      ]}
    />
  );
}
