// src/pages/home/Home.js
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ModuleModal from "./ModuleModal";
import "./home.scss";
import api from "../../services/api";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from "react-i18next";

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  InputAdornment,
  Stack,
  Paper,
  Chip,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import OutboxOutlinedIcon from "@mui/icons-material/OutboxOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import { getModuleIconByName } from "./moduleIcons";

export default function Home() {
  const token = localStorage.getItem("token");
  const [firstname, setFirstname] = useState("");
  const { t } = useTranslation();
  const [homeInsights, setHomeInsights] = useState({
    directInbox: 0,
    workflowInbox: 0,
    outbox: 0,
    overdue: 0,
    recentActivity: [],
  });

  useEffect(() => {
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setFirstname(decoded.firstname || "");
    } catch {
      /* noop */
    }
  }, [token]);

  // --- modules & "last used" ranking ----------------------------------------
  const [modules, setModules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/subscription/subscriptions");
        setModules(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch subscriptions", err);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const safeDate = (value) => {
      const date = value ? new Date(value) : null;
      return date && !Number.isNaN(date.getTime()) ? date : null;
    };

    const relativeTime = (value) => {
      const date = safeDate(value);
      if (!date) return "-";
      const diffMs = Date.now() - date.getTime();
      const minutes = Math.max(1, Math.floor(diffMs / 60000));
      if (minutes < 60) return `${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hr ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
      return date.toLocaleDateString();
    };

    const isOverdue = (value) => {
      const date = safeDate(value);
      if (!date) return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date < now;
    };

    const loadHomeInsights = async () => {
      try {
        const [approvalsInboxRes, approvalsOutboxRes, workflowInboxRes, workflowOutboxRes] = await Promise.all([
          api.get("/approvals/inbox"),
          api.get("/approvals/outbox"),
          api.get("/simple_workflow_instances", { params: { box: "inbox" } }),
          api.get("/simple_workflow_instances", { params: { box: "outbox" } }),
        ]);

        if (cancelled) return;

        const approvalsInbox = Array.isArray(approvalsInboxRes.data) ? approvalsInboxRes.data : [];
        const approvalsOutbox = Array.isArray(approvalsOutboxRes.data) ? approvalsOutboxRes.data : [];
        const workflowInbox = Array.isArray(workflowInboxRes.data) ? workflowInboxRes.data : [];
        const workflowOutbox = Array.isArray(workflowOutboxRes.data) ? workflowOutboxRes.data : [];

        const recentActivity = [
          ...approvalsInbox.slice(0, 3).map((item) => ({
            id: `approval-inbox-${item.id}`,
            title: item.title || "Direct assignment",
            subtitle: "Direct Assignments · Inbox",
            when: item.created_at || item.due_date,
            Icon: AssignmentOutlinedIcon,
          })),
          ...approvalsOutbox.slice(0, 3).map((item) => ({
            id: `approval-outbox-${item.id}`,
            title: item.title || "Direct assignment",
            subtitle: "Direct Assignments · Outbox",
            when: item.created_at || item.due_date,
            Icon: OutboxOutlinedIcon,
          })),
          ...workflowInbox.slice(0, 3).map((item) => ({
            id: `workflow-inbox-${item.id}`,
            title: item.workflow_map_name || item.workflow_name || "Workflow item",
            subtitle: `Workflow Assignments · ${item.step_name || "Inbox"}`,
            when: item.step_assigned_date || item.date_created,
            Icon: AccountTreeOutlinedIcon,
          })),
          ...workflowOutbox.slice(0, 3).map((item) => ({
            id: `workflow-outbox-${item.id}`,
            title: item.workflow_map_name || item.workflow_name || "Workflow item",
            subtitle: `Workflow Outbox · ${item.step_name || "Item"}`,
            when: item.step_assigned_date || item.date_created,
            Icon: OutboxOutlinedIcon,
          })),
        ]
          .filter((item) => item.when)
          .sort((a, b) => new Date(b.when) - new Date(a.when))
          .slice(0, 4)
          .map((item) => ({
            ...item,
            timeLabel: relativeTime(item.when),
          }));

        const overdueCount =
          approvalsInbox.filter((item) => isOverdue(item.due_date)).length +
          workflowInbox.filter((item) => isOverdue(item.step_due_date)).length;

        setHomeInsights({
          directInbox: approvalsInbox.length,
          workflowInbox: workflowInbox.length,
          outbox: approvalsOutbox.length + workflowOutbox.length,
          overdue: overdueCount,
          recentActivity,
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch home insights", error);
          setHomeInsights((prev) => ({ ...prev, recentActivity: [] }));
        }
      }
    };

    if (token) {
      loadHomeInsights();
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  const usageKey = "appUsage";
  const onAppClick = (mod) => {
    try {
      const usage = JSON.parse(localStorage.getItem(usageKey) || "{}");
      const key = String(mod.module_id || mod.module_name);
      usage[key] = Date.now();
      localStorage.setItem(usageKey, JSON.stringify(usage));
    } catch {}
  };

  const visibleModules = useMemo(() => {
    const usage = JSON.parse(localStorage.getItem(usageKey) || "{}");
    const filtered = modules.filter((m) => {
      if (!query) return true;
      const hay = `${m.module_name ?? ""} ${m.description ?? ""}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });
    const scored = filtered
      .map((m) => ({
        ...m,
        _score: usage[String(m.module_id || m.module_name)] || 0,
      }))
      .sort((a, b) => b._score - a._score);
    return scored.slice(0, 8);
  }, [modules, query]);

  // --- tiles -----------------------------------------------------------------
  const AppTile = ({ mod }) => {
    const ModuleIcon = getModuleIconByName(mod.module_name);
    const moduleRoute =
      mod.module_name === "Workflow Assignments" ? "/workflowassign" : mod.route || "#";
    return (
      <Card
        variant="outlined"
        sx={{
          height: "100%",
          height: 180,
          minHeight: 180,
          maxHeight: 180,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#ffffff",
          border: "1px solid #cdd8ef",
          borderRadius: 3,
          boxShadow: "0 12px 24px rgba(17, 39, 87, 0.08)",
          transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 18px 30px rgba(17, 39, 87, 0.12)",
            borderColor: "#8fb1ef",
          },
        }}
      >
        <CardActionArea
          component={Link}
          to={moduleRoute}
          onClick={() => onAppClick(mod)}
          sx={{ height: "100%", alignItems: "flex-start", flexGrow: 1 }}
          disabled={!moduleRoute || moduleRoute === "#"}
        >
          <CardContent sx={{ p: 2.25, height: "100%", display: "flex", flexDirection: "column" }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(47,125,214,0.1)",
              color: "#1a4fd8",
              mb: 1.5,
            }}
          >
            <ModuleIcon />
            </Box>
            <Typography variant="subtitle1" fontWeight={500} sx={{ color: "#1a4fd8", mb: 0.75 }} noWrap>
              {mod.module_name}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                lineHeight: 1.7,
                flexGrow: 1,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {mod.description || "Launch and manage this module from the home hub."}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 2, color: "#2f7dd6" }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Open module</Typography>
              <ArrowForwardIosIcon sx={{ fontSize: 12 }} />
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  };

  const AddTile = () => (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
         height: 180,
         minHeight: 180,
         maxHeight: 180,
        display: "flex",
        flexDirection: "column",
        borderStyle: "dashed",
        borderColor: "#a9c1ea",
        bgcolor: "rgba(255,255,255,0.72)",
        borderRadius: 3,
        boxShadow: "0 12px 24px rgba(17, 39, 87, 0.08)",
        backdropFilter: "blur(10px)",
        "&:hover": {
          boxShadow: "0 18px 30px rgba(17, 39, 87, 0.12)",
          borderColor: "#2f7dd6",
        },
      }}
    >
      <CardActionArea
        onClick={() => setShowModal(true)}
        sx={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          p: 2.5,
        }}
      >
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: "rgba(47,125,214,0.12)",
            color: "#1a4fd8",
            mb: 1.25,
          }}
        >
          <AddIcon sx={{ fontSize: 30 }} />
        </Box>
        <Typography fontWeight={500} color="#1a4fd8">
          {t("add_new_subscription", "Add New Subscription")}
        </Typography>
        <Typography
          sx={{
            mt: 0.75,
            color: "#51607d",
            fontSize: 13,
            maxWidth: 220,
            textAlign: "center",
          }}
        >
          Open the module catalog and add more business applications.
        </Typography>
      </CardActionArea>
    </Card>
  );

  const myWorkTodayStats = [
    { label: "Assignments", value: homeInsights.directInbox, Icon: AssignmentOutlinedIcon },
    { label: "Workflows", value: homeInsights.workflowInbox, Icon: AccountTreeOutlinedIcon },
    { label: "Outbox", value: homeInsights.outbox, Icon: OutboxOutlinedIcon },
    { label: "Overdue", value: homeInsights.overdue, Icon: WarningAmberOutlinedIcon },
  ];

  const myWorkCards = [
    {
      title: "Direct Assignments",
      subtitle: "Work currently assigned to you",
      count: homeInsights.directInbox,
      Icon: AssignmentOutlinedIcon,
    },
    {
      title: "Workflow Assignments",
      subtitle: "Workflow items awaiting action",
      count: homeInsights.workflowInbox,
      Icon: AccountTreeOutlinedIcon,
    },
    {
      title: "Outbox Items",
      subtitle: "Items you created or sent",
      count: homeInsights.outbox,
      Icon: OutboxOutlinedIcon,
    },
    {
      title: "Overdue",
      subtitle: "Items needing immediate attention",
      count: homeInsights.overdue,
      Icon: WarningAmberOutlinedIcon,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f4f7fd",
        color: "#152238",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 12% 0%, rgba(47,125,214,0.12), transparent 24%), radial-gradient(circle at 88% 15%, rgba(119,195,106,0.12), transparent 20%), linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0))",
          pointerEvents: "none",
        },
      }}
    >
      <Box
        sx={{
          background: "linear-gradient(135deg, #1f355d 0%, #203a67 55%, #243e72 100%)",
          color: "#fff",
          mt: "-16px",
          pt: { xs: "36px", md: "44px" },
          pb: { xs: "36px", md: "44px" },
          // pt: { xs: "92px", md: "108px" },
          // pb: { xs: 5, md: 7 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="flex-end">
            <Grid item xs={12} md={7}>
              <Chip
                label="Unified business workspace"
                sx={{
                  bgcolor: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontWeight: 500,
                  border: "1px solid rgba(255,255,255,0.16)",
                  mb: 2,
                }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 500,
                  fontSize: { xs: "36px", md: "42px" },
                  lineHeight: 1.05,
                  mb: 1.5,
                }}
              >
                Welcome{firstname ? `, ${firstname}` : ""}.
              </Typography>
              <Typography
                sx={{
                  color: "#e5edf8",
                  maxWidth: 860,
                  lineHeight: 1.5,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Launch your business applications from one polished workspace. Search apps, open
                them quickly, and keep recent work close at hand.
              </Typography>
              <TextField
                size="small"
                placeholder={t("search", "Search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{
                  mt: 3,
                  width: { xs: "100%", md: 520 },
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#ffffff",
                    borderRadius: 999,
                    boxShadow: "0 10px 22px rgba(17,39,87,0.06)",
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: "flex", alignItems: "flex-end" }}>
              <Stack spacing={2} sx={{ width: "100%" }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.25,
                    borderRadius: 3,
                    bgcolor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Typography sx={{ color: "#cfe1ff", fontSize: 12, fontWeight: 500 }}>
                    MY WORK TODAY
                  </Typography>
                  <Grid container spacing={1.25} sx={{ mt: 0.25 }}>
                    {myWorkTodayStats.map(({ label, value, Icon }) => (
                      <Grid item xs={6} sm={3} md={6} lg={3} key={label}>
                        <Box
                          sx={{
                            p: 1.4,
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            minHeight: 88,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                          }}
                        >
                          <Icon sx={{ fontSize: 18, color: "#e5edf8" }} />
                          <Typography sx={{ color: "#fff", fontWeight: 500, fontSize: 24, lineHeight: 1.1 }}>
                            {value}
                          </Typography>
                          <Typography sx={{ color: "#d6e2f2", fontSize: 11, fontWeight: 500 }}>
                            {label}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 5 }, pb: 8, position: "relative", zIndex: 1 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 500, color: "#152238" }}>
              Applications
            </Typography>
            <Typography sx={{ color: "#51607d", mt: 0.5 }}>
              Search, launch, and manage the modules you use most.
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={2.5}>
          {visibleModules.length === 0 ? (
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid #d8e1f2",
                  bgcolor: "#ffffff",
                  boxShadow: "0 12px 24px rgba(17, 39, 87, 0.07)",
                }}
              >
                <Typography color="text.secondary">
                  {query
                    ? t("no_apps_match", "No applications match your search.")
                    : t("no_subscriptions", "You have no active subscriptions.")}
                </Typography>
              </Paper>
            </Grid>
          ) : (
            visibleModules.map((m) =>
              m.route ? (
                <Grid item xs={12} sm={6} md={4} lg={3} key={m.subscription_id}>
                  <AppTile mod={m} />
                </Grid>
              ) : null
            )
          )}

          <Grid item xs={12} sm={6} md={4} lg={3}>
            <AddTile />
          </Grid>
        </Grid>

        <Grid container spacing={2.5} sx={{ mt: 1.5, alignItems: "stretch" }}>
          <Grid item xs={12} md={8}>
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid #d8e1f2",
                bgcolor: "#ffffff",
                boxShadow: "0 12px 24px rgba(17, 39, 87, 0.07)",
              }}
              >
                <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 2.5, py: 2, borderBottom: "1px solid #e7edf6" }}
              >
                <Typography sx={{ fontWeight: 500, color: "#152238", fontSize: 20 }}>
                  Recent Activity
                </Typography>
                <Typography sx={{ color: "#2f7dd6", fontWeight: 700, fontSize: 13 }}>
                  Live feed
                </Typography>
              </Stack>
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {homeInsights.recentActivity.length === 0 ? (
                  <Typography sx={{ px: 2.5, py: 2.5, color: "#51607d" }}>
                    No recent activity available.
                  </Typography>
                ) : (
                  homeInsights.recentActivity.map((item, index) => {
                    const Icon = item.Icon || HistoryOutlinedIcon;
                    return (
                      <Stack
                        key={item.id}
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{
                          flex: 1,
                          px: 2.5,
                          py: 1.8,
                          borderBottom: index === homeInsights.recentActivity.length - 1 ? "0" : "1px solid #edf1f6",
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: "#f1f5fb",
                            color: "#1a4fd8",
                            flex: "0 0 auto",
                          }}
                        >
                          <Icon sx={{ fontSize: 20 }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontWeight: 500, color: "#152238", fontSize: 14 }}>
                            {item.title}
                          </Typography>
                          <Typography sx={{ color: "#6b7c93", fontSize: 12 }}>
                            {item.subtitle}
                          </Typography>
                        </Box>
                        <Typography sx={{ color: "#7b8798", fontSize: 12, flex: "0 0 auto" }}>
                          {item.timeLabel}
                        </Typography>
                      </Stack>
                    );
                  })
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid #d8e1f2",
                bgcolor: "#ffffff",
                boxShadow: "0 12px 24px rgba(17, 39, 87, 0.07)",
              }}
              >
                <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 2.5, py: 2, borderBottom: "1px solid #e7edf6" }}
              >
                <Typography sx={{ fontWeight: 500, color: "#152238", fontSize: 20 }}>
                  My Work
                </Typography>
                <Typography sx={{ color: "#2f7dd6", fontWeight: 700, fontSize: 13 }}>
                  Today
                </Typography>
              </Stack>
              <Stack spacing={1.5} sx={{ p: 2, flex: 1 }}>
                {myWorkCards.map(({ title, subtitle, count, Icon }) => (
                  <Box
                    key={title}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      border: "1px solid #e1e8f4",
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: "#fbfcfe",
                    }}
                  >
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "#f1f5fb",
                        color: "#1a4fd8",
                        flex: "0 0 auto",
                      }}
                    >
                      <Icon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 500, color: "#152238", fontSize: 14 }}>
                        {title}
                      </Typography>
                      <Typography sx={{ color: "#6b7c93", fontSize: 12 }}>
                        {subtitle}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        minWidth: 28,
                        height: 28,
                        px: 1,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 999,
                        bgcolor: "#eef4ff",
                        color: "#2f7dd6",
                        fontWeight: 800,
                        fontSize: 12,
                        flex: "0 0 auto",
                      }}
                    >
                      {count}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Module Picker Modal */}
      {showModal && <ModuleModal onClose={() => setShowModal(false)} />}
    </Box>
  );
}




