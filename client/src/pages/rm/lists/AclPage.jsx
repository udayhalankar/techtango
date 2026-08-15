import React from "react";
import RMListPage from "../components/RMListPage";
import { safeJson } from "../../../utils/safeJson";
export default function AclPage() {
  return (
    <RMListPage
      title="Acl"
      endpoint="/api/rm/acl"
      columns={[
        { key: "entity_type", label: "Entity" },
        { key: "entity_id", label: "Entity Id" },
        { key: "permission", label: "Permission" },
      ]}
      fields={[
        // { key: "tenant_id", label: "Tenant Id", type: "number" , lockOnEdit: true },
        { key: "entity_type", label: "Entity Type", lockOnEdit: true },
        { key: "entity_id", label: "Entity Id", type: "number", lockOnEdit: true },
        { key: "principal_type", label: "Principal Type" },
        { key: "principal_id", label: "Principal Id", type: "number" },
        { key: "permission", label: "Permission" },
        { key: "grant", label: "Grant", type: "boolean" },
      ]}
    />
  );
}
