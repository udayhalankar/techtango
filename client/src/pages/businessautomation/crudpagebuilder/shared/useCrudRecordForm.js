import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from
  "../../../../services/api";

import {
  camelToSnake,
  isEmptyForInput,
  parseOptions,
  validationForField,
} from "./crudRecordUtils";


export default function useCrudRecordForm({
  page,
  mode = "create",
  initialValues = {},
  onSaved,
}) {

  const [
    formFields,
    setFormFields,
  ] = useState([]);


  const [
    validations,
    setValidations,
  ] = useState({});


  const [
    values,
    setValues,
  ] = useState({});


  const [
    fileFields,
    setFileFields,
  ] = useState({});


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    loading,
    setLoading,
  ] = useState(false);


  useEffect(() => {

    setValues(
      initialValues ||
      {}
    );


    setFileFields(
      {}
    );

  }, [
    initialValues,
    mode,
    page?.id,
  ]);


  useEffect(() => {

    if (
      !page?.dbtable_id
    ) {
      setFormFields(
        []
      );

      return;
    }


    let cancelled =
      false;


    const load =
      async () => {

        setLoading(true);


        try {

          const parsedValidations =
            typeof page
              ?.validations ===
            "string"
              ? (() => {

                  try {
                    return JSON.parse(
                      page.validations ||
                      "{}"
                    );

                  } catch {
                    return {};
                  }
                })()
              : page
                  ?.validations ||
                {};


          setValidations(
            parsedValidations
          );


          const response =
            await api.get(
              `/templates/${page.dbtable_id}/fields`
            );


          if (
            cancelled
          ) {
            return;
          }


          const sourceRows =
            Array.isArray(
              response.data
            )
              ? response.data
              : [];


          const fields =
            sourceRows.map(
              (field) => ({
                columnName:
                  camelToSnake(
                    field
                      ?.fieldname
                  ),

                label:
                  field
                    ?.fieldname,

                dataType:
                  field
                    ?.datatype,

                inputType:
                  field
                    ?.inputtype,

                optionsCsv:
                  field
                    ?.options,

                dateGranularity:
                  field
                    ?.format,

                visible:
                  true,
              })
            );


          setFormFields(
            fields
          );

        } catch (error) {

          console.error(
            "Failed to load CRUD record fields",
            error
          );


          setFormFields(
            []
          );

        } finally {

          if (
            !cancelled
          ) {
            setLoading(
              false
            );
          }
        }
      };


    load();


    return () => {
      cancelled =
        true;
    };

  }, [
    page?.dbtable_id,
    page?.validations,
  ]);


  const setFieldValue =
    useCallback(
      (
        key,
        value
      ) => {

        setValues(
          (previous) => ({
            ...previous,
            [key]: value,
          })
        );
      },
      []
    );


  const save =
    useCallback(
      async () => {

        if (
          !page?.id
        ) {
          return null;
        }


        const modeKey =
          mode === "create"
            ? "create"
            : "edit";


        for (
          const field of
          formFields
        ) {

          const key =
            field
              ?.columnName;


          if (!key) {
            continue;
          }


          const validation =
            validationForField(
              validations,
              modeKey,
              key
            );


          if (
            validation
              .visible ===
              false ||
            validation
              .mandatory !==
              true
          ) {
            continue;
          }


          if (
            isEmptyForInput(
              field
                ?.inputType,
              values[
                key
              ]
            )
          ) {

            alert(
              `${field.label || key} is required.`
            );

            return null;
          }
        }


        setSaving(true);


        try {

          const payload = {
            ...values,
          };


          const attachmentKeys =
            [];


          formFields.forEach(
            (field) => {

              const key =
                field
                  ?.columnName;


              if (!key) {
                return;
              }


              const inputType =
                String(
                  field
                    ?.inputType ||
                  ""
                )
                  .toLowerCase();


              const options =
                parseOptions(
                  field
                    ?.optionsCsv
                );


              if (
                inputType ===
                  "checkbox" &&
                options.length &&
                Array.isArray(
                  payload[
                    key
                  ]
                )
              ) {

                const isInt =
                  String(
                    field
                      ?.dataType ||
                    ""
                  )
                    .toLowerCase()
                    .includes(
                      "int"
                    );


                if (isInt) {

                  payload[
                    key
                  ] =
                    payload[
                      key
                    ].length
                      ? Number(
                          payload[
                            key
                          ][0]
                        )
                      : null;

                } else {

                  payload[
                    key
                  ] =
                    payload[
                      key
                    ].join(
                      ","
                    );
                }
              }


              if (
                inputType ===
                "image"
              ) {

                attachmentKeys.push(
                  key
                );


                delete payload[
                  key
                ];
              }
            }
          );


          attachmentKeys.forEach(
            (key) => {

              delete payload[
                key
              ];
            }
          );


          const formData =
            new FormData();


          formData.append(
            "data",
            JSON.stringify(
              payload
            )
          );


          attachmentKeys.forEach(
            (key) => {

              const files =
                fileFields[
                  key
                ] ||
                [];


              files.forEach(
                (file) => {

                  formData.append(
                    `attachment__${key}`,
                    file
                  );
                }
              );
            }
          );


          let response;


          if (
            mode ===
            "create"
          ) {

            response =
              await api.post(
                `/crudpages/${page.id}/records-with-files`,
                formData,
                {
                  headers: {
                    "Content-Type":
                      "multipart/form-data",
                  },
                }
              );

          } else {

            const id =
              values?.id;


            response =
              await api.put(
                `/crudpages/${page.id}/records/${id}/with-files`,
                formData,
                {
                  headers: {
                    "Content-Type":
                      "multipart/form-data",
                  },
                }
              );
          }


          onSaved?.(
            response.data
          );


          return response.data;

        } catch (error) {

          alert(
            error
              ?.response
              ?.data
              ?.error ||
            "Save failed."
          );


          console.error(
            error
          );


          return null;

        } finally {

          setSaving(
            false
          );
        }
      },
      [
        page,
        mode,
        values,
        formFields,
        validations,
        fileFields,
        onSaved,
      ]
    );


  return {
    formFields,
    validations,

    values,
    setValues,
    setFieldValue,

    fileFields,
    setFileFields,

    loading,
    saving,

    save,
  };
}