// // src/pages/home/Home.js
// import React, { useEffect, useMemo, useState } from "react";
// import { Link } from "react-router-dom";
// import ModuleModal from "./ModuleModal";
// import "./home.scss";
// import api from "../../services/api";
// import { jwtDecode } from "jwt-decode";

// import {
//   Box,
//   Container,
//   Typography,
//   Card,
//   CardContent,
//   CardActionArea,
//   TextField,
//   InputAdornment,
// } from "@mui/material";
// import AddIcon from "@mui/icons-material/Add";
// import SearchIcon from "@mui/icons-material/Search";

// export default function Home() {
//   // --- user + last login -----------------------------------------------------
//   const token = localStorage.getItem("token");
//   const [firstname, setFirstname] = useState("");
//   const [lastLogin, setLastLogin] = useState("");

//   useEffect(() => {
//     if (!token) return;
//     try {
//       const decoded = jwtDecode(token);
//       setFirstname(decoded.firstname || "");
//       const raw =
//         decoded.last_login ||
//         decoded.lastLogin ||
//         localStorage.getItem("lastLogin");
//       if (raw) {
//         const d = new Date(raw);
//         setLastLogin(isNaN(d.getTime()) ? String(raw) : d.toDateString());
//       }
//     } catch { /* noop */ }
//   }, [token]);

