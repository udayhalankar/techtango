import React, { useMemo, useRef, useState, useEffect, lazy, Suspense } from 'react';
import {
  Box, Grid, Card, CardHeader, CardContent, Typography, Divider, List, ListItemButton,
  Dialog, DialogTitle, DialogContent, IconButton, Stack, Collapse, Tooltip, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Lazy-load your existing Database Settings page (you already built this)
const DatabaseSettings = lazy(() => import('./DatabaseSettings'));

/* --------------------------- Resizable Sidebar --------------------------- */
function ResizableSidebar({ width, setWidth, children, min = 200, max = 380 }) {
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const next = Math.min(max, Math.max(min, e.clientX));
      setWidth(next);
    };
    const onUp = () => { dragging.current = false; document.body.style.userSelect = ''; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setWidth, min, max]);

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 64px)' }}>
      <Box
        sx={{
          width,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
      <Box
        onMouseDown={() => { dragging.current = true; document.body.style.userSelect = 'none'; }}
        sx={{
          width: 6,
          cursor: 'col-resize',
          '&:hover': { bgcolor: 'action.hover' },
          bgcolor: 'transparent',
        }}
        aria-label="Resize sidebar"
        role="separator"
      />
    </Box>
  );
}

/* ----------------------------- Helper UI -------------------------------- */
function SectionCard({ title, children }) {
  return (
    <Card elevation={1} sx={{ height: '100%' }}>
      <CardHeader
        title={<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>}
        sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 1, '.MuiCardHeader-title': { fontSize: 14 } }}
      />
      <Divider />
      <CardContent sx={{ pt: 1 }}>{children}</CardContent>
    </Card>
  );
}

function LinkItem({ primary, onClick, bold = false }) {
  return (
    <ListItemButton onClick={onClick} sx={{ py: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 400, textDecoration: 'underline 0px' }}>
        {primary}
      </Typography>
    </ListItemButton>
  );
}

