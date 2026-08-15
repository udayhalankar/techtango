// src/layout/HomeLayout.jsx
import * as React from 'react';
import { Outlet, Link } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Badge, Avatar,
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableChartIcon from '@mui/icons-material/TableChart';
import ListAltIcon from '@mui/icons-material/ListAlt';
import NotificationsIcon from '@mui/icons-material/Notifications';
// import ChartBuilder from '../components/ChartBuilder';
// import WorkflowDesigner from '../pages/workflow/WorkflowDesigner';
// import DbSchemaExplorer from '../pages/DbSchemaExplorer';

const APPBAR_HEIGHT = 56;
const COLLAPSED = 56;          // collapsed drawer width
const MIN_WIDTH = 160;         // min expanded width
const MAX_WIDTH = 360;         // max expanded width

export default function HomeLayout() {
  const [open, setOpen] = React.useState(true);
  const [drawerWidth, setDrawerWidth] = React.useState(
    () => Number(localStorage.getItem('drawerWidth')) || 200
  );
  const [resizing, setResizing] = React.useState(false);

  // persist width
  React.useEffect(() => {
    if (open) localStorage.setItem('drawerWidth', String(drawerWidth));
  }, [open, drawerWidth]);

  // global mouse handlers while resizing
  React.useEffect(() => {
    if (!resizing) return;

    const onMove = (e) => {
      // e.clientX is distance from the left edge of the window
      let next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, e.clientX));
      setDrawerWidth(next);
    };
    const onUp = () => setResizing(false);

    // prevent text selection during resize
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  const currentWidth = open ? drawerWidth : COLLAPSED;  

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f6f9fc' }}>
      {/* Top bar */}
      <AppBar
        position="fixed"
        elevation={1}
        sx={{ height: APPBAR_HEIGHT, justifyContent: 'center', borderRadius: 0 }}
      >
        <Toolbar sx={{ minHeight: APPBAR_HEIGHT }}>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(v => !v)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>UI Dashboard</Typography>
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Avatar sx={{ width: 28, height: 28, bgcolor: '#1976d2' }}>U</Avatar>
        </Toolbar>
      </AppBar>

      {/* Side drawer */}
      {/* Drawer: root width = 0; paper is fixed + sized */}
      <Drawer
        variant="permanent"
        open
        sx={{
          width: 0,              // <- important: root takes no layout width
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            position: 'fixed',   // <- sits on the left, outside normal flow
            left: 0,
            top: APPBAR_HEIGHT,
            width: currentWidth,
            height: `calc(100% - ${APPBAR_HEIGHT}px)`,
            boxSizing: 'border-box',
            borderRight: '1px solid #e5eaf2',
            transition: 'width 150ms',
          },
        }}
      >
        {/* (in permanent drawers, Toolbar is just a spacer if you need one) */}
        <List>
          <ListItemButton component={Link} to="/uicreator">
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="UI Dashboard" />
          </ListItemButton>
          <ListItemButton component={Link} to="/tables">
            <ListItemIcon><TableChartIcon /></ListItemIcon>
            <ListItemText primary="Report Builder" />
          </ListItemButton>
          <ListItemButton component={Link} to="/forms">
            <ListItemIcon><ListAltIcon /></ListItemIcon>
            <ListItemText primary="Enterprise Form Builder" />
          </ListItemButton>
          <ListItemButton component={Link} to="/bulkuploader">
            <ListItemIcon><ListAltIcon /></ListItemIcon>
            <ListItemText primary="Bulk Uploader" />
          </ListItemButton>
          <ListItemButton component={Link} to="/charts/new">
            <ListItemIcon><ListAltIcon /></ListItemIcon>
            <ListItemText primary="BI Chart Builder" />
          </ListItemButton>
          <ListItemButton component={Link} to="/wfassignments">
            <ListItemIcon><ListAltIcon /></ListItemIcon>
            <ListItemText primary="My Workflows" />
          </ListItemButton>
          <ListItemButton component={Link} to="/wfdesigner">
            <ListItemIcon><ListAltIcon /></ListItemIcon>
            <ListItemText primary="Workflow Designer" />
          </ListItemButton>
          <ListItemButton component={Link} to="/wfmanager">
            <ListItemIcon><ListAltIcon /></ListItemIcon>
            <ListItemText primary="Workflow Manager" />
          </ListItemButton>
          <ListItemButton component={Link} to="/wflibrary">
            <ListItemIcon><ListAltIcon /></ListItemIcon>
            <ListItemText primary="WF Library" />
          </ListItemButton>
          <ListItemButton component={Link} to="/db-schema">
            <ListItemIcon><ListAltIcon /></ListItemIcon>
            <ListItemText primary="DBSchemaExplorer" />
          </ListItemButton>
          
        </List>
        <Divider />
      </Drawer>

      {/* Resize handle (right edge of the drawer) */}
      <Box
        onMouseDown={() => open && setResizing(true)}
        onDoubleClick={() => setOpen(v => !v)}
        title={open ? 'Drag to resize • Double-click to collapse' : 'Double-click to expand'}
        sx={{
          position: 'fixed',
          left: currentWidth - 3,
          top: APPBAR_HEIGHT,
          height: `calc(100% - ${APPBAR_HEIGHT}px)`,
          width: 6,
          cursor: 'col-resize',
          zIndex: 1300,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 2,
            height: 28,
            bgcolor: '#c8d2df',
            borderRadius: 1,
          },
        }}
      />

      {/* Main content: this is the ONLY horizontal push */}
      <Box
        component="main"
        sx={{
          flex: 1,
          p: 2,
          mt: `${APPBAR_HEIGHT}px`,
          ml: `${currentWidth}px`,  // <- single source of spacing
          transition: 'margin-left 150ms',
          minWidth: 0,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}



// // src/layout/HomeLayout.jsx
// import * as React from 'react';
// import { Outlet, Link } from 'react-router-dom';
// import {
//   AppBar, Toolbar, Typography, IconButton, Badge, Avatar,
//   Drawer, List, ListItemButton, ListItemIcon, ListItemText,
//   Box, Divider
// } from '@mui/material';
// import MenuIcon from '@mui/icons-material/Menu';
// import DashboardIcon from '@mui/icons-material/Dashboard';
// import TableChartIcon from '@mui/icons-material/TableChart';
// import ListAltIcon from '@mui/icons-material/ListAlt';
// import NotificationsIcon from '@mui/icons-material/Notifications';
// import BulkUploader from '../components/BulkUploader';

// const DRAWER_WIDTH = 200;
// const APPBAR_HEIGHT = 56; // 64 on desktop if you prefer

// export default function HomeLayout() {
//   const [open, setOpen] = React.useState(true);

//   return (
//     <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f6f9fc' }}>
//       {/* Top bar */}
//       <AppBar
//         position="fixed"
//         elevation={1}
//         sx={{
//           height: APPBAR_HEIGHT,
//           justifyContent: 'center',
//           borderRadius: 0,              // <— no rounded corners
//         }}
//       >
//         <Toolbar sx={{ minHeight: APPBAR_HEIGHT }}>
//           <IconButton color="inherit" edge="start" onClick={() => setOpen(v => !v)} sx={{ mr: 1 }}>
//             <MenuIcon />
//           </IconButton>
//           <Typography variant="h6" sx={{ flexGrow: 1 }}>UI Dashboard</Typography>

//           <IconButton color="inherit" sx={{ mr: 1 }}>
//             <Badge badgeContent={3} color="error">
//               <NotificationsIcon />
//             </Badge>
//           </IconButton>
//           <Avatar sx={{ width: 28, height: 28, bgcolor: '#1976d2' }}>U</Avatar>
//         </Toolbar>
//       </AppBar>

//       {/* Side drawer */}
//       <Drawer
//         variant="permanent"
//         open={open}
//         sx={{
//           width: open ? DRAWER_WIDTH : 56,
//           flexShrink: 0,
//           '& .MuiDrawer-paper': {
//             width: open ? DRAWER_WIDTH : 56,
//             boxSizing: 'border-box',
//             top: APPBAR_HEIGHT,                                  // <— sit below the AppBar
//             height: `calc(100% - ${APPBAR_HEIGHT}px)`,
//             borderRight: '1px solid #e5eaf2'
//           }
//         }}
//       >
//         <Toolbar sx={{ minHeight: APPBAR_HEIGHT }} /> {/* spacer (not visible) */}
//         <List>
//           <ListItemButton component={Link} to="/" selected>
//             <ListItemIcon><DashboardIcon /></ListItemIcon>
//             <ListItemText primary="UI Dashboard" />
//           </ListItemButton>
//           <ListItemButton component={Link} to="/table">
//             <ListItemIcon><TableChartIcon /></ListItemIcon>
//             <ListItemText primary="Tables" />
//           </ListItemButton>
//           <ListItemButton component={Link} to="/forms">
//             <ListItemIcon><ListAltIcon /></ListItemIcon>
//             <ListItemText primary="Forms" />
//           </ListItemButton>
//           <ListItemButton component={Link} to="/bulkuploader">
//             <ListItemIcon><ListAltIcon /></ListItemIcon>
//             <ListItemText primary="Bulk Excel Uploader" />
//           </ListItemButton>
//         </List>
//         <Divider />
//       </Drawer>

//       {/* Main content */}
//       <Box
//         component="main"
//         sx={{
//           flex: 1,
//           p: 2,
//           mt: `${APPBAR_HEIGHT}px`,       // <— prevents Outlet from being hidden
//           ml: open ? `${DRAWER_WIDTH}px` : '56px',
//           transition: 'margin-left 200ms',
//           minWidth: 0,                    // prevent overflow on narrow screens
//         }}
//       >
//         <Outlet />
//       </Box>
//     </Box>
//   );
// }