//   // --- modules & "last used" ranking ----------------------------------------
//   const [modules, setModules] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const [query, setQuery] = useState("");

//   // Outer left/right margins for the page sections (Welcome + Applications)
//   const APP_MX = { xs: 0, md: 6, lg: 6 };

//   // Inner left/right padding INSIDE the Applications block.
//   // Keep this equal to the bordered block's p.x so the header aligns with the first tile.
//   const APP_INNER_PX = { xs: 2, md: 3 };

//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await api.get("/subscription/subscriptions");
//         setModules(Array.isArray(res.data) ? res.data : []);
//       } catch (err) {
//         console.error("Failed to fetch subscriptions", err);
//       }
//     })();
//   }, []);

//   const usageKey = "appUsage";
//   const onAppClick = (mod) => {
//     try {
//       const usage = JSON.parse(localStorage.getItem(usageKey) || "{}");
//       const key = String(mod.module_id || mod.module_name);
//       usage[key] = Date.now();
//       localStorage.setItem(usageKey, JSON.stringify(usage));
//     } catch {}
//   };

//   const visibleModules = useMemo(() => {
//     const usage = JSON.parse(localStorage.getItem(usageKey) || "{}");
//     const filtered = modules.filter((m) => {
//       if (!query) return true;
//       const hay = `${m.module_name ?? ""} ${m.description ?? ""}`.toLowerCase();
//       return hay.includes(query.toLowerCase());
//     });
//     const scored = filtered
//       .map((m) => ({
//         ...m,
//         _score: usage[String(m.module_id || m.module_name)] || 0,
//       }))
//       .sort((a, b) => b._score - a._score);
//     return scored.slice(0, 9);
//   }, [modules, query]);

