// // src/pages/home/Home.js
// import React, { useRef, useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import ModuleModal from "./ModuleModal";
// import "./home.scss";
// import api from "../../services/api";
// import { jwtDecode } from "jwt-decode";

// export default function Home() {
//   const token = localStorage.getItem("token");
//   let firstname = "";

//   if (token) {
//     try {
//       const { firstname: fn } = jwtDecode(token);
//       firstname = fn;
//     } catch (e) {
//       console.error("Invalid token", e);
//     }
//   }

//   const sliderRef = useRef();
//   const [modules, setModules] = useState([]);
//   const [showModal, setShowModal] = useState(false);

//   const scrollLeft = () => {
//     sliderRef.current?.scrollBy({ left: -300, behavior: "smooth" });
//   };

//   const scrollRight = () => {
//     sliderRef.current?.scrollBy({ left: 300, behavior: "smooth" });
//   };

//   useEffect(() => {
//     const fetchModules = async () => {
//       try {
//         const res = await api.get("/subscription/subscriptions"); // ✅ Correct endpoint
//         console.log("🏷️ subscriptions response:", res.data);
//         setModules(res.data);
//       } catch (err) {
//         console.error("❌ Failed to fetch modules", err);
//       }
//     };
//     fetchModules();
//   }, []);

//   return (
//     <div className="home-page">
//       <div className="home-container">
//         <h1>Welcome{firstname ? `, ${firstname}` : ""}!</h1>
//       </div>

//       <div className="nav-bar">
//         <button>Proposals</button>
//         <button>Meetings</button>
//         <button>Assignments</button>
//         <button>Workflow Assignments</button>
//         <button>Notifications</button>
//       </div>

//       <div className="top-section">
//         <div className="banner">
//           <h2>Joint Operations Committee</h2>
//           <p className="app-title">The All-in-One app!</p>
//           <p>Download the ESR App for a seamless experience</p>
//           <button className="details-btn">Details</button>
//           <div className="phone-image">📱</div>
//         </div>

//         <div className="meetings">
//           <h3>Scheduled Meetings</h3>
//           <table>
//             <thead>
//               <tr>
//                 <th>Date</th>
//                 <th>Agenda</th>
//               </tr>
//             </thead>
//             <tbody>
//               <tr>
//                 <td>15 Nov 2024</td>
//                 <td>Discuss Multiple Items.</td>
//               </tr>
//               <tr>
//                 <td>22 Nov 2024</td>
//                 <td>Discuss Multiple Items.</td>
//               </tr>
//               <tr>
//                 <td>27 Nov 2024</td>
//                 <td>Discuss Multiple Items.</td>
//               </tr>
//             </tbody>
//           </table>
//         </div>
//       </div>

//       <div className="add-modules-button">
//         Applications
//         <button className="add-btn" onClick={() => setShowModal(true)}>
//           Add Modules
//         </button>
//       </div>

//       <div className="slider-container">
//         <button className="slider-arrow left" onClick={scrollLeft}>
//           ◀
//         </button>
//         <div className="cards-slider" ref={sliderRef}>
//           {modules.length === 0 ? (
//             <div style={{ padding: "1rem", color: "#666" }}>
//               You have no active subscriptions.
//             </div>
//           ) : (
//             modules.map((mod) => {
//               if (!mod.route) {
//                 console.warn(`Skipping module: ${mod.module_name} (no route)`);
//                 return null;
//               }
//               return (
//                 <div className="card my-assignments" key={mod.subscription_id}>
//                   <Link to={mod.route} className="card-link">
//                     <h4>{mod.module_name}</h4>
//                     <p>{mod.description}</p>
//                   </Link>
//                 </div>
//               );
//             })
//           )}
//         </div>
//         <button className="slider-arrow right" onClick={scrollRight}>
//           ▶
//         </button>
//       </div>

//       <div className="bottom-info">
//         <div className="info-box">
//           <h4>Statistics</h4>
//           <ul>
//             <li>New Proposals: 18</li>
//             <li>Proposals on Hold: 7</li>
//             <li>Assignments closed last week: 5</li>
//             <li>Open Assignments: 42</li>
//             <li>Assignments due next week: 7</li>
//           </ul>
//         </div>
//         <div className="info-box">
//           <h4>Minutes of Previous Meeting</h4>
//           <p>This is the text for the minutes of previous meeting.</p>
//         </div>
//         <div className="info-box">
//           <h4>Overdue Assignments</h4>
//           <p>Click here to view all overdue and escalated assignments</p>
//         </div>
//       </div>

//       {showModal && <ModuleModal onClose={() => setShowModal(false)} />}
//     </div>
//   );
// }


// src/pages/home/Home.js
import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ModuleModal from "./ModuleModal";
import "./home.scss";
import api from "../../services/api";
import { jwtDecode } from "jwt-decode";
import Enquiries from "../enquiries/Enquiries";


