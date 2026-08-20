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
    iconColor: "#0f766e",
  },
  {
    label: "Entity Data Model Builder",
    desc: "Build reusable schemas and keep your data structures consistent",
    to: "/datatablebuilder",
    Icon: StorageIcon,
    iconColor: "#7c3aed",
  },
  {
    label: "Data Application Builder",
    desc: "Build full data-driven applications without coding",
    to: "/crudwebpage",
    Icon: WebAssetOutlinedIcon,
    iconColor: "#ea580c",
  },
  {
    label: "AI App Builder",
    desc: "Create one-page CRUD apps from AI-generated schema",
    to: "/aiappbuilder",
    Icon: WebAssetOutlinedIcon,
    iconColor: "#2563eb",
  },
  {
    label: "Workflow Studio",
    desc: "Streamline Business Form Workflows, Design and Deploy Workflows with a level of ease never experienced before",
    to: "/simplewfb",
    Icon: WebAssetOutlinedIcon,
    iconColor: "#be185d",
  },
  {
    label: "Dashboard Studio",
    desc: "Create Dashboards to Vusualize Enterprise Processes",
    to: "/dashboardbuilder",
    Icon: WebAssetOutlinedIcon,
    iconColor: "#0891b2",
  },
  {
    label: "Bulk Uploader",
    desc: "Import CSV/Excel",
    to: "/bulkuploader",
    Icon: UploadFileIcon,
    iconColor: "#b45309",
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
      maxRows={2}
      containerMaxWidth="lg"
    />
  );
}
