// src/pages/public/LandingPage.jsx
import React, { useEffect } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import DashboardCustomizeOutlinedIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import SchemaOutlinedIcon from "@mui/icons-material/SchemaOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import { useTranslation } from "react-i18next";
import logo from "../../components/navbar/ttlogo.png";
import dashboardPic from "./dashboard2.jpg";

const offeringCards = [
  {
    title: "Experience Builder",
    icon: BoltOutlinedIcon,
    description:
      "Create guided experiences, configure page layouts, and publish polished page views with preview support and access controls.",
    bullets: ["Draft pages fast", "Preview before publish", "Control visibility"],
  },
  {
    title: "Dashboard Studio",
    icon: DashboardCustomizeOutlinedIcon,
    description:
      "Design dashboards with data-backed widgets, layouts, charts, and interactive filters for operational visibility.",
    bullets: ["Chart and table widgets", "Custom layouts", "Data-driven insights"],
  },
  {
    title: "Entity Data Model Builder",
    icon: SchemaOutlinedIcon,
    description:
      "Define reusable schemas and data structures that keep your application data consistent and maintainable.",
    bullets: ["Reusable entities", "Structured metadata", "Consistent models"],
  },
  {
    title: "Workflow Studio",
    icon: RuleOutlinedIcon,
    description:
      "Automate business processes with configurable steps, approvals, assignments, and workflow routing.",
    bullets: ["Process automation", "Approval gates", "Assignment routing"],
  },
  {
    title: "Forms",
    icon: InsertDriveFileOutlinedIcon,
    description:
      "Build business forms for data capture, intake, and operational workflows without recreating the same patterns.",
    bullets: ["Fast form creation", "Reusable field patterns", "Business-ready UX"],
  },
  {
    title: "Chart Builder",
    icon: QueryStatsOutlinedIcon,
    description:
      "Turn data into charts and visual summaries that can be embedded in dashboards and operational pages.",
    bullets: ["Visual analytics", "Multiple chart types", "Database-driven"],
  },
];