//   // --- tiles -----------------------------------------------------------------
//   const AppTile = ({ mod }) => (
//     <Card
//       variant="outlined"
//       sx={{
//         height: 120,
//         bgcolor: "transparent",
//         borderColor: "divider",
//         borderRadius: 2,
//         boxShadow: 1, // subtle shadow
//         transition: "transform .12s ease, box-shadow .12s ease",
//         "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
//       }}
//     >
//       <CardActionArea
//         component={Link}
//         to={mod.route || "#"}
//         onClick={() => onAppClick(mod)}
//         sx={{ height: "100%", alignItems: "flex-start" }}
//         disabled={!mod.route}
//       >
//         <CardContent sx={{ p: 2 }}>
//           <Typography variant="subtitle1" fontWeight={700} noWrap>
//             {mod.module_name}
//           </Typography>
//           <Typography variant="body2" color="text.secondary" noWrap>
//             {mod.description || "—"}
//           </Typography>
//         </CardContent>
//       </CardActionArea>
//     </Card>
//   );

//   const AddTile = () => (
//     <Card
//       variant="outlined"
//       sx={{
//         height: 120,
//         borderStyle: "dashed",
//         borderColor: "divider",
//         bgcolor: "transparent",
//         borderRadius: 2,
//         boxShadow: 1,
//         "&:hover": { boxShadow: 3 },
//       }}
//     >
//       <CardActionArea
//         onClick={() => setShowModal(true)}
//         sx={{
//           height: "100%",
//           display: "grid",
//           placeItems: "center",
//           textAlign: "center",
//           p: 2,
//         }}
//       >
//         <AddIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
//         <Typography fontWeight={700} color="primary">
//           Add New <br /> Subscription
//         </Typography>
//       </CardActionArea>
//     </Card>
//   );

