import React, { useMemo } from "react";

import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import DescriptionOutlinedIcon from
  "@mui/icons-material/DescriptionOutlined";

import CloudUploadOutlinedIcon from
  "@mui/icons-material/CloudUploadOutlined";

import ChatBubbleOutlineRoundedIcon from
  "@mui/icons-material/ChatBubbleOutlineRounded";

import SendRoundedIcon from
  "@mui/icons-material/SendRounded";


/* ============================================================
   SHARED STYLES
============================================================ */

const LABEL_SX = {
  display: "block",

  mb: "5px",

  fontSize: "8px",

  lineHeight: 1,

  fontWeight: 800,

  letterSpacing: ".35px",

  textTransform: "uppercase",

  color: "#5d7184",
};


const CONTROL_SX = {
  "& .MuiOutlinedInput-root": {
    minHeight: 31,

    bgcolor: "#ffffff",

    borderRadius: "4px",

    "& fieldset": {
      borderColor: "#bfd1e0",
    },

    "&:hover fieldset": {
      borderColor: "#9ebbd1",
    },

    "&.Mui-focused fieldset": {
      borderColor: "#62a8d8",
      borderWidth: "1px",
    },

    "&.Mui-disabled": {
      bgcolor: "#fafafa",

      "& fieldset": {
        borderColor: "#e1e5e8",
      },
    },
  },

  "& .MuiInputBase-input": {
    px: 1,
    py: "6px",

    fontSize: "10px",

    color: "#29435a",
  },

  "& .MuiSelect-select": {
    py: "6px !important",
    px: "9px !important",

    fontSize: "10px",

    color: "#29435a",
  },
};


/* ============================================================
   CARD
============================================================ */

