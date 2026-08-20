import React from "react";
import { Box, Dialog, DialogContent, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function ReusableFormModal({
  open,
  onClose,
  title,
  subtitle,
  icon = "🤝",
  maxWidth = 784,
  children,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth,
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.22)",
          maxHeight: "calc(100vh - 72px)",
          m: 2,
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(4px)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
          px: "18px",
          pt: "14px",
          pb: "13px",
          color: "#fff",
          background: "linear-gradient(135deg, #0f7c8b 0%, #176d96 100%)",
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: "38px",
            height: "38px",
            borderRadius: "12px",
            display: "grid",
            placeItems: "center",
            background: "rgba(255, 255, 255, 0.16)",
            fontSize: "18px",
            flex: "0 0 auto",
          }}
        >
          {icon}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component="h3"
            sx={{
              m: 0,
              mb: "4px",
              fontSize: "1.24rem",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              sx={{
                m: 0,
                color: "rgba(255, 255, 255, 0.88)",
                fontSize: "0.76rem",
                lineHeight: 1.3,
              }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: "#fff",
            mt: "-2px",
            mr: "-6px",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.12)",
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent
        dividers
        sx={{
          p: 0,
          backgroundColor: "#f8fbff",
          borderTop: 0,
        }}
      >
        <Box
          sx={{
            p: "14px 16px 13px",
            "& form": {
              mt: 0,
              border: "1px solid #d1dbe8",
              borderRadius: "12px",
              p: 2,
              backgroundColor: "#f8fbff",
            },
            "& .rfm-form": {
              mt: 0,
            },
            "& .rfm-field": {
              display: "flex",
              flexDirection: "column",
            },
            "& .rfm-field-label": {
              margin: 0,
              marginBottom: "4px",
              fontSize: "0.68rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#4b648b",
              lineHeight: 1.25,
            },
            "& .MuiInputLabel-root": {
              color: "#4b648b",
              fontSize: "0.82rem",
              fontWeight: 700,
            },
            "& .rfm-field .MuiInputLabel-root": {
              display: "none",
            },
            "& .MuiInputLabel-shrink": {
              color: "#4b648b",
            },
            "& .MuiOutlinedInput-root": {
              minHeight: 34,
              borderRadius: "10px",
              backgroundColor: "#fff",
              color: "#183153",
              boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)",
              "& fieldset": {
                borderColor: "#c7d3e4",
              },
              "&:hover fieldset": {
                borderColor: "#adc0da",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#2f7dd6",
                borderWidth: 1,
              },
            },
            "& .MuiInputBase-input": {
              px: "10px",
              py: "8px",
              color: "#183153",
            },
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
            },
            "& .MuiInputBase-inputMultiline": {
              px: "10px",
              py: "8px",
            },
            "& .MuiFormHelperText-root": {
              mt: "4px",
              mx: 0,
              fontSize: "0.72rem",
              color: "#6b7c93",
            },
            "& .rfm-field .MuiFormHelperText-root": {
              minHeight: "1.1em",
            },
            "& .MuiFormControlLabel-label": {
              color: "#183153",
              fontSize: "0.98rem",
            },
            "& .rfm-choice-group": {
              gap: "6px",
              alignItems: "flex-start",
            },
            "& .MuiCheckbox-root, & .MuiRadio-root": {
              color: "#4b648b",
              padding: "4px",
            },
            "& .MuiCheckbox-root.Mui-checked, & .MuiRadio-root.Mui-checked": {
              color: "#2f7dd6",
            },
            "& .MuiButton-root": {
              borderRadius: "10px",
              fontWeight: 700,
              textTransform: "none",
              minHeight: 40,
              px: 2.25,
            },
            "& .MuiButton-contained": {
              background: "linear-gradient(135deg, #1f80f0 0%, #1f7cf5 100%)",
              boxShadow: "0 10px 24px rgba(31, 128, 240, 0.22)",
              "&:hover": {
                background: "linear-gradient(135deg, #1b6fd2 0%, #1a6fe0 100%)",
              },
            },
            "& .MuiButton-outlined": {
              borderColor: "#c7d3e4",
              color: "#183153",
              backgroundColor: "#fff",
              "&:hover": {
                borderColor: "#adc0da",
                backgroundColor: "#f8fbff",
              },
            },
            "& .rfm-actions": {
              justifyContent: "flex-end",
            },
          }}
        >
          {children}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
