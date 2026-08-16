import React from "react";
import DescriptionIcon from "@mui/icons-material/Description";
import DynamicFormIcon from "@mui/icons-material/DynamicForm";
import TableChartIcon from "@mui/icons-material/TableChart";
import StorageIcon from "@mui/icons-material/Storage";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ManageHistoryIcon from "@mui/icons-material/ManageHistory";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import WebAssetOutlinedIcon from "@mui/icons-material/WebAssetOutlined";
import ModuleTileGrid from "../../components/ModuleTileGrid";

const tiles = [
  {
    label: "Experience Builder",
    desc: "Create Pages",
    to: "/experiencebuilder",
    Icon: StorageIcon,
  },
  {
    label: "Entity Data Model Builder",
    desc: "Build reusable schemas and keep your data structures consistent",
    to: "/datatablebuilder",
    Icon: StorageIcon,
  },
  {
    label: "Data Application Builder",
    desc: "Build full data-driven applications without coding",
    to: "/crudwebpage",
    Icon: WebAssetOutlinedIcon,
  },
  {
    label: "AI App Builder",
    desc: "Create one-page CRUD apps from AI-generated schema",
    to: "/aiappbuilder",
    Icon: WebAssetOutlinedIcon,
  },
  {
    label: "Workflow Studio",
    desc: "Streamline Business Form Workflows, Design and Deploy Workflows with a level of ease never experienced before",
    to: "/simplewfb",
    Icon: WebAssetOutlinedIcon,
  },
  {
    label: "Dashboard Studio",
    desc: "Create Dashboards to Vusualize Enterprise Processes",
    to: "/dashboardbuilder",
    Icon: WebAssetOutlinedIcon,
  },
  {
    label: "Forms",
    desc: "Create Business Forms",
    to: "/forms",
    Icon: DescriptionIcon,
  },
  {
    label: "Report Builder",
    desc: "Create Report using Database tables",
    to: "/tables",
    Icon: TableChartIcon,
  },
  {
    label: "Chart Builder",
    desc: "Build charts & dashboards",
    to: "/charts/new",
    Icon: AutoGraphIcon,
  },
  {
    label: "SmartForms",
    desc: "Build forms faster",
    to: "/sbforms",
    Icon: DynamicFormIcon,
  },
  {
    label: "Workflows",
    desc: "Manage assignments",
    to: "/wfassignments",
    Icon: AccountTreeIcon,
  },
  {
    label: "Workflow Manager",
    desc: "Manage & monitor flows",
    to: "/workflowmanager",
    Icon: ManageHistoryIcon,
  },
  {
    label: "Workflow Manager (Alt)",
    desc: "Alternate manager route",
    to: "/wfmanager",
    Icon: PrecisionManufacturingIcon,
  },
  {
    label: "Workflow Designer",
    desc: "Design flows visually",
    to: "/wfdesigner",
    Icon: DesignServicesIcon,
  },
  {
    label: "Workflow Designer (Compat)",
    desc: "Legacy/compat editor",
    to: "/workflow-designer",
    Icon: IntegrationInstructionsIcon,
  },
  {
    label: "Workflow Library",
    desc: "Reusable templates",
    to: "/wflibrary",
    Icon: LibraryBooksIcon,
  },
  {
    label: "Bulk Uploader",
    desc: "Import CSV/Excel",
    to: "/bulkuploader",
    Icon: UploadFileIcon,
  },
];

export default function BusinessAutomation() {
  return (
    <ModuleTileGrid
      title="Business Automation"
      subtitle="Streamline business form creation, workflow automation, and gain insights through reports, charts, and dashboards."
      titleBarColor="#1f355d"
      searchEnabled
      searchPlaceholder="Search business automation"
      tiles={tiles}
      tilesPerRow={{ xs: 1, sm: 2, md: 4, lg: 4 }}
      maxRows={5}
      containerMaxWidth="lg"
    />
  );
}
