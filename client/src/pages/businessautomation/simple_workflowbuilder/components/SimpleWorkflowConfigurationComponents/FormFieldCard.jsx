import React from "react";

import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import api from "../../../../../services/api";


const LABEL_SX = {
  display: "block",
  mb: "5px",
  ml: "1px",

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

  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: "#8d969e",
    color: "#8d969e",
  },

  "& .MuiSelect-select.Mui-disabled": {
    WebkitTextFillColor: "#8d969e",
    color: "#8d969e",
  },
};


export default function FormFieldCard({
  r,
  idx,
  isInitiate,
  onChangeRow,
  DATE_GRANULARITIES,
  INPUT_TYPES,
  recordId,
  header,
}) {

  const ro = !!r.read_only;

  const roDisplayOnly = false;

  const dt =
    String(
      r.data_type || ""
    ).toLowerCase();

  const isWorkflowId =
    String(
      r.column || ""
    ).toLowerCase() ===
    "workflow_id";

  const isDateType =
    dt === "date" ||
    dt === "timestamp" ||
    dt === "timestamptz";


  const supportsOptions = [
    "checkbox",
    "radio",
    "dropdownlist",
  ].includes(
    String(
      r.input_type
    ).toLowerCase()
  );


  const inputTypeChoices =
    INPUT_TYPES.map(
      (opt) =>
        opt.value === "date" &&
        !isDateType
          ? {
              ...opt,
              disabled: true,
            }
          : opt
    );


  const effectiveInputType =
    isDateType
      ? "date"
      : r.input_type ||
        "text";


  /* ============================================================
     WORKFLOW_ID ENFORCEMENT
  ============================================================ */

  React.useEffect(() => {

    if (!isWorkflowId) {
      return;
    }

    const patch = {};

    if (
      r.read_only !== true
    ) {
      patch.read_only = true;
    }

    if (r.data_entry) {
      patch.data_entry = false;
    }

    if (r.mandatory) {
      patch.mandatory = false;
    }

    if (
      Object.keys(patch)
        .length
    ) {
      onChangeRow(
        idx,
        patch
      );
    }

  }, [
    isWorkflowId,
    r.read_only,
    r.data_entry,
    r.mandatory,
    idx,
    onChangeRow,
  ]);


  /* ============================================================
     ATTACHMENTS
  ============================================================ */

  async function handleAttachmentUpload(
    e
  ) {

    const files =
      Array.from(
        e.target.files || []
      );

    if (!files.length) {
      return;
    }

    try {

      const uploaded = [];

      for (
        const f of files
      ) {

        const form =
          new FormData();

        form.append(
          "file",
          f
        );

        form.append(
          "ref_table",
          header
            ?.workflow_table_name ||
            "approval_items"
        );

        form.append(
          "ref_table_id",
          recordId ||
            r?.current_row_id ||
            ""
        );

        if (recordId) {
          form.append(
            "workflow_id",
            String(recordId)
          );
        }

        const { data } =
          await api.post(
            "/upload",
            form,
            {
              headers: {
                "Content-Type":
                  "multipart/form-data",
              },
            }
          );

        if (data?.file) {
          uploaded.push(
            data.file
          );
        } else if (
          Array.isArray(
            data?.files
          )
        ) {
          uploaded.push(
            ...data.files
          );
        } else {
          uploaded.push(
            data
          );
        }
      }

      onChangeRow(
        idx,
        {
          attachments: [
            ...(r.attachments ||
              []),
            ...uploaded,
          ],
        }
      );

    } catch (err) {

      console.error(
        "upload failed",
        err
      );

      alert(
        "Upload failed. Please try again."
      );

    } finally {

      e.target.value = "";

    }
  }


  function removeAttachment(
    i
  ) {

    const next = [
      ...(r.attachments ||
        []),
    ];

    next.splice(i, 1);

    onChangeRow(
      idx,
      {
        attachments: next,
      }
    );
  }


  /* ============================================================
     DISPLAY NAME
  ============================================================ */

  const displayName =
    String(
      r.label ||
        r.column ||
        ""
    )
      .replace(/_/g, " ")
      .trim();


  return (
  <Box
    sx={{
      mb: 1.25,

      border: "1px solid #cfddea",

      borderRadius: "7px",

      overflow: "hidden",

      bgcolor: "#ffffff",

      boxShadow: "none",
    }}
  >

    {/* ========================================================
        FIELD CARD HEADER
    ======================================================== */}

    <Box
      sx={{
        minHeight: 30,

        px: 1.25,

        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",

        gap: 1,

        background:
          "linear-gradient(#f8fbfd,#eef5fa)",

        borderBottom:
          "1px solid #cfddea",
      }}
    >

      {/* LEFT - FIELD */}

      <Box
        sx={{
          minWidth: 0,

          display: "flex",
          alignItems: "center",

          gap: 0.75,
        }}
      >

        {/* SAME SMALL ICON STYLE AS BASIC INFO */}

        <Box
          sx={{
            width: 14,
            height: 14,

            flexShrink: 0,

            display: "grid",
            placeItems: "center",

            color: "#0d4f82",

            fontSize: 9,
            fontWeight: 700,
          }}
        >
          ▣
        </Box>


        {/* FIELD NAME */}

        <Typography
          sx={{
            minWidth: 0,

            fontSize: 10,

            lineHeight: 1,

            fontWeight: 800,

            color: "#0d4f82",

            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName || "Field"}
        </Typography>


        {/* SYSTEM FIELD */}

        {isWorkflowId && (
          <Box
            sx={{
              px: 0.55,
              py: 0.1,

              borderRadius: "3px",

              bgcolor: "#e8edf1",

              border:
                "1px solid #d8e0e6",

              color: "#73818c",

              fontSize: 7,

              lineHeight: 1.2,

              fontWeight: 700,

              letterSpacing: ".04em",

              textTransform: "uppercase",
            }}
          >
            System
          </Box>
        )}

      </Box>


      {/* ======================================================
          QUIET DATABASE METADATA
      ====================================================== */}

      <Stack
        direction="row"

        spacing={0.55}

        alignItems="center"

        sx={{
          flexShrink: 0,
        }}
      >

        <Typography
          sx={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, monospace",

            fontSize: 7.5,

            color: "#748797",
          }}
        >
          {r.column}
        </Typography>


        <Box
          sx={{
            width: 3,
            height: 3,

            borderRadius: "50%",

            bgcolor: "#9fb0bd",
          }}
        />


        <Typography
          sx={{
            fontSize: 7.5,

            color: "#748797",

            textTransform: "lowercase",
          }}
        >
          {r.data_type || "unknown"}
        </Typography>

      </Stack>

    </Box>


    {/* ========================================================
        FORM SETTINGS
    ======================================================== */}

      {/* ========================================================
          FORM SETTINGS
      ======================================================== */}

      <Box
          sx={{
            px: 1.25,
            pt: 1.15,
            pb: 1.05,
          }}
        >

        <Grid
          container
          columnSpacing={1.25}
          rowSpacing={1.15}
        >

          {/* LABEL */}

          <Grid
            item
            xs={12}
            md={5}
          >

            <Typography
              sx={LABEL_SX}
            >
              Label Name
            </Typography>

            <TextField
              fullWidth
              size="small"

              value={
                r.label || ""
              }

              onChange={(e) =>
                onChangeRow(
                  idx,
                  {
                    label:
                      e.target
                        .value,
                  }
                )
              }

              disabled={ro}

              placeholder="Enter field label"

              sx={CONTROL_SX}
            />

          </Grid>


          {/* INPUT TYPE */}

          <Grid
            item
            xs={12}
            md={4}
          >

            <Typography
              sx={LABEL_SX}
            >
              Input Type
            </Typography>


            {isInitiate ? (

              <FormControl
                fullWidth
                size="small"

                sx={
                  CONTROL_SX
                }

                disabled={
                  ro ||
                  isDateType
                }
              >
                <Select
                  value={
                    effectiveInputType
                  }

                  onChange={(e) => {

                    const it =
                      e.target
                        .value;

                    const isOpt =
                      [
                        "checkbox",
                        "radio",
                        "dropdownlist",
                      ].includes(
                        it
                      );

                    onChangeRow(
                      idx,
                      {
                        input_type:
                          isDateType
                            ? "date"
                            : it,

                        options:
                          isOpt
                            ? r.options ||
                              ""
                            : "",
                      }
                    );
                  }}
                >

                  {inputTypeChoices.map(
                    (opt) => (
                      <MenuItem
                        key={
                          opt.value
                        }

                        value={
                          opt.value
                        }

                        disabled={
                          opt.disabled
                        }
                      >
                        {
                          opt.label
                        }
                      </MenuItem>
                    )
                  )}

                </Select>
              </FormControl>

            ) : (

              <TextField
                fullWidth
                size="small"

                value={
                  effectiveInputType
                }

                disabled

                sx={
                  CONTROL_SX
                }
              />

            )}

          </Grid>


          {/* DATE GRANULARITY */}

          <Grid
            item
            xs={12}
            md={3}
          >

            <Typography
              sx={LABEL_SX}
            >
              Date Granularity
            </Typography>

            <FormControl
              fullWidth
              size="small"

              sx={CONTROL_SX}

              disabled={
                !isInitiate ||
                !isDateType ||
                ro
              }
            >

              <Select
                value={
                  r.date_granularity ||
                  (isDateType
                    ? "date"
                    : "")
                }

                displayEmpty

                onChange={(e) =>
                  onChangeRow(
                    idx,
                    {
                      date_granularity:
                        e.target
                          .value,
                    }
                  )
                }
              >

                {isDateType ? (

                  DATE_GRANULARITIES.map(
                    (opt) => (
                      <MenuItem
                        key={
                          opt.value
                        }
                        value={
                          opt.value
                        }
                      >
                        {
                          opt.label
                        }
                      </MenuItem>
                    )
                  )

                ) : (

                  <MenuItem value="">
                    —
                  </MenuItem>

                )}

              </Select>

            </FormControl>

          </Grid>


          {/* ====================================================
              OPTIONS / ATTACHMENTS
          ==================================================== */}

          <Grid
            item
            xs={12}
          >

            {String(
              effectiveInputType
            ).toLowerCase() ===
            "attachment" ? (

              <Box>

                <Typography
                  sx={LABEL_SX}
                >
                  Attachments
                </Typography>

                <Button
                  variant="outlined"
                  size="small"
                  component="label"

                  disabled={
                    !isInitiate ||
                    ro
                  }

                  sx={{
                    minHeight: 30,

                    borderRadius:
                      "4px",

                    textTransform:
                      "none",

                    fontSize: 9.5,
                  }}
                >
                  Upload attachments

                  <input
                    type="file"
                    multiple
                    hidden

                    onChange={
                      handleAttachmentUpload
                    }
                  />
                </Button>


                {(r.attachments ||
                  []).length >
                  0 && (

                  <Stack
                    spacing={0.55}
                    sx={{
                      mt: 0.8,
                    }}
                  >

                    {(r.attachments ||
                      []).map(
                      (f, i) => {

                        const name =
                          f.originalname ||
                          f.name ||
                          f.filename ||
                          f.url ||
                          `file_${
                            i + 1
                          }`;

                        return (
                          <Box
                            key={`${name}-${i}`}
                            sx={{
                              minHeight:
                                28,

                              px: 0.9,

                              display:
                                "flex",

                              alignItems:
                                "center",

                              justifyContent:
                                "space-between",

                              gap: 1,

                              border:
                                "1px solid #e2e8ed",

                              borderRadius:
                                "3px",

                              bgcolor:
                                "#fafcfd",

                              fontSize:
                                9,
                            }}
                          >

                            <Box
                              component="span"
                              sx={{
                                minWidth:
                                  0,

                                overflow:
                                  "hidden",

                                textOverflow:
                                  "ellipsis",

                                whiteSpace:
                                  "nowrap",

                                color:
                                  "#536b7f",
                              }}
                            >
                              {name}
                            </Box>


                            <Button
                              size="small"
                              variant="text"

                              onClick={() =>
                                removeAttachment(
                                  i
                                )
                              }

                              disabled={
                                !isInitiate ||
                                ro
                              }

                              sx={{
                                minWidth:
                                  0,

                                px: 0.6,

                                fontSize:
                                  8.5,

                                textTransform:
                                  "none",
                              }}
                            >
                              Remove
                            </Button>

                          </Box>
                        );
                      }
                    )}

                  </Stack>
                )}

              </Box>

            ) : (

              <>
                <Typography
                  sx={LABEL_SX}
                >
                  Options
                </Typography>

                <TextField
                  fullWidth
                  size="small"

                  placeholder={
                    supportsOptions
                      ? "Enter options separated by commas — e.g. Male, Female, Other"
                      : "Not applicable"
                  }

                  value={
                    supportsOptions
                      ? r.options ||
                        ""
                      : ""
                  }

                  onChange={(e) =>
                    onChangeRow(
                      idx,
                      {
                        options:
                          e.target
                            .value,
                      }
                    )
                  }

                  disabled={
                    ro ||
                    !supportsOptions
                  }

                  sx={CONTROL_SX}
                />
              </>

            )}

          </Grid>


          {/* ====================================================
              FIELD BEHAVIOUR
          ==================================================== */}

          <Grid
            item
            xs={12}
          >

            <Box
              sx={{
                mt: 0.15,

                pt: 0.85,

                borderTop:
                  "1px solid #e7edf2",
              }}
            >

              <Typography
  sx={{
    mb: 0.5,

    fontSize: 7.7,

    lineHeight: 1,

    fontWeight: 800,

    letterSpacing: ".4px",

    textTransform: "uppercase",

    color: "#5d7184",
  }}
>
  Field Behaviour
</Typography>


              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}

                spacing={1.4}

                useFlexGap

                flexWrap="wrap"

                sx={{
                  "& .MuiFormControlLabel-root":
                    {
                      m: 0,
                    },

                  "& .MuiFormControlLabel-label":
                    {
                      fontSize:
                        9.5,

                      color:
                        "#435b70",
                    },

                  "& .MuiCheckbox-root":
                    {
                      p: 0.35,

                      "& .MuiSvgIcon-root":
                        {
                          fontSize:
                            16,
                        },
                    },
                }}
              >

                {/* DATA ENTRY */}

                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"

                      checked={
                        isWorkflowId
                          ? false
                          : !!r.data_entry
                      }

                      onChange={(e) =>
                        onChangeRow(
                          idx,
                          {
                            data_entry:
                              e.target
                                .checked,
                          }
                        )
                      }

                      disabled={
                        isWorkflowId ||
                        r.read_only ||
                        roDisplayOnly
                      }
                    />
                  }

                  label="Data entry"
                />


                {/* READ ONLY */}

                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"

                      checked={
                        isWorkflowId
                          ? true
                          : !!r.read_only
                      }

                      onChange={(e) =>
                        onChangeRow(
                          idx,
                          {
                            read_only:
                              e.target
                                .checked,
                          }
                        )
                      }

                      disabled={
                        isWorkflowId ||
                        !!r.data_entry ||
                        roDisplayOnly
                      }
                    />
                  }

                  label="Read only"
                />


                {/* VISIBLE */}

                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"

                      checked={
                        !!r.visible
                      }

                      onChange={(e) =>
                        onChangeRow(
                          idx,
                          {
                            visible:
                              e.target
                                .checked,
                          }
                        )
                      }
                    />
                  }

                  label="Visible"
                />


                {/* MANDATORY */}

                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"

                      checked={
                        isWorkflowId
                          ? false
                          : !!r.mandatory
                      }

                      onChange={(e) =>
                        onChangeRow(
                          idx,
                          {
                            mandatory:
                              e.target
                                .checked,
                          }
                        )
                      }

                      disabled={
                        isWorkflowId ||
                        !r.data_entry ||
                        r.read_only ||
                        roDisplayOnly
                      }
                    />
                  }

                  label="Mandatory"
                />

              </Stack>

            </Box>

          </Grid>

        </Grid>

      </Box>

    </Box>
  );
}