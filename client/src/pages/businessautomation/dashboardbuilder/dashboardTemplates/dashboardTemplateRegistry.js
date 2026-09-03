import ExecutiveWorkspaceTemplate, {
  EXECUTIVE_WORKSPACE_KEY,
} from "./ExecutiveWorkspaceTemplate";


const DASHBOARD_TEMPLATE_REGISTRY = {

  [EXECUTIVE_WORKSPACE_KEY]:
    ExecutiveWorkspaceTemplate,

};


export function getDashboardTemplate(
  templateKey
) {

  if (!templateKey) {
    return null;
  }


  return (
    DASHBOARD_TEMPLATE_REGISTRY[
      templateKey
    ] || null
  );
}


export function getDashboardTemplates() {

  return Object.values(
    DASHBOARD_TEMPLATE_REGISTRY
  );
}


export default DASHBOARD_TEMPLATE_REGISTRY;