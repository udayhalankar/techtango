// src/pages/rm/components/RMListPage.jsx
import React from "react";
import {
  Box, Button, Card, CardContent, Typography,
  Table, TableHead, TableRow, TableCell, TableBody, TextField,
} from "@mui/material";
import RMFormModal from "./RMFormModal";
import { authHeaders } from "../../../utils/authHeaders";
import { safeJson } from "../../../utils/safeJson";

export default function RMListPage({
  title,
  endpoint,
  columns,
  fields,
  ModalComponent, // optional: pass a custom modal component
}) {
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalItem, setModalItem] = React.useState(null);

  async function load() {
    const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`, {
      headers: { ...authHeaders() },
    });
    const out = await safeJson(res);
    const items = Array.isArray(out?.items) ? out.items : Array.isArray(out) ? out : [];
    setRows(items);
  }
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  // Choose which modal to render (default to generic RMFormModal)
  const Modal = ModalComponent || RMFormModal;

  return (
    <Box>
      <Typography variant="h6" sx={{ color: "#f0772c", mb: 2 }}>{title}</Typography>

      <Card variant="outlined" sx={{ mb: 1 }}>
        <CardContent sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            variant="contained"
            onClick={() => { setModalItem(null); setModalOpen(true); }}
          >
            Create
          </Button>
          <TextField
            size="small"
            placeholder="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ width: 280, ml: "auto" }}
          />
        </CardContent>
      </Card>

      <Card variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map(c => (
                <TableCell key={c.key} sx={{ fontWeight: 700 }}>{c.label}</TableCell>
              ))}
              <TableCell sx={{ width: 110, fontWeight: 700 }}>View</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                {columns.map(c => (
                  <TableCell key={c.key}>{String(r[c.key] ?? "")}</TableCell>
                ))}
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => { setModalItem(r); setModalOpen(true); }}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={columns.length + 1}>No data</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

        <Modal
          open={modalOpen}
          onClose={(saved) => { setModalOpen(false); if (saved) load(); }}
          title={title.toUpperCase()}
          endpoint={endpoint}
          item={modalItem}
          fields={fields}
        />
    </Box>
  );
}


// import React from "react";
// import {
//   Box, Button, Card, CardContent, Typography,
//   Table, TableHead, TableRow, TableCell, TableBody, TextField, 
// } from "@mui/material";
// import RMFormModal from "./RMFormModal";
// import { authHeaders } from "../../../utils/authHeaders";
// import { safeJson } from "../../../utils/safeJson";

// export default function RMListPage({ title, endpoint, columns, fields, ModalComponent }) {
//   const [q, setQ] = React.useState("");
//   const [rows, setRows] = React.useState([]);
//   const [modalOpen, setModalOpen] = React.useState(false);
//   const [modalItem, setModalItem] = React.useState(null);

//   async function load() {
//     const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`, {
//      headers: { ...authHeaders() },
//    });
//    const out = await safeJson(res);
//    const items = Array.isArray(out?.items) ? out.items : Array.isArray(out) ? out : [];
//    setRows(items);
//   }
//   React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

//   return (
//     <Box>
//       <Typography variant="h6" sx={{ color: "#f0772c", mb: 2 }}>{title}</Typography>

//       <Card variant="outlined" sx={{ mb: 1 }}>
//         <CardContent sx={{ display: "flex", gap: 1, alignItems: "center" }}>
//           <Button variant="contained" onClick={() => { setModalItem(null); setModalOpen(true); }}>
//             Create
//           </Button>
//           <TextField
//             size="small"
//             placeholder="Search"
//             value={q}
//             onChange={(e) => setQ(e.target.value)}
//             sx={{ width: 280, ml: "auto" }}
//           />
//         </CardContent>
//       </Card>

//       <Card variant="outlined">
//         <Table size="small">
//           <TableHead>
//             <TableRow>
//               {columns.map(c => <TableCell key={c.key} sx={{ fontWeight: 700 }}>{c.label}</TableCell>)}
//               <TableCell sx={{ width: 110, fontWeight: 700 }}>View</TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {rows.map(r => (
//               <TableRow key={r.id}>
//                 {columns.map(c => <TableCell key={c.key}>{String(r[c.key] ?? "")}</TableCell>)}
//                 <TableCell>
//                   <Button size="small" variant="outlined" onClick={() => { setModalItem(r); setModalOpen(true); }}>
//                     View
//                   </Button>
//                 </TableCell>
//               </TableRow>
//             ))}
//             {!rows.length && (
//               <TableRow><TableCell colSpan={columns.length + 1}>No data</TableCell></TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </Card>

//       <RMFormModal
//          {(ModalComponent || RMFormModal)({
//             open: modalOpen,
//             onClose: () => setModalOpen(false),
//             title: title.toUpperCase(),
//             endpoint,
//             item: modalItem,
//             fields,
//             onSaved: () => load(),
//             onDeleted: () => load(),
//           })}
//       />
//     </Box>
//   );
// }
