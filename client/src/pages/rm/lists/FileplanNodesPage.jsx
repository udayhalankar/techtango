//src/rm/fileplan/FileplanNodesPage.jsx
import React from "react";
import RMListPage from "../components/RMListPage";


// Schema for CREATE / PATCH (drives ConfigModal)
const fileplanSchema = [
  { key: "code",        label: "Code",  lockOnEdit: true },
  { key: "title",       label: "Title", lockOnEdit: true },
  { key: "description", label: "Description" },
  {
    key: "retention_policy_id",
    label: "Retention Policy",
    type: "select-remote",
    url: "/api/rm/retention-policies?page=1&pageSize=500&sortBy=code&sortDir=asc",
    valueProp: "id",
    labelProp: (p) => `${p.code ?? ""} ${p.name ?? p.policy_name ?? ""}`.trim(), // tolerate either column
    allowNone: true,     // shows “— None —”
    coerce: "int|null",  // ""/0 -> null, number -> int
  },
  { key: "order_no",    label: "Order", type: "number", coerce: "int" },
];

export default function FileplanNodesPage() {
  return (
    <RMListPage
      title="Fileplan Nodes"
      endpoint="/api/rm/fileplan-nodes"
      columns={[
        { key: "code",  label: "Code" },
        { key: "title", label: "Title" },
        // Table shows the id by default; if you want a name here too,
        // add it to your list API or enhance RMListPage to look up labels.
        { key: "retention_policy_name", label: "Retention Policy" },
      ]}
      fields={fileplanSchema}
    />
  );
}


// import React from "react";
// import RMListPage from "../components/RMListPage";

// export default function FileplanNodesPage() {
//   return (
//     <RMListPage
//       title="Fileplan Nodes"
//       endpoint="/api/rm/fileplan-nodes"
//       columns={[
//         { key: "code", label: "Code" },
//         { key: "title", label: "Title" },
//         { key: "retention_policy_id", label: "Retention Policy" },
//       ]}
//       fields={[
//         // { key: "tenant_id", label: "Tenant Id", type: "number", lockOnEdit: true },
//         { key: "code", label: "Code", lockOnEdit: true },
//         { key: "title", label: "Title", lockOnEdit: true },
//         { key: "description", label: "Description" },
//         { key: "retention_policy_id", label: "Retention Policy Id", type: "number" },
//         { key: "order_no", label: "Order", type: "number" },
//       ]}
//     />
//   );
// }
