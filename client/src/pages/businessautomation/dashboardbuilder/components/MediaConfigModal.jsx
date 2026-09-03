import React, {
  useEffect,
  useState,
} from "react";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import CloseIcon from
  "@mui/icons-material/Close";

import ImageOutlinedIcon from
  "@mui/icons-material/ImageOutlined";

import VideoLibraryOutlinedIcon from
  "@mui/icons-material/VideoLibraryOutlined";


const fieldSx = {
  "& .MuiInputBase-root": {
    fontSize: 11.5,
  },

  "& .MuiInputLabel-root": {
    fontSize: 11.5,
  },
};


const labelSx = {
  mb: 0.6,

  fontSize: 10.5,

  fontWeight: 600,

  color: "#52677a",
};


function ToggleCard({
  selected,
  icon,
  title,
  subtitle,
  onClick,
}) {

  return (
    <Box
      onClick={
        onClick
      }

      sx={{
        flex: 1,

        minHeight: 76,

        p: 1.25,

        border:
          selected
            ? "1px solid #2188a0"
            : "1px solid #d9e3ec",

        bgcolor:
          selected
            ? "#eef8fa"
            : "#fff",

        borderRadius:
          "7px",

        cursor:
          "pointer",

        display:
          "flex",

        alignItems:
          "center",

        gap: 1.1,

        "&:hover": {
          borderColor:
            "#72b6c5",
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,

          borderRadius:
            "6px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          bgcolor:
            selected
              ? "#d8eef3"
              : "#eef4f8",

          color:
            "#2188a0",
        }}
      >
        {icon}
      </Box>


      <Box>

        <Typography
          sx={{
            fontSize: 12,

            fontWeight: 700,

            color:
              "#273d51",
          }}
        >
          {title}
        </Typography>


        <Typography
          sx={{
            mt: 0.2,

            fontSize: 10,

            color:
              "#8090a0",
          }}
        >
          {subtitle}
        </Typography>

      </Box>

    </Box>
  );
}


export default function MediaConfigModal({
  open,

  onClose,

  onSave,

  initialConfig,

  slot,
}) {

  const [
    title,
    setTitle,
  ] =
    useState("");


  const [
    mediaType,
    setMediaType,
  ] =
    useState(
      "image"
    );


  const [
    sourceType,
    setSourceType,
  ] =
    useState(
      "upload"
    );


  const [
    mediaUrl,
    setMediaUrl,
  ] =
    useState("");


  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState("");


  const [
    width,
    setWidth,
  ] =
    useState(
      "100%"
    );


  const [
    alignment,
    setAlignment,
  ] =
    useState(
      "center"
    );


  const [
    fit,
    setFit,
  ] =
    useState(
      "contain"
    );


  const [
    aspectRatio,
    setAspectRatio,
  ] =
    useState(
      "16/9"
    );


  const [
    altText,
    setAltText,
  ] =
    useState("");


  const [
    caption,
    setCaption,
  ] =
    useState("");


  const [
    controls,
    setControls,
  ] =
    useState(true);


  const [
    autoplay,
    setAutoplay,
  ] =
    useState(false);


  const [
    muted,
    setMuted,
  ] =
    useState(false);


  const [
    loop,
    setLoop,
  ] =
    useState(false);


  /* ========================================================================
     LOAD EXISTING CONFIG
  ======================================================================== */

  useEffect(() => {

    if (!open) {
      return;
    }


    const cfg =
      initialConfig ||
      {};


    const options =
      cfg.options ||
      {};


    const existingUrl =
      cfg.source?.url ||
      cfg.url ||
      "";


    setTitle(
      cfg.title ||
      ""
    );


    setMediaType(
      cfg.mediaType ||
      "image"
    );


    setSourceType(
      cfg.source?.type ||
      "upload"
    );


    setMediaUrl(
      existingUrl
    );


    setPreviewUrl(
      existingUrl
    );


    setWidth(
      options.width ||
      "100%"
    );


    setAlignment(
      options.alignment ||
      "center"
    );


    setFit(
      options.fit ||
      "contain"
    );


    setAspectRatio(
      options.aspectRatio ||
      "16/9"
    );


    setAltText(
      options.altText ||
      ""
    );


    setCaption(
      options.caption ||
      ""
    );


    setControls(
      options.controls !==
        false
    );


    setAutoplay(
      options.autoplay ===
        true
    );


    setMuted(
      options.muted ===
        true
    );


    setLoop(
      options.loop ===
        true
    );

  }, [
    open,
    initialConfig,
  ]);


  /* ========================================================================
   LOCAL FILE

   TEMPORARY DEVELOPMENT MODE.

   Files are converted to Base64 and stored
   inside the dashboard configuration.

   Keep size intentionally small until
   filesystem storage is implemented.
======================================================================== */

const handleFile =
  (
    event
  ) => {

    const file =
      event
        ?.target
        ?.files?.[0];


    if (!file) {
      return;
    }


    /* ============================================================
       FILE SIZE LIMIT
    ============================================================ */

    const MAX_FILE_SIZE =
      2 *
      1024 *
      1024; // 2 MB


    if (
      file.size >
      MAX_FILE_SIZE
    ) {

      window.alert(
        `${
          mediaType ===
          "video"
            ? "Video"
            : "Image"
        } must be 2 MB or smaller.`
      );


      event.target.value =
        "";

      return;
    }


    /* ============================================================
       FILE TYPE VALIDATION
    ============================================================ */

    const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];


const allowedVideoTypes = [
  "video/mp4",
  "video/webm",
];


const validImage =
  mediaType ===
    "image" &&
  allowedImageTypes.includes(
    file.type
  );


const validVideo =
  mediaType ===
    "video" &&
  allowedVideoTypes.includes(
    file.type
  );


    if (
      !validImage &&
      !validVideo
    ) {

      window.alert(
        `Please select a valid ${mediaType} file.`
      );


      event.target.value =
        "";

      return;
    }


    /* ============================================================
       TEMPORARY BASE64 STORAGE
    ============================================================ */

    const reader =
      new FileReader();


    reader.onload =
      () => {

        if (
          typeof reader.result !==
          "string"
        ) {
          return;
        }


        setMediaUrl(
          reader.result
        );


        setPreviewUrl(
          reader.result
        );
      };


    reader.onerror =
      () => {

        console.error(
          "Failed to read media file."
        );


        window.alert(
          "Unable to read the selected media file."
        );
      };


    reader.readAsDataURL(
      file
    );


    event.target.value =
      "";
  };

  /* ========================================================================
     SAVE
  ======================================================================== */

  const handleSave =
  () => {

    if (!mediaUrl) {

      window.alert(
        "Please select or enter a media source."
      );

      return;
    }


    if (
      !slot?.slotId
    ) {

      console.error(
        "MediaConfigModal: slot is missing",
        slot
      );

      window.alert(
        "Dashboard target area is missing."
      );

      return;
    }


    const component = {
      type:
        "media",

      title,

      mediaType,

      source: {
        type:
          sourceType,

        url:
          mediaUrl,
      },

      options: {
        width,

        alignment,

        fit,

        aspectRatio,

        altText,

        caption,

        controls,

        autoplay,

        muted,

        loop,
      },

      /*
       * Preserve Merge Right information
       * when configuring an existing component.
       */
      layout:
        initialConfig
          ?.layout ||
        {
          span: 1,

          mergedSlots:
            [],
        },
    };


    console.log(
      "MEDIA SAVE",
      {
        component,
        slot,
      }
    );


    onSave?.(
      component,
      slot
    );
  };

  return (
    <Dialog
      open={
        open
      }

      onClose={
        onClose
      }

      maxWidth="md"

      fullWidth

      PaperProps={{
        sx: {
          borderRadius:
            "14px",

          overflow:
            "hidden",
        },
      }}
    >

      {/* ================================================================
          HEADER
      ================================================================ */}

      <Box
        sx={{
          px: 2.3,
          py: 1.5,

          bgcolor:
            "#2188a0",

          color:
            "#fff",

          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "flex-start",
        }}
      >

        <Box>

          <Typography
            sx={{
              fontSize: 18,

              fontWeight: 700,
            }}
          >
            Configure Image / Video
          </Typography>


          <Typography
            sx={{
              mt: 0.2,

              fontSize: 10.5,

              color:
                "rgba(255,255,255,.9)",
            }}
          >
            Add media content to {slot?.slotId || "this dashboard area"}.
          </Typography>

        </Box>


        <IconButton
          onClick={
            onClose
          }

          sx={{
            width: 32,
            height: 32,

            color:
              "#fff",

            bgcolor:
              "rgba(255,255,255,.12)",

            "&:hover": {
              bgcolor:
                "rgba(255,255,255,.2)",
            },
          }}
        >
          <CloseIcon
            sx={{
              fontSize: 18,
            }}
          />
        </IconButton>

      </Box>


      <DialogContent
        sx={{
          p: 2.2,

          bgcolor:
            "#f8fafc",
        }}
      >

        {/* TITLE */}

        <TextField
          fullWidth

          size="small"

          label=
            "Component Title"

          value={
            title
          }

          onChange={(e) =>
            setTitle(
              e.target.value
            )
          }

          sx={{
            ...fieldSx,

            mb: 2,
          }}
        />


        {/* MEDIA TYPE */}

        <Typography
          sx={
            labelSx
          }
        >
          Media Type
        </Typography>


        <Box
          sx={{
            display:
              "flex",

            gap: 1.2,

            mb: 2,
          }}
        >

          <ToggleCard
            selected={
              mediaType ===
              "image"
            }

            title=
              "Image"

            subtitle=
              "JPG, PNG, WebP, GIF"

            icon={
              <ImageOutlinedIcon />
            }

            onClick={() => {

                setMediaType(
                  "image"
                );


                setMediaUrl(
                  ""
                );


                setPreviewUrl(
                  ""
                );
              }}
          />


          <ToggleCard
            selected={
              mediaType ===
              "video"
            }

            title=
              "Video"

            subtitle=
              "MP4, WebM or direct URL"

            icon={
              <VideoLibraryOutlinedIcon />
            }

            onClick={() => {

  setMediaType(
    "video"
  );


  setMediaUrl(
    ""
  );


  setPreviewUrl(
    ""
  );
}}
          />

        </Box>


        {/* SOURCE */}

        <Typography
          sx={
            labelSx
          }
        >
          Source
        </Typography>


        <Select
          fullWidth

          size="small"

          value={
            sourceType
          }

          onChange={(e) =>
            setSourceType(
              e.target.value
            )
          }

          sx={{
            mb: 1.2,

            fontSize: 11.5,
          }}
        >
          <MenuItem
            value=
              "upload"
          >
            Upload File
          </MenuItem>

          <MenuItem
            value=
              "url"
          >
            Media URL
          </MenuItem>
        </Select>


        {sourceType ===
          "upload" ? (

          <Button
  component="label"
  variant="outlined"
  fullWidth

  sx={{
    mb: 1.5,
    minHeight: 42,
    textTransform: "none",
    fontSize: 11.5,
  }}
>
  {mediaType === "image"
    ? "Choose Image — Max 2 MB"
    : "Choose Video — Max 2 MB"}

  <input
    hidden
    type="file"

    accept={
      mediaType === "image"
        ? "image/png,image/jpeg,image/webp,image/gif"
        : "video/mp4,video/webm"
    }

    onChange={
      handleFile
    }
  />
</Button>

        ) : (

          <TextField
            fullWidth

            size="small"

            label=
              "Media URL"

            value={
              mediaUrl
            }

            onChange={(e) => {

              setMediaUrl(
                e.target.value
              );


              setPreviewUrl(
                e.target.value
              );
            }}

            sx={{
              ...fieldSx,

              mb: 1.5,
            }}
          />

        )}


        {/* PREVIEW */}

        {previewUrl && (

          <Box
            sx={{
              mb: 2,

              minHeight:
                180,

              p: 1.2,

              border:
                "1px solid #dae4ec",

              borderRadius:
                "7px",

              bgcolor:
                "#fff",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              overflow:
                "hidden",
            }}
          >

            {mediaType ===
              "image" ? (

              <Box
                component=
                  "img"

                src={
                  previewUrl
                }

                alt=
                  "Preview"

                sx={{
                  maxWidth:
                    "100%",

                  maxHeight:
                    320,

                  objectFit:
                    fit,
                }}
              />

            ) : (

              <Box
                component=
                  "video"

                src={
                  previewUrl
                }

                controls

                muted

                sx={{
                  width:
                    "100%",

                  maxHeight:
                    320,

                  objectFit:
                    fit,

                  bgcolor:
                    "#000",
                }}
              />

            )}

          </Box>

        )}


        {/* LAYOUT */}

        <Box
          sx={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(3, 1fr)",

            gap: 1.2,

            mb: 1.7,
          }}
        >

          <Box>

            <Typography
              sx={
                labelSx
              }
            >
              Width
            </Typography>

            <Select
              fullWidth

              size="small"

              value={
                width
              }

              onChange={(e) =>
                setWidth(
                  e.target.value
                )
              }

              sx={{
                fontSize:
                  11.5,
              }}
            >
              <MenuItem value="25%">
                25%
              </MenuItem>

              <MenuItem value="50%">
                50%
              </MenuItem>

              <MenuItem value="75%">
                75%
              </MenuItem>

              <MenuItem value="100%">
                100%
              </MenuItem>
            </Select>

          </Box>


          <Box>

            <Typography
              sx={
                labelSx
              }
            >
              Alignment
            </Typography>

            <Select
              fullWidth

              size="small"

              value={
                alignment
              }

              onChange={(e) =>
                setAlignment(
                  e.target.value
                )
              }

              sx={{
                fontSize:
                  11.5,
              }}
            >
              <MenuItem value="left">
                Left
              </MenuItem>

              <MenuItem value="center">
                Center
              </MenuItem>

              <MenuItem value="right">
                Right
              </MenuItem>
            </Select>

          </Box>


          <Box>

            <Typography
              sx={
                labelSx
              }
            >
              Fit
            </Typography>

            <Select
              fullWidth

              size="small"

              value={
                fit
              }

              onChange={(e) =>
                setFit(
                  e.target.value
                )
              }

              sx={{
                fontSize:
                  11.5,
              }}
            >
              <MenuItem value="contain">
                Contain
              </MenuItem>

              <MenuItem value="cover">
                Cover
              </MenuItem>
            </Select>

          </Box>

        </Box>


        {/* IMAGE SETTINGS */}

        {mediaType ===
          "image" && (

          <TextField
            fullWidth

            size="small"

            label=
              "Alt Text"

            value={
              altText
            }

            onChange={(e) =>
              setAltText(
                e.target.value
              )
            }

            sx={{
              ...fieldSx,

              mb: 1.5,
            }}
          />

        )}


        {/* VIDEO SETTINGS */}

        {mediaType ===
          "video" && (

          <>
            <Typography
              sx={
                labelSx
              }
            >
              Aspect Ratio
            </Typography>


            <Select
              fullWidth

              size="small"

              value={
                aspectRatio
              }

              onChange={(e) =>
                setAspectRatio(
                  e.target.value
                )
              }

              sx={{
                mb: 1.5,

                fontSize:
                  11.5,
              }}
            >
              <MenuItem value="16/9">
                16 : 9
              </MenuItem>

              <MenuItem value="4/3">
                4 : 3
              </MenuItem>

              <MenuItem value="1/1">
                1 : 1
              </MenuItem>
            </Select>


            <Box
              sx={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(4, 1fr)",

                gap: 1,
                mb: 1.5,
              }}
            >

              {[
                [
                  "Controls",
                  controls,
                  setControls,
                ],

                [
                  "Autoplay",
                  autoplay,
                  setAutoplay,
                ],

                [
                  "Muted",
                  muted,
                  setMuted,
                ],

                [
                  "Loop",
                  loop,
                  setLoop,
                ],
              ].map(
                ([
                  label,
                  value,
                  setter,
                ]) => (

                  <Box
                    key={
                      label
                    }

                    sx={{
                      px: 1,

                      py: 0.4,

                      border:
                        "1px solid #dde6ed",

                      borderRadius:
                        "6px",

                      bgcolor:
                        "#fff",

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "space-between",
                    }}
                  >

                    <Typography
                      sx={{
                        fontSize:
                          10.5,

                        color:
                          "#506579",
                      }}
                    >
                      {label}
                    </Typography>


                    <Switch
                      size="small"

                      checked={
                        value
                      }

                      onChange={(e) =>
                        setter(
                          e.target.checked
                        )
                      }
                    />

                  </Box>

                )
              )}

            </Box>

          </>

        )}


        {/* CAPTION */}

        <TextField
          fullWidth

          size="small"

          label=
            "Caption"

          value={
            caption
          }

          onChange={(e) =>
            setCaption(
              e.target.value
            )
          }

          sx={
            fieldSx
          }
        />

      </DialogContent>


      <DialogActions
        sx={{
          px: 2.2,
          py: 1.3,

          borderTop:
            "1px solid #e1e8ee",

          bgcolor:
            "#fff",
        }}
      >

        <Button
          onClick={
            onClose
          }

          sx={{
            textTransform:
              "none",

            fontSize:
              11,
          }}
        >
          Cancel
        </Button>


        <Button
          variant=
            "contained"

          onClick={
            handleSave
          }

          sx={{
            px: 2,

            textTransform:
              "none",

            fontSize:
              11,

            bgcolor:
              "#0879df",
          }}
        >
          Save Media
        </Button>

      </DialogActions>

    </Dialog>
  );
}