import React from "react";

import {
  Box,
  Typography,
} from "@mui/material";


export default function DashboardMediaComponent({
  config,
}) {

  if (!config) {
    return null;
  }


  const mediaType =
    config.mediaType ||
    "image";


  const source =
    config.source?.url ||
    config.url ||
    "";


  const options =
    config.options ||
    {};


  const {
    width = "100%",
    alignment = "center",
    fit = "contain",
    aspectRatio = "16/9",

    altText = "",

    controls = true,
    autoplay = false,
    muted = false,
    loop = false,

    caption = "",
  } = options;


  if (!source) {

    return (
      <Box
        sx={{
          minHeight: 120,

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          color: "#7a8da0",
          fontSize: 12,
        }}
      >
        No media configured
      </Box>
    );
  }


  const alignmentMap = {
    left:
      "flex-start",

    center:
      "center",

    right:
      "flex-end",
  };


  return (
    <Box
      sx={{
        width: "100%",

        display: "flex",
        flexDirection: "column",

        alignItems:
          alignmentMap[
            alignment
          ] ||
          "center",
      }}
    >

      {/* ================================================================
          IMAGE
      ================================================================ */}

      {mediaType ===
        "image" && (

        <Box
          component="img"

          src={
            source
          }

          alt={
            altText
          }

          sx={{
            display: "block",

            width:
              width,

            maxWidth:
              "100%",

            height:
              "auto",

            objectFit:
              fit,

            borderRadius:
              "4px",
          }}
        />
      )}


      {/* ================================================================
          VIDEO
      ================================================================ */}

      {mediaType ===
        "video" && (

        <Box
          component="video"

          src={
            source
          }

          controls={
            controls
          }

          autoPlay={
            autoplay
          }

          muted={
            muted
          }

          loop={
            loop
          }

          playsInline

          sx={{
            display: "block",

            width:
              width,

            maxWidth:
              "100%",

            aspectRatio:
              aspectRatio,

            objectFit:
              fit,

            bgcolor:
              "#000",

            borderRadius:
              "4px",
          }}
        />
      )}


      {/* ================================================================
          CAPTION
      ================================================================ */}

      {caption && (

        <Typography
          sx={{
            mt: 0.75,

            fontSize: 11,

            lineHeight: 1.4,

            color:
              "#66788a",

            textAlign:
              alignment,
          }}
        >
          {caption}
        </Typography>
      )}

    </Box>
  );
}