//   return (
//     <Container maxWidth="xl" sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
//       {/* Greeting */}
//       <Box sx={{ mx: APP_MX }}>
//         <Typography variant="h6" gutterBottom sx={{ color: "primary.dark" }}>
//           Welcome{firstname ? `, ${firstname}` : ""}!
//         </Typography>
//       </Box>

//       {/* Hero headline */}
//       <Box sx={{ textAlign: "center", mt: 6, mb: 6 }}>
//         <Typography
//           variant="h3"
//           sx={{ fontWeight: 800, letterSpacing: 0.2, color: "warning.dark" }}
//         >
//           Manage Information
//           <br />
//           Effortlessly
//         </Typography>
//       </Box>

//       {/* Header + Search (outside the bordered block, aligned via APP_INNER_PX) */}
//       <Box
//         sx={{
//           display: "flex",
//           mx: APP_MX,
//           px: APP_INNER_PX, // <-- aligns with grid inside bordered block
//           alignItems: "center",
//           gap: 3,
//           justifyContent: "space-between",
//           mb: 2,
//         }}
//       >
//         <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
//           Applications
//         </Typography>

//         <TextField
//           size="small"
//           placeholder="Search"
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           sx={{ width: { xs: "100%", sm: 320 } }}
//           InputProps={{
//             startAdornment: (
//               <InputAdornment position="start">
//                 <SearchIcon fontSize="small" />
//               </InputAdornment>
//             ),
//           }}
//         />
//       </Box>

//       {/* Applications block with border and inner padding */}
//       <Box
//         sx={{
//           mx: APP_MX,
//           mt: 2,
//           border: "1px solid",
//           borderColor: "divider",
//           borderRadius: 2,
//           p: { xs: 2, md: 3 },
//           bgcolor: "background.paper",
//         }}
//       >
//         {/* EXACTLY 5 tiles per row (desktop) */}
//         <Box
//           sx={{
//             display: "grid",
//             gap: 2,
//             gridTemplateColumns: {
//               xs: "1fr",
//               sm: "repeat(2, 1fr)",
//               md: "repeat(3, 1fr)",
//               lg: "repeat(5, 1fr)",
//               xl: "repeat(5, 1fr)",
//             },
//           }}
//         >
//           {visibleModules.length === 0 ? (
//             <Typography color="text.secondary" sx={{ gridColumn: "1/-1" }}>
//               {query
//                 ? "No applications match your search."
//                 : "You have no active subscriptions."}
//             </Typography>
//           ) : (
//             visibleModules.map((m) =>
//               m.route ? <AppTile key={m.subscription_id} mod={m} /> : null
//             )
//           )}

//           {/* Big Add/Remove tile appears as part of row 2 */}
//           <AddTile />
//         </Box>
//       </Box>

//       {/* Last login (bottom-right) */}
//       {lastLogin && (
//         <Box
//           sx={{
//             position: "fixed",
//             right: 16,
//             bottom: 12,
//             color: "text.secondary",
//             fontSize: 13,
//           }}
//         >
//           Your last login was on <strong>{lastLogin}</strong>
//         </Box>
//       )}

//       {/* Module Picker Modal */}
//       {showModal && <ModuleModal onClose={() => setShowModal(false)} />}
//     </Container>
//   );
// }



// // // src/pages/home/Home.js
// // import React, { useEffect, useMemo, useState } from "react";
// // import { Link } from "react-router-dom";
// // import ModuleModal from "./ModuleModal";
// // import "./home.scss";
// // import api from "../../services/api";
// // import { jwtDecode } from "jwt-decode";

// // import {
// //   Box,
// //   Container,
// //   Typography,
// //   Card,
// //   CardContent,
// //   CardActionArea,
// //   TextField,
// //   InputAdornment,
// // } from "@mui/material";
// // import AddIcon from "@mui/icons-material/Add";
// // import SearchIcon from "@mui/icons-material/Search";

// // export default function Home() {
// //   // --- user + last login -----------------------------------------------------
// //   const token = localStorage.getItem("token");
// //   const [firstname, setFirstname] = useState("");
// //   const [lastLogin, setLastLogin] = useState("");