/* ------------------------------- Modals --------------------------------- */
function ModalShell({ open, title, onClose, children, maxWidth = 'md' }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Main Admin Page ---------------------------- */
export default function AdminPanel() {
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [openModal, setOpenModal] = useState(null); // key of modal

  // Left sidebar groups (collapsible)
  const [openAssign, setOpenAssign] = useState(true);
  const [openVisited, setOpenVisited] = useState(true);

  const handleOpen = (key) => setOpenModal(key);
  const handleClose = () => setOpenModal(null);

  // Map of actions to titles (and special components)
  const actionMap = useMemo(
    () => ({
      // Settings
      'settings.db': { title: 'Database Settings', component: <Suspense fallback={<CircularProgress size={20} />}><DatabaseSettings /></Suspense> },
      'settings.module': { title: 'Modify Module Settings' },

      // Customer Accounts & Billing
      'cab.manage': { title: 'Manage Account' },
      'cab.newCustomer': { title: 'Add New Customer' },
      'cab.viewEdit': { title: 'View & Edit Customer' },
      'cab.invoices': { title: 'Generate Invoices' },
      'cab.overdue': { title: 'Over Due Invoices' },
      'cab.prevPayments': { title: 'Previous Payments' },

      // Storage
      'storage.util': { title: 'Storage Utilization Report' },
      'storage.newLocation': { title: 'Add New Location' },
      'storage.newUnit': { title: 'Add New Storage Unit' },
      'storage.newFacility': { title: 'Add New Facility' },

      // Users & Privileges
      'uap.userList': { title: 'User List' },
      'uap.customerList': { title: 'Customer List' },
      'uap.privileges': { title: 'Privileges' },
      'uap.addUser': { title: 'Add New User' },
      'uap.assignRole': { title: 'Assign Role to User' },
      'uap.editRole': { title: 'Edit User Role' },
      'uap.addDept': { title: 'Add New Department' },

      // Data Management
      'dm.export.entry': { title: 'Export Data Entry Master' },
      'dm.export.location': { title: 'Export Location Master' },
      'dm.export.fileId': { title: 'Export File ID Master' },
      'dm.upload.entry': { title: 'Upload Data Entry Data' },
      'dm.upload.inwardFile': { title: 'Upload Bulk Inward Data (File)' },
      'dm.upload.inwardBox': { title: 'Upload Bulk Inward Data (Box)' },

      // Reports
      'reports.standard': { title: 'Standard Reports' },
      'reports.custom': { title: 'Custom Reports' },

      // Records Management
      'rm.inheritRules': { title: 'Inherit Disposition Rules' },
      'rm.editRule': { title: 'Edit Disposition Rule' },
      'rm.inheritHold': { title: 'Inherit Hold' },
      'rm.editHolds': { title: 'Edit Holds' },
    }),
    []
  );

  const current = openModal ? actionMap[openModal] : null;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 0px)' }}>
      {/* Left Sidebar (Resizable) */}
      <ResizableSidebar width={sidebarWidth} setWidth={setSidebarWidth}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Navigation</Typography>

          {/* My Assignments */}
          <Stack direction="row" alignItems="center" spacing={0.5} onClick={() => setOpenAssign(v => !v)} sx={{ cursor: 'pointer', mb: 1 }}>
            <Tooltip title="Toggle">
              <ExpandMoreIcon sx={{ transform: openAssign ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
            </Tooltip>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>My Assignments</Typography>
          </Stack>
          <Collapse in={openAssign}>
            <List dense>
              <LinkItem primary="RWM" onClick={() => handleOpen('reports.standard')} />
              <LinkItem primary="ECM" onClick={() => handleOpen('reports.custom')} />
            </List>
          </Collapse>

          {/* Recently Visited */}
          <Stack direction="row" alignItems="center" spacing={0.5} onClick={() => setOpenVisited(v => !v)} sx={{ cursor: 'pointer', mt: 2, mb: 1 }}>
            <Tooltip title="Toggle">
              <ExpandMoreIcon sx={{ transform: openVisited ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
            </Tooltip>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Recently Visited</Typography>
          </Stack>
          <Collapse in={openVisited}>
            <List dense>
              {['Delayed Request','New Invoices','Storage Utilization Report','Destruction Approval','Vital Documents Report','Recent Searches','Saved Searches'].map((t, i) => (
                <LinkItem key={i} primary={t} onClick={() => handleOpen('reports.standard')} />
              ))}
            </List>
          </Collapse>
        </Box>
      </ResizableSidebar>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Administration</Typography>

          <Grid container spacing={2}>
            {/* Row 1 */}
            <Grid item xs={12} md={3}>
              <SectionCard title="Customer Accounts & Billing">
                <List dense>
                  <LinkItem primary="Manage Account" onClick={() => handleOpen('cab.manage')} />
                  <LinkItem primary="Add New Customer" onClick={() => handleOpen('cab.newCustomer')} />
                  <LinkItem primary="View & Edit Customer" onClick={() => handleOpen('cab.viewEdit')} />
                  <LinkItem primary="Generate Invoices" onClick={() => handleOpen('cab.invoices')} />
                  <LinkItem primary="Over Due Invoices" onClick={() => handleOpen('cab.overdue')} />
                  <LinkItem primary="Previous Payments" onClick={() => handleOpen('cab.prevPayments')} />
                </List>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={3}>
              <SectionCard title="Settings">
                <List dense>
                  <LinkItem primary="Database Settings" onClick={() => handleOpen('settings.db')} />
                  <LinkItem primary="Modify Module Settings" onClick={() => handleOpen('settings.module')} />
                </List>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={3}>
              <SectionCard title="Storage Management">
                <List dense>
                  <LinkItem primary="Storage Utilization Report" bold onClick={() => handleOpen('storage.util')} />
                  <LinkItem primary="Add New Location" onClick={() => handleOpen('storage.newLocation')} />
                  <LinkItem primary="Add New Storage Unit" onClick={() => handleOpen('storage.newUnit')} />
                  <LinkItem primary="Add New Facility" onClick={() => handleOpen('storage.newFacility')} />
                </List>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={3}>
              <SectionCard title="User, Access & Privileges">
                <List dense>
                  <LinkItem primary="User List" bold onClick={() => handleOpen('uap.userList')} />
                  <LinkItem primary="Customer List" bold onClick={() => handleOpen('uap.customerList')} />
                  <LinkItem primary="Privileges" onClick={() => handleOpen('uap.privileges')} />
                  <LinkItem primary="Add New User" onClick={() => handleOpen('uap.addUser')} />
                  <LinkItem primary="Assign Role to User" onClick={() => handleOpen('uap.assignRole')} />
                  <LinkItem primary="Edit User Role" onClick={() => handleOpen('uap.editRole')} />
                  <LinkItem primary="Add New Department" onClick={() => handleOpen('uap.addDept')} />
                </List>
              </SectionCard>
            </Grid>

            {/* Row 2 */}
            <Grid item xs={12} md={3}>
              <SectionCard title="Data Management">
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Export Data</Typography>
                <List dense sx={{ mb: 1 }}>
                  <LinkItem primary="Export Data Entry Master" onClick={() => handleOpen('dm.export.entry')} />
                  <LinkItem primary="Export Location Master" onClick={() => handleOpen('dm.export.location')} />
                  <LinkItem primary="Export File ID Master" onClick={() => handleOpen('dm.export.fileId')} />
                </List>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Upload Data</Typography>
                <List dense>
                  <LinkItem primary="Upload Data Entry Data" onClick={() => handleOpen('dm.upload.entry')} />
                  <LinkItem primary="Upload Bulk Inward Data (File)" onClick={() => handleOpen('dm.upload.inwardFile')} />
                  <LinkItem primary="Upload Bulk Inward Data (Box)" onClick={() => handleOpen('dm.upload.inwardBox')} />
                </List>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={3}>
              <SectionCard title="Standard Reports">
                <List dense>
                  <LinkItem primary="Open Standard Reports" onClick={() => handleOpen('reports.standard')} />
                </List>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={3}>
              <SectionCard title="Custom Reports">
                <List dense>
                  <LinkItem primary="Open Custom Reports" onClick={() => handleOpen('reports.custom')} />
                </List>
              </SectionCard>
            </Grid>

            <Grid item xs={12} md={3}>
              <SectionCard title="Records Management">
                <List dense>
                  <LinkItem primary="Inherit Disposition Rules" bold onClick={() => handleOpen('rm.inheritRules')} />
                  <LinkItem primary="Edit Disposition Rule" onClick={() => handleOpen('rm.editRule')} />
                  <LinkItem primary="Inherit Hold" bold onClick={() => handleOpen('rm.inheritHold')} />
                  <LinkItem primary="Edit Holds" onClick={() => handleOpen('rm.editHolds')} />
                </List>
              </SectionCard>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Modal router */}
      <ModalShell
        open={!!openModal}
        title={current?.title || 'Details'}
        onClose={handleClose}
        maxWidth={openModal === 'settings.db' ? 'lg' : 'md'}
      >
        {/* Database Settings renders your full page inside a modal */}
        {openModal === 'settings.db' ? (
          <Box sx={{ py: 1 }}>
            <Suspense fallback={<CircularProgress />}>
              <DatabaseSettings />
            </Suspense>
          </Box>
        ) : (
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              This is a placeholder modal for: <b>{current?.title}</b>.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Replace this with the form, table, or settings UI for this action.
            </Typography>
          </Box>
        )}
      </ModalShell>
    </Box>
  );
}
