import React from "react";

import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Typography,
} from "@mui/material";

import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import WebAssetOutlinedIcon from "@mui/icons-material/WebAssetOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";


const COMPONENT_TYPES = {
  kpi: {
    type: "kpi",
    label: "KPI",
    description: "Metric or summary value",
    Icon: SpeedOutlinedIcon,
  },

  chart: {
    type: "chart",
    label: "Chart",
    description: "Visualize data",
    Icon: BarChartOutlinedIcon,
  },

  table: {
    type: "table",
    label: "Table",
    description: "Display records",
    Icon: TableChartOutlinedIcon,
  },

  crud: {
    type: "crud",
    label: "CRUD App",
    description: "Embed a data application",
    Icon: WebAssetOutlinedIcon,
  },

  text: {
    type: "text",
    label: "Text",
    description: "Add text or notes",
    Icon: NotesOutlinedIcon,
  },

  image: {
  type: "media",

  title:
    "Image / Video",

  description:
    "Add media",

  Icon:
    ImageOutlinedIcon,
},
};


export default function AddComponentModal({
  open,
  slot,
  onClose,
  onSelect,
}) {

  const acceptedTypes =
    Array.isArray(slot?.accepts)
      ? slot.accepts
      : String(slot?.accepts || "")
          .split(",")
          .map((item) =>
            item.trim()
          )
          .filter(Boolean);


  const availableComponents =
    acceptedTypes
      .map(
        (type) =>
          COMPONENT_TYPES[type]
      )
      .filter(Boolean);


  return (
    <Dialog
      open={Boolean(open)}
      onClose={onClose}
      maxWidth={false}
      BackdropProps={{
        sx: {
          backdropFilter:
            "none !important",

          WebkitBackdropFilter:
            "none !important",

          backgroundColor:
            "rgba(17,31,46,.42) !important",
        },
      }}
      PaperProps={{
        sx: {
          width:
            "min(680px, 92vw)",

          borderRadius:
            "15px",

          overflow:
            "hidden",

          bgcolor:
            "#f8fbfe",

          border:
            "1px solid #cfdae5",

          boxShadow:
            "0 22px 60px rgba(22,42,61,.22)",
        },
      }}
    >

      {/* ============================================================
          HEADER
      ============================================================ */}

      <Box
        sx={{
          px: 2.4,
          py: 1.8,

          display: "flex",
          alignItems: "flex-start",
          justifyContent:
            "space-between",

          background:
            "linear-gradient(105deg, #187f96 0%, #16849c 45%, #247c98 100%)",

          color: "#ffffff",
        }}
      >

        <Box>

          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            Add Component
          </Typography>

          <Typography
            sx={{
              mt: 0.35,

              fontSize: 10.5,

              color:
                "rgba(255,255,255,.86)",
            }}
          >
            Choose the component to place in this dashboard area.
          </Typography>

        </Box>


        <Button
          onClick={onClose}
          sx={{
            minWidth: 32,
            width: 32,
            height: 32,

            borderRadius: "50%",

            color: "#ffffff",

            fontSize: 18,

            bgcolor:
              "rgba(255,255,255,.10)",

            "&:hover": {
              bgcolor:
                "rgba(255,255,255,.18)",
            },
          }}
        >
          ×
        </Button>

      </Box>


      {/* ============================================================
          BODY
      ============================================================ */}

      <DialogContent
        sx={{
          p: 2.4,

          bgcolor:
            "#f8fbfe",
        }}
      >

        {/* SLOT INFO */}

        <Box
          sx={{
            mb: 2,

            px: 1.4,
            py: 1,

            borderRadius:
              "8px",

            border:
              "1px solid #dce5ed",

            bgcolor:
              "#ffffff",
          }}
        >

          <Typography
            sx={{
              fontSize: 10,

              color:
                "#7c8fa2",
            }}
          >
            Target area
          </Typography>

          <Typography
            sx={{
              mt: 0.1,

              fontSize: 11.5,

              fontWeight: 600,

              color:
                "#33485d",
            }}
          >
            {slot?.slotId ||
              "Dashboard component"}
          </Typography>

        </Box>


        {/* COMPONENT GRID */}

        {availableComponents.length ? (

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs:
                  "1fr",

                sm:
                  "repeat(2, minmax(0,1fr))",

                md:
                  "repeat(3, minmax(0,1fr))",
              },

              gap: 1.2,
            }}
          >

            {availableComponents.map(
              ({
                type,
                label,
                description,
                Icon,
              }) => (

                <Box
                  key={type}

                  role="button"

                  tabIndex={0}

                  onClick={() =>
                    onSelect?.(
                      type,
                      slot
                    )
                  }

                  onKeyDown={(e) => {
                    if (
                      e.key ===
                        "Enter" ||
                      e.key === " "
                    ) {
                      onSelect?.(
                        type,
                        slot
                      );
                    }
                  }}

                  sx={{
                    minHeight: 112,

                    p: 1.5,

                    display: "flex",

                    flexDirection:
                      "column",

                    alignItems:
                      "flex-start",

                    justifyContent:
                      "space-between",

                    cursor:
                      "pointer",

                    borderRadius:
                      "10px",

                    border:
                      "1px solid #d9e4ee",

                    bgcolor:
                      "#ffffff",

                    transition:
                      "all .15s ease",

                    "&:hover": {
                      borderColor:
                        "#8eb9da",

                      bgcolor:
                        "#f7fbfe",

                      boxShadow:
                        "0 5px 15px rgba(33,70,102,.08)",

                      transform:
                        "translateY(-1px)",
                    },
                  }}
                >

                  <Box
                    sx={{
                      width: 34,
                      height: 34,

                      display:
                        "grid",

                      placeItems:
                        "center",

                      borderRadius:
                        "8px",

                      bgcolor:
                        "#edf5fb",

                      color:
                        "#327aa8",
                    }}
                  >
                    <Icon
                      sx={{
                        fontSize: 19,
                      }}
                    />
                  </Box>


                  <Box
                    sx={{
                      mt: 1.1,
                    }}
                  >

                    <Typography
                      sx={{
                        fontSize:
                          11.5,

                        fontWeight:
                          700,

                        color:
                          "#2d4358",
                      }}
                    >
                      {label}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.2,

                        fontSize:
                          9.5,

                        lineHeight:
                          1.35,

                        color:
                          "#8998a7",
                      }}
                    >
                      {description}
                    </Typography>

                  </Box>

                </Box>
              )
            )}

          </Box>

        ) : (

          <Box
            sx={{
              py: 4,

              textAlign:
                "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 11,

                color:
                  "#8292a2",
              }}
            >
              No compatible components are available for this area.
            </Typography>
          </Box>
        )}

      </DialogContent>

    </Dialog>
  );
}