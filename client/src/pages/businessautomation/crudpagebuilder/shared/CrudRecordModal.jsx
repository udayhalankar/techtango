import React from "react";

import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
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

import ReusableFormModal from
  "../../../../components/ReusableFormModal";

import SecureFileUploader from
  "../../../../components/SecureFileUploader";

import useCrudRecordForm from
  "./useCrudRecordForm";

import {
  codeLabelPairs,
  parseMultiValue,
  parseOptions,
  validationForField,
} from "./crudRecordUtils";


export default function CrudRecordModal({
  open,
  page,

  mode = "create",

  initialValues = {},

  onClose,
  onSaved,
}) {

  const {
    formFields,
    validations,

    values,
    setFieldValue,

    fileFields,
    setFileFields,

    loading,
    saving,

    save,
  } =
    useCrudRecordForm({
      page,
      mode,
      initialValues,
      onSaved,
    });


  if (!page) {
    return null;
  }


  const readOnly =
    mode === "view";


  return (
    <ReusableFormModal
      open={open}

      onClose={
        onClose
      }

      title={
        mode === "create"
          ? "Create Record"
          : mode === "edit"
            ? "Edit Record"
            : "View Record"
      }

      subtitle={
        page?.form_name ||
        page?.page_name ||
        ""
      }

      icon={
        mode === "create"
          ? "➕"
          : mode === "edit"
            ? "✏️"
            : "👁️"
      }

      maxWidth={660}
    >

      <Box
        sx={{
          pt: 1.5,

          "& .crud-record-field":
            {
              display:
                "flex",

              flexDirection:
                "column",

              gap: "3px",
            },

          "& .crud-record-label":
            {
              fontSize: "9px",

              lineHeight: 1.2,

              fontWeight: 300,

              color:
                "#516784",

              letterSpacing:
                "0.15px",

              textTransform:
                "uppercase",
            },

          "& .MuiOutlinedInput-root":
            {
              minHeight: 38,

              borderRadius:
                "6px",

              bgcolor:
                "#ffffff",

              "& fieldset": {
                borderColor:
                  "#c9d5e3",
              },

              "&:hover fieldset":
                {
                  borderColor:
                    "#97adc4",
                },

              "&.Mui-focused fieldset":
                {
                  borderColor:
                    "#16839a",

                  borderWidth:
                    "1px",
                },
            },

          "& .MuiInputBase-input":
            {
              py: "8px",

              px: "11px",

              fontSize: "12px",

              color:
                "#18324f",
            },

          "& .MuiSelect-select":
            {
              py:
                "8px !important",

              fontSize:
                "12px",
            },

          "& .MuiFormControlLabel-label":
            {
              fontSize:
                "11.5px",

              color:
                "#263b53",
            },
        }}
      >

        {loading ? (

          <Box
            sx={{
              minHeight: 160,

              display: "grid",

              placeItems:
                "center",
            }}
          >
            <CircularProgress
              size={22}
            />
          </Box>

        ) : (

          <Grid
            container
            spacing={2}
          >

            {formFields
              .filter(
                (
                  field,
                  index
                ) => {

                  const key =
                    field
                      ?.columnName ||
                    `field_${index}`;


                  const modeKey =
                    mode ===
                    "create"
                      ? "create"
                      : "edit";


                  const validation =
                    validationForField(
                      validations,
                      modeKey,
                      key
                    );


                  return (
                    key &&
                    ![
                      "id",
                      "date_created",
                      "date_modified",
                      "created_by",
                      "modified_by",
                    ].includes(
                      String(
                        key
                      ).toLowerCase()
                    ) &&
                    field
                      ?.visible !==
                      false &&
                    validation
                      .visible !==
                      false
                  );
                }
              )
              .map(
                (
                  field,
                  index
                ) => {

                  const key =
                    field
                      ?.columnName ||
                    `field_${index}`;


                  const label =
                    field
                      ?.label ||
                    key;


                  const inputType =
                    String(
                      field
                        ?.inputType ||
                      field
                        ?.dataType ||
                      ""
                    )
                      .toLowerCase();


                  const dataType =
                    String(
                      field
                        ?.dataType ||
                      ""
                    )
                      .toLowerCase();


                  const modeKey =
                    mode ===
                    "create"
                      ? "create"
                      : "edit";


                  const validation =
                    validationForField(
                      validations,
                      modeKey,
                      key
                    );


                  const disabled =
                    readOnly ||
                    validation
                      .read_only ===
                      true ||
                    validation
                      .data_entry ===
                      false;


                  const rawValue =
                    values[
                      key
                    ];


                  const options =
                    parseOptions(
                      field
                        ?.optionsCsv
                    );


                  const pairs =
                    codeLabelPairs(
                      options
                    );


                  if (
                    inputType ===
                    "select"
                  ) {

                    return (
                      <Grid
                        item
                        xs={12}
                        md={6}
                        key={key}
                      >

                        <Box
                          className=
                            "crud-record-field"
                        >

                          <Typography
                            className=
                              "crud-record-label"
                          >
                            {label}
                            {validation
                              .mandatory
                              ? " *"
                              : ""}
                          </Typography>


                          <FormControl
                            fullWidth
                            size="small"
                          >

                            <Select
                              value={
                                rawValue ??
                                ""
                              }

                              disabled={
                                disabled
                              }

                              onChange={
                                (event) =>
                                  setFieldValue(
                                    key,
                                    event
                                      .target
                                      .value
                                  )
                              }
                            >

                              <MenuItem
                                value=""
                              >
                                Select
                              </MenuItem>


                              {pairs.map(
                                ({
                                  code,
                                  label:
                                    optionLabel,
                                }) => (

                                  <MenuItem
                                    key={
                                      code
                                    }

                                    value={
                                      dataType.includes(
                                        "int"
                                      )
                                        ? code
                                        : optionLabel
                                    }
                                  >
                                    {
                                      optionLabel
                                    }
                                  </MenuItem>
                                )
                              )}

                            </Select>

                          </FormControl>

                        </Box>

                      </Grid>
                    );
                  }


                  if (
                    inputType ===
                    "radio"
                  ) {

                    return (
                      <Grid
                        item
                        xs={12}
                        md={6}
                        key={key}
                      >

                        <Box
                          className=
                            "crud-record-field"
                        >

                          <Typography
                            className=
                              "crud-record-label"
                          >
                            {label}
                          </Typography>


                          <RadioGroup
                            value={
                              rawValue ??
                              ""
                            }

                            onChange={
                              (event) =>
                                setFieldValue(
                                  key,
                                  event
                                    .target
                                    .value
                                )
                            }
                          >

                            {pairs.map(
                              ({
                                code,
                                label:
                                  optionLabel,
                              }) => (

                                <FormControlLabel
                                  key={
                                    code
                                  }

                                  value={
                                    dataType.includes(
                                      "int"
                                    )
                                      ? code
                                      : optionLabel
                                  }

                                  control={
                                    <Radio
                                      size="small"
                                      disabled={
                                        disabled
                                      }
                                    />
                                  }

                                  label={
                                    optionLabel
                                  }
                                />
                              )
                            )}

                          </RadioGroup>

                        </Box>

                      </Grid>
                    );
                  }


                  if (
                    inputType ===
                    "checkbox"
                  ) {

                    const selected =
                      parseMultiValue(
                        rawValue
                      );


                    return (
                      <Grid
                        item
                        xs={12}
                        md={6}
                        key={key}
                      >

                        <Box
                          className=
                            "crud-record-field"
                        >

                          <Typography
                            className=
                              "crud-record-label"
                          >
                            {label}
                          </Typography>


                          {pairs.map(
                            ({
                              code,
                              label:
                                optionLabel,
                            }) => {

                              const value =
                                dataType.includes(
                                  "int"
                                )
                                  ? code
                                  : optionLabel;


                              return (
                                <FormControlLabel
                                  key={
                                    code
                                  }

                                  control={
                                    <Checkbox
                                      size="small"

                                      disabled={
                                        disabled
                                      }

                                      checked={
                                        selected.includes(
                                          value
                                        )
                                      }

                                      onChange={
                                        (
                                          event
                                        ) => {

                                          const next =
                                            event
                                              .target
                                              .checked
                                              ? [
                                                  ...selected,
                                                  value,
                                                ]
                                              : selected.filter(
                                                  (
                                                    item
                                                  ) =>
                                                    item !==
                                                    value
                                                );


                                          setFieldValue(
                                            key,
                                            next
                                          );
                                        }
                                      }
                                    />
                                  }

                                  label={
                                    optionLabel
                                  }
                                />
                              );
                            }
                          )}

                        </Box>

                      </Grid>
                    );
                  }


                  if (
                    inputType ===
                    "image"
                  ) {

                    return (
                      <Grid
                        item
                        xs={12}
                        md={6}
                        key={key}
                      >

                        <Box
                          className=
                            "crud-record-field"
                        >

                          <Typography
                            className=
                              "crud-record-label"
                          >
                            {label}
                          </Typography>


                          {!disabled && (

                            <SecureFileUploader
                              files={
                                fileFields[
                                  key
                                ] ||
                                []
                              }

                              setFiles={
                                (
                                  next
                                ) =>
                                  setFileFields(
                                    (
                                      previous
                                    ) => ({
                                      ...previous,

                                      [key]:
                                        next,
                                    })
                                  )
                              }

                              multiple
                            />

                          )}

                        </Box>

                      </Grid>
                    );
                  }


                  const isTextarea =
                    inputType ===
                    "textarea";


                  const isNumber =
                    inputType ===
                      "number" ||
                    inputType ===
                      "integer" ||
                    dataType.includes(
                      "int"
                    );


                  const isDate =
                    inputType ===
                    "date";


                  return (
                    <Grid
                      item
                      xs={12}
                      md={
                        isTextarea
                          ? 12
                          : 6
                      }
                      key={key}
                    >

                      <Box
                        className=
                          "crud-record-field"
                      >

                        <Typography
                          className=
                            "crud-record-label"
                        >
                          {label}
                          {validation
                            .mandatory
                            ? " *"
                            : ""}
                        </Typography>


                        <TextField
                          fullWidth
                          size="small"

                          type={
                            isTextarea
                              ? "text"
                              : isDate
                                ? "date"
                                : isNumber
                                  ? "number"
                                  : "text"
                          }

                          multiline={
                            isTextarea
                          }

                          minRows={
                            isTextarea
                              ? 3
                              : undefined
                          }

                          value={
                            rawValue ??
                            ""
                          }

                          disabled={
                            disabled
                          }

                          onChange={
                            (event) =>
                              setFieldValue(
                                key,

                                isNumber &&
                                event
                                  .target
                                  .value !==
                                  ""
                                  ? Number(
                                      event
                                        .target
                                        .value
                                    )
                                  : event
                                      .target
                                      .value
                              )
                          }
                        />

                      </Box>

                    </Grid>
                  );
                }
              )}

          </Grid>

        )}


        <Stack
          direction="row"

          spacing={1}

          justifyContent=
            "flex-end"

          sx={{
            mt: 2,
          }}
        >

          <Button
            variant="outlined"

            onClick={
              onClose
            }
          >
            Close
          </Button>


          {!readOnly && (

            <Button
              variant=
                "contained"

              disabled={
                saving
              }

              onClick={
                save
              }
            >
              {saving
                ? "Saving..."
                : mode ===
                  "create"
                  ? "Save"
                  : "Update"}
            </Button>

          )}

        </Stack>

      </Box>

    </ReusableFormModal>
  );
}