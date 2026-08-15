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
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { getModuleIconByName } from "./moduleIcons";

export default function Home() {
  // --- user + last login -----------------------------------------------------
  const token = localStorage.getItem("token");
  const [firstname, setFirstname] = useState("");
  const [lastLogin, setLastLogin] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setFirstname(decoded.firstname || "");
    } catch {
      /* noop */
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    const loadLastLogin = async () => {
      if (!token) {
        if (!cancelled) setLastLogin(null);
        return;
      }

      try {
        const res = await api.get("/auth/last-login");
        if (cancelled) return;

        const raw = res?.data?.lastLogin ?? null;
        if (!raw) {
          setLastLogin(null);
          return;
        }

        const d = new Date(raw);
        setLastLogin(isNaN(d.getTime()) ? String(raw) : d.toDateString());
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch last login", err);
          setLastLogin(null);
        }
      }
    };

    loadLastLogin();

    return () => {
      cancelled = true;
    };
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
    return (
      <Card
        variant="outlined"
        sx={{
          height: "100%",
          minHeight: 198,
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
          to={mod.route || "#"}
          onClick={() => onAppClick(mod)}
          sx={{ height: "100%", alignItems: "flex-start", flexGrow: 1 }}
          disabled={!mod.route}
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
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#1a4fd8", mb: 0.75 }} noWrap>
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
        minHeight: 198,
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
        <Typography fontWeight={800} color="#1a4fd8">
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
          mt: "-65px",
          pt: { xs: "105px", md: "121px" },
          pb: { xs: 5, md: 7 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip
                label="Unified business workspace"
                sx={{
                  bgcolor: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontWeight: 700,
                  border: "1px solid rgba(255,255,255,0.16)",
                  mb: 2,
                }}
              />
              <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.05, mb: 1.5 }}>
                Welcome{firstname ? `, ${firstname}` : ""}.
              </Typography>
              <Typography sx={{ color: "#e5edf8", maxWidth: 860, lineHeight: 1.7, fontSize: 16 }}>
                Launch your business applications from one polished workspace. Search apps, open
                them quickly, and keep recent work close at hand.
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: "wrap" }}>
                {[
                  "Fast module launch",
                  "Role-aware access",
                  "Recent items first",
                ].map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.1)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.14)",
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack spacing={2}>
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
                  <Typography sx={{ color: "#cfe1ff", fontSize: 12, fontWeight: 700 }}>
                    LAST LOGIN
                  </Typography>
                  <Typography sx={{ color: "#fff", fontWeight: 800, mt: 0.5 }}>
                    {lastLogin || "No previous login recorded"}
                  </Typography>
                </Paper>
                {/* <Paper
                  elevation={0}
                  sx={{
                    p: 2.25,
                    borderRadius: 3,
                    bgcolor: "#ffffff",
                    color: "#152238",
                    border: "1px solid rgba(216,221,231,0.95)",
                    boxShadow: "0 16px 38px rgba(0,0,0,0.15)",
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "rgba(47,125,214,0.1)",
                        color: "#1a4fd8",
                      }}
                    >
                      <LockOutlinedIcon />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: "#1a4fd8" }}>
                        Secure access
                      </Typography>
                      <Typography sx={{ color: "#51607d", fontSize: 13, mt: 0.25 }}>
                        Authenticated modules and guided navigation.
                      </Typography>
                    </Box>
                  </Stack>
                </Paper> */}
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
            <Typography variant="h5" sx={{ fontWeight: 900, color: "#152238" }}>
              Applications
            </Typography>
            <Typography sx={{ color: "#51607d", mt: 0.5 }}>
              Search, launch, and manage the modules you use most.
            </Typography>
          </Box>
          <TextField
            size="small"
            placeholder={t("search", "Search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{
              width: { xs: "100%", md: 420 },
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
      </Container>

      {/* Last login (bottom-right) */}
      {lastLogin && (
        <Box
          sx={{
            position: "fixed",
            right: 16,
            bottom: 12,
            color: "#51607d",
            fontSize: 13,
            bgcolor: "rgba(255,255,255,0.84)",
            px: 1.5,
            py: 0.75,
            borderRadius: 999,
            border: "1px solid rgba(216,221,231,0.9)",
            boxShadow: "0 8px 18px rgba(17,39,87,0.06)",
          }}
        >
          Your last login was on <strong>{lastLogin}</strong>
        </Box>
      )}

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