function FormSectionCard({
  icon,
  title,
  subtitle,
  children,
}) {
  return (
    <Box
      sx={{
        border:
          "1px solid #cfddea",

        borderRadius:
          "7px",

        overflow:
          "hidden",

        bgcolor:
          "#ffffff",

        boxShadow:
          "none",
      }}
    >
      {/* HEADER */}

      <Box
        sx={{
          minHeight: 31,

          px: 1.25,

          display: "flex",

          alignItems:
            "center",

          gap: 0.75,

          background:
            "linear-gradient(#f8fbfd,#eef5fa)",

          borderBottom:
            "1px solid #cfddea",
        }}
      >
        <Box
          sx={{
            width: 18,
            height: 18,

            flexShrink: 0,

            display: "grid",

            placeItems:
              "center",

            color:
              "#0d4f82",

            "& .MuiSvgIcon-root":
              {
                fontSize: 14,
              },
          }}
        >
          {icon}
        </Box>

        <Box>
          <Typography
            sx={{
              fontSize: 10.5,

              fontWeight:
                800,

              color:
                "#0d4f82",

              lineHeight:
                1.15,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              sx={{
                mt: 0.15,

                fontSize:
                  7.7,

                color:
                  "#7b8e9d",
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {/* BODY */}

      <Box
        sx={{
          p: 1.25,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}


/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function SimpleWorkflowViewForm({
  header,
  step,
  previewFields = [],
  formValues = {},
  setFormValues,
}) {

  /* ==========================================================
     CLASSIFY FIELDS
  ========================================================== */

  const {
    detailFields,
    attachmentFields,
    commentFields,
  } = useMemo(() => {

    const details = [];
    const uploads = [];
    const comments = [];

    (previewFields || []).forEach(
      (field) => {

        if (!field?.visible) {
          return;
        }

        const column =
          String(
            field.column || ""
          )
            .trim()
            .toLowerCase();

        const inputType =
          String(
            field.input_type ||
              ""
          )
            .trim()
            .toLowerCase();


        if (
          inputType ===
          "attachment"
        ) {
          uploads.push(field);

          return;
        }


        if (
          column ===
            "step_comments" ||
          column ===
            "comments" ||
          column ===
            "comment"
        ) {
          comments.push(
            field
          );

          return;
        }


        details.push(field);
      }
    );


    return {
      detailFields:
        details,

      attachmentFields:
        uploads,

      commentFields:
        comments,
    };

  }, [previewFields]);


  /* ==========================================================
     FIELD UPDATE
  ========================================================== */

  const setValue = (
    key,
    value
  ) => {

    setFormValues?.(
      (previous) => ({
        ...previous,

        [key]:
          value,
      })
    );

  };


  /* ==========================================================
     OPTIONS
  ========================================================== */

  function getOptions(field) {

    if (
      Array.isArray(
        field?.option_list
      ) &&
      field.option_list
        .length
    ) {
      return field.option_list.map(
        (option, index) => ({
          value:
            option?.value ??
            option?.id ??
            String(
              index + 1
            ),

          label:
            option?.label ??
            option?.name ??
            String(
              option?.value ??
                ""
            ),
        })
      );
    }


    return String(
      field?.options || ""
    )
      .split(",")
      .map(
        (value) =>
          value.trim()
      )
      .filter(Boolean)
      .map(
        (label, index) => ({
          value: label,

          label,
        })
      );

  }


  /* ==========================================================
     RENDER FIELD
  ========================================================== */

  function renderField(field) {

    const key =
      String(
        field.column || ""
      );

    const label =
      field.label ||
      key.replace(
        /_/g,
        " "
      );

    const type =
      String(
        field.input_type ||
          "text"
      ).toLowerCase();

    const value =
      formValues?.[key] ??
      "";

    const disabled =
      Boolean(
        field.read_only
      );

    const required =
      Boolean(
        field.mandatory
      );


    /* TEXTAREA */

    if (
      type ===
      "textarea"
    ) {
      return (
        <Box>
          <Typography
            sx={LABEL_SX}
          >
            {label}

            {required
              ? " *"
              : ""}
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={3}

            size="small"

            value={value}

            disabled={
              disabled
            }

            onChange={(e) =>
              setValue(
                key,
                e.target
                  .value
              )
            }

            sx={CONTROL_SX}
          />
        </Box>
      );
    }


    /* DROPDOWN */

    if (
      type ===
      "dropdownlist"
    ) {

      const options =
        getOptions(field);

      return (
        <Box>
          <Typography
            sx={LABEL_SX}
          >
            {label}

            {required
              ? " *"
              : ""}
          </Typography>

          <FormControl
            fullWidth
            size="small"

            disabled={
              disabled
            }

            sx={CONTROL_SX}
          >
            <Select
              value={value}

              displayEmpty

              onChange={(e) =>
                setValue(
                  key,
                  e.target
                    .value
                )
              }
            >
              <MenuItem value="">
                Select
              </MenuItem>

              {options.map(
                (option) => (
                  <MenuItem
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>
        </Box>
      );
    }


    /* RADIO */

    if (
      type ===
      "radio"
    ) {

      const options =
        getOptions(field);

      return (
        <Box>
          <Typography
            sx={LABEL_SX}
          >
            {label}

            {required
              ? " *"
              : ""}
          </Typography>

          <RadioGroup
            value={value}

            onChange={(e) =>
              setValue(
                key,
                e.target
                  .value
              )
            }

            sx={{
              flexDirection:
                "row",

              gap: 1.5,

              "& .MuiFormControlLabel-root":
                {
                  m: 0,
                },

              "& .MuiFormControlLabel-label":
                {
                  fontSize:
                    9.5,
                },

              "& .MuiSvgIcon-root":
                {
                  fontSize:
                    16,
                },
            }}
          >
            {options.map(
              (option) => (
                <FormControlLabel
                  key={
                    option.value
                  }

                  value={
                    option.value
                  }

                  disabled={
                    disabled
                  }

                  control={
                    <Radio
                      size="small"
                    />
                  }

                  label={
                    option.label
                  }
                />
              )
            )}
          </RadioGroup>
        </Box>
      );
    }


    /* CHECKBOX */

    if (
      type ===
      "checkbox"
    ) {

      const options =
        getOptions(field);

      const selected =
        Array.isArray(
          value
        )
          ? value
          : [];

      return (
        <Box>
          <Typography
            sx={LABEL_SX}
          >
            {label}

            {required
              ? " *"
              : ""}
          </Typography>

          <Stack
            direction="row"

            spacing={1.25}

            useFlexGap

            flexWrap="wrap"
          >
            {options.map(
              (option) => {

                const checked =
                  selected.includes(
                    option.value
                  );

                return (
                  <FormControlLabel
                    key={
                      option.value
                    }

                    disabled={
                      disabled
                    }

                    control={
                      <Checkbox
                        size="small"

                        checked={
                          checked
                        }

                        onChange={(e) => {

                          const next =
                            new Set(
                              selected
                            );

                          if (
                            e.target
                              .checked
                          ) {
                            next.add(
                              option.value
                            );
                          } else {
                            next.delete(
                              option.value
                            );
                          }

                          setValue(
                            key,
                            Array.from(
                              next
                            )
                          );
                        }}

                        sx={{
                          p: 0.35,

                          "& .MuiSvgIcon-root":
                            {
                              fontSize:
                                16,
                            },
                        }}
                      />
                    }

                    label={
                      option.label
                    }

                    sx={{
                      m: 0,

                      "& .MuiFormControlLabel-label":
                        {
                          fontSize:
                            9.5,
                        },
                    }}
                  />
                );
              }
            )}
          </Stack>
        </Box>
      );
    }


    /* DATE */

    if (
      type === "date"
    ) {
      return (
        <Box>
          <Typography
            sx={LABEL_SX}
          >
            {label}

            {required
              ? " *"
              : ""}
          </Typography>

          <TextField
            fullWidth

            size="small"

            type="date"

            value={value}

            disabled={
              disabled
            }

            onChange={(e) =>
              setValue(
                key,
                e.target
                  .value
              )
            }

            sx={CONTROL_SX}
          />
        </Box>
      );
    }


    /* NUMBER */

    if (
      type ===
      "integer"
    ) {
      return (
        <Box>
          <Typography
            sx={LABEL_SX}
          >
            {label}

            {required
              ? " *"
              : ""}
          </Typography>

          <TextField
            fullWidth

            size="small"

            type="number"

            value={value}

            disabled={
              disabled
            }

            onChange={(e) =>
              setValue(
                key,
                e.target
                  .value
              )
            }

            sx={CONTROL_SX}
          />
        </Box>
      );
    }


    /* NORMAL TEXT */

    return (
      <Box>
        <Typography
          sx={LABEL_SX}
        >
          {label}

          {required
            ? " *"
            : ""}
        </Typography>

        <TextField
          fullWidth

          size="small"

          value={value}

          disabled={
            disabled
          }

          onChange={(e) =>
            setValue(
              key,
              e.target.value
            )
          }

          sx={CONTROL_SX}
        />
      </Box>
    );
  }


  /* ==========================================================
     UPLOAD FIELD
  ========================================================== */

  function renderUploadField(
    field
  ) {

    const key =
      String(
        field.column ||
          "_attachments"
      );

    const files =
      Array.isArray(
        formValues?.[key]
      )
        ? formValues[key]
        : [];


    return (
      <Box>
        <Typography
          sx={LABEL_SX}
        >
          {field.label ||
            "Attachments"}
        </Typography>


        <Box
          sx={{
            minHeight: 64,

            px: 1.25,
            py: 1,

            display: "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            gap: 1,

            border:
              "1px dashed #b8cad8",

            borderRadius:
              "4px",

            bgcolor:
              "#fbfcfd",
          }}
        >

          <Box>
            <Typography
              sx={{
                fontSize:
                  9.5,

                fontWeight:
                  700,

                color:
                  "#405a6d",
              }}
            >
              Upload supporting
              documents
            </Typography>

            <Typography
              sx={{
                mt: 0.2,

                fontSize:
                  8,

                color:
                  "#80909d",
              }}
            >
              Select one or more
              files.
            </Typography>
          </Box>


          <Button
            variant="outlined"

            component="label"

            size="small"

            sx={{
              minHeight: 29,

              px: 1.1,

              borderRadius:
                "3px",

              textTransform:
                "none",

              fontSize: 9,

              fontWeight:
                700,
            }}
          >
            Browse

            <input
              hidden

              multiple

              type="file"

              onChange={(e) => {

                const nextFiles =
                  Array.from(
                    e.target
                      .files ||
                      []
                  );

                setValue(
                  key,
                  nextFiles
                );
              }}
            />
          </Button>
        </Box>


        {files.length >
          0 && (
          <Stack
            spacing={0.5}

            sx={{
              mt: 0.75,
            }}
          >
            {files.map(
              (file, index) => (
                <Box
                  key={`${file?.name || "file"}-${index}`}

                  sx={{
                    minHeight:
                      27,

                    px: 0.8,

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    gap: 1,

                    border:
                      "1px solid #e1e8ed",

                    borderRadius:
                      "3px",

                    bgcolor:
                      "#fafcfd",

                    fontSize:
                      8.5,

                    color:
                      "#526b7e",
                  }}
                >
                  <Box
                    sx={{
                      minWidth:
                        0,

                      overflow:
                        "hidden",

                      textOverflow:
                        "ellipsis",

                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {file?.name ||
                      `File ${
                        index + 1
                      }`}
                  </Box>


                  <Button
                    size="small"

                    variant="text"

                    onClick={() => {

                      const next =
                        [
                          ...files,
                        ];

                      next.splice(
                        index,
                        1
                      );

                      setValue(
                        key,
                        next
                      );
                    }}

                    sx={{
                      minWidth:
                        0,

                      px: 0.5,

                      fontSize:
                        8,

                      textTransform:
                        "none",
                    }}
                  >
                    Remove
                  </Button>
                </Box>
              )
            )}
          </Stack>
        )}

      </Box>
    );
  }


  /* ==========================================================
     FALLBACK COMMENT FIELD
  ========================================================== */

  const fallbackCommentKey =
    "_view_form_comments";


  return (
    <Box
      sx={{
        px: 1.5,

        py: 1.4,

        bgcolor:
          "#ffffff",
      }}
    >

      {/* ======================================================
          FORM HEADER
      ====================================================== */}

      <Box
        sx={{
          mb: 1.25,

          px: 1.35,
          py: 1,

          display: "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap: 1,

          border:
            "1px solid #d5e1ea",

          borderRadius:
            "5px",

          bgcolor:
            "#f8fbfd",
        }}
      >

        <Box>
          <Typography
            sx={{
              fontSize: 13,

              lineHeight:
                1.15,

              fontWeight:
                800,

              color:
                "#17324d",
            }}
          >
            {header
              ?.workflow_map_name ||
              "Workflow Form"}
          </Typography>

          <Typography
            sx={{
              mt: 0.25,

              fontSize: 8.3,

              color:
                "#75899a",
            }}
          >
            {step?.step_name ||
              "Workflow Step"}

            {" · "}

            {Number(
              step?.step_no
            ) === 0
              ? "New submission"
              : "Workflow update"}
          </Typography>
        </Box>


        <Box
          sx={{
            px: 0.8,

            py: 0.25,

            border:
              "1px solid #cad9e4",

            borderRadius:
              "3px",

            bgcolor:
              "#ffffff",

            color:
              "#61788b",

            fontSize: 8,

            fontWeight: 700,
          }}
        >
          Preview
        </Box>

      </Box>


      <Stack spacing={1.25}>

        {/* ====================================================
            DETAILS
        ==================================================== */}

        <FormSectionCard
          title="Details"

          subtitle="Enter the required form information."

          icon={
            <DescriptionOutlinedIcon />
          }
        >

          {detailFields.length >
          0 ? (

            <Grid
              container

              columnSpacing={
                1.25
              }

              rowSpacing={
                1.15
              }
            >
              {detailFields.map(
                (field) => (
                  <Grid
                    item

                    xs={12}

                    md={
                      String(
                        field.input_type
                      ).toLowerCase() ===
                        "textarea"
                        ? 12
                        : 6
                    }

                    key={
                      field.column
                    }
                  >
                    {renderField(
                      field
                    )}
                  </Grid>
                )
              )}
            </Grid>

          ) : (

            <Typography
              sx={{
                fontSize: 9,

                color:
                  "#7a8d9d",
              }}
            >
              No detail fields
              are configured.
            </Typography>

          )}

        </FormSectionCard>


        {/* ====================================================
            UPLOAD
        ==================================================== */}

        <FormSectionCard
          title="Upload"

          subtitle="Attach supporting documents where required."

          icon={
            <CloudUploadOutlinedIcon />
          }
        >

          {attachmentFields.length >
          0 ? (

            <Stack
              spacing={1}
            >
              {attachmentFields.map(
                (field) => (
                  <Box
                    key={
                      field.column
                    }
                  >
                    {renderUploadField(
                      field
                    )}
                  </Box>
                )
              )}
            </Stack>

          ) : (

            <Box
              sx={{
                minHeight: 52,

                px: 1,

                display:
                  "flex",

                alignItems:
                  "center",

                border:
                  "1px dashed #d6e0e7",

                borderRadius:
                  "4px",

                bgcolor:
                  "#fbfcfd",
              }}
            >
              <Typography
                sx={{
                  fontSize: 8.8,

                  color:
                    "#81909d",
                }}
              >
                No attachment field
                is configured for
                this step.
              </Typography>
            </Box>

          )}

        </FormSectionCard>


        {/* ====================================================
            COMMENTS
        ==================================================== */}

        <FormSectionCard
          title="Comments"

          subtitle="Add comments or supporting notes."

          icon={
            <ChatBubbleOutlineRoundedIcon />
          }
        >

          {commentFields.length >
          0 ? (

            <Stack
              spacing={1}
            >
              {commentFields.map(
                (field) => (
                  <Box
                    key={
                      field.column
                    }
                  >
                    {renderField({
                      ...field,

                      input_type:
                        "textarea",
                    })}
                  </Box>
                )
              )}
            </Stack>

          ) : (

            <Box>
              <Typography
                sx={LABEL_SX}
              >
                Comments
              </Typography>

              <TextField
                fullWidth

                multiline

                minRows={3}

                size="small"

                placeholder="Enter comments..."

                value={
                  formValues?.[
                    fallbackCommentKey
                  ] || ""
                }

                onChange={(e) =>
                  setValue(
                    fallbackCommentKey,
                    e.target
                      .value
                  )
                }

                sx={CONTROL_SX}
              />
            </Box>

          )}

        </FormSectionCard>


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <Box
          sx={{
            pt: 0.25,

            display: "flex",

            justifyContent:
              "flex-end",

            gap: 0.7,
          }}
        >
          <Button
            variant="outlined"

            size="small"

            disabled

            sx={{
              minHeight: 30,

              px: 1.2,

              borderRadius:
                "3px",

              textTransform:
                "none",

              fontSize: 9,
            }}
          >
            Cancel
          </Button>


          <Button
            variant="contained"

            size="small"

            disabled

            endIcon={
              <SendRoundedIcon
                sx={{
                  fontSize:
                    "12px !important",
                }}
              />
            }

            sx={{
              minHeight: 30,

              px: 1.3,

              borderRadius:
                "3px",

              textTransform:
                "none",

              fontSize: 9,

              fontWeight:
                700,

              bgcolor:
                "#0879df",

              boxShadow:
                "none",
            }}
          >
            {step
              ?.approve_button_name ||
              (Number(
                step?.step_no
              ) === 0
                ? "Submit"
                : "Save")}
          </Button>
        </Box>

      </Stack>

    </Box>
  );
}