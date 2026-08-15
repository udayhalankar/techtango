// src/rm/metadatacategories/MetadataCategoriesPage.jsx
import React from "react";
import RMListPage from "../components/RMListPage";
import MetadataCategoryModal from "../components/MetadataCategoryModal";

export default function MetadataCategoriesPage() {
  return (
    <RMListPage
      title="Metadata Categories"
      endpoint="/api/rm/metadata-categories"
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "is_active", label: "Active" },
      ]}
      fields={[]}                    // not used by custom modal
      ModalComponent={(props) => (
        <MetadataCategoryModal
          {...props}
          title="Metadata Category"
          endpoint="/api/rm/metadata-categories"
        />
      )}
    />
  );
}


// import React from "react";
// import RMListPage from "../components/RMListPage";
// export default function MetadataCategoriesPage() {
//   return (
//     <RMListPage
//       title="Metadata Categories"
//       endpoint="/api/rm/metadata-categories"
//       columns={[
//         { key: "code", label: "Code" },
//         { key: "name", label: "Name" },
//         { key: "is_active", label: "Active" },
//       ]}
//       fields={[
//         // { key: "tenant_id", label: "Tenant Id", type: "number" , lockOnEdit: true },
//         { key: "code", label: "Code", lockOnEdit: true },
//         { key: "name", label: "Name", lockOnEdit: true },
//         { key: "description", label: "Description" },
//         { key: "is_active", label: "Active", type: "boolean" },
//       ]}
//     />
//   );
// }