import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";

// Or globally via your theme:
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderColor: '#424242',  // equivalent to grey.700
          borderWidth: '1px',
          borderStyle: 'solid',
          boxShadow: 'none',
        },
      },
    },
    MuiBox: {
      styleOverrides: {
        root: {
          borderColor: '#424242',
          borderWidth: '1px',
          borderStyle: 'solid',
        },
      },
    },
  },
});

export default function Home() {
  const token = localStorage.getItem("token");
  let firstname = "";
  if (token) {
    try {
      firstname = jwtDecode(token).firstname;
    } catch {}
  }

  const sliderRef = useRef();
  const [modules, setModules] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api
      .get("/subscription/subscriptions")
      .then((res) => setModules(res.data))
      .catch((err) => console.error(err));
  }, []);

  const scrollLeft = () =>
    sliderRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  const scrollRight = () =>
    sliderRef.current?.scrollBy({ left: 300, behavior: "smooth" });

  const meetings = [
    { date: "15 Nov 2024", agenda: "Discuss Multiple Items." },
    { date: "22 Nov 2024", agenda: "Discuss Multiple Items." },
    { date: "27 Nov 2024", agenda: "Discuss Multiple Items." },
  ];

  // Reduced vertical padding and font size 3px smaller
  const headerSx = { backgroundColor: 'primary.main', color: '#fff', px: 1, py: 0.5 };
  const headerTextSx = { fontSize: '0.875rem' }; // approx 14px

  return (
    <Container maxWidth="lg" disableGutters sx={{ px: 2, py: 2 }}>
      {/* Greeting */}
      <Typography variant="h6" gutterBottom>
        Welcome{firstname ? `, ${firstname}` : ""}!
      </Typography>

      {/* News & Notifications */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ minHeight: 280 }}>
            <Box sx={headerSx}>
              <Typography variant="subtitle1" sx={headerTextSx}>
                NEWS UPDATES
              </Typography>
            </Box>
            <CardContent sx={{ pt: 2 }}>
              {/* News content */}
              <Button
        variant="contained"
        color="primary"
        component={Link}
        to="/forms"
        sx={{ mt: 2 }}
      >
        Open Form Views
      </Button>

      <br></br>
      <Button
        variant="contained"
        color="primary"
        component={Link}
        to="/bulkuploader"
        sx={{ mt: 2 }}
      >
        Bulk Uploader
      </Button>
      
      
      <br></br>
      <Button
        variant="contained"
        color="primary"
        component={Link}
        to="/Enquiry"
        sx={{ mt: 2 }}
      >
        Enquiries
      </Button>

            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ minHeight: 280 }}>
            <Box sx={headerSx}>
              <Typography variant="subtitle1" sx={headerTextSx}>
                NOTIFICATIONS
              </Typography>
            </Box>
            <CardContent sx={{ pt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Agenda</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {meetings.map((m) => (
                    <TableRow key={m.date}>
                      <TableCell>{m.date}</TableCell>
                      <TableCell>{m.agenda}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Applications Slider */}
      <Box display="flex" alignItems="center" mb={1}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          APPLICATIONS
        </Typography>
        <Button variant="contained" onClick={() => setShowModal(true)} size="small">
          ADD / REMOVE
        </Button>
      </Box>
      <Box position="relative" mb={2}>
        <IconButton
          onClick={scrollLeft}
          sx={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
        >
          <ArrowBackIos fontSize="small" />
        </IconButton>
        <Box
          ref={sliderRef}
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'hidden',
            scrollBehavior: 'smooth',
          }}
        >
          {modules.length === 0 ? (
            <Typography color="text.secondary">You have no active subscriptions.</Typography>
          ) : (
            modules.map((mod) =>
              mod.route ? (
                <Card key={mod.subscription_id} variant="outlined" sx={{ minWidth: 150 }}>
                  <CardContent>
                    <Link to={mod.route} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Typography variant="subtitle1" noWrap>
                        {mod.module_name}
                      </Typography>
                      <Typography variant="body2" noWrap>
                        {mod.description}
                      </Typography>
                    </Link>
                  </CardContent>
                </Card>
              ) : null
            )
          )}
        </Box>
        <IconButton
          onClick={scrollRight}
          sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
        >
          <ArrowForwardIos fontSize="small" />
        </IconButton>
      </Box>

      {/* Placeholders */}
      <Grid container spacing={1}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Grid item xs={12} md={4} key={i}>
            <Card variant="outlined" sx={{ minHeight: 160 }}>
              <Box sx={headerSx}>
                <Typography variant="subtitle1" sx={headerTextSx}>
                  PLACEHOLDER
                </Typography>
              </Box>
              <CardContent sx={{ pt: 2 }}>
                {/* Placeholder content */}
                
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Module Picker Modal */}
      {showModal && <ModuleModal onClose={() => setShowModal(false)} />}
    </Container>
  );
}
