import React, { useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";

const DEFAULT_BUTTON_STYLE = {
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "24px",
  height: "24px",
  borderRadius: "999px",
  border: "0",
  background: "#5b2b7f",
  color: "#fff",
  fontSize: "12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: "2",
};

const VOID_TAGS = new Set(["br", "hr"]);

export function renderSchemaNode(node, key = "root") {
  if (!node) return null;
  if (node.type === "text") return node.text;
  const children = Array.isArray(node.children)
    ? node.children.map((child, idx) => renderSchemaNode(child, `${key}-${idx}`))
    : null;
  if (node.type === "fragment") {
    return <React.Fragment key={key}>{children}</React.Fragment>;
  }
  if (node.type === "element" && node.tag) {
    if (VOID_TAGS.has(node.tag)) {
      return React.createElement(node.tag, { key, ...(node.props || {}) });
    }
    return React.createElement(node.tag, { key, ...(node.props || {}) }, children);
  }
  return null;
}

export function useDomConfigButtons(rootRef, targets) {
  const targetsMemo = useMemo(() => targets || [], [targets]);

  useEffect(() => {
    const root = rootRef?.current;
    if (!root || !targetsMemo.length) return;

    root.querySelectorAll(".cfg-config-btn").forEach((btn) => btn.remove());

    const ensureButton = (target, label, onClick, styleOverrides) => {
      if (!target) return;
      if (!target.style.position) target.style.position = "relative";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cfg-config-btn";
      btn.textContent = label;
      btn.setAttribute("aria-label", "Configure");
      Object.assign(btn.style, DEFAULT_BUTTON_STYLE, styleOverrides || {});
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        onClick?.();
      });
      target.appendChild(btn);
    };

    targetsMemo.forEach((target) => {
      const el =
        typeof target.selector === "string"
          ? root.querySelector(target.selector)
          : target.element;
      ensureButton(el, target.label || "C", target.onClick, target.style);
    });

    return () => {
      root.querySelectorAll(".cfg-config-btn").forEach((btn) => btn.remove());
    };
  }, [rootRef, targetsMemo]);
}

export function ConfiguratorDialog({
  open,
  title,
  fields,
  values,
  onChange,
  onClose,
  onSave,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, mt: 1 }}>
        {(fields || []).map((field) => {
          if (field.type === "select") {
            return (
              <Select
                key={field.name}
                value={values[field.name] ?? ""}
                displayEmpty
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={field.disabled}
              >
                <MenuItem value="">{field.placeholder || "Select"}</MenuItem>
                {(field.options || []).map((opt) => (
                  <MenuItem key={opt.value ?? opt} value={opt.value ?? opt}>
                    {opt.label ?? opt}
                  </MenuItem>
                ))}
              </Select>
            );
          }
          return (
            <TextField
              key={field.name}
              label={field.label}
              placeholder={field.placeholder}
              value={values[field.name] ?? ""}
              onChange={(e) => onChange(field.name, e.target.value)}
              multiline={field.multiline}
              minRows={field.minRows}
            />
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        <Button onClick={onSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ConfiguratorWrapper({ children }) {
  return <Box sx={{ position: "relative" }}>{children}</Box>;
}
