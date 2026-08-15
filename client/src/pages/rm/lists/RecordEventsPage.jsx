import React from "react";
import RMListPage from "../components/RMListPage";

export default function RecordEventsPage() {
  return (
    <RMListPage
      title="Record Events"
      endpoint="/api/rm/record-events"
      columns={[
        { key: "record_id", label: "Record" },
        { key: "type", label: "Type" },
        { key: "event_ts", label: "When" },
      ]}
      fields={[
        // { key: "tenant_id", label: "Tenant Id", type: "number" , lockOnEdit: true },
        { key: "record_id", label: "Record Id", type: "number", lockOnEdit: true },
        { key: "type", label: "Type", lockOnEdit: true },
        { key: "event_ts", label: "Event Time" },
        { key: "data", label: "Data (JSON)" },
      ]}
    />
  );
}
