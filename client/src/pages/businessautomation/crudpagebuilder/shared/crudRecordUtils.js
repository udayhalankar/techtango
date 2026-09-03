export const camelToSnake = (
  str
) =>
  String(str || "")
    .replace(
      /[A-Z]/g,
      (letter) =>
        `_${letter.toLowerCase()}`
    );


export const parseOptions = (
  csv
) =>
  String(csv || "")
    .split(",")
    .map(
      (value) =>
        value.trim()
    )
    .filter(Boolean);


export const codeLabelPairs = (
  options
) =>
  options.map(
    (label, index) => ({
      code: index + 1,
      label,
    })
  );


export const parseMultiValue = (
  value
) => {

  if (!value) {
    return [];
  }


  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }


  if (
    typeof value ===
    "string"
  ) {

    try {

      const parsed =
        JSON.parse(
          value
        );


      if (
        Array.isArray(
          parsed
        )
      ) {
        return parsed;
      }

    } catch {

      return value
        .split(",")
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean);
    }
  }


  return [];
};


export const normalizeDate = (
  value
) => {

  if (!value) {
    return "";
  }


  if (
    value instanceof Date
  ) {
    return value
      .toISOString()
      .slice(0, 10);
  }


  if (
    typeof value ===
      "string" &&
    value.length >= 10 &&
    value[4] === "-" &&
    value[7] === "-"
  ) {
    return value.slice(
      0,
      10
    );
  }


  return value;
};


export const parseAttachmentValue =
  (value) => {

    if (!value) {
      return [];
    }


    if (
      Array.isArray(
        value
      )
    ) {
      return value;
    }


    if (
      typeof value ===
      "string"
    ) {

      try {

        const parsed =
          JSON.parse(
            value
          );


        return Array.isArray(
          parsed
        )
          ? parsed
          : [];

      } catch {

        return [];
      }
    }


    return [];
  };


export const validationForField =
  (
    validations,
    mode,
    fieldKey
  ) => {

    const base = {
      data_entry: true,
      read_only: false,
      visible: true,
      mandatory: false,
    };


    const config =
      validations?.[
        mode
      ]?.[
        fieldKey
      ] || {};


    return {
      ...base,
      ...config,
    };
  };


export const isEmptyForInput =
  (
    inputType,
    value
  ) => {

    const kind =
      String(
        inputType || ""
      ).toLowerCase();


    if (
      kind ===
      "checkbox"
    ) {
      return (
        !Array.isArray(
          value
        ) ||
        value.length ===
          0
      );
    }


    return (
      value === "" ||
      value === null ||
      value === undefined
    );
  };