// //   useEffect(() => {
// //     if (!token) return;
// //     try {
// //       const decoded = jwtDecode(token);
// //       setFirstname(decoded.firstname || "");
// //       const raw =
// //         decoded.last_login ||
// //         decoded.lastLogin ||
// //         localStorage.getItem("lastLogin");
// //       if (raw) {
// //         const d = new Date(raw);
// //         setLastLogin(isNaN(d.getTime()) ? String(raw) : d.toDateString());
// //       }
// //     } catch { /* noop */ }
// //   }, [token]);

// //   // --- modules & "last used" ranking ----------------------------------------
// //   const [modules, setModules] = useState([]);
// //   const [showModal, setShowModal] = useState(false);
// //   const [query, setQuery] = useState("");
// //   const APP_MX = { xs: 0, md: 6, lg: 6 }; 

// //   useEffect(() => {
// //     (async () => {
// //       try {
// //         const res = await api.get("/subscription/subscriptions");
// //         setModules(Array.isArray(res.data) ? res.data : []);
// //       } catch (err) {
// //         console.error("Failed to fetch subscriptions", err);
// //       }
// //     })();
// //   }, []);

// //   const usageKey = "appUsage";
// //   const onAppClick = (mod) => {
// //     try {
// //       const usage = JSON.parse(localStorage.getItem(usageKey) || "{}");
// //       const key = String(mod.module_id || mod.module_name);
// //       usage[key] = Date.now();
// //       localStorage.setItem(usageKey, JSON.stringify(usage));
// //     } catch {}
// //   };

// //   const visibleModules = useMemo(() => {
// //     const usage = JSON.parse(localStorage.getItem(usageKey) || "{}");
// //     const filtered = modules.filter((m) => {
// //       if (!query) return true;
// //       const hay = `${m.module_name ?? ""} ${m.description ?? ""}`.toLowerCase();
// //       return hay.includes(query.toLowerCase());
// //     });
// //     const scored = filtered
// //       .map((m) => ({
// //         ...m,
// //         _score: usage[String(m.module_id || m.module_name)] || 0,
// //       }))
// //       .sort((a, b) => b._score - a._score);
// //     return scored.slice(0, 9);
// //   }, [modules, query]);

// //   // --- tiles -----------------------------------------------------------------
// //   const AppTile = ({ mod }) => (
// //     <Card
// //         variant="outlined"
// //         sx={{
// //           height: 120,
// //           bgcolor: "transparent",
// //           borderColor: "divider",
// //           borderRadius: 2,
// //           boxShadow: 1,                 // subtle shadow
// //           transition: "transform .12s ease, box-shadow .12s ease",
// //           "&:hover": { transform: "translateY(-2px)", boxShadow: 3 }, // lift a bit on hover
// //         }}
// //       >
// //       <CardActionArea
// //         component={Link}
// //         to={mod.route || "#"}
// //         onClick={() => onAppClick(mod)}
// //         sx={{ height: "100%", alignItems: "flex-start" }}
// //         disabled={!mod.route}
// //       >
// //         <CardContent sx={{ p: 2 }}>
// //           <Typography variant="subtitle1" fontWeight={700} noWrap>
// //             {mod.module_name}
// //           </Typography>
// //           <Typography variant="body2" color="text.secondary" noWrap>
// //             {mod.description || "—"}
// //           </Typography>
// //         </CardContent>
// //       </CardActionArea>
// //     </Card>
// //   );

// //   const AddTile = () => (
// //     <Card
// //       variant="outlined"
// //       sx={{
// //         height: 120,
// //         borderStyle: "dashed",
// //         borderColor: "divider",
// //         bgcolor: "transparent",
// //         borderRadius: 2,
// //         boxShadow: 1,
// //         "&:hover": { boxShadow: 3 },
// //       }}
// //     >
// //       <CardActionArea
// //         onClick={() => setShowModal(true)}
// //         sx={{
// //           height: "100%",
// //           display: "grid",
// //           placeItems: "center",
// //           textAlign: "center",
// //           p: 2,
// //         }}
// //       >
// //         <AddIcon color="primary" sx={{ fontSize: 32, mb: 1 } } />
// //         <Typography fontWeight={700} color="blue">Add New <br/>Subscription</Typography>
// //         {/* <Typography variant="caption" color="text.secondary">
// //           Subscription
// //         </Typography> */}
// //       </CardActionArea>
// //     </Card>
// //   );

// //   return (
// //     <Container maxWidth="xl" sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
// //       {/* Greeting */}
// //       <Box sx={{ mx: APP_MX }}>
// //         <Typography variant="h6" gutterBottom sx={{ color: "primary.dark" }}>
// //           Welcome{firstname ? `, ${firstname}` : ""}!
// //         </Typography>
// //       </Box>

// //       {/* Hero headline */}
// //       <Box sx={{ textAlign: "center", mt: 6, mb: 6 }}>
// //         <Typography
// //           variant="h3"
// //           sx={{ fontWeight: 800, letterSpacing: 0.2, color: "warning.dark" }}
// //         >
// //           Manage Information
// //           <br />
// //           Effortlessly
// //         </Typography>
// //       </Box>

// //       {/* === Applications block with left/right margin + thin border === */}

// //  {/* Header + Search */}
// //       <Box
// //           sx={{
// //             display: "flex",
// //             mx: APP_MX,  
// //             alignItems: "center",
// //             gap: 3,
// //             justifyContent: "space-between",
// //             mb: 2,
// //           }}
// //         >
// //           <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
// //             Applications
// //           </Typography>

