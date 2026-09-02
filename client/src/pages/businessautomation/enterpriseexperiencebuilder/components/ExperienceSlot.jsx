import React from "react";

import {
  Box,
  Typography,
} from "@mui/material";

import AddRoundedIcon from
  "@mui/icons-material/AddRounded";


export default function ExperienceSlot({
  slot,
  component,
  columnGap = 12,
  onAddComponent,
  renderComponent,
}) {

  if (component) {

  return (
    <Box
      sx={{
        width:
          "100%",

        minWidth:
          0,

        height:
          "100%",

        minHeight:
          component?.type ===
          "kpi"
            ? 108
            : 220,

        bgcolor:
          "#ffffff",

        border:
          "1px solid #dfe7ed",

        borderRadius:
          "3px",

        overflow:
          "hidden",

        boxSizing:
          "border-box",
      }}
    >
      {renderComponent?.(
        component,
        slot
      )}
    </Box>
  );
}


  return (
    <Box
      onClick={() =>
        onAddComponent?.(
          slot
        )
      }

      sx={{
        minHeight: 180,
        width: "100%",

        border: "1px dashed #cbd8e3",
        borderRadius: "7px",

        bgcolor: "#ffffff",

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        cursor:
          "pointer",

        transition:
          "all .16s ease",

        "&:hover": {
          borderColor:
            "#2188a0",

          bgcolor:
            "#f8fcfd",
        },
      }}
    >

      <Box
        sx={{
          textAlign:
            "center",
        }}
      >

        <Box
          sx={{
            width: 30,
            height: 30,

            mx: "auto",
            mb: 0.7,

            display:
              "grid",

            placeItems:
              "center",

            borderRadius:
              "7px",

            bgcolor:
              "#eef6fb",

            color:
              "#287596",
          }}
        >
          <AddRoundedIcon
            sx={{
              fontSize: 17,
            }}
          />
        </Box>


        <Typography
          sx={{
            fontSize:
              10.5,

            fontWeight:
              600,

            color:
              "#476278",
          }}
        >
          Add Component
        </Typography>


        <Typography
          sx={{
            mt: 0.35,

            fontSize:
              9,

            color:
              "#94a3b2",
          }}
        >
          {Array.isArray(
            slot?.accepts
          )
            ? slot.accepts.join(
                " · "
              )
            : ""}
        </Typography>

      </Box>

    </Box>
  );
}