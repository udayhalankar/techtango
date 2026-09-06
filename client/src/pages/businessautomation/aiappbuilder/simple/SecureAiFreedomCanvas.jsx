
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import api from "../../../../services/api";

const BRIDGE_SOURCE = "AUGMIS_AI_FREEDOM_V1";

const DEBUG_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.REACT_APP_AI_BUILDER_DEBUG === "true";

const ALLOWED_BRIDGE_ACTIONS = new Set([
  "CREATE_RECORD",
  "UPDATE_RECORD",
  "DELETE_RECORD",
  "REFRESH_RECORDS",
  "SHOW_NOTIFICATION",
  "DEBUG_EVENT",
  "DEBUG_AUDIT_RESULT",
]);

const normalized = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function parseTimeToMinutes(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours > 23 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function rowTransactionData(row) {
  return row?.transaction_data &&
    typeof row.transaction_data === "object"
    ? row.transaction_data
    : {};
}

function validatePayloadAgainstBackendSchema({
  schema,
  payload,
  rows,
  excludeId = null,
}) {
  const fields = Array.isArray(schema?.fields)
    ? schema.fields
    : [];

  for (const field of fields) {
    const value = payload?.[field.name];
    const fieldText = String(value ?? "").trim();

    const validation =
      field?.validation &&
      typeof field.validation === "object"
        ? field.validation
        : {};

    if (field.required && !fieldText) {
      return `${field.label || field.name} is required`;
    }

    if (
      (validation.type === "date_not_past" ||
        validation.dateNotPast) &&
      fieldText
    ) {
      const parsed = new Date(`${fieldText}T00:00:00`);
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (
        !Number.isNaN(parsed.getTime()) &&
        parsed < today
      ) {
        return (
          validation.message ||
          `${field.label || field.name} cannot be in the past`
        );
      }
    }

    if (
      validation.type === "greater_than" &&
      validation.compareWith
    ) {
      const current =
        parseTimeToMinutes(fieldText);

      const compare =
        parseTimeToMinutes(
          payload?.[validation.compareWith]
        );

      if (
        current !== null &&
        compare !== null &&
        current <= compare
      ) {
        return (
          validation.message ||
          `${field.label || field.name} must be after ${validation.compareWith}`
        );
      }
    }

    if (field.type === "number" && fieldText) {
      const numeric = Number(fieldText);

      if (Number.isNaN(numeric)) {
        return `${field.label || field.name} must be a number`;
      }

      if (
        validation.min !== undefined &&
        numeric < Number(validation.min)
      ) {
        return (
          validation.message ||
          `${field.label || field.name} must be at least ${validation.min}`
        );
      }

      if (
        validation.max !== undefined &&
        numeric > Number(validation.max)
      ) {
        return (
          validation.message ||
          `${field.label || field.name} must not exceed ${validation.max}`
        );
      }
    }
  }

  const comparableRows = (
    Array.isArray(rows) ? rows : []
  ).filter(
    (row) =>
      excludeId === null ||
      String(row?.id) !== String(excludeId)
  );

  const uniqueRules = Array.isArray(
    schema?.uniqueRules
  )
    ? schema.uniqueRules
    : [];

  for (const rule of uniqueRules) {
    const names = Array.isArray(rule?.fields)
      ? rule.fields
      : [];

    if (names.length < 2) continue;

    const duplicate = comparableRows.some((row) => {
      const data = rowTransactionData(row);

      return names.every(
        (name) =>
          String(data?.[name] ?? "") ===
          String(payload?.[name] ?? "")
      );
    });

    if (duplicate) {
      return (
        rule.message ||
        "Duplicate record is not allowed"
      );
    }
  }

  const overlapRules = Array.isArray(
    schema?.overlapRules
  )
    ? schema.overlapRules
    : [];

  for (const rule of overlapRules) {
    const resourceField = String(
      rule?.resourceField || ""
    );

    const dateField = String(
      rule?.dateField || ""
    );

    const startField = String(
      rule?.startTimeField || ""
    );

    const endField = String(
      rule?.endTimeField || ""
    );

    const durationField = String(
      rule?.durationField || ""
    );

    const slotMinutes = Math.max(
      1,
      Number(rule?.slotMinutes || 30)
    );

    const resource = String(
      payload?.[resourceField] ?? ""
    ).trim();

    const date = String(
      payload?.[dateField] ?? ""
    ).trim();

    const start = parseTimeToMinutes(
      payload?.[startField]
    );

    if (!resource || !date || start === null) {
      continue;
    }

    let end = endField
      ? parseTimeToMinutes(
          payload?.[endField]
        )
      : null;

    if (end === null && durationField) {
      const duration = Number(
        payload?.[durationField]
      );

      if (
        !Number.isNaN(duration) &&
        duration > 0
      ) {
        end =
          start +
          duration * slotMinutes;
      }
    }

    if (end === null) {
      end = start + slotMinutes;
    }

    const conflict = comparableRows.some((row) => {
      const data = rowTransactionData(row);

      if (
        String(
          data?.[resourceField] ?? ""
        ).trim() !== resource
      ) {
        return false;
      }

      if (
        String(
          data?.[dateField] ?? ""
        ).trim() !== date
      ) {
        return false;
      }

      const otherStart =
        parseTimeToMinutes(
          data?.[startField]
        );

      if (otherStart === null) {
        return false;
      }

      let otherEnd = endField
        ? parseTimeToMinutes(
            data?.[endField]
          )
        : null;

      if (
        otherEnd === null &&
        durationField
      ) {
        const duration = Number(
          data?.[durationField]
        );

        if (
          !Number.isNaN(duration) &&
          duration > 0
        ) {
          otherEnd =
            otherStart +
            duration * slotMinutes;
        }
      }

      if (otherEnd === null) {
        otherEnd =
          otherStart +
          slotMinutes;
      }

      return (
        start < otherEnd &&
        end > otherStart
      );
    });

    if (conflict) {
      return (
        rule.message ||
        "This time slot conflicts with an existing booking."
      );
    }
  }

  return "";
}

function findBackendFieldForFrontend(frontendField, backendFields) {
  if (!frontendField || !Array.isArray(backendFields)) return null;

  const frontendName = normalized(frontendField.name);
  const frontendLabel = normalized(frontendField.label);
  const frontendText = `${frontendField.name || ""} ${frontendField.label || ""}`.toLowerCase();

  let match = backendFields.find((field) => {
    const backendName = normalized(field.name);
    const backendLabel = normalized(field.label);

    return (
      (frontendName && (backendName === frontendName || backendLabel === frontendName)) ||
      (frontendLabel && (backendName === frontendLabel || backendLabel === frontendLabel))
    );
  });

  if (match) return match;

  const aliases = [
    {
      front: /room|resource|vehicle|equipment|asset|location/,
      back: /room|resource|vehicle|equipment|asset|location/,
    },
    {
      front: /booking.?date|reservation.?date|(^|[^a-z])date([^a-z]|$)/,
      back: /booking.?date|reservation.?date|(^|[^a-z])date([^a-z]|$)/,
    },
    { front: /from|start|begin/, back: /from|start|begin/ },
    { front: /to|end|finish/, back: /to|end|finish/ },
    { front: /status/, back: /status/ },
  ];

  for (const alias of aliases) {
    if (!alias.front.test(frontendText)) continue;

    match = backendFields.find((field) => {
      if (frontendField.type && field.type && frontendField.type !== field.type) {
        return false;
      }

      return alias.back.test(`${field.name || ""} ${field.label || ""}`.toLowerCase());
    });

    if (match) return match;
  }

  if (frontendField.type) {
    const sameType = backendFields.filter((field) => field.type === frontendField.type);
    if (sameType.length === 1) return sameType[0];
  }

  return null;
}

function mapFreedomPayload(rawPayload, frontendSpec, backendSchema) {
  const frontendFields = Array.isArray(frontendSpec?.form?.fields)
    ? frontendSpec.form.fields
    : [];

  const backendFields = Array.isArray(backendSchema?.fields)
    ? backendSchema.fields
    : [];

  const payload = {};

  // Backend defaults are allowed, but browser-provided unknown/system fields are not.
  backendFields.forEach((field) => {
    if (
      field?.defaultValue !== undefined &&
      field?.defaultValue !== null &&
      field?.defaultValue !== ""
    ) {
      payload[field.name] = field.defaultValue;
    }
  });

  frontendFields.forEach((frontendField) => {
    const value = rawPayload?.[frontendField.name];

    if (value === undefined || value === null || value === "") {
      return;
    }

    const backendField = findBackendFieldForFrontend(frontendField, backendFields);

    payload[backendField?.name || frontendField.name] = value;
  });

  return payload;
}

function stripClientDangerousHtml(html = "") {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return String(html || "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="augmis-client-root">${String(html || "")}</div>`, "text/html");
  const root = doc.getElementById("augmis-client-root");

  if (!root) return "";

  root
    .querySelectorAll("script,iframe,object,embed,base,meta,link,style")
    .forEach((node) => node.remove());

  root.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = String(attr.name || "").toLowerCase();
      const value = String(attr.value || "");

      if (name.startsWith("on")) {
        node.removeAttribute(attr.name);
        return;
      }

      if (name === "style") {
        node.removeAttribute(attr.name);
        return;
      }

      if (["href", "src", "action", "formaction", "xlink:href"].includes(name)) {
        const safe =
          value.startsWith("#") ||
          value.startsWith("data:image/");

        if (!safe) node.removeAttribute(attr.name);
      }
    });
  });

  return root.innerHTML;
}