const capabilityCards = [
  {
    title: "Security and governance",
    text:
      "Access remains tied to authenticated users and tenant context, with draft and published views separated by design.",
    icon: SecurityOutlinedIcon,
  },
  {
    title: "Faster delivery",
    text:
      "Teams can configure pages, dashboards, forms, and workflows from one platform instead of stitching tools together.",
    icon: RocketLaunchOutlinedIcon,
  },
  {
    title: "Reusable patterns",
    text:
      "Layouts, widgets, and data models are reusable, so the platform scales without creating one-off implementations.",
    icon: CheckCircleOutlineOutlinedIcon,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/home", { replace: true });
  }, [navigate]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb", color: "#152238" }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{ bgcolor: "#ffffff", color: "#152238", borderBottom: "1px solid #d8dde7" }}
      >
        <Toolbar disableGutters sx={{ minHeight: 80 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              minHeight: 80,
              width: "100%",
              px: "10px",
            }}
          >
            <Box
              sx={{
                width: 180,
                height: 48,
                flexShrink: 0,
                backgroundImage: `url(${logo})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "left center",
                backgroundSize: "100% auto",
              }}
            />

            <Stack
              direction="row"
              spacing={3}
              sx={{ display: { xs: "none", md: "flex" }, fontWeight: 700, flexShrink: 0 }}
            >
              <Link underline="none" color="inherit" href="#offerings">
                Offerings
              </Link>
              <Link underline="none" color="inherit" href="#capabilities">
                Capabilities
              </Link>
              <Link underline="none" color="inherit" href="#security">
                Security
              </Link>
            </Stack>

            <Box sx={{ flexGrow: 1 }} />

            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              sx={{ textTransform: "none", borderRadius: 999, px: 2.5 }}
            >
              {t("login", "Log in")}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          background: "linear-gradient(135deg, #1f355d 0%, #203a67 55%, #243e72 100%)",
          color: "#ffffff",
          pt: { xs: 6, md: 9 },
          pb: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip
                label="Unified business automation platform"
                sx={{
                  bgcolor: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontWeight: 700,
                  mb: 2,
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: -0.8,
                  mb: 2,
                  fontSize: { xs: 40, md: 58 },
                }}
              >
                Build pages, dashboards, forms, and workflows in one place.
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 400,
                  color: "#e5edf8",
                  maxWidth: 780,
                  lineHeight: 1.6,
                  mb: 3,
                }}
              >
                Augmis gives teams a structured way to create configurable pages,
                publish experiences, visualize data, and automate business processes with less
                manual effort.
              </Typography>

              <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardOutlinedIcon />}
                  sx={{
                    textTransform: "none",
                    borderRadius: 999,
                    px: 3,
                    bgcolor: "#2f7dd6",
                    boxShadow: "0 10px 18px rgba(0,0,0,0.18)",
                  }}
                >
                  Get started
                </Button>
                <Button
                  href="#offerings"
                  variant="outlined"
                  size="large"
                  sx={{
                    textTransform: "none",
                    borderRadius: 999,
                    px: 3,
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.45)",
                  }}
                >
                  Explore offerings
                </Button>
              </Stack>

              <Stack direction="row" spacing={1.5} sx={{ mt: 4, flexWrap: "wrap" }}>
                {["Authenticated access", "Preview and publish", "Tenant-aware design"].map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ position: "relative", minHeight: { xs: 320, md: 440 } }}>
                <Paper
                  elevation={0}
                  sx={{
                    position: "absolute",
                    inset: { xs: 30, md: 20 },
                    borderRadius: 4,
                    bgcolor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    backdropFilter: "blur(10px)",
                  }}
                />
                <Box
                  component="img"
                  src={dashboardPic}
                  alt="Dashboard preview"
                  sx={{
                    position: "absolute",
                    inset: { xs: 26, md: 18 },
                    width: "calc(100% - 36px)",
                    height: "calc(100% - 36px)",
                    objectFit: "cover",
                    borderRadius: 4,
                    opacity: 1,
                    filter: "none",
                    pointerEvents: "none",
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Grid container spacing={2}>
          {[
            { value: "6+", label: "Core builders", sub: "Pages, dashboards, forms, workflows and more" },
            { value: "1", label: "Unified platform", sub: "One experience for creation and delivery" },
            { value: "100%", label: "Tenant-aware", sub: "Designed for controlled access and isolation" },
            { value: "Fast", label: "Draft to publish", sub: "Preview, refine, and release confidently" },
          ].map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid #d8e1f2",
                  bgcolor: "#ffffff",
                  boxShadow: "0 8px 18px rgba(17, 39, 87, 0.06)",
                }}
              >
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: "#1a4fd8" }}>
                  {stat.value}
                </Typography>
                <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{stat.label}</Typography>
                <Typography sx={{ fontSize: 13, color: "#51607d", mt: 0.5 }}>{stat.sub}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box id="offerings" sx={{ py: { xs: 6, md: 8 }, bgcolor: "#eef2fb" }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ color: "#1a4fd8", fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>
              Offerings
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: "#152238" }}>
              What the platform lets you build
            </Typography>
            <Typography sx={{ mt: 1.5, maxWidth: 860, color: "#51607d", lineHeight: 1.7 }}>
              Each module is designed for a different layer of the enterprise stack, from user-facing
              pages to data models and process automation.
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {offeringCards.map((card) => {
              const Icon = card.icon;
              return (
                <Grid item xs={12} sm={6} md={4} key={card.title}>
                  <Paper
                    elevation={0}
                    sx={{
                      height: "100%",
                      p: 2.5,
                      borderRadius: 3,
                      border: "1px solid #d8e1f2",
                      bgcolor: "#ffffff",
                      boxShadow: "0 8px 18px rgba(17, 39, 87, 0.06)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "rgba(47,125,214,0.1)",
                        color: "#1a4fd8",
                        mb: 2,
                      }}
                    >
                      <Icon />
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, color: "#1a4fd8" }}>
                      {card.title}
                    </Typography>
                    <Typography sx={{ mt: 1, color: "#51607d", lineHeight: 1.7 }}>
                      {card.description}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {card.bullets.map((bullet) => (
                        <Box key={bullet} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16, color: "#2f7dd6" }} />
                          <Typography sx={{ fontSize: 13, color: "#152238" }}>{bullet}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Box id="capabilities" sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#152238", mb: 1 }}>
            Built for delivery teams
          </Typography>
          <Typography sx={{ maxWidth: 820, color: "#51607d", mb: 3, lineHeight: 1.7 }}>
            The platform is designed to keep the development surface consistent while still allowing
            users to configure and publish rich experiences.
          </Typography>

          <Grid container spacing={2}>
            {capabilityCards.map((item) => {
              const Icon = item.icon;
              return (
                <Grid item xs={12} md={4} key={item.title}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: "1px solid #d8e1f2",
                      bgcolor: "#ffffff",
                      boxShadow: "0 8px 18px rgba(17, 39, 87, 0.06)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: "rgba(47,125,214,0.1)",
                          color: "#1a4fd8",
                        }}
                      >
                        <Icon />
                      </Box>
                      <Typography sx={{ fontWeight: 800, color: "#152238" }}>{item.title}</Typography>
                    </Box>
                    <Typography sx={{ mt: 1.5, color: "#51607d", lineHeight: 1.7 }}>
                      {item.text}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Box id="security" sx={{ bgcolor: "#1f355d", color: "#fff", py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Security and separation are built in.
              </Typography>
              <Typography sx={{ mt: 1.5, color: "#e2eaf6", lineHeight: 1.8, maxWidth: 780 }}>
                Draft pages, previews, and published pages are handled as separate states. Published
                content stays within authenticated app routes and respects the page status model,
                so you can control what becomes visible and when.
              </Typography>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <Stack spacing={1.25}>
                  {[
                    "Authenticated routes for published content",
                    "Preview isolated from live draft editing",
                    "Tenant-aware backend architecture",
                    "Status-driven page lifecycle",
                  ].map((item) => (
                    <Box key={item} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 18, color: "#8fd1ff" }} />
                      <Typography sx={{ color: "#ffffff", fontSize: 14 }}>{item}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ bgcolor: "#f5f7fb", py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography variant="h4" sx={{ fontWeight: 900, color: "#152238" }}>
            Explore the platform and start building.
          </Typography>
          <Typography sx={{ mt: 1.5, color: "#51607d", maxWidth: 760, mx: "auto", lineHeight: 1.7 }}>
            Log in to access the builders, configure your pages, and move from draft to published
            with a controlled workflow.
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
            sx={{
              mt: 3,
              px: 4,
              py: 1.25,
              textTransform: "none",
              borderRadius: 999,
              bgcolor: "#2f7dd6",
              boxShadow: "0 10px 18px rgba(17,39,87,0.18)",
            }}
          >
            Go to Login
          </Button>
        </Container>
      </Box>

      <Divider />
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="body2">
            {t("footer_left", "© Augmis")} {new Date().getFullYear()}
          </Typography>
          <Typography variant="body2">Manage information effortlessly</Typography>
        </Stack>
      </Container>
    </Box>
  );
}
