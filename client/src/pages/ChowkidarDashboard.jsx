import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

// ---------- UI helpers ----------
const STATUS_COLORS = { pass: "success", warn: "warning", fail: "error" };

function StatusChip({ status, size = "small" }) {
  const map = { pass: "✅ PASS", warn: "⚠️ WARN", fail: "❌ FAIL" };
  return <Chip size={size} color={STATUS_COLORS[status]} label={map[status]} />;
}

function worstStatus(checks = []) {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
}

export default function ChowkidarDashboard() {
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [filter, setFilter] = useState("all"); // all | pass | warn | fail
  const [q, setQ] = useState("");

  // Actions modal state
  const [activeCard, setActiveCard] = useState(null); // { file, check, status, message, actions[] }
  const openActions = useCallback((filePath, checkObj) => {
    if (checkObj?.actions?.length) setActiveCard({ file: filePath, ...checkObj });
  }, []);
  const closeActions = useCallback(() => setActiveCard(null), []);

  const fetchData = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/chowkidar");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to load chowkidar results", e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData(); // initial
    const id = setInterval(fetchData, 5000); // auto-refresh every 5s
    return () => clearInterval(id);
  }, []);

  const files = useMemo(() => {
    if (!data?.results) return [];
    return Object.entries(data.results).map(([file, checks]) => ({
      file,
      checks,
      worst: worstStatus(checks),
    }));
  }, [data]);

  const filtered = useMemo(() => {
    return files.filter((f) => {
      if (q && !f.file.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter !== "all" && f.worst !== filter) return false;
      return true;
    });
  }, [files, q, filter]);

  const totals = data?.summary?.totals || { pass: 0, warn: 0, fail: 0 };

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={700}>
            Cerberus
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last scan: {data?.scannedAt ? new Date(data.scannedAt).toLocaleString() : "—"}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip color="success" label={`Pass: ${totals.pass || 0}`} />
          <Chip color="warning" label={`Warn: ${totals.warn || 0}`} />
          <Chip color="error" label={`Fail: ${totals.fail || 0}`} />
          <Tooltip title="Refresh now">
            <IconButton onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Card variant="outlined" sx={{ mb: 2 }}>
        {fetching && <LinearProgress />}
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Search filename"
              placeholder="e.g. server/routes/approvals.js"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              fullWidth
            />
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="all">Show: All</MenuItem>
              <MenuItem value="fail">❌ Fail</MenuItem>
              <MenuItem value="warn">⚠️ Warn</MenuItem>
              <MenuItem value="pass">✅ Pass</MenuItem>
            </Select>
          </Stack>
        </CardContent>
      </Card>

      {/* FILE LIST */}
      <Stack spacing={2}>
        {filtered.length === 0 && (
          <Card variant="outlined">
            <CardContent>
              <Typography>No files match your filter/search.</Typography>
            </CardContent>
          </Card>
        )}

        {filtered.map(({ file, checks, worst }) => (
          <Card key={file} variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                spacing={1}
                mb={1}
              >
                <Typography variant="subtitle1" sx={{ wordBreak: "break-all" }}>
                  {file}
                </Typography>
                <StatusChip status={worst} />
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 1.5,
                }}
              >
                {checks.map((c, idx) => (
                  <Card
                    key={`${file}-${idx}`}
                    variant="outlined"
                    sx={{ p: 1, cursor: c?.actions?.length ? "pointer" : "default" }}
                    onClick={() => openActions(file, c)}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {c.check}
                      </Typography>
                      <StatusChip status={c.status} />
                      {c.message && (
                        <Typography variant="caption" color="text.secondary">
                          {c.message}
                        </Typography>
                      )}
                      {c?.actions?.length > 0 && (
                        <Typography variant="caption" color="primary">
                          View actions…
                        </Typography>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Actions Modal */}
      <Dialog open={!!activeCard} onClose={closeActions} maxWidth="md" fullWidth>
        <DialogTitle>
          {activeCard ? `${activeCard.check} — ${activeCard.file}` : "Actions"}
        </DialogTitle>
        <DialogContent dividers>
          {activeCard?.actions?.length ? (
            <List dense>
              {activeCard.actions.map((a, i) => (
                <ListItem key={i} alignItems="flex-start" sx={{ display: "block" }}>
                  <ListItemText
                    primary={<Typography fontWeight={600}>{a.title}</Typography>}
                    secondary={
                      <>
                        {a.description && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {a.description}
                          </Typography>
                        )}
                        {a.snippet && (
                          <Box
                            component="pre"
                            sx={{
                              bgcolor: "#f6f8fa",
                              p: 1.5,
                              borderRadius: 1,
                              overflow: "auto",
                              fontSize: "0.8rem",
                              border: "1px solid #eaecef",
                            }}
                          >
                            <code>{a.snippet}</code>
                          </Box>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No suggested actions for this check.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeActions}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