function stripClientDangerousCss(css = "") {
  return String(css || "")
    .slice(0, 70000)
    .replace(/@import[^;]+;?/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "none")
    .replace(/expression\s*\(/gi, "")
    .replace(/behavior\s*:/gi, "")
    .replace(/-moz-binding\s*:/gi, "")
    .replace(/<\/?style[^>]*>/gi, "");
}

const TRUSTED_BRIDGE_SCRIPT = String.raw`
(() => {
  "use strict";

  const SOURCE = "AUGMIS_AI_FREEDOM_V1";
  let records = [];

  const post = (type, payload = {}) => {
    parent.postMessage(
      {
        source: SOURCE,
        type,
        ...payload,
      },
      "*"
    );
  };

  const debug = (event, details = {}) => {
    post("DEBUG_EVENT", {
      event,
      details,
      at: new Date().toISOString(),
    });
  };

  const auditDom = () => {
    const allForms = [...document.querySelectorAll("form")];
    const recordForms = [
      ...document.querySelectorAll("[data-augmis-form='record']")
    ];
    const formModals = [
      ...document.querySelectorAll("[data-augmis-modal='form']")
    ];
    const allButtons = [
      ...document.querySelectorAll(
        "button, input[type='submit'], input[type='button']"
      )
    ];

    const saveLikeButtons = allButtons
      .filter((button) => {
        const text = String(
          button.textContent ||
            button.value ||
            ""
        )
          .trim()
          .toLowerCase();

        const action = String(
          button.getAttribute("data-augmis-action") || ""
        )
          .trim()
          .toLowerCase();

        return (
          [
            "save",
            "save-record",
            "submit",
            "submit-record",
            "create-record",
            "update-record",
          ].includes(action) ||
          /^(save|create|update|submit|book|reserve|send)\b/.test(text)
        );
      })
      .map((button) => ({
        text: String(
          button.textContent ||
            button.value ||
            ""
        )
          .trim()
          .slice(0, 120),
        type: button.getAttribute("type") || "",
        action:
          button.getAttribute("data-augmis-action") || "",
        insideRecordForm: Boolean(
          button.closest("[data-augmis-form='record']")
        ),
        insideFormModal: Boolean(
          button.closest("[data-augmis-modal='form']")
        ),
      }));

    return {
      formsTotal: allForms.length,
      recordForms: recordForms.length,
      formModals: formModals.length,
      recordTemplates: document.querySelectorAll(
        "template[data-augmis-record-template]"
      ).length,
      recordContainers: document.querySelectorAll(
        "[data-augmis-records]"
      ).length,
      saveLikeButtons,
      recordFormFields: recordForms.map((form) =>
        [...form.elements]
          .filter((element) => Boolean(element.name))
          .map((element) => ({
            name: element.name,
            type:
              element.type ||
              element.tagName.toLowerCase(),
            required: Boolean(element.required),
            disabled: Boolean(element.disabled),
          }))
      ),
    };
  };

  const getRecordData = (record) => {
    const tx =
      record &&
      record.transaction_data &&
      typeof record.transaction_data === "object"
        ? record.transaction_data
        : {};

    return {
      id: record && record.id != null ? record.id : "",
      ...tx,
    };
  };

  const replaceTemplateTokens = (fragment, data) => {
    const replace = (value) =>
      String(value || "").replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_full, key) => {
        const resolved = data[key];
        return resolved == null ? "" : String(resolved);
      });

    const walker = document.createTreeWalker(
      fragment,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = replace(node.nodeValue);
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        [...node.attributes].forEach((attr) => {
          node.setAttribute(attr.name, replace(attr.value));
        });

        node.setAttribute("data-augmis-rendered-record", "1");
      }
    });
  };

  const recordMatches = (record, query) => {
    if (!query) return true;

    const data = getRecordData(record);

    return Object.values(data)
      .map((value) => String(value == null ? "" : value))
      .join(" ")
      .toLowerCase()
      .includes(query);
  };

  const renderRecords = () => {
    const holders = [...document.querySelectorAll("[data-augmis-records]")];

    holders.forEach((holder) => {
      holder
        .querySelectorAll("[data-augmis-rendered-record]")
        .forEach((node) => node.remove());

      const template =
        holder.querySelector("template[data-augmis-record-template]") ||
        document.querySelector("template[data-augmis-record-template]");

      if (!template) return;

      const search =
        document.querySelector("[data-augmis-search]");

      const query = String(search && search.value ? search.value : "")
        .trim()
        .toLowerCase();

      const filtered = records.filter((record) =>
        recordMatches(record, query)
      );

      filtered.forEach((record) => {
        const fragment = template.content.cloneNode(true);
        replaceTemplateTokens(fragment, getRecordData(record));
        holder.insertBefore(fragment, template);
      });

      document
        .querySelectorAll("[data-augmis-empty]")
        .forEach((emptyNode) => {
          emptyNode.hidden = filtered.length > 0;
        });

      document
        .querySelectorAll("[data-augmis-record-count]")
        .forEach((countNode) => {
          countNode.textContent = String(filtered.length);
        });
    });
  };

  const showModal = (name) => {
    document
      .querySelectorAll("[data-augmis-modal]")
      .forEach((modal) => {
        modal.hidden =
          modal.getAttribute("data-augmis-modal") !== name;
      });
  };

  const closeModals = () => {
    document
      .querySelectorAll("[data-augmis-modal]")
      .forEach((modal) => {
        modal.hidden = true;
      });
  };

  const getRecord = (id) =>
    records.find((record) => String(record && record.id) === String(id));

  const populateForm = (record) => {
    const form = document.querySelector("[data-augmis-form='record']");
    if (!form) return;

    form.reset();

    const data = record ? getRecordData(record) : {};

    [...form.elements].forEach((element) => {
      if (!element.name) return;

      const value = data[element.name];

      if (element.type === "checkbox") {
        element.checked =
          value === true ||
          value === "true" ||
          value === 1 ||
          value === "1";
      } else if (value != null) {
        element.value = String(value);
      }
    });

    form.dataset.editId =
      record && record.id != null
        ? String(record.id)
        : "";
  };

  const populateView = (record) => {
    const data = getRecordData(record || {});

    document
      .querySelectorAll("[data-augmis-view-field]")
      .forEach((node) => {
        const field = node.getAttribute("data-augmis-view-field");
        node.textContent =
          data[field] == null ? "—" : String(data[field]);
      });
  };

  const processRecordForm = (form) => {
    if (!form) {
      post("SHOW_NOTIFICATION", {
        message:
          "The AI Freedom form is missing its AUGMIS record binding.",
        severity: "error",
      });

      debug("FORM_PROCESS_ABORTED_NO_FORM", {
        domAudit: auditDom(),
      });

      return false;
    }

    const requiredFieldNames = [
      ...form.elements,
    ]
      .filter(
        (element) =>
          Boolean(element.name) &&
          Boolean(element.required)
      )
      .map((element) => element.name);

    const invalidFieldNames = [
      ...form.elements,
    ]
      .filter(
        (element) =>
          Boolean(element.name) &&
          Boolean(element.willValidate) &&
          typeof element.checkValidity ===
            "function" &&
          !element.checkValidity()
      )
      .map((element) => element.name);

    const valid =
      invalidFieldNames.length === 0;

    debug("FORM_VALIDITY_CHECK", {
      valid,
      requiredFieldNames,
      invalidFieldNames,
    });

    if (!valid) {
      if (
        typeof form.reportValidity ===
        "function"
      ) {
        form.reportValidity();
      }

      post("SHOW_NOTIFICATION", {
        message:
          "Please complete the required or invalid fields.",
        severity: "warning",
      });

      debug(
        "FORM_PROCESS_BLOCKED_BY_HTML_VALIDATION",
        {
          invalidFieldNames,
        }
      );

      return false;
    }

    const payload = {};

    [...form.elements].forEach(
      (element) => {
        if (
          !element.name ||
          element.disabled
        ) {
          return;
        }

        if (
          element.type === "checkbox"
        ) {
          payload[element.name] =
            Boolean(element.checked);
          return;
        }

        if (
          element.type === "radio"
        ) {
          if (element.checked) {
            payload[element.name] =
              element.value;
          }
          return;
        }

        payload[element.name] =
          element.value;
      }
    );

    const editId = String(
      form.dataset.editId || ""
    ).trim();

    debug(
      editId
        ? "BRIDGE_POST_UPDATE_RECORD"
        : "BRIDGE_POST_CREATE_RECORD",
      {
        editMode: Boolean(editId),
        payloadFieldNames:
          Object.keys(payload),
      }
    );

    post(
      editId
        ? "UPDATE_RECORD"
        : "CREATE_RECORD",
      {
        id: editId || null,
        payload,
      }
    );

    return true;
  };

  const submitRecordForm = (
    preferredForm = null
  ) => {
    const form =
      preferredForm ||
      document.querySelector(
        "[data-augmis-form='record']"
      );

    debug(
      "SUBMIT_RECORD_FORM_CALLED",
      {
        preferredFormProvided:
          Boolean(preferredForm),
        recordFormFound:
          Boolean(form),
        domAudit: auditDom(),
      }
    );

    /*
      IMPORTANT:
      Do NOT call form.requestSubmit() here.

      AI Freedom runs in a sandbox that intentionally does not grant
      normal form-navigation privileges. We do not need a real browser
      form submission anyway.

      AUGMIS validates and serializes the bound form itself, then sends
      a controlled bridge message to the parent.
    */
    return processRecordForm(form);
  };

  document.addEventListener(
    "input",
    (event) => {
      if (
        event.target &&
        event.target.matches(
          "[data-augmis-search]"
        )
      ) {
        renderRecords();
      }
    }
  );

  /*
    Support Enter-key/native submit events too, but never allow the browser
    itself to navigate/submit the form.
  */
  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;

      debug("FORM_SUBMIT_EVENT", {
        formExists: Boolean(form),
        isBoundRecordForm: Boolean(
          form &&
            form.matches &&
            form.matches(
              "[data-augmis-form='record']"
            )
        ),
      });

      if (
        !form ||
        !form.matches(
          "[data-augmis-form='record']"
        )
      ) {
        debug(
          "FORM_SUBMIT_IGNORED_UNBOUND_FORM",
          {
            tagName:
              form?.tagName || "",
          }
        );

        return;
      }

      event.preventDefault();
      processRecordForm(form);
    }
  );

  document.addEventListener("click", (event) => {
    const clickedButton =
      event.target &&
      event.target.closest
        ? event.target.closest("button, input[type='submit'], input[type='button']")
        : null;

    const trigger =
      event.target &&
      event.target.closest
        ? event.target.closest("[data-augmis-action]")
        : null;

    if (clickedButton) {
      debug("BUTTON_CLICK", {
        text: String(
          clickedButton.textContent ||
            clickedButton.value ||
            ""
        )
          .trim()
          .slice(0, 120),
        type:
          clickedButton.getAttribute("type") || "",
        action:
          clickedButton.getAttribute("data-augmis-action") || "",
        insideRecordForm: Boolean(
          clickedButton.closest("[data-augmis-form='record']")
        ),
        insideFormModal: Boolean(
          clickedButton.closest("[data-augmis-modal='form']")
        ),
      });
    }

    if (!trigger && clickedButton) {
      const formModal = clickedButton.closest(
        "[data-augmis-modal='form']"
      );

      const buttonText = String(
        clickedButton.textContent ||
          clickedButton.value ||
          ""
      )
        .trim()
        .toLowerCase();

      const looksLikeSave =
        clickedButton.getAttribute("type") === "submit" ||
        /^(save|create|update|submit|book|reserve|send)\b/.test(
          buttonText
        );

      if (formModal && looksLikeSave) {
        event.preventDefault();

        debug("SAVE_FALLBACK_MATCHED", {
          buttonText,
          formModalFound: true,
          recordFormInsideModal: Boolean(
            formModal.querySelector(
              "[data-augmis-form='record']"
            )
          ),
        });

        submitRecordForm(
          formModal.querySelector(
            "[data-augmis-form='record']"
          )
        );

        return;
      }

      if (looksLikeSave) {
        debug("SAVE_LIKE_BUTTON_NOT_BOUND", {
          buttonText,
          formModalFound: Boolean(formModal),
          domAudit: auditDom(),
        });
      }
    }

    if (!trigger) return;

    event.preventDefault();

    const action = String(
      trigger.getAttribute("data-augmis-action") || ""
    ).toLowerCase();

    const recordId =
      trigger.getAttribute("data-record-id") ||
      trigger.closest("[data-record-id]")?.getAttribute("data-record-id") ||
      "";

    if (
      [
        "save",
        "save-record",
        "submit",
        "submit-record",
        "create-record",
        "update-record",
      ].includes(action)
    ) {
      debug("EXPLICIT_SAVE_ACTION_MATCHED", {
        action,
      });
      const formModal = trigger.closest(
        "[data-augmis-modal='form']"
      );

      submitRecordForm(
        formModal?.querySelector(
          "[data-augmis-form='record']"
        ) || null
      );

      return;
    }

    if (action === "open-create") {
      populateForm(null);
      showModal("form");
      return;
    }

    if (action === "close-modal") {
      closeModals();
      return;
    }

    if (action === "edit") {
      const record = getRecord(recordId);
      if (record) {
        populateForm(record);
        showModal("form");
      }
      return;
    }

    if (action === "view") {
      const record = getRecord(recordId);
      if (record) {
        populateView(record);
        showModal("view");
      }
      return;
    }

    if (action === "delete") {
      post("DELETE_RECORD", {
        id: recordId,
      });
      return;
    }

    if (action === "refresh") {
      post("REFRESH_RECORDS");
      return;
    }

    if (action === "notify") {
      post("SHOW_NOTIFICATION", {
        message:
          trigger.getAttribute("data-message") ||
          "Application notification",
        severity:
          trigger.getAttribute("data-severity") ||
          "info",
      });
    }
  });

  window.addEventListener("message", (event) => {
    const message = event.data;

    if (!message || message.source !== SOURCE) return;

    if (message.type === "AUGMIS_DATA") {
      records = Array.isArray(message.records)
        ? message.records
        : [];
      renderRecords();
    }

    if (message.type === "AUGMIS_CLOSE_MODALS") {
      closeModals();
    }

    if (message.type === "AUGMIS_DEBUG_AUDIT") {
      post("DEBUG_AUDIT_RESULT", {
        audit: auditDom(),
        at: new Date().toISOString(),
      });
    }
  });

  window.addEventListener("error", (event) => {
    debug("IFRAME_RUNTIME_ERROR", {
      message: String(event.message || "Unknown iframe error").slice(0, 400),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    debug("IFRAME_UNHANDLED_REJECTION", {
      message: String(
        event.reason?.message ||
          event.reason ||
          "Unhandled promise rejection"
      ).slice(0, 400),
    });
  });

  debug("BRIDGE_READY", {
    domAudit: auditDom(),
  });

})();
`;

function buildSrcDoc(aiFreedom = {}) {
  const safeHtml = stripClientDangerousHtml(aiFreedom?.html || "");
  const safeCss = stripClientDangerousCss(aiFreedom?.css || "");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'none';
    img-src data: blob:;
    style-src 'unsafe-inline';
    script-src 'unsafe-inline';
    font-src data:;
    connect-src 'none';
    frame-src 'none';
    object-src 'none';
    media-src 'none';
    worker-src 'none';
    child-src 'none';
    form-action 'none';
    base-uri 'none';
  "
/>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body {
    margin: 0;
    min-height: 100%;
    background: #f5f7fa;
    font-family: Inter, Arial, Helvetica, sans-serif;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  [hidden] {
    display: none !important;
  }

  ${safeCss}
</style>
</head>
<body>
  <div id="augmis-ai-root">${safeHtml}</div>
  <script>${TRUSTED_BRIDGE_SCRIPT}<\/script>
</body>
</html>`;
}

export default function SecureAiFreedomCanvas({
  spec,
  backendApp,
  backendSchema,
  onNotice,
}) {
  const iframeRef = useRef(null);
  const loadInFlightRef = useRef(null);
  const onNoticeRef = useRef(onNotice);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState(null);

  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEvents, setDebugEvents] = useState([]);
  const [lastAudit, setLastAudit] = useState(null);

  const appSlug = String(backendApp?.app_slug || "").trim();
  const isLive = Boolean(appSlug);

  useEffect(() => {
    onNoticeRef.current = onNotice;
  }, [onNotice]);

  const srcDoc = useMemo(
    () => buildSrcDoc(spec?.aiFreedom || {}),
    [spec?.aiFreedom]
  );

  const postRecords = useCallback((nextRecords = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    // Only id + transaction_data are exposed to the sandbox.
    const safeRecords = (Array.isArray(nextRecords) ? nextRecords : []).map((row) => ({
      id: row?.id,
      transaction_data:
        row?.transaction_data && typeof row.transaction_data === "object"
          ? row.transaction_data
          : {},
    }));

    win.postMessage(
      {
        source: BRIDGE_SOURCE,
        type: "AUGMIS_DATA",
        records: safeRecords,
      },
      "*"
    );
  }, []);

  const addDebugEvent = useCallback((event, details = {}) => {
    if (!DEBUG_ENABLED) return;

    setDebugEvents((prev) => {
      const next = [
        ...prev,
        {
          at: new Date().toISOString(),
          side: "parent",
          event,
          details,
        },
      ];

      return next.slice(-120);
    });
  }, []);

  const requestDebugAudit = useCallback(() => {
    if (!DEBUG_ENABLED) return;

    const win = iframeRef.current?.contentWindow;

    if (!win) {
      addDebugEvent("DEBUG_AUDIT_FAILED_NO_IFRAME");
      return;
    }

    addDebugEvent("DEBUG_AUDIT_REQUESTED");

    win.postMessage(
      {
        source: BRIDGE_SOURCE,
        type: "AUGMIS_DEBUG_AUDIT",
      },
      "*"
    );
  }, [addDebugEvent]);

  const loadRecords = useCallback(async () => {
    if (!isLive || !appSlug) {
      setRecords([]);
      postRecords([]);
      return [];
    }

    // If the iframe and parent both request a refresh at nearly the same time,
    // reuse the same request instead of hitting the API twice.
    if (loadInFlightRef.current) {
      return loadInFlightRef.current;
    }

    const request = (async () => {
      setLoading(true);

      addDebugEvent("API_GET_RECORDS_START", {
        appSlug,
      });

      try {
        const response = await api.get(
          `/aiappbuilder/${appSlug}/records`
        );

        const nextRecords = Array.isArray(response?.data)
          ? response.data
          : [];

        setRecords(nextRecords);
        postRecords(nextRecords);

        addDebugEvent("API_GET_RECORDS_SUCCESS", {
          status: response?.status || 200,
          recordCount: nextRecords.length,
        });

        return nextRecords;
      } catch (error) {
        addDebugEvent("API_GET_RECORDS_ERROR", {
          status: error?.response?.status || null,
          message: String(
            error?.response?.data?.error ||
              error.message ||
              "Could not load application records."
          ).slice(0, 400),
        });
        onNoticeRef.current?.(
          error?.response?.data?.error ||
            error.message ||
            "Could not load application records.",
          "error"
        );

        return [];
      } finally {
        setLoading(false);
      }
    })();

    loadInFlightRef.current = request;

    try {
      return await request;
    } finally {
      if (loadInFlightRef.current === request) {
        loadInFlightRef.current = null;
      }
    }
  }, [addDebugEvent, appSlug, isLive, postRecords]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    postRecords(records);
  }, [records, postRecords]);

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      const message = event.data;

      if (
        !message ||
        message.source !== BRIDGE_SOURCE
      ) {
        return;
      }

      if (
        DEBUG_ENABLED &&
        message.type === "DEBUG_EVENT"
      ) {
        setDebugEvents((prev) => [
          ...prev,
          {
            at:
              message.at ||
              new Date().toISOString(),
            side: "iframe",
            event:
              message.event ||
              "DEBUG_EVENT",
            details:
              message.details || {},
          },
        ].slice(-120));

        return;
      }

      if (
        DEBUG_ENABLED &&
        message.type === "DEBUG_AUDIT_RESULT"
      ) {
        setLastAudit(
          message.audit || null
        );

        setDebugEvents((prev) => [
          ...prev,
          {
            at:
              message.at ||
              new Date().toISOString(),
            side: "iframe",
            event:
              "DEBUG_AUDIT_RESULT",
            details:
              message.audit || {},
          },
        ].slice(-120));

        return;
      }

      if (
        !ALLOWED_BRIDGE_ACTIONS.has(
          message.type
        )
      ) {
        return;
      }

      addDebugEvent("BRIDGE_MESSAGE_RECEIVED", {
        type: message.type,
        idPresent: Boolean(message.id),
        payloadFieldNames:
          message.payload &&
          typeof message.payload === "object"
            ? Object.keys(message.payload)
            : [],
      });

      if (message.type === "SHOW_NOTIFICATION") {
        onNotice?.(
          String(message.message || "Application notification").slice(0, 400),
          ["success", "error", "warning", "info"].includes(message.severity)
            ? message.severity
            : "info"
        );
        return;
      }

      if (message.type === "REFRESH_RECORDS") {
        await loadRecords();
        return;
      }

      if (!isLive) {
        onNotice?.(
          "This is an AI Freedom preview. Build the backend before saving records.",
          "info"
        );
        return;
      }

      if (message.type === "DELETE_RECORD") {
        const id = String(message.id || "").trim();

        if (id) {
          setDeleteRequest({ id });
        }
        return;
      }

      if (
        message.type === "CREATE_RECORD" ||
        message.type === "UPDATE_RECORD"
      ) {
        const mappedPayload = mapFreedomPayload(
          message.payload || {},
          spec,
          backendSchema
        );

        addDebugEvent("PAYLOAD_MAPPED", {
          sourceFieldNames:
            message.payload &&
            typeof message.payload === "object"
              ? Object.keys(message.payload)
              : [],
          mappedFieldNames:
            Object.keys(mappedPayload),
        });

        const validationError =
          validatePayloadAgainstBackendSchema({
            schema: backendSchema,
            payload: mappedPayload,
            rows: records,
            excludeId:
              message.type ===
              "UPDATE_RECORD"
                ? message.id
                : null,
          });

        if (validationError) {
          addDebugEvent(
            "PARENT_VALIDATION_BLOCKED",
            {
              message:
                validationError,
            }
          );

          onNoticeRef.current?.(
            validationError,
            "warning"
          );

          return;
        }

        addDebugEvent(
          "PARENT_VALIDATION_PASSED",
          {
            mappedFieldNames:
              Object.keys(mappedPayload),
          }
        );

        try {
          if (message.type === "UPDATE_RECORD") {
            const id = String(message.id || "").trim();

            if (!id) {
              throw new Error("Record id is required for update.");
            }

            addDebugEvent("API_UPDATE_RECORD_START", {
              appSlug,
              recordIdPresent: true,
              mappedFieldNames:
                Object.keys(mappedPayload),
            });

            const response = await api.put(
              `/aiappbuilder/${backendApp.app_slug}/records/${encodeURIComponent(id)}`,
              {
                transaction_data: mappedPayload,
              }
            );

            addDebugEvent("API_UPDATE_RECORD_SUCCESS", {
              status: response?.status || 200,
            });

            onNotice?.("Record updated successfully.", "success");
          } else {
            addDebugEvent("API_CREATE_RECORD_START", {
              appSlug,
              mappedFieldNames:
                Object.keys(mappedPayload),
            });

            const response = await api.post(
              `/aiappbuilder/${backendApp.app_slug}/records`,
              {
                transaction_data: mappedPayload,
              }
            );

            addDebugEvent("API_CREATE_RECORD_SUCCESS", {
              status: response?.status || 200,
            });

            onNotice?.("Record created successfully.", "success");
          }

          await loadRecords();

          iframeRef.current?.contentWindow?.postMessage(
            {
              source: BRIDGE_SOURCE,
              type: "AUGMIS_CLOSE_MODALS",
            },
            "*"
          );
        } catch (error) {
          addDebugEvent("API_RECORD_MUTATION_ERROR", {
            status:
              error?.response?.status || null,
            message: String(
              error?.response?.data?.error ||
                error.message ||
                "Could not save record."
            ).slice(0, 400),
          });

          onNotice?.(
            error?.response?.data?.error ||
              error.message ||
              "Could not save record.",
            error?.response?.status === 409 ? "warning" : "error"
          );
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    addDebugEvent,
    appSlug,
    backendApp?.app_slug,
    backendSchema,
    isLive,
    loadRecords,
    onNotice,
    spec,
  ]);

  const confirmDelete = async () => {
    if (!deleteRequest?.id || !backendApp?.app_slug) return;

    try {
      await api.delete(
        `/aiappbuilder/${backendApp.app_slug}/records/${encodeURIComponent(deleteRequest.id)}`
      );

      setDeleteRequest(null);
      onNotice?.("Record deleted successfully.", "success");
      await loadRecords();
    } catch (error) {
      onNotice?.(
        error?.response?.data?.error ||
          error.message ||
          "Could not delete record.",
        "error"
      );
    }
  };

  const buildDebugReport = useCallback(() => {
    const frontendFields = Array.isArray(
      spec?.form?.fields
    )
      ? spec.form.fields.map(
          (field) => ({
            name: field.name,
            type: field.type,
            required: Boolean(
              field.required
            ),
          })
        )
      : [];

    const backendFields = Array.isArray(
      backendSchema?.fields
    )
      ? backendSchema.fields.map(
          (field) => ({
            name: field.name,
            type: field.type,
            required: Boolean(
              field.required
            ),
          })
        )
      : [];

    return {
      reportType:
        "AUGMIS_AI_FREEDOM_DEBUG_V1",
      generatedAt:
        new Date().toISOString(),
      environment:
        process.env.NODE_ENV,
      appSlug,
      backendConnected: isLive,
      bridgeSource: BRIDGE_SOURCE,
      sandbox:
        "allow-scripts (no allow-same-origin)",
      aiFreedom: {
        htmlLength:
          String(
            spec?.aiFreedom?.html || ""
          ).length,
        cssLength:
          String(
            spec?.aiFreedom?.css || ""
          ).length,
        bridgeVersion:
          spec?.aiFreedom
            ?.bridgeVersion || null,
      },
      frontendFields,
      backendFields,
      lastAudit,
      recentEvents:
        debugEvents.slice(-80),
      privacy:
        "Field values, JWTs, cookies, tenant data, record contents and secrets are intentionally omitted.",
    };
  }, [
    appSlug,
    backendSchema,
    debugEvents,
    isLive,
    lastAudit,
    spec,
  ]);

  const copyDebugReport = useCallback(async () => {
    requestDebugAudit();

    const report =
      buildDebugReport();

    const text = [
      "[AUGMIS AI Freedom Debug Report]",
      "Diagnose this report and repair ONLY the current application's AI Freedom HTML/CSS bridge markup where possible.",
      "Do not weaken sandbox/security restrictions. Do not modify AUGMIS core, auth, tenant boundaries, database access or trusted bridge code.",
      "Do not claim the issue is fixed unless the generated markup is changed consistently with the diagnostic evidence.",
      "",
      JSON.stringify(
        report,
        null,
        2
      ),
    ].join("\\n");

    try {
      await navigator.clipboard.writeText(
        text
      );

      onNoticeRef.current?.(
        "AI Freedom debug report copied. Paste it into the AI Design Conversation.",
        "success"
      );
    } catch (error) {
      onNoticeRef.current?.(
        "Could not copy automatically. Open Developer Debugger and copy the report manually.",
        "warning"
      );
    }
  }, [
    buildDebugReport,
    requestDebugAudit,
  ]);

  if (!spec?.aiFreedom?.html) {
    return (
      <Alert severity="info">
        AI Freedom styling has not been generated yet. Switch to AI Freedom again
        or ask the AI to restyle this application.
      </Alert>
    );
  }

  return (
    <>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          minHeight: 560,
          height: "100%",
          border: "1px solid #dce5ed",
          borderRadius: "12px",
          overflow: "hidden",
          bgcolor: "#fff",
        }}
      >
        {DEBUG_ENABLED ? (
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setDebugOpen(true);
              requestDebugAudit();
            }}
            sx={{
              position: "absolute",
              right: 14,
              bottom: 14,
              zIndex: 4,
              minWidth: 92,
              height: 30,
              borderRadius: "10px",
              textTransform: "none",
              fontSize: 10.5,
              fontWeight: 800,
              bgcolor: "#24384b",
              boxShadow:
                "0 5px 16px rgba(20,40,60,.18)",
              "&:hover": {
                bgcolor: "#172a3a",
              },
            }}
          >
            Dev Debug
          </Button>
        ) : null}

        {loading ? (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              position: "absolute",
              right: 14,
              top: 12,
              zIndex: 2,
              px: 1.1,
              py: 0.6,
              bgcolor: "rgba(255,255,255,.92)",
              borderRadius: "10px",
              border: "1px solid #dce5ed",
            }}
          >
            <CircularProgress size={14} />
            <Typography sx={{ fontSize: 10.8, color: "#5f768a" }}>
              Syncing records…
            </Typography>
          </Stack>
        ) : null}

        <iframe
          ref={iframeRef}
          title="AUGMIS AI Freedom Application Canvas"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          onLoad={() => {
            postRecords(records);
            addDebugEvent("IFRAME_LOADED");
            window.setTimeout(
              requestDebugAudit,
              50
            );
          }}
          style={{
            width: "100%",
            minHeight: "620px",
            height: "100%",
            border: 0,
            display: "block",
            background: "#fff",
          }}
        />
      </Box>

      {DEBUG_ENABLED ? (
        <Dialog
          open={debugOpen}
          onClose={() =>
            setDebugOpen(false)
          }
          fullWidth
          maxWidth="md"
          PaperProps={{
            sx: {
              borderRadius: "14px",
            },
          }}
        >
          <DialogTitle>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 17,
                    fontWeight: 900,
                    color: "#173854",
                  }}
                >
                  AI Freedom Developer
                  Debugger
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,
                    fontSize: 10.8,
                    color: "#75899d",
                  }}
                >
                  Development mode only.
                  Values, secrets and record
                  contents are not included.
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#567187",
                }}
              >
                {debugEvents.length} events
              </Typography>
            </Stack>
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={1.4}>
              <Alert severity="info">
                Click the failing Save
                button first, then return
                here and choose Run
                Diagnostics. Copy the
                report into the AI Design
                Conversation.
              </Alert>

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
              >
                <Button
                  variant="outlined"
                  onClick={
                    requestDebugAudit
                  }
                  sx={{
                    textTransform:
                      "none",
                    borderRadius:
                      "10px",
                  }}
                >
                  Run Diagnostics
                </Button>

                <Button
                  variant="contained"
                  onClick={
                    copyDebugReport
                  }
                  sx={{
                    textTransform:
                      "none",
                    borderRadius:
                      "10px",
                  }}
                >
                  Copy for AI Chat
                </Button>

                <Button
                  onClick={() => {
                    setDebugEvents([]);
                    setLastAudit(null);
                  }}
                  sx={{
                    textTransform:
                      "none",
                  }}
                >
                  Clear
                </Button>
              </Stack>

              <Divider />

              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  maxHeight: 440,
                  overflow: "auto",
                  borderRadius: "10px",
                  bgcolor: "#101820",
                  color: "#dce9f5",
                  border:
                    "1px solid #293d4d",
                  fontSize: 10.4,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak:
                    "break-word",
                  fontFamily:
                    "Consolas, Monaco, monospace",
                }}
              >
                {JSON.stringify(
                  buildDebugReport(),
                  null,
                  2
                )}
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() =>
                setDebugOpen(false)
              }
              sx={{
                textTransform: "none",
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      <Dialog
        open={Boolean(deleteRequest)}
        onClose={() => setDeleteRequest(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 850, color: "#8f1f1f" }}>
          Delete Record?
        </DialogTitle>

        <DialogContent>
          <Alert severity="warning">
            This will delete the selected record from the current application.
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setDeleteRequest(null)}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            sx={{
              textTransform: "none",
              borderRadius: "10px",
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
