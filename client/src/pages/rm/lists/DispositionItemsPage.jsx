import React from "react";
import RMListPage from "../components/RMListPage";
export default function DispositionItemsPage() {
  return (
    <RMListPage
      title="Disposition Items"
      endpoint="/api/rm/disposition-items"
      columns={[
        { key: "batch_id", label: "Batch" },
        { key: "record_id", label: "Record" },
        { key: "proposed_action", label: "Action" },
      ]}
      fields={[
        { key: "batch_id", label: "Batch Id", type: "number", lockOnEdit: true },
        { key: "record_id", label: "Record Id", type: "number", lockOnEdit: true },
        { key: "proposed_action", label: "Proposed Action" },
        { key: "eligible_on", label: "Eligible On" },
      ]}
    />
  );
}
