// src/pages/businessautomation/BusinessAutomation.jsx
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
} from "@mui/material";

// Icons
import DescriptionIcon from "@mui/icons-material/Description";        // Forms
import DynamicFormIcon from "@mui/icons-material/DynamicForm";        // SmartForms
import TableChartIcon from "@mui/icons-material/TableChart";          // Table Creator
import StorageIcon from "@mui/icons-material/Storage";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";            // Chart Builder
import UploadFileIcon from "@mui/icons-material/UploadFile";          // Bulk Uploader
import AppsIcon from "@mui/icons-material/Apps";                      // UI Creator
import ManageHistoryIcon from "@mui/icons-material/ManageHistory";    // Workflow Manager (new)
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing"; // Workflow Manager (alt)
import DesignServicesIcon from "@mui/icons-material/DesignServices";  // Workflow Designer
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions"; // Compat Designer
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";      // Workflow Library
import AccountTreeIcon from "@mui/icons-material/AccountTree";        // Workflows / Assignments
import BoltIcon from "@mui/icons-material/Bolt";                      // Create Workflow (Modal)
import WebAssetOutlinedIcon from "@mui/icons-material/WebAssetOutlined";

export default function BusinessAutomation() {
  // All tiles for the routes you provided (no :id edit tiles)
  const tiles = [
    {
      label: "Experience Builder",
      desc: "Create Pages",
      to: "/experiencebuilder",
      Icon:  StorageIcon,
    },
    {
      label: "Entity Data Model Builder",
      desc: "Build reusable schemas and keep your data structures consistent",
      to: "/datatablebuilder",
      Icon:  StorageIcon,
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
      label: "Create Workflow (Modal)",
      desc: "Quick create flow",
      to: "/wfmod",
      Icon: BoltIcon,
    },
    {
      label: "Bulk Uploader",
      desc: "Import CSV/Excel",
      to: "/bulkuploader",
      Icon: UploadFileIcon,
    },
    {
      label: "UI Creator",
      desc: "Compose UIs from parts",
      to: "/uicreator",
      Icon: AppsIcon,
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <Box sx={{ bgcolor: "#1f355d", color: "#fff", px: 4, mt: "-65px", pt: "97px", pb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Business Automation
        </Typography>
        {/* <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
          Intelligent automation solutions designed to power digital transformation, fuel growth, and enhance sustainability.
        </Typography> */}
        <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
          Streamline business form creation, workflow automation, and gain insights through reports, charts, and dashboards.
        </Typography>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          // sx={{
          //   maxWidth: 1200,
          //   mx: "auto",
          //   // bgcolor: "#eef2fb",
          //   borderRadius: 2,
          //   p: 3,
          // }}
          display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
            sx={{ gap: 2, flexWrap: 'wrap' }}
        >
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              {tiles.map((t) => (
                <Grid item key={t.to} xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: "#ffffff",
                      color: "#1f355d",
                      border: "1px solid #2f5fff",
                      boxShadow: "0 4px 10px rgba(16, 24, 40, 0.16)",
                      borderRadius: 2,
                      p: 2,
                      minHeight: 160,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 1.5,
                      transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 10px 18px rgba(16, 24, 40, 0.22)",
                        borderColor: "#1a4fd8",
                      },
                    }}
                  >
                    <Box>
                      <Typography
                        component={RouterLink}
                        to={t.to}
                        sx={{
                          fontWeight: 700,
                          fontSize: 16,
                          color: "#1a4fd8",
                          textDecoration: "none",
                          display: "block",
                        }}
                      >
                        {t.label}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#51607d", mt: 1 }}>
                        {t.desc}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "none" }}
                        onClick={() => alert("TODO: Manage access")}
                      >
                        Manage Access
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
