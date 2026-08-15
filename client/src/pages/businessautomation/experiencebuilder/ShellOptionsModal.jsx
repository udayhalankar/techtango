import { useEffect, useMemo, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";

const DEFAULT_DRAFT = {
  title: "",
  subtitle: "",
  note: "",
};

const getTitle = (slotKey) => {
  if (slotKey === "header") return "Header options";
  if (slotKey === "footer") return "Footer options";
  return "Menu options";
};

const getSubtitle = (slotKey) => {
  if (slotKey === "header") return "Configure the header placeholder content.";
  if (slotKey === "footer") return "Configure the footer placeholder content.";
  return "Configure the left/right menu placeholder content.";
};

const getNoteLabel = (slotKey) => {
  if (slotKey === "header") return "Supporting Text";
  if (slotKey === "footer") return "Footer Note";
  return "Menu Note";
};

const ShellOptionsModal = ({ open, slotKey = "header", value, onClose, onSave }) => {
  const normalizedValue = useMemo(() => ({ ...DEFAULT_DRAFT, ...(value || {}) }), [value]);
  const [draft, setDraft] = useState(normalizedValue);

  useEffect(() => {
    if (open) setDraft(normalizedValue);
  }, [open, normalizedValue]);

  const title = getTitle(slotKey);
  const subtitle = getSubtitle(slotKey);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 1.25, pt: 0.5 }}>
          <Typography sx={{ fontSize: 13, color: "#5f6f8a" }}>{subtitle}</Typography>
          <TextField
            size="small"
            label="Title"
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
          />
          <TextField
            size="small"
            label={getNoteLabel(slotKey)}
            value={draft.subtitle}
            onChange={(event) => setDraft((prev) => ({ ...prev, subtitle: event.target.value }))}
            multiline
            minRows={2}
          />
          <TextField
            size="small"
            label="Extra Note"
            value={draft.note}
            onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
            multiline
            minRows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => setDraft(DEFAULT_DRAFT)}
        >
          Reset
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => onSave?.(draft)}>
            Save
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export const HeaderOptionsModal = (props) => <ShellOptionsModal {...props} slotKey="header" />;
export const FooterOptionsModal = (props) => <ShellOptionsModal {...props} slotKey="footer" />;
export const MenuOptionsModal = (props) => <ShellOptionsModal {...props} slotKey="menu" />;

export default ShellOptionsModal;
