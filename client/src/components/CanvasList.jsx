// client/src/components/CanvasList.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, TextField, Pagination, Stack, Button, Tooltip
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../services/api";

export default function CanvasList({ onView, onEdit }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const fetchData = async () => {
    const { data } = await api.get("/canvas-configs", { params: { page, pageSize, q } });
    setItems(data.items || []);
    setTotal(data.total || 0);
  };
  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [page, pageSize, q]);

  const handleDelete = async (id) => {
    if (!window.confirm("Archive this canvas? (You can bring it back later)")) return;
    await api.patch(`/canvas-configs/${id}/archive`, { updated_by: 1 }); // no auth yet
    fetchData();
  };

  return (
    <Box>
      <Stack direction="row" gap={2} sx={{ mb: 2 }} alignItems="center">
        <TextField size="small" label="Search" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
        <Button size="small" onClick={() => { setQ(""); setPage(1); }}>Clear</Button>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "40%" }}>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right" sx={{ width: 180 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(r => (
              <TableRow key={r.id} hover>
                <TableCell>{r.canvas_name}</TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell align="right">
                  <Tooltip title="View">
                    <IconButton onClick={() => onView?.(r.id)}><VisibilityIcon /></IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => onEdit?.(r.id)}><EditIcon /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete (Archive)">
                    <IconButton onClick={() => handleDelete(r.id)}><DeleteIcon /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={3} align="center">No canvases yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack alignItems="center" sx={{ mt: 2 }}>
        <Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} />
      </Stack>
    </Box>
  );
}

