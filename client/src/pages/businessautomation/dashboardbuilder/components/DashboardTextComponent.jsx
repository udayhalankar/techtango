import React from
  "react";

import {
  Box,
  Typography,
} from "@mui/material";

import DashboardComponentMenu from
  "./DashboardComponentMenu";


export default function DashboardTextComponent({
  component,

  onConfigure,
  onDuplicate,

  onMergeRight,
  canMergeRight,

  onRemove,
}) {

  const title =
    component
      ?.title ||
    "";


  const html =
    component
      ?.content
      ?.html ||
    "";


  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",

        minHeight: 160,

        p: 1.3,

        display:
          "flex",

        flexDirection:
          "column",

        overflow:
          "hidden",
      }}
    >

      {/* HEADER */}

      <Box
        sx={{
          minHeight: 28,

          mb: 0.65,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap: 0.8,
        }}
      >

        <Typography
          noWrap

          sx={{
            minWidth: 0,

            flex: 1,

            fontSize:
              11.5,

            fontWeight:
              600,

            color:
              "#40566d",
          }}
        >
          {title}
        </Typography>


        <DashboardComponentMenu
          onConfigure={
            onConfigure
          }

          onDuplicate={
            onDuplicate
          }

          onMergeRight={
            onMergeRight
          }

          canMergeRight={
            canMergeRight
          }

          onRemove={
            onRemove
          }
        />

      </Box>


      {/* CONTENT */}

      <Box
        sx={{
          flex: 1,

          minHeight: 0,

          overflow:
            "auto",

          color:
            "#40566d",

          fontSize:
            11.5,

          lineHeight:
            1.55,

          "& p": {
            mt: 0,
            mb: 0.8,
          },

          "& h1": {
            fontSize: 22,
            mb: 1,
          },

          "& h2": {
            fontSize: 18,
            mb: 0.9,
          },

          "& h3": {
            fontSize: 15,
            mb: 0.8,
          },

          "& ul, & ol": {
            pl: 2.4,
          },

          "& a": {
            color:
              "#0a74d7",

            textDecoration:
              "underline",
          },
        }}

        dangerouslySetInnerHTML={{
          __html:
            html,
        }}
      />

    </Box>
  );
}