// //           <TextField
// //             size="small"
// //             placeholder="Search"
// //             value={query}
// //             onChange={(e) => setQuery(e.target.value)}
// //             sx={{ width: { xs: "100%", sm: 320 } }}
// //             InputProps={{
// //               startAdornment: (
// //                 <InputAdornment position="start">
// //                   <SearchIcon fontSize="small" />
// //                 </InputAdornment>
// //               ),
// //             }}
// //           />
// //         </Box>

// //       <Box
// //           sx={{
// //             mx: APP_MX,              // <-- same margin as Welcome
// //             mt: 2,
// //             border: "1px solid",
// //             borderColor: "divider",
// //             borderRadius: 2,
// //             p: { xs: 2, md: 3 },
// //             bgcolor: "background.paper",
// //           }}
// //         >
       
        

// //         {/* EXACTLY 5 tiles per row (desktop) */}
// //         <Box
// //           sx={{
// //             display: "grid",
// //             gap: 2,
// //             // Responsive columns; lg+ = exactly 5 per row
// //             gridTemplateColumns: {
// //               xs: "1fr",
// //               sm: "repeat(2, 1fr)",
// //               md: "repeat(3, 1fr)",
// //               lg: "repeat(5, 1fr)",
// //               xl: "repeat(5, 1fr)",
// //             },
// //           }}
// //         >
// //           {visibleModules.length === 0 ? (
// //             <Typography color="text.secondary" sx={{ gridColumn: "1/-1" }}>
// //               {query
// //                 ? "No applications match your search."
// //                 : "You have no active subscriptions."}
// //             </Typography>
// //           ) : (
// //             visibleModules.map((m) =>
// //               m.route ? <AppTile key={m.subscription_id} mod={m} /> : null
// //             )
// //           )}

// //           {/* Big Add/Remove tile appears as part of row 2 */}
// //           <AddTile />
// //         </Box>
// //       </Box>

// //       {/* Last login (bottom-right) */}
// //       {lastLogin && (
// //         <Box
// //           sx={{
// //             position: "fixed",
// //             right: 16,
// //             bottom: 12,
// //             color: "text.secondary",
// //             fontSize: 13,
// //           }}
// //         >
// //           Your last login was on <strong>{lastLogin}</strong>
// //         </Box>
// //       )}

// //       {/* Module Picker Modal */}
// //       {showModal && <ModuleModal onClose={() => setShowModal(false)} />}
// //     </Container>
// //   );
// // }


// // // src/pages/home/Home.js
// // import React, { useRef, useEffect, useState } from "react";
// // import { Link } from "react-router-dom";
// // import ModuleModal from "./ModuleModal";
// // import "./home.scss";
// // import api from "../../services/api";
// // import { jwtDecode } from "jwt-decode";
// // import Enquiries from "../enquiries/Enquiries";
// // import HomeLayout from "../../layout/HomeLayout"


// // import {
// //   Box,
// //   Container,
// //   Typography,
// //   Button,
// //   Grid,
// //   Card,
// //   CardContent,
// //   IconButton,
// //   Table,
// //   TableHead,
// //   TableRow,
// //   TableCell,
// //   TableBody,
// // } from "@mui/material";
// // import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";

// // // Or globally via your theme:
// // import { createTheme } from '@mui/material/styles';

// // const theme = createTheme({
// //   components: {
// //     MuiCard: {
// //       styleOverrides: {
// //         root: {
// //           borderColor: '#424242',  // equivalent to grey.700
// //           borderWidth: '1px',
// //           borderStyle: 'solid',
// //           boxShadow: 'none',
// //         },
// //       },
// //     },
// //     MuiBox: {
// //       styleOverrides: {
// //         root: {
// //           borderColor: '#424242',
// //           borderWidth: '1px',
// //           borderStyle: 'solid',
// //         },
// //       },
// //     },
// //   },
// // });

// // export default function Home() {
// //   const token = localStorage.getItem("token");
// //   let firstname = "";
// //   if (token) {
// //     try {
// //       firstname = jwtDecode(token).firstname;
// //     } catch {}
// //   }

// //   const sliderRef = useRef();
// //   const [modules, setModules] = useState([]);
// //   const [showModal, setShowModal] = useState(false);

// //   useEffect(() => {
// //     api
// //       .get("/subscription/subscriptions")
// //       .then((res) => setModules(res.data))
// //       .catch((err) => console.error(err));
// //   }, []);

// //   const scrollLeft = () =>
// //     sliderRef.current?.scrollBy({ left: -300, behavior: "smooth" });
// //   const scrollRight = () =>
// //     sliderRef.current?.scrollBy({ left: 300, behavior: "smooth" });

// //   const meetings = [
// //     { date: "15 Nov 2024", agenda: "Discuss Multiple Items." },
// //     { date: "22 Nov 2024", agenda: "Discuss Multiple Items." },
// //     { date: "27 Nov 2024", agenda: "Discuss Multiple Items." },
// //   ];

// //   // Reduced vertical padding and font size 3px smaller
// //   const headerSx = { backgroundColor: 'primary.main', color: '#fff', px: 1, py: 0.5 };
// //   const headerTextSx = { fontSize: '0.875rem' }; // approx 14px

