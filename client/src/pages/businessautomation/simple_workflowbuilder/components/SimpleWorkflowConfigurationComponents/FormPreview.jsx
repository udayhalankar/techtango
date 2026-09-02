import React from "react";

import SimpleWorkflowViewForm from
  "./SimpleWorkflowViewForm";


export default function FormPreview({
  header,

  local,

  previewFields,

  formValues,

  setFormValues,
}) {

  return (
    <SimpleWorkflowViewForm
      header={header}

      step={local}

      previewFields={
        previewFields
      }

      formValues={
        formValues
      }

      setFormValues={
        setFormValues
      }
    />
  );

}


//below blocked since render form is parked
// import React from "react";
// import SimpleWorkflowFormViews from "../SimpleWorkflowFormViews";

// export default function FormPreview({
//   header,
//   local,
//   previewFields,
//   setActiveFormLayout,
//   renderSection,
//   formValues,
//   setFormValues,
// }) {
//   return (
//     <SimpleWorkflowFormViews
//       header={header}
//       step={local}
//       previewFields={previewFields}
//       onSelectLayout={(layout) => setActiveFormLayout(layout)}
//       renderSection={renderSection}
//       formValues={formValues}
//       setFormValues={setFormValues}
//     />
//   );
// }
