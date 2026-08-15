import React from "react";
import RMListPage from "../components/RMListPage";
export default function HoldRecordsPage() {
  return (
    <RMListPage
      title="Hold Records"
      endpoint="/api/rm/hold-records"
      columns={[
        { key: "hold_id", label: "Hold" },
        { key: "record_id", label: "Record" },
      ]}
      fields={[
        { key: "hold_id", label: "Hold Id", type: "number", lockOnEdit: true },
        { key: "record_id", label: "Record Id", type: "number", lockOnEdit: true },
      ]}
    />
  );
}
