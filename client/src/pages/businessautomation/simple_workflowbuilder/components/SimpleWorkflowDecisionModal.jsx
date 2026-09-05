// client/src/pages/businessautomation/simple_workflowbuilder/components/SimpleWorkflowDecisionModal.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import IconButton from "@mui/material/IconButton";

const LABEL_SX = {
  display: "block",
  mb: 0.6,
  fontSize: 11,
  lineHeight: 1.2,
  fontWeight: 600,
  color: "#4f6478",
};

const CONTROL_SX = {
  "& .MuiOutlinedInput-root": {
    minHeight: 40,
    borderRadius: "6px",
    bgcolor: "#ffffff",
    "& fieldset": { borderColor: "#bfd0df" },
    "&:hover fieldset": { borderColor: "#94afc4" },
    "&.Mui-focused fieldset": {
      borderColor: "#4d91c6",
      borderWidth: "1px",
    },
  },
  "& .MuiInputBase-input": {
    fontSize: 12,
    color: "#263f55",
  },
  "& .MuiSelect-select": {
    fontSize: 12,
    color: "#263f55",
  },
};

export default function SimpleWorkflowDecisionModal({
  open = true,
  step,
  steps = [],
  onClose,
  onSave,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [local, setLocal] = useState({
    step_action: "approve",
    review_allowed: false,
    next_step_after_reject: null,
    approve_button_name: "Approve",
    reject_button_name: "Reject",
  });

  useEffect(() => {
    if (!step) return;

    const action = String(step.step_action || "approve").toLowerCase();

    const reviewAllowed =
      step.review_allowed === true ||
      step.review_allowed === 1 ||
      step.review_allowed === "1" ||
      String(step.review_allowed || "").toLowerCase() === "true";

    setLocal({
      step_action: action === "send" ? "send" : "approve",
      review_allowed: reviewAllowed,
      next_step_after_reject:
        step.next_step_after_reject === null ||
        step.next_step_after_reject === undefined ||
        step.next_step_after_reject === ""
          ? null
          : Number(step.next_step_after_reject),
      approve_button_name:
        step.approve_button_name || (action === "send" ? "Send" : "Approve"),
      reject_button_name: step.reject_button_name || "Reject",
    });

    setError("");
  }, [step]);

  const previousSteps = useMemo(() => {
    if (!step) return [];

    return (steps || [])
      .filter((item) => {
        if (!item) return false;
        if (Number(item.id) === Number(step.id)) return false;
        return Number(item.step_no) < Number(step.step_no);
      })
      .sort((a, b) => Number(a.step_no) - Number(b.step_no));
  }, [steps, step]);

  if (!step) return null;

  const isApprove = local.step_action === "approve";

  const change = (field, value) => {
    setLocal((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleActionChange = (value) => {
    if (value === "send") {
      setLocal((prev) => ({
        ...prev,
        step_action: "send",
        review_allowed: false,
        next_step_after_reject: null,
        approve_button_name: "Send",
        reject_button_name: "",
      }));
    } else {
      setLocal((prev) => ({
        ...prev,
        step_action: "approve",
        approve_button_name:
          prev.approve_button_name && prev.approve_button_name !== "Send"
            ? prev.approve_button_name
            : "Approve",
        reject_button_name: prev.reject_button_name || "Reject",
      }));
    }
    setError("");
  };

  const handleSave = async () => {
    if (saving) return;

    if (isApprove) {
      if (
        local.next_step_after_reject === null ||
        local.next_step_after_reject === undefined ||
        local.next_step_after_reject === ""
      ) {
        setError("Select the step to return to when this decision is rejected.");
        return;
      }

      if (!String(local.approve_button_name || "").trim()) {
        setError("Approve Button Text is required.");
        return;
      }

      if (!String(local.reject_button_name || "").trim()) {
        setError("Reject Button Text is required.");
        return;
      }
    }

    const payload = {
      step_action: local.step_action,
      review_allowed: isApprove ? Boolean(local.review_allowed) : false,
      next_step_after_reject: isApprove
        ? Number(local.next_step_after_reject)
        : null,
      approve_button_name: isApprove
        ? String(local.approve_button_name || "").trim()
        : "Send",
      reject_button_name: isApprove
        ? String(local.reject_button_name || "").trim()
        : "",
    };

    try {
      setSaving(true);
      setError("");
      await onSave?.(payload);
    } catch (err) {
      console.error("[decision-modal] save failed", err);
      setError(err?.response?.data?.error || "Failed to save decision settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          width: 500,
          maxWidth: "calc(100vw - 32px)",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 24px 65px rgba(20, 43, 65, .22)",
        },
      }}
    >
      <DialogTitle
        sx={{
          minHeight: 62,
          px: 2.4,
          py: 1.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #d7e0e8",
          bgcolor: "#ffffff",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".14em",
              color: "#395269",
            }}
          >
            DECISION
          </Typography>

          <Typography
            sx={{
              mt: 0.35,
              fontSize: 10,
              fontWeight: 500,
              color: "#8192a2",
            }}
          >
            Step {step.step_no}: {step.step_name}
          </Typography>
        </Box>

        <IconButton
          size="small"
          onClick={onClose}
          disabled={saving}
          sx={{ color: "#7a8ea2" }}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          px: 2.4,
          py: 2.1,
          bgcolor: "#ffffff",
        }}
      >
        <Box sx={{ display: "grid", gap: 1.65 }}>
          {error ? (
            <Alert severity="error" sx={{ py: 0.25, fontSize: 11 }}>
              {error}
            </Alert>
          ) : null}

          <Box>
            <Typography sx={LABEL_SX}>Step Action</Typography>
            <FormControl fullWidth size="small" sx={CONTROL_SX}>
              <Select
                value={local.step_action}
                onChange={(e) => handleActionChange(e.target.value)}
              >
                <MenuItem value="approve">Approve / Reject</MenuItem>
                <MenuItem value="send">Send</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {local.step_action === "send" ? (
            <Alert severity="info" sx={{ py: 0.35, fontSize: 11 }}>
              Saving as Send removes the Decision diamond because this step will no
              longer require an Approve / Reject branch.
            </Alert>
          ) : null}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 42,
              px: 1.25,
              border: "1px solid #d8e3ec",
              borderRadius: "6px",
              bgcolor: isApprove ? "#ffffff" : "#f6f8fa",
            }}
          >
            <Box>
              <Typography sx={{ ...LABEL_SX, mb: 0.2 }}>Allow Review</Typography>
              <Typography sx={{ fontSize: 9.5, color: "#8798a8" }}>
                Allow the reviewer to review before the final decision.
              </Typography>
            </Box>

            <Switch
              size="small"
              checked={isApprove && Boolean(local.review_allowed)}
              disabled={!isApprove}
              onChange={(e) => change("review_allowed", e.target.checked)}
            />
          </Box>

          <Box>
            <Typography sx={LABEL_SX}>Next Step On Reject</Typography>
            <FormControl fullWidth size="small" sx={CONTROL_SX} disabled={!isApprove}>
              <Select
                displayEmpty
                value={local.next_step_after_reject ?? ""}
                onChange={(e) =>
                  change(
                    "next_step_after_reject",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              >
                <MenuItem value="">
                  <em>Select previous step</em>
                </MenuItem>

                {previousSteps.map((item) => (
                  <MenuItem key={item.id} value={Number(item.step_no)}>
                    {item.step_no}. {item.step_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1.25,
            }}
          >
            <Box>
              <Typography sx={LABEL_SX}>Approve Button Text</Typography>
              <TextField
                fullWidth
                size="small"
                value={isApprove ? local.approve_button_name : "Send"}
                disabled={!isApprove}
                onChange={(e) => change("approve_button_name", e.target.value)}
                placeholder="Approve"
                sx={CONTROL_SX}
              />
            </Box>

            <Box>
              <Typography sx={LABEL_SX}>Reject Button Text</Typography>
              <TextField
                fullWidth
                size="small"
                value={isApprove ? local.reject_button_name : ""}
                disabled={!isApprove}
                onChange={(e) => change("reject_button_name", e.target.value)}
                placeholder="Reject"
                sx={CONTROL_SX}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.4,
          py: 1.5,
          borderTop: "1px solid #d7e0e8",
          bgcolor: "#fbfcfd",
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          disabled={saving}
          variant="outlined"
          sx={{
            minWidth: 106,
            textTransform: "none",
            borderRadius: "5px",
            fontSize: 11,
          }}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving}
          variant="contained"
          sx={{
            minWidth: 132,
            textTransform: "none",
            borderRadius: "5px",
            fontSize: 11,
            bgcolor: "#0784c7",
            "&:hover": { bgcolor: "#066fa8" },
          }}
        >
          {saving ? "Saving..." : "Save Decision"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
