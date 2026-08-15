import DashboardCustomizeOutlinedIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import SchemaOutlinedIcon from "@mui/icons-material/SchemaOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import SettingsSuggestOutlinedIcon from "@mui/icons-material/SettingsSuggestOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";

const fallbackIcons = [
  ExtensionOutlinedIcon,
  PublicOutlinedIcon,
  DescriptionOutlinedIcon,
  EventAvailableOutlinedIcon,
  FolderOutlinedIcon,
  AccountTreeOutlinedIcon,
  SettingsSuggestOutlinedIcon,
  TableChartOutlinedIcon,
  CloudOutlinedIcon,
  PersonSearchOutlinedIcon,
  WorkOutlineOutlinedIcon,
  StorageOutlinedIcon,
];

function hashName(value = "") {
  const text = String(value).toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getModuleIconByName(name = "") {
  const n = String(name).toLowerCase().trim();

  if (n === "business automation") return DashboardCustomizeOutlinedIcon;
  if (n === "approvals") return ManageAccountsOutlinedIcon;
  if (n === "dashboard") return SpaceDashboardOutlinedIcon;
  if (n === "workflow assignments") return RuleOutlinedIcon;
  if (n === "rms") return StorageOutlinedIcon;

  if (n.includes("workflow")) return RuleOutlinedIcon;
  if (n.includes("form")) return InsertDriveFileOutlinedIcon;
  if (n.includes("chart") || n.includes("report")) return QueryStatsOutlinedIcon;
  if (n.includes("entity") || n.includes("model") || n.includes("schema")) return SchemaOutlinedIcon;
  if (n.includes("security") || n.includes("access")) return SecurityOutlinedIcon;
  if (n.includes("approval")) return ManageAccountsOutlinedIcon;
  if (n.includes("dashboard")) return SpaceDashboardOutlinedIcon;

  return fallbackIcons[hashName(n) % fallbackIcons.length];
}