// //   return (
// //     <Container maxWidth="lg" disableGutters sx={{ px: 2, py: 2 }}>
// //       {/* Greeting */}
// //       <Typography variant="h6" gutterBottom>
// //         Welcome{firstname ? `, ${firstname}` : ""}!
// //       </Typography>

// //       {/* News & Notifications */}
// //       <Grid container spacing={2} mb={2}>
// //         <Grid item xs={12} md={8}>
// //           <Card variant="outlined" sx={{ minHeight: 280 }}>
// //             <Box sx={headerSx}>
// //               <Typography variant="subtitle1" sx={headerTextSx}>
// //                 NEWS UPDATES
// //               </Typography>
// //             </Box>
// //             <CardContent sx={{ pt: 2 }}>
// //               {/* News content */}
// //               <Button
// //         variant="contained"
// //         color="primary"
// //         component={Link}
// //         to="/forms"
// //         sx={{ mt: 2 }}
// //       >
// //         Open Form Views
// //       </Button>

// //       <br></br>
// //       <Button
// //         variant="contained"
// //         color="primary"
// //         component={Link}
// //         to="/bulkuploader"
// //         sx={{ mt: 2 }}
// //       >
// //         Bulk Uploader
// //       </Button>
      
      
    

// //       <br></br>
// //       <Button
// //         variant="contained"
// //         color="primary"
// //         component={Link}
// //         to="/HomeLayout"
// //         sx={{ mt: 2 }}
// //       >
// //         Home Layout (Tables, Forms, Charts, UI Creator)
// //       </Button>

// //             </CardContent>
// //           </Card>
// //         </Grid>
// //         <Grid item xs={12} md={4}>
// //           <Card variant="outlined" sx={{ minHeight: 280 }}>
// //             <Box sx={headerSx}>
// //               <Typography variant="subtitle1" sx={headerTextSx}>
// //                 NOTIFICATIONS
// //               </Typography>
// //             </Box>
// //             <CardContent sx={{ pt: 2 }}>
// //               <Table size="small">
// //                 <TableHead>
// //                   <TableRow>
// //                     <TableCell>Date</TableCell>
// //                     <TableCell>Agenda</TableCell>
// //                   </TableRow>
// //                 </TableHead>
// //                 <TableBody>
// //                   {meetings.map((m) => (
// //                     <TableRow key={m.date}>
// //                       <TableCell>{m.date}</TableCell>
// //                       <TableCell>{m.agenda}</TableCell>
// //                     </TableRow>
// //                   ))}
// //                 </TableBody>
// //               </Table>
// //             </CardContent>
// //           </Card>
// //         </Grid>
// //       </Grid>

// //       {/* Applications Slider */}
// //       <Box display="flex" alignItems="center" mb={1}>
// //         <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
// //           APPLICATIONS
// //         </Typography>
// //         <Button variant="contained" onClick={() => setShowModal(true)} size="small">
// //           ADD / REMOVE
// //         </Button>
// //       </Box>
// //       <Box position="relative" mb={2}>
// //         <IconButton
// //           onClick={scrollLeft}
// //           sx={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
// //         >
// //           <ArrowBackIos fontSize="small" />
// //         </IconButton>
// //         <Box
// //           ref={sliderRef}
// //           sx={{
// //             display: 'flex',
// //             gap: 1,
// //             overflowX: 'hidden',
// //             scrollBehavior: 'smooth',
// //           }}
// //         >
// //           {modules.length === 0 ? (
// //             <Typography color="text.secondary">You have no active subscriptions.</Typography>
// //           ) : (
// //             modules.map((mod) =>
// //               mod.route ? (
// //                 <Card key={mod.subscription_id} variant="outlined" sx={{ minWidth: 150 }}>
// //                   <CardContent>
// //                     <Link to={mod.route} style={{ textDecoration: 'none', color: 'inherit' }}>
// //                       <Typography variant="subtitle1" noWrap>
// //                         {mod.module_name}
// //                       </Typography>
// //                       <Typography variant="body2" noWrap>
// //                         {mod.description}
// //                       </Typography>
// //                     </Link>
// //                   </CardContent>
// //                 </Card>
// //               ) : null
// //             )
// //           )}
// //         </Box>
// //         <IconButton
// //           onClick={scrollRight}
// //           sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
// //         >
// //           <ArrowForwardIos fontSize="small" />
// //         </IconButton>
// //       </Box>

// //       {/* Placeholders */}
// //       <Grid container spacing={1}>
// //         {Array.from({ length: 3 }).map((_, i) => (
// //           <Grid item xs={12} md={4} key={i}>
// //             <Card variant="outlined" sx={{ minHeight: 160 }}>
// //               <Box sx={headerSx}>
// //                 <Typography variant="subtitle1" sx={headerTextSx}>
// //                   PLACEHOLDER
// //                 </Typography>
// //               </Box>
// //               <CardContent sx={{ pt: 2 }}>
// //                 {/* Placeholder content */}
                
// //               </CardContent>
// //             </Card>
// //           </Grid>
// //         ))}
// //       </Grid>

// //       {/* Module Picker Modal */}
// //       {showModal && <ModuleModal onClose={() => setShowModal(false)} />}
// //     </Container>
// //   );
// // }
