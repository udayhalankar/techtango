// client/src/pages/businessautomation/simple_workflowbuilder/components/SimpleWorkflowStepModal.jsx
// Dedicated Process/Step modal used by Workflow Map.
// Decision-related fields are intentionally hidden because they are edited
// in SimpleWorkflowDecisionModal.jsx.

import React from "react";
import SimpleWorkflowStepConfigurationModal from "./SimpleWorkflowStepInlineConfiguration";

export default function SimpleWorkflowStepModal(props) {
  return (
    <SimpleWorkflowStepConfigurationModal
      {...props}
      inline={false}
      hideDecisionFields
    />
  );
}