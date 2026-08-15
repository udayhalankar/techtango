import React from "react";
import RMListPage from "../components/RMListPage";
export default function LocationsPage() {
  return (
    <RMListPage
      title="Locations"
      endpoint="/api/rm/locations"
      columns={[
        { key: "facility", label: "Facility" },
        { key: "room", label: "Room" },
        { key: "shelf", label: "Shelf" },
      ]}
      fields={[
        // { key: "tenant_id", label: "Tenant Id", type: "number", lockOnEdit: true },
        { key: "facility", label: "Facility", lockOnEdit: true },
        { key: "room", label: "Room" },
        { key: "aisle", label: "Aisle" },
        { key: "bay", label: "Bay" },
        { key: "shelf", label: "Shelf" },
        { key: "bin", label: "Bin" },
        { key: "barcode", label: "Barcode" },
        { key: "is_active", label: "Active", type: "boolean" },
      ]}
    />
  );
}
