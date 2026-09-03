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
  Grid,
  Button,
  IconButton,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import OutboxOutlinedIcon from "@mui/icons-material/OutboxOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";

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

  const [modules, setModules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");

  // ---------------------------------------------------------------------------
  // USER
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      setFirstname(decoded.firstname || "");
    } catch {
      /* noop */
    }
  }, [token]);

  // ---------------------------------------------------------------------------
  // SUBSCRIBED MODULES
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // MY WORK / HOME INSIGHTS
  // ---------------------------------------------------------------------------

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

      if (days < 7) {
        return `${days} day${days === 1 ? "" : "s"} ago`;
      }

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
        const [
          approvalsInboxRes,
          approvalsOutboxRes,
          workflowInboxRes,
          workflowOutboxRes,
        ] = await Promise.all([
          api.get("/approvals/inbox"),
          api.get("/approvals/outbox"),
          api.get("/simple_workflow_instances", {
            params: { box: "inbox" },
          }),
          api.get("/simple_workflow_instances", {
            params: { box: "outbox" },
          }),
        ]);

        if (cancelled) return;

        const approvalsInbox = Array.isArray(approvalsInboxRes.data)
          ? approvalsInboxRes.data
          : [];

        const approvalsOutbox = Array.isArray(approvalsOutboxRes.data)
          ? approvalsOutboxRes.data
          : [];

        const workflowInbox = Array.isArray(workflowInboxRes.data)
          ? workflowInboxRes.data
          : [];

        const workflowOutbox = Array.isArray(workflowOutboxRes.data)
          ? workflowOutboxRes.data
          : [];

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
            title:
              item.workflow_map_name ||
              item.workflow_name ||
              "Workflow item",
            subtitle: `Workflow Assignments · ${
              item.step_name || "Inbox"
            }`,
            when: item.step_assigned_date || item.date_created,
            Icon: AccountTreeOutlinedIcon,
          })),

          ...workflowOutbox.slice(0, 3).map((item) => ({
            id: `workflow-outbox-${item.id}`,
            title:
              item.workflow_map_name ||
              item.workflow_name ||
              "Workflow item",
            subtitle: `Workflow Outbox · ${
              item.step_name || "Item"
            }`,
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
          approvalsInbox.filter((item) =>
            isOverdue(item.due_date)
          ).length +
          workflowInbox.filter((item) =>
            isOverdue(item.step_due_date)
          ).length;

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

          setHomeInsights((prev) => ({
            ...prev,
            recentActivity: [],
          }));
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

  // ---------------------------------------------------------------------------
  // APPLICATION USAGE / SEARCH
  // ---------------------------------------------------------------------------

  const usageKey = "appUsage";

  const onAppClick = (mod) => {
    try {
      const usage = JSON.parse(
        localStorage.getItem(usageKey) || "{}"
      );

      const key = String(
        mod.module_id || mod.module_name
      );

      usage[key] = Date.now();

      localStorage.setItem(
        usageKey,
        JSON.stringify(usage)
      );
    } catch {}
  };

  const visibleModules = useMemo(() => {
    const usage = JSON.parse(
      localStorage.getItem(usageKey) || "{}"
    );

    const filtered = modules.filter((m) => {
      if (!query) return true;

      const hay =
        `${m.module_name ?? ""} ${m.description ?? ""}`.toLowerCase();

      return hay.includes(query.toLowerCase());
    });

    return filtered
      .map((m) => ({
        ...m,
        _score:
          usage[
            String(m.module_id || m.module_name)
          ] || 0,
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 10);
  }, [modules, query]);

  // ---------------------------------------------------------------------------
  // TODO CARDS
  // ---------------------------------------------------------------------------

  const workItems = [
    {
      title: "Direct Assignments",
      subtitle: "Items awaiting your action",
      value: homeInsights.directInbox,
      action: "Open",
      to: "/directassignments",
      Icon: AssignmentOutlinedIcon,
      accent: "#0a6ed1",
      bg: "#eaf3fc",
    },

    {
      title: "Workflow Tasks",
      subtitle: "Workflow assignments",
      value: homeInsights.workflowInbox,
      action: "Review",
      to: "/workflowassign",
      Icon: AccountTreeOutlinedIcon,
      accent: "#6b4eff",
      bg: "#f0edff",
    },

    {
      title: "Outbox",
      subtitle: "Items sent by you",
      value: homeInsights.outbox,
      action: "View",
      to: "/directassignments?tab=outbox",
      Icon: OutboxOutlinedIcon,
      accent: "#17875b",
      bg: "#eaf7f0",
    },

    {
      title: "Overdue",
      subtitle: "Require immediate attention",
      value: homeInsights.overdue,
      action: null,
      Icon: WarningAmberOutlinedIcon,
      accent: "#c64820",
      bg: "#fff0ea",
    },
  ];

  // ---------------------------------------------------------------------------
  // APPLICATION TILE
  // ---------------------------------------------------------------------------

  const AppTile = ({ mod }) => {
    const ModuleIcon =
      getModuleIconByName(mod.module_name);

    const moduleRoute =
      mod.module_name === "Workflow Assignments"
        ? "/workflowassign"
        : mod.route || "#";

    return (
      <Card
        elevation={0}
        sx={{
          height: 150,
          border: "1px solid #d9dfe7",
          borderRadius: "6px",
          bgcolor: "#ffffff",
          transition:
            "all .18s ease",
          "&:hover": {
            borderColor: "#7aaee8",
            boxShadow:
              "0 8px 22px rgba(17,43,77,.10)",
            transform: "translateY(-2px)",
          },
        }}
      >
        <CardActionArea
          component={Link}
          to={moduleRoute}
          onClick={() => onAppClick(mod)}
          disabled={!moduleRoute || moduleRoute === "#"}
          sx={{
            height: "100%",
            alignItems: "stretch",
          }}
        >
          <CardContent
            sx={{
              p: "14px !important",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "6px",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "#eef5fb",
                  color: "#0a6ed1",
                }}
              >
                <ModuleIcon sx={{ fontSize: 20 }} />
              </Box>

              <ArrowForwardIosIcon
                sx={{
                  fontSize: 12,
                  color: "#9aa6b2",
                  mt: 1,
                }}
              />
            </Stack>

            <Typography
              sx={{
                mt: 1.2,
                fontSize: 14,
                fontWeight: 700,
                color: "#223548",
                lineHeight: 1.25,
              }}
              noWrap
            >
              {mod.module_name}
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 11.5,
                color: "#66788a",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
            >
              {mod.description ||
                "Open this business application."}
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            <Typography
              sx={{
                color: "#0a6ed1",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Open application
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  };

  // ---------------------------------------------------------------------------
  // ADD TILE
  // ---------------------------------------------------------------------------

  const AddTile = () => (
    <Card
      elevation={0}
      sx={{
        height: 150,
        border: "1px dashed #9eb8d4",
        borderRadius: "10px",
        bgcolor: "#fafcff",
        "&:hover": {
          borderColor: "#0a6ed1",
          bgcolor: "#f4f9fe",
        },
      }}
    >
      <CardActionArea
        onClick={() => setShowModal(true)}
        sx={{
          height: "100%",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack
          alignItems="center"
          spacing={1}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              bgcolor: "#eaf3fc",
              color: "#0a6ed1",
              display: "grid",
              placeItems: "center",
            }}
          >
            <AddIcon />
          </Box>

          <Typography
            sx={{
              fontSize: 13,
              color: "#0a6ed1",
              fontWeight: 700,
            }}
          >
            Add Application
          </Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Box
      className="augmis-home"
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f6f7",
        color: "#223548",
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          width: {
            xs: "96%",
            md: "92%",
            lg: "90%",
            xl: "88%",
          },
          maxWidth: "1500px",
          mx: "auto",
          py: 3,
        }}
      >
        {/* ================================================================ */}
        {/* SEARCH */}
        {/* ================================================================ */}

        {/* <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2.5,
          }}
        >
          <TextField
            size="small"
            placeholder={t(
              "search",
              "Search applications"
            )}
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            sx={{
              width: {
                xs: "100%",
                sm: 450,
                md: 540,
              },

              "& .MuiOutlinedInput-root": {
                bgcolor: "#ffffff",
                borderRadius: "20px",
                fontSize: 13,
                height: 38,

                "& fieldset": {
                  borderColor: "#d9dfe7",
                },

                "&:hover fieldset": {
                  borderColor: "#b7c5d3",
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{
                      fontSize: 18,
                      color: "#5f7387",
                    }}
                  />
                </InputAdornment>
              ),
            }}
          />
        </Box> */}

        {/* ================================================================ */}
        {/* WELCOME BANNER */}
        {/* ================================================================ */}

        <Paper
          elevation={0}
          sx={{
            minHeight: 118,
            borderRadius: "6px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            px: {
              xs: 2.5,
              md: 4,
            },
            mb: 2.5,

            background:
              "linear-gradient(105deg, #42586b 0%, #2d465d 40%, #405469 100%)",

            "&::after": {
              content: '""',
              position: "absolute",
              right: -40,
              top: -90,
              width: 360,
              height: 260,
              borderRadius: "50%",
              bgcolor:
                "rgba(255,255,255,0.08)",
              transform: "rotate(-12deg)",
            },

            "&::before": {
              content: '""',
              position: "absolute",
              right: 180,
              bottom: -100,
              width: 250,
              height: 180,
              borderRadius: "50%",
              bgcolor:
                "rgba(255,255,255,0.05)",
            },
          }}
        >
          <Box sx={{ zIndex: 1 }}>
            <Typography
              sx={{
                color:
                  "rgba(255,255,255,.78)",
                fontSize: 12,
                mb: 0.5,
              }}
            >
              Your unified digital workplace
            </Typography>

            <Typography
              sx={{
                color: "#fff",
                fontSize: {
                  xs: 24,
                  md: 29,
                },
                fontWeight: 700,
              }}
            >
              Good morning
              {firstname
                ? `, ${firstname}`
                : ""}
            </Typography>

            <Typography
              sx={{
                color:
                  "rgba(255,255,255,.80)",
                fontSize: 13,
                mt: 0.5,
              }}
            >
              Here&apos;s what needs your
              attention today.
            </Typography>
          </Box>
        </Paper>

        {/* ================================================================ */}
        {/* TO DO'S */}
        {/* ================================================================ */}

        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 2,
              md: 2.5,
            },
            mb: 2.5,
            borderRadius: "6px",
            border: "1px solid #e1e5e9",
            bgcolor: "#ffffff",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1.7 }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#223548",
                }}
              >
                To Do&apos;s
              </Typography>

              <Typography
                sx={{
                  fontSize: 11.5,
                  color: "#6a7c8e",
                  mt: 0.2,
                }}
              >
                Items requiring your
                attention
              </Typography>
            </Box>

            <Button
              size="small"
              endIcon={
                <ArrowForwardIosIcon
                  sx={{ fontSize: "10px !important" }}
                />
              }
              sx={{
                textTransform: "none",
                fontSize: 12,
              }}
            >
              View All
            </Button>
          </Stack>

          <Grid container spacing={1.5}>
            {workItems.map(
              ({
                title,
                subtitle,
                 value,
                 action,
                 to,
                 Icon,
                accent,
                bg,
              }) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  lg={3}
                  key={title}
                >
                  <Box
                    sx={{
                      height: 132,
                      border:
                        "1px solid #dfe4ea",
                      borderRadius: "5px",
                      p: 1.5,
                      bgcolor: "#fff",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: "4px",
                            display: "grid",
                            placeItems: "center",
                            bgcolor: bg,
                            color: accent,
                          }}
                        >
                          <Icon
                            sx={{
                              fontSize: 18,
                            }}
                          />
                        </Box>

                        <Box>
                          <Typography
                            sx={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color:
                                "#223548",
                            }}
                          >
                            {title}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 10.5,
                              color:
                                "#728496",
                            }}
                          >
                            {subtitle}
                          </Typography>
                        </Box>
                      </Stack>

                      <IconButton
                        size="small"
                        aria-label={`${title} options`}
                        sx={{
                          p: 0.3,
                          color: "#8a98a6",
                        }}
                      >
                        <MoreHorizIcon
                          sx={{
                            fontSize: 17,
                          }}
                        />
                      </IconButton>
                    </Stack>

                    <Box
                      sx={{
                        flexGrow: 1,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 27,
                          color: accent,
                          fontWeight: 700,
                        }}
                      >
                        {String(value).padStart(
                          2,
                          "0"
                        )}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      justifyContent="flex-end"
                    >
                      {action && (
                        <Button
                          component={Link}
                          to={to}
                          size="small"
                          sx={{
                            minWidth: 58,
                            minHeight: 26,
                            px: 1.2,
                            py: 0.2,
                            fontSize: 10.5,
                            textTransform: "none",
                            borderRadius: "6px",
                            color: accent,
                            bgcolor: bg,
                            "&:hover": {
                              bgcolor: bg,
                            },
                          }}
                        >
                          {action}
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </Grid>
              )
            )}
          </Grid>
        </Paper>

        {/* ================================================================ */}
        {/* APPLICATIONS */}
        {/* ================================================================ */}

        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 2,
              md: 2.5,
            },
            mb: 2.5,
            borderRadius: "6px",
            border: "1px solid #e1e5e9",
            bgcolor: "#ffffff",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1.7 }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <AppsOutlinedIcon
                sx={{
                  color: "#0a6ed1",
                  fontSize: 19,
                }}
              />

              <Box>
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Applications
                </Typography>

                <Typography
                  sx={{
                    color: "#6a7c8e",
                    fontSize: 11.5,
                  }}
                >
                  Your subscribed business
                  applications
                </Typography>
              </Box>
            </Stack>

            <Button
              size="small"
              onClick={() =>
                setShowModal(true)
              }
              sx={{
                textTransform: "none",
                fontSize: 12,
              }}
            >
              Manage Applications
            </Button>
          </Stack>

          <Grid container spacing={1.5}>
            {visibleModules.length === 0 ? (
              <Grid item xs={12}>
                <Box
                  sx={{
                    py: 4,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      color: "#6a7c8e",
                      fontSize: 13,
                    }}
                  >
                    {query
                      ? "No applications match your search."
                      : "You have no active subscriptions."}
                  </Typography>
                </Box>
              </Grid>
            ) : (
              visibleModules.map((m) =>
                m.route ? (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    lg={2}
                    key={m.subscription_id}
                  >
                    <AppTile mod={m} />
                  </Grid>
                ) : null
              )
            )}

            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={2}
            >
              <AddTile />
            </Grid>
          </Grid>
        </Paper>

        {/* ================================================================ */}
        {/* LOWER SECTION */}
        {/* ================================================================ */}

        <Grid
          container
          spacing={2.5}
          alignItems="stretch"
        >
          {/* RECENT ACTIVITY */}

          <Grid item xs={12} lg={8}>
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                borderRadius: "6px",
                border:
                  "1px solid #e1e5e9",
                bgcolor: "#fff",
                overflow: "hidden",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom:
                    "1px solid #edf0f3",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Recent Activity
                </Typography>

                <Typography
                  sx={{
                    fontSize: 11,
                    color: "#0a6ed1",
                    fontWeight: 600,
                  }}
                >
                  Latest
                </Typography>
              </Stack>

              {homeInsights.recentActivity
                .length === 0 ? (
                <Typography
                  sx={{
                    p: 2.5,
                    color: "#6a7c8e",
                    fontSize: 12.5,
                  }}
                >
                  No recent activity
                  available.
                </Typography>
              ) : (
                homeInsights.recentActivity.map(
                  (item, index) => {
                    const Icon =
                      item.Icon ||
                      HistoryOutlinedIcon;

                    return (
                      <Stack
                        key={item.id}
                        direction="row"
                        alignItems="center"
                        spacing={1.4}
                        sx={{
                          px: 2,
                          py: 1.5,
                          borderBottom:
                            index ===
                            homeInsights
                              .recentActivity
                              .length -
                              1
                              ? "none"
                              : "1px solid #edf0f3",
                        }}
                      >
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: "4px",
                            display: "grid",
                            placeItems:
                              "center",
                            bgcolor:
                              "#f0f5fa",
                            color:
                              "#0a6ed1",
                            flex:
                              "0 0 auto",
                          }}
                        >
                          <Icon
                            sx={{
                              fontSize: 18,
                            }}
                          />
                        </Box>

                        <Box
                          sx={{
                            flexGrow: 1,
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            noWrap
                            sx={{
                              fontSize: 12.5,
                              fontWeight: 700,
                            }}
                          >
                            {item.title}
                          </Typography>

                          <Typography
                            noWrap
                            sx={{
                              fontSize: 11,
                              color:
                                "#718395",
                            }}
                          >
                            {
                              item.subtitle
                            }
                          </Typography>
                        </Box>

                        <Typography
                          sx={{
                            fontSize: 10.5,
                            color:
                              "#8593a1",
                            flex:
                              "0 0 auto",
                          }}
                        >
                          {
                            item.timeLabel
                          }
                        </Typography>
                      </Stack>
                    );
                  }
                )
              )}
            </Paper>
          </Grid>

          {/* WORK SUMMARY */}

          <Grid item xs={12} lg={4}>
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                borderRadius: "6px",
                border:
                  "1px solid #e1e5e9",
                bgcolor: "#fff",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom:
                    "1px solid #edf0f3",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  My Work Summary
                </Typography>
              </Box>

              <Stack
                spacing={1}
                sx={{ p: 1.5 }}
              >
                <SummaryRow
                  Icon={
                    CheckCircleOutlineIcon
                  }
                  title="Assignments"
                  value={
                    homeInsights.directInbox
                  }
                  color="#0a6ed1"
                />

                <SummaryRow
                  Icon={
                    AccountTreeOutlinedIcon
                  }
                  title="Workflow"
                  value={
                    homeInsights.workflowInbox
                  }
                  color="#6b4eff"
                />

                <SummaryRow
                  Icon={
                    AccessTimeOutlinedIcon
                  }
                  title="Outbox"
                  value={
                    homeInsights.outbox
                  }
                  color="#17875b"
                />

                <SummaryRow
                  Icon={
                    WarningAmberOutlinedIcon
                  }
                  title="Overdue"
                  value={
                    homeInsights.overdue
                  }
                  color="#c64820"
                />
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {showModal && (
        <ModuleModal
          onClose={() =>
            setShowModal(false)
          }
        />
      )}
    </Box>
  );
}

// ============================================================================
// SUMMARY ROW
// ============================================================================

function SummaryRow({
  Icon,
  title,
  value,
  color,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.2,
        border: "1px solid #e4e8ed",
        borderRadius: "4px",
        px: 1.2,
        py: 1,
      }}
    >
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: "4px",
          bgcolor: `${color}12`,
          color,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon sx={{ fontSize: 17 }} />
      </Box>

      <Typography
        sx={{
          flexGrow: 1,
          fontSize: 12,
          color: "#40566b",
          fontWeight: 600,
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          fontSize: 15,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
