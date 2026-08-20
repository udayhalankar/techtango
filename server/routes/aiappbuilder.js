const express = require("express");

const router = express.Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/checkSubscription");

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const ALLOWED_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "date",
  "time",
  "select",
  "checkbox",
  "radio",
  "email",
  "tel",
]);
const SYSTEM_FIELD_NAMES = new Set([
  "id",
  "transaction_id",
  "transaction_data",
  "tenant_id",
  "date_created",
  "created_by",
  "date_modified",
  "modified_by",
  "is_active",
  "is_deleted",
  "deleted_by",
  "deleted_at",
  "version_no",
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "app";

const extractJsonText = (payload) => {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if (typeof block?.text === "string" && block.text.trim()) {
        return block.text.trim();
      }
    }
  }

  return "";
};

const isBookingRequirement = (value) =>
  /meeting|room|booking|schedule/.test(String(value || "").toLowerCase());

const toSafeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeRelationshipDefinition = (relationship, index = 0) => {
  if (!relationship || typeof relationship !== "object") return null;

  const label = String(relationship.label || relationship.name || relationship.sourceField || relationship.columnName || `relationship_${index + 1}`).trim();
  const sourceField = slugify(relationship.sourceField || relationship.field || relationship.columnName || label);
  const columnName = slugify(relationship.columnName || sourceField || label);
  const targetTable = slugify(relationship.targetTable || relationship.references || relationship.lookupTable || "");
  const targetField = slugify(relationship.targetField || relationship.referenceField || "id");
  const displayField = slugify(relationship.displayField || relationship.lookupField || relationship.displayColumn || "");
  const lookupLabel = String(relationship.lookupLabel || relationship.displayLabel || "").trim();
  const widgetType = String(relationship.widgetType || relationship.widget || "dropdown").trim() || "dropdown";
  const relationshipType = String(relationship.relationshipType || relationship.type || "lookup").trim() || "lookup";

  if (!IDENT.test(columnName) || !targetTable) {
    return null;
  }

  return {
    name: slugify(relationship.name || label),
    label: label || columnName,
    sourceField: sourceField || columnName,
    columnName,
    targetTable,
    targetField: IDENT.test(targetField) ? targetField : "id",
    displayField: IDENT.test(displayField) ? displayField : "",
    lookupLabel,
    widgetType,
    relationshipType,
    required: Boolean(relationship.required),
    multiple: Boolean(relationship.multiple),
    onDelete: String(relationship.onDelete || "").trim(),
    validation: relationship.validation && typeof relationship.validation === "object" ? relationship.validation : {},
    metadata: relationship.metadata && typeof relationship.metadata === "object" ? relationship.metadata : {},
  };
};

const collectRelationships = (schema = {}) => {
  const explicit = toSafeArray(schema?.relationships)
    .filter((relationship) => relationship && typeof relationship === "object")
    .map(normalizeRelationshipDefinition)
    .filter(Boolean);

  const fieldDerived = toSafeArray(schema?.fields)
    .filter((field) => field && typeof field === "object" && field.relationship && typeof field.relationship === "object")
    .map((field, index) => normalizeRelationshipDefinition({
      ...field.relationship,
      sourceField: field.relationship.sourceField || field.name,
      columnName: field.relationship.columnName || field.name,
      label: field.relationship.label || field.label || field.name,
    }, index))
    .filter(Boolean);

  const relationships = [];
  const seen = new Set();
  for (const relationship of [...explicit, ...fieldDerived]) {
    const key = relationship.columnName || relationship.sourceField || relationship.name;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    relationships.push(relationship);
  }
  return relationships;
};

const normalizeDashboardConfig = (dashboardConfig = {}) => {
  const config = dashboardConfig && typeof dashboardConfig === "object" ? dashboardConfig : {};
  return {
    sourceTables: toSafeArray(config.sourceTables).map((value) => String(value)).filter(Boolean),
    cards: toSafeArray(config.cards)
      .filter((card) => card && typeof card === "object")
      .map((card) => ({
        ...card,
        title: String(card.title || "").trim(),
        table: String(card.table || "").trim(),
        metric: String(card.metric || "count").trim(),
        field: String(card.field || "").trim(),
        filterField: String(card.filterField || "").trim(),
        filterValue: card.filterValue ?? "",
      }))
      .filter((card) => card.title || card.table),
    charts: toSafeArray(config.charts)
      .filter((chart) => chart && typeof chart === "object")
      .map((chart) => ({
        ...chart,
        title: String(chart.title || "").trim(),
        table: String(chart.table || "").trim(),
        chartType: String(chart.chartType || "bar").trim(),
        xField: String(chart.xField || "").trim(),
        yField: String(chart.yField || "").trim(),
        groupBy: String(chart.groupBy || "").trim(),
        aggregate: String(chart.aggregate || "count").trim(),
        size: String(chart.size || "").trim(),
      }))
      .filter((chart) => chart.title || chart.table || chart.xField),
    tables: toSafeArray(config.tables)
      .filter((table) => table && typeof table === "object")
      .map((table) => ({
        ...table,
        title: String(table.title || "").trim(),
        table: String(table.table || "").trim(),
        columns: toSafeArray(table.columns).map((value) => String(value)).filter(Boolean),
        limit: Number(table.limit || 10),
      }))
      .filter((table) => table.title || table.table),
    textBlocks: toSafeArray(config.textBlocks)
      .filter((block) => block && typeof block === "object")
      .map((block) => ({
        ...block,
        title: String(block.title || "").trim(),
        content: String(block.content || "").trim(),
      }))
      .filter((block) => block.title || block.content),
    widgets: toSafeArray(config.widgets).map((value) => String(value)).filter(Boolean),
  };
};

const splitPayloadForTable = (schema, payload = {}) => {
  const relationships = collectRelationships(schema);
  const relationshipColumns = new Map();

  for (const relationship of relationships) {
    relationshipColumns.set(relationship.columnName, relationship);
    relationshipColumns.set(relationship.sourceField, relationship);
  }

  const transactionData = {};
  const relationValues = {};

  for (const [key, value] of Object.entries(payload || {})) {
    const relationship = relationshipColumns.get(key);
    if (relationship) {
      const normalizedValue = value && typeof value === "object"
        ? value.id ?? value.value ?? value.key ?? value[relationship.columnName] ?? null
        : value;
      relationValues[relationship.columnName] = normalizedValue;
      continue;
    }
    transactionData[key] = value;
  }

  return {
    transactionData,
    relationValues,
    relationships,
    presentKeys: new Set(Object.keys(payload || {})),
  };
};

const mergeRowWithRelationships = (row, relationships = []) => {
  if (!row) return row;
  const merged = {
    ...row,
    transaction_data: {
      ...(row.transaction_data || {}),
    },
  };

  for (const relationship of relationships) {
    if (!relationship) continue;
    const value = row[relationship.columnName];
    if (value !== undefined) {
      merged.transaction_data[relationship.sourceField || relationship.columnName] = value;
      merged.transaction_data[relationship.columnName] = value;
    }
  }

  return merged;
};

const normalizeBuilderField = (field, index = 0) => {
  if (!field || typeof field !== "object") return null;
  const name = slugify(field.name || field.label || `field_${index + 1}`);
  if (SYSTEM_FIELD_NAMES.has(name)) return null;
  const type = ALLOWED_FIELD_TYPES.has(String(field.type || "text").toLowerCase())
    ? String(field.type || "text").toLowerCase()
    : "text";
  return {
    name,
    label: String(field.label || name).trim() || name,
    type,
    required: Boolean(field.required),
    showInTable: field.showInTable !== false,
    searchable: Boolean(field.searchable),
    readOnly: Boolean(field.readOnly),
    uniqueValue: Boolean(field.uniqueValue),
    defaultValue: field.defaultValue ?? "",
    placeholder: String(field.placeholder || "").trim(),
    helperText: String(field.helperText || "").trim(),
    options: Array.isArray(field.options) ? field.options.map((option) => String(option)).filter(Boolean) : [],
    validation: field.validation && typeof field.validation === "object" ? field.validation : {},
    relationship: field.relationship && typeof field.relationship === "object" ? field.relationship : null,
  };
};

const buildSchemaFromBuilderSpec = (builderSpec, appName, requirement) => {
  const fields = Array.isArray(builderSpec?.fields)
    ? builderSpec.fields.map(normalizeBuilderField).filter(Boolean)
    : [];
  const normalizedFields = fields.length
    ? fields
    : null;

  const hasStructuredViewSpec = Boolean(
    builderSpec?.dashboardConfig ||
    builderSpec?.chartConfig ||
    builderSpec?.calendarConfig ||
    toSafeArray(builderSpec?.relationships).length ||
    toSafeArray(builderSpec?.validations).length ||
    toSafeArray(builderSpec?.uniqueRules).length ||
    toSafeArray(builderSpec?.overlapRules).length ||
    toSafeArray(builderSpec?.dependencies).length ||
    toSafeArray(builderSpec?.tableColumns).length
  );

  if (!normalizedFields && !hasStructuredViewSpec) {
    return null;
  }

  const validations = toSafeArray(builderSpec?.validations)
    .filter((validation) => validation && typeof validation === "object")
    .map((validation) => ({
      type: String(validation.type || "").trim(),
      fields: toSafeArray(validation.fields).map((value) => String(value)).filter(Boolean),
      field: String(validation.field || "").trim(),
      compareWith: String(validation.compareWith || "").trim(),
      message: String(validation.message || "").trim(),
    }))
    .filter((validation) => validation.type);

  const uniqueRules = toSafeArray(builderSpec?.uniqueRules)
    .filter((rule) => rule && typeof rule === "object")
    .map((rule) => ({
      name: String(rule.name || "").trim(),
      fields: toSafeArray(rule.fields).map((value) => String(value)).filter(Boolean),
      message: String(rule.message || "").trim(),
    }))
    .filter((rule) => rule.name && rule.fields.length >= 2);

  const overlapRules = toSafeArray(builderSpec?.overlapRules)
    .filter((rule) => rule && typeof rule === "object")
    .map((rule) => ({
      name: String(rule.name || "").trim(),
      resourceField: String(rule.resourceField || "").trim(),
      dateField: String(rule.dateField || "").trim(),
      startTimeField: String(rule.startTimeField || "").trim(),
      endTimeField: String(rule.endTimeField || "").trim(),
      durationField: String(rule.durationField || "").trim(),
      slotMinutes: clamp(Number(rule.slotMinutes || 30), 1, 1440),
      message: String(rule.message || "").trim(),
    }))
    .filter((rule) => rule.name && rule.resourceField && rule.dateField && rule.startTimeField);

  const dependencies = toSafeArray(builderSpec?.dependencies)
    .filter((rule) => rule && typeof rule === "object")
    .map((rule) => ({
      field: String(rule.field || "").trim(),
      dependsOn: String(rule.dependsOn || "").trim(),
      value: rule.value ?? null,
      showWhen: String(rule.showWhen || "").trim(),
    }))
    .filter((rule) => rule.field && rule.dependsOn);

  const appNameValue = String(builderSpec?.appName || appName || "New Application").trim() || "New Application";
  const requirementValue = String(builderSpec?.requirement || requirement || "").trim();
 return normalizeSchema({
  appName: appNameValue,
  title: String(builderSpec?.title || appNameValue).trim() || appNameValue,
  description: requirementValue,
  appMode: String(builderSpec?.appMode || "crud").trim() || "crud",
  sourceTable: String(
    builderSpec?.sourceTable ||
    builderSpec?.dashboardConfig?.sourceTables?.[0] ||
    ""
  ).trim(),
    fields: normalizedFields,
    tableColumns: Array.isArray(builderSpec?.tableColumns) ? builderSpec.tableColumns : [],
    validations,
    uniqueRules,
    overlapRules,
    dependencies,
    relationships: toSafeArray(builderSpec?.relationships)
      .filter((relationship) => relationship && typeof relationship === "object"),
    dashboardConfig: normalizeDashboardConfig(builderSpec?.dashboardConfig),
    chartConfig: builderSpec?.chartConfig && typeof builderSpec.chartConfig === "object" ? builderSpec.chartConfig : {},
    calendarConfig: builderSpec?.calendarConfig && typeof builderSpec.calendarConfig === "object" ? builderSpec.calendarConfig : {},
    ui: builderSpec?.ui && typeof builderSpec.ui === "object" ? builderSpec.ui : {},
  }, appNameValue, requirementValue);
};

const normalizeSchema = (schema, fallbackName = "New Application", requirement = "") => {
  const requestedMode = String(schema?.appMode || "crud").trim() || "crud";

const isDataViewMode = [
  "chart",
  "dashboard",
  "report",
  "booking_chart",
  "calendar",
].includes(requestedMode);

const safeFields = Array.isArray(schema?.fields)
  ? schema.fields
      .filter((field) => field && typeof field === "object")
      .map((field, index) => {
        const name = slugify(field.name || field.label || `field_${index + 1}`);
        if (SYSTEM_FIELD_NAMES.has(name)) {
          return null;
        }

        const type = ALLOWED_FIELD_TYPES.has(String(field.type || "text").toLowerCase())
          ? String(field.type || "text").toLowerCase()
          : "text";

        return {
          name,
          label: String(field.label || name).trim() || name,
          type,
          required: Boolean(field.required),
          showInTable: field.showInTable !== false,
          defaultValue: field.defaultValue ?? "",
          placeholder: String(field.placeholder || "").trim(),
          options: Array.isArray(field.options) ? field.options.map((option) => String(option)) : [],
          validation: field.validation && typeof field.validation === "object" ? field.validation : {},
        };
      })
      .filter(Boolean)
  : [];

const fields = safeFields.length
  ? safeFields
  : isDataViewMode
    ? []
    : [
        { name: "title", label: "Title", type: "text", required: true, showInTable: true, defaultValue: "" },
        { name: "description", label: "Description", type: "textarea", required: false, showInTable: true, defaultValue: "" },
        { name: "status", label: "Status", type: "select", required: true, showInTable: true, defaultValue: "Active", options: ["Active", "Inactive"] },
      ];

  const validations = Array.isArray(schema?.validations)
  ? schema.validations
  : [];

  // const uniqueRules = Array.isArray(schema?.uniqueRules)
  //   ? schema.uniqueRules
  //   : [];

  // const overlapRules = Array.isArray(schema?.overlapRules)
  //   ? schema.overlapRules
  //   : [];

  const dependencies = Array.isArray(schema?.dependencies)
    ? schema.dependencies
    : [];

  const tableColumns = Array.isArray(schema?.tableColumns)
    ? schema.tableColumns
    : fields
        .filter((field) => field.showInTable)
        .map((field) => field.name);

  const ui =
    schema?.ui && typeof schema.ui === "object"
      ? schema.ui
      : {};
      
  const safeValidations = validations
    .filter((validation) => validation && typeof validation === "object")
    .map((validation) => ({
      type: String(validation.type || "").trim(),
      fields: Array.isArray(validation.fields) ? validation.fields.map((value) => String(value)).filter(Boolean) : [],
      field: String(validation.field || "").trim(),
      compareWith: String(validation.compareWith || "").trim(),
      message: String(validation.message || "").trim(),
    }))
    .filter((validation) => validation.type);

  const safeUniqueRules = toSafeArray(schema?.uniqueRules)
    .filter((rule) => rule && typeof rule === "object")
    .map((rule) => ({
      name: String(rule.name || "").trim(),
      fields: toSafeArray(rule.fields).map((value) => String(value)).filter(Boolean),
      message: String(rule.message || "").trim(),
    }))
    .filter((rule) => rule.name && rule.fields.length >= 2);

  const safeOverlapRules = toSafeArray(schema?.overlapRules)
    .filter((rule) => rule && typeof rule === "object")
    .map((rule) => ({
      name: String(rule.name || "").trim(),
      resourceField: String(rule.resourceField || "").trim(),
      dateField: String(rule.dateField || "").trim(),
      startTimeField: String(rule.startTimeField || "").trim(),
      endTimeField: String(rule.endTimeField || "").trim(),
      durationField: String(rule.durationField || "").trim(),
      slotMinutes: clamp(Number(rule.slotMinutes || 30), 1, 1440),
      message: String(rule.message || "").trim(),
    }))
    .filter((rule) => rule.name && rule.resourceField && rule.dateField && rule.startTimeField);

  const safeDependencies = toSafeArray(schema?.dependencies)
    .filter((rule) => rule && typeof rule === "object")
    .map((rule) => ({
      field: String(rule.field || "").trim(),
      dependsOn: String(rule.dependsOn || "").trim(),
      value: rule.value ?? null,
      showWhen: String(rule.showWhen || "").trim(),
    }))
    .filter((rule) => rule.field && rule.dependsOn);

  const safeRelationships = collectRelationships(schema);

  // const bookingMode = isBookingRequirement(`${fallbackName} ${requirement} ${schema?.title || ""} ${schema?.description || ""}`);
  // const uniqueRules = safeUniqueRules.length
  //   ? safeUniqueRules
  //   : bookingMode
  //     ? [
  //         {
  //           name: "unique_room_date_start_time",
  //           fields: ["room_name", "booking_date", "start_time"],
  //           message: "This room is already booked for the selected date and start time.",
  //         },
  //       ]
  //     : [];

  const uniqueRules = safeUniqueRules;

  // if (bookingMode) {
  //   fields.forEach((field) => {
  //     if (field.name === "booking_date") {
  //       field.validation = {
  //         ...(field.validation || {}),
  //         type: "date_not_past",
  //         message: "Booking date cannot be in the past",
  //       };
  //     }
  //     if (field.name === "end_time") {
  //       field.validation = {
  //         ...(field.validation || {}),
  //         type: "greater_than",
  //         compareWith: "start_time",
  //         message: "End time must be after start time",
  //       };
  //     }
  //     if (field.name === "duration_slots") {
  //       field.validation = {
  //         ...(field.validation || {}),
  //         min: 1,
  //         message: "Duration must be at least 1 slot",
  //       };
  //     }
  //   });
  // }
  // const overlapRules = safeOverlapRules.length
  //   ? safeOverlapRules
  //   : bookingMode
  //     ? [
  //         {
  //           name: "prevent_room_booking_overlap",
  //           resourceField: "room_name",
  //           dateField: "booking_date",
  //           startTimeField: "start_time",
  //           endTimeField: "",
  //           durationField: "duration_slots",
  //           slotMinutes: 30,
  //           message: "This room is already booked during the selected time slot.",
  //         },
  //       ]
  //     : [];

  const overlapRules = safeOverlapRules;

  const appName = String(schema?.appName || fallbackName).trim() || fallbackName;
  const appSlug = slugify(schema?.appSlug || appName);
  const tableName = `cust_${appSlug}`;
  const appMode = String(schema?.appMode || "crud").trim() || "crud";
  const sourceTable = String(schema?.sourceTable || "").trim();
  return {
    appName,
    appSlug,
    tableName,
    title: String(schema?.title || appName).trim() || appName,
    description: String(schema?.description || "").trim(),
    appMode,
    sourceTable,
    chartConfig: schema?.chartConfig && typeof schema.chartConfig === "object" ? schema.chartConfig : {},
    dashboardConfig: normalizeDashboardConfig(schema?.dashboardConfig),
    calendarConfig: schema?.calendarConfig && typeof schema.calendarConfig === "object" ? schema.calendarConfig : {},
    fields,
    tableColumns: Array.isArray(schema?.tableColumns)
      ? schema.tableColumns.map((value) => String(value)).filter((value) => Boolean(value) && !SYSTEM_FIELD_NAMES.has(value))
      : fields.filter((field) => field.showInTable !== false).map((field) => field.name),
    validations: safeValidations,
    uniqueRules,
    overlapRules,
    dependencies: safeDependencies,
    relationships: safeRelationships,
    ui: schema?.ui && typeof schema.ui === "object" ? schema.ui : {},
  };
};

const buildHeuristicSchema = (appName, requirement, builderSpec = null, appType = "auto", sourceTable = "") => {
  const builderSchema = buildSchemaFromBuilderSpec(builderSpec, appName, requirement);
  if (builderSchema) {
    return builderSchema;
  }

  const text = `${appName || ""} ${requirement || ""} ${appType || ""}`.toLowerCase();

  const appMode =
    appType && appType !== "auto"
      ? appType
      : /booking chart|slot view/.test(text)
        ? "booking_chart"
        : /chart|graph|report|dashboard|visual/.test(text)
          ? "chart"
          : "crud";

  const fields = ["chart", "dashboard", "report", "booking_chart", "calendar"].includes(appMode)
    ? []
    : [
        { name: "title", label: "Title", type: "text", required: true, showInTable: true },
        { name: "description", label: "Description", type: "textarea", required: false, showInTable: true },
        { name: "status", label: "Status", type: "select", required: true, showInTable: true, defaultValue: "Active", options: ["Active", "Inactive"] },
      ];

  return normalizeSchema({
    appName,
    title: appName || "New Application",
    description: String(requirement || "").trim(),
    appMode,
    sourceTable: sourceTable || "",
    fields,
    tableColumns: [],
    validations: [],
    uniqueRules: [],
    overlapRules: [],
    dependencies: [],
    relationships: [],
    dashboardConfig: normalizeDashboardConfig({}),
    chartConfig: {
      chartType: appMode === "booking_chart" ? "booking_chart" : "bar",
      xField: "",
      yField: "",
      groupBy: "",
      aggregate: "count",
      title: appName || "Chart",
    },
    calendarConfig: {
      dateField: "",
      titleField: "",
      startTimeField: "",
      endTimeField: "",
      resourceField: "",
    },
    ui: {},
  }, appName || "New Application", requirement);
};

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aiappbuilder_applications (
      id BIGSERIAL PRIMARY KEY,
      app_name TEXT NOT NULL,
      app_slug TEXT NOT NULL UNIQUE,
      table_name TEXT NOT NULL UNIQUE,
      requirement TEXT,
      schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'Active',
      created_by BIGINT,
      tenant_id BIGINT,
      date_created TIMESTAMPTZ NOT NULL DEFAULT now(),
      date_modified TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS aiappbuilder_relationships (
      id BIGSERIAL PRIMARY KEY,
      app_id BIGINT REFERENCES aiappbuilder_applications(id) ON DELETE CASCADE,
      app_slug TEXT NOT NULL,
      table_name TEXT NOT NULL,
      relationship_name TEXT NOT NULL,
      label TEXT NOT NULL,
      source_field TEXT NOT NULL,
      column_name TEXT NOT NULL,
      target_table TEXT NOT NULL,
      target_field TEXT NOT NULL DEFAULT 'id',
      display_field TEXT,
      lookup_label TEXT,
      widget_type TEXT NOT NULL DEFAULT 'dropdown',
      relationship_type TEXT NOT NULL DEFAULT 'lookup',
      required BOOLEAN NOT NULL DEFAULT false,
      multiple BOOLEAN NOT NULL DEFAULT false,
      on_delete TEXT,
      validation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      tenant_id BIGINT,
      created_by BIGINT,
      date_created TIMESTAMPTZ NOT NULL DEFAULT now(),
      date_modified TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (app_slug, column_name)
    );
  `);

  const { rows: columnRows } = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'aiappbuilder_applications'
    `
  );
  const columns = new Set(columnRows.map((row) => row.column_name));
  const alters = [];
  if (!columns.has("tenant_id")) alters.push(`ADD COLUMN IF NOT EXISTS tenant_id BIGINT`);
  if (!columns.has("date_created")) alters.push(`ADD COLUMN IF NOT EXISTS date_created TIMESTAMPTZ NOT NULL DEFAULT now()`);
  if (!columns.has("date_modified")) alters.push(`ADD COLUMN IF NOT EXISTS date_modified TIMESTAMPTZ NOT NULL DEFAULT now()`);
  if (alters.length) {
    await pool.query(`ALTER TABLE aiappbuilder_applications ${alters.join(", ")}`);
  }

  const { rows: relationshipColumnRows } = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'aiappbuilder_relationships'
    `
  );
  const relationshipColumns = new Set(relationshipColumnRows.map((row) => row.column_name));
  const relationshipAlters = [];
  if (!relationshipColumns.has("app_id")) relationshipAlters.push(`ADD COLUMN IF NOT EXISTS app_id BIGINT`);
  if (!relationshipColumns.has("app_slug")) relationshipAlters.push(`ADD COLUMN IF NOT EXISTS app_slug TEXT NOT NULL DEFAULT ''`);
  if (!relationshipColumns.has("table_name")) relationshipAlters.push(`ADD COLUMN IF NOT EXISTS table_name TEXT NOT NULL DEFAULT ''`);
  if (!relationshipColumns.has("source_field")) relationshipAlters.push(`ADD COLUMN IF NOT EXISTS source_field TEXT NOT NULL DEFAULT ''`);
  if (!relationshipColumns.has("column_name")) relationshipAlters.push(`ADD COLUMN IF NOT EXISTS column_name TEXT NOT NULL DEFAULT ''`);
  if (!relationshipColumns.has("relationship_name")) relationshipAlters.push(`ADD COLUMN IF NOT EXISTS relationship_name TEXT NOT NULL DEFAULT ''`);
  if (!relationshipColumns.has("label")) relationshipAlters.push(`ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT ''`);
  if (relationshipAlters.length) {
    await pool.query(`ALTER TABLE aiappbuilder_relationships ${relationshipAlters.join(", ")}`);
  }
  await pool.query(`
    UPDATE aiappbuilder_relationships r
       SET app_slug = COALESCE(NULLIF(r.app_slug, ''), a.app_slug),
           table_name = COALESCE(NULLIF(r.table_name, ''), a.table_name)
      FROM aiappbuilder_applications a
     WHERE r.app_id = a.id
  `);
  await pool.query(`
    UPDATE aiappbuilder_relationships
       SET app_slug = COALESCE(NULLIF(app_slug, ''), ''),
           table_name = COALESCE(NULLIF(table_name, ''), '')
  `);
  await pool.query(`UPDATE aiappbuilder_relationships SET source_field = COALESCE(NULLIF(source_field, ''), column_name, relationship_name, label)`);
  await pool.query(`UPDATE aiappbuilder_relationships SET column_name = COALESCE(NULLIF(column_name, ''), source_field, relationship_name, label)`);
  await pool.query(`UPDATE aiappbuilder_relationships SET relationship_name = COALESCE(NULLIF(relationship_name, ''), label, column_name, source_field)`);
  await pool.query(`UPDATE aiappbuilder_relationships SET label = COALESCE(NULLIF(label, ''), relationship_name, column_name, source_field)`);
}

async function ensureAppTable(tableName, schema = null) {
  if (!IDENT.test(tableName)) {
    throw new Error("Invalid table name");
  }
  const relationships = collectRelationships(schema);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      id BIGSERIAL PRIMARY KEY,
      transaction_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      tenant_id BIGINT NOT NULL DEFAULT 1,
      created_by BIGINT,
      date_created TIMESTAMPTZ NOT NULL DEFAULT now(),
      modified_by BIGINT,
      date_modified TIMESTAMPTZ NOT NULL DEFAULT now(),
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      deleted_by BIGINT,
      deleted_at TIMESTAMPTZ,
      version_no INTEGER NOT NULL DEFAULT 1
    );
  `);

  const { rows: columnRows } = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
    `,
    [tableName]
  );
  const columns = new Set(columnRows.map((row) => row.column_name));

  if (columns.has("transaction_id") && !columns.has("id")) {
    await pool.query(`ALTER TABLE "${tableName}" RENAME COLUMN transaction_id TO id;`);
    columns.add("id");
    columns.delete("transaction_id");
  }

  const alters = [];
  if (!columns.has("tenant_id")) alters.push(`ADD COLUMN IF NOT EXISTS tenant_id BIGINT NOT NULL DEFAULT 1`);
  if (!columns.has("created_by")) alters.push(`ADD COLUMN IF NOT EXISTS created_by BIGINT`);
  if (!columns.has("date_created")) alters.push(`ADD COLUMN IF NOT EXISTS date_created TIMESTAMPTZ NOT NULL DEFAULT now()`);
  if (!columns.has("modified_by")) alters.push(`ADD COLUMN IF NOT EXISTS modified_by BIGINT`);
  if (!columns.has("date_modified")) alters.push(`ADD COLUMN IF NOT EXISTS date_modified TIMESTAMPTZ NOT NULL DEFAULT now()`);
  if (!columns.has("is_active")) alters.push(`ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
  if (!columns.has("is_deleted")) alters.push(`ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false`);
  if (!columns.has("deleted_by")) alters.push(`ADD COLUMN IF NOT EXISTS deleted_by BIGINT`);
  if (!columns.has("deleted_at")) alters.push(`ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  if (!columns.has("version_no")) alters.push(`ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1`);
  for (const relationship of relationships) {
    if (!columns.has(relationship.columnName)) {
      alters.push(`ADD COLUMN IF NOT EXISTS "${relationship.columnName}" BIGINT`);
    }
  }
  if (alters.length) {
    await pool.query(`ALTER TABLE "${tableName}" ${alters.join(", ")}`);
  }

  await pool.query(`
    UPDATE "${tableName}"
       SET tenant_id = COALESCE(tenant_id, 1),
           date_created = COALESCE(date_created, now()),
           date_modified = COALESCE(date_modified, now()),
           is_active = COALESCE(is_active, true),
           is_deleted = COALESCE(is_deleted, false),
           version_no = COALESCE(version_no, 1)
  `);

  await pool.query(`
    ALTER TABLE "${tableName}"
      ALTER COLUMN tenant_id SET DEFAULT 1,
      ALTER COLUMN tenant_id SET NOT NULL,
      ALTER COLUMN date_created SET DEFAULT now(),
      ALTER COLUMN date_created SET NOT NULL,
      ALTER COLUMN date_modified SET DEFAULT now(),
      ALTER COLUMN date_modified SET NOT NULL,
      ALTER COLUMN is_active SET DEFAULT true,
      ALTER COLUMN is_active SET NOT NULL,
      ALTER COLUMN is_deleted SET DEFAULT false,
      ALTER COLUMN is_deleted SET NOT NULL,
      ALTER COLUMN version_no SET DEFAULT 1,
      ALTER COLUMN version_no SET NOT NULL
  `);
}

const buildPromptSchema = () => ({
  type: "object",
  additionalProperties: false,
  properties: {
    appName: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    appMode: { type: "string" },
    sourceTable: { type: "string" },
    chartConfig: {
              type: "object",
              additionalProperties: false,
              properties: {
                chartType: { type: "string" },
                xField: { type: "string" },
                yField: { type: "string" },
                groupBy: { type: "string" },
                aggregate: { type: "string" },
                title: { type: "string" }
              },
              required: ["chartType", "xField", "yField", "groupBy", "aggregate", "title"]
            },
            dashboardConfig: {
              type: "object",
              additionalProperties: false,
              properties: {
                sourceTables: { type: "array", items: { type: "string" } },
                cards: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      table: { type: "string" },
                      metric: { type: "string" },
                      field: { type: "string" },
                      filterField: { type: "string" },
                      filterValue: {
                        anyOf: [
                          { type: "string" },
                          { type: "number" },
                          { type: "boolean" },
                          { type: "null" },
                        ],
                      },
                    },
                    required: ["title", "table", "metric", "field", "filterField", "filterValue"],
                  },
                },
                charts: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      table: { type: "string" },
                      chartType: { type: "string" },
                      xField: { type: "string" },
                      yField: { type: "string" },
                      groupBy: { type: "string" },
                      aggregate: { type: "string" },
                      size: { type: "string" }
                    },
                    required: ["title", "table", "chartType", "xField", "yField", "groupBy", "aggregate", "size"]
                  }
                },
                tables: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      table: { type: "string" },
                      columns: { type: "array", items: { type: "string" } },
                      limit: { type: "number" }
                    },
                    required: ["title", "table", "columns", "limit"]
                  }
                },
                textBlocks: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      content: { type: "string" }
                    },
                    required: ["title", "content"]
                  }
                },
                widgets: { type: "array", items: { type: "string" } }
              },
              required: ["sourceTables", "cards", "charts", "tables", "textBlocks", "widgets"]
            },
    calendarConfig: {
      type: "object",
      additionalProperties: false,
      properties: {
        dateField: { type: "string" },
                titleField: { type: "string" },
                startTimeField: { type: "string" },
                endTimeField: { type: "string" },
                resourceField: { type: "string" }
      },
      required: ["dateField", "titleField", "startTimeField", "endTimeField", "resourceField"]
    },
    relationships: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          label: { type: "string" },
          sourceField: { type: "string" },
          columnName: { type: "string" },
          targetTable: { type: "string" },
          targetField: { type: "string" },
          displayField: { type: "string" },
          lookupLabel: { type: "string" },
          widgetType: { type: "string" },
          relationshipType: { type: "string" },
          required: { type: "boolean" },
          multiple: { type: "boolean" },
          onDelete: { type: "string" },
          validation: {
            type: "object",
            additionalProperties: false,
            properties: {
              minLength: { type: "number" },
              maxLength: { type: "number" },
              min: { type: "number" },
              max: { type: "number" },
            },
            required: ["minLength", "maxLength", "min", "max"],
          },
          metadata: {
            type: "object",
            additionalProperties: false,
            properties: {},
          },
        },
        required: [
          "name",
          "label",
          "sourceField",
          "columnName",
          "targetTable",
          "targetField",
          "displayField",
          "lookupLabel",
          "widgetType",
          "relationshipType",
          "required",
          "multiple",
          "onDelete",
          "validation",
          "metadata",
        ],
      },
    },
    tableColumns: { type: "array", items: { type: "string" } },
    validations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string" },
          fields: { type: "array", items: { type: "string" } },
          field: { type: "string" },
          compareWith: { type: "string" },
          message: { type: "string" },
        },
        required: ["type", "fields", "field", "compareWith", "message"],
      },
    },
    uniqueRules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          fields: { type: "array", items: { type: "string" } },
          message: { type: "string" },
        },
        required: ["name", "fields", "message"],
      },
    },
    overlapRules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          resourceField: { type: "string" },
          dateField: { type: "string" },
          startTimeField: { type: "string" },
          endTimeField: { type: "string" },
          durationField: { type: "string" },
          slotMinutes: { type: "number" },
          message: { type: "string" },
        },
        required: [
          "name",
          "resourceField",
          "dateField",
          "startTimeField",
          "endTimeField",
          "durationField",
          "slotMinutes",
          "message",
        ],
      },
    },
    dependencies: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          dependsOn: { type: "string" },
          value: {
            anyOf: [
              { type: "string" },
              { type: "number" },
              { type: "boolean" },
              { type: "null" },
            ],
          },
          showWhen: { type: "string" },
        },
        required: ["field", "dependsOn", "value", "showWhen"],
      },
    },
    ui: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          label: { type: "string" },
          type: { type: "string" },
          required: { type: "boolean" },
          showInTable: { type: "boolean" },
          defaultValue: {
            anyOf: [
              { type: "string" },
              { type: "number" },
              { type: "boolean" },
              { type: "null" },
              {
                type: "array",
                items: {
                  anyOf: [
                    { type: "string" },
                    { type: "number" },
                    { type: "boolean" },
                    { type: "null" },
                  ],
                },
              },
              {
                type: "object",
                additionalProperties: false,
                properties: {},
              },
            ],
          },
          placeholder: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          relationship: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  label: { type: "string" },
                  sourceField: { type: "string" },
                  columnName: { type: "string" },
                  targetTable: { type: "string" },
                  targetField: { type: "string" },
                  displayField: { type: "string" },
                  lookupLabel: { type: "string" },
                  widgetType: { type: "string" },
                  relationshipType: { type: "string" },
                  required: { type: "boolean" },
                  multiple: { type: "boolean" },
                  onDelete: { type: "string" },
                  validation: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      minLength: { type: "number" },
                      maxLength: { type: "number" },
                      min: { type: "number" },
                      max: { type: "number" },
                    },
                    required: ["minLength", "maxLength", "min", "max"],
                  },
                  metadata: {
                    type: "object",
                    additionalProperties: false,
                    properties: {},
                  },
                },
                required: [
                  "name",
                  "label",
                  "sourceField",
                  "columnName",
                  "targetTable",
                  "targetField",
                  "displayField",
                  "lookupLabel",
                  "widgetType",
                  "relationshipType",
                  "required",
                  "multiple",
                  "onDelete",
                  "validation",
                  "metadata",
                ],
              },
              { type: "null" },
            ],
          },
          validation: {
            type: "object",
            additionalProperties: false,
            properties: {
              minLength: { type: "number" },
              maxLength: { type: "number" },
              min: { type: "number" },
              max: { type: "number" },
            },
            required: ["minLength", "maxLength", "min", "max"],
          },
        },
        required: [
          "name",
          "label",
          "type",
          "required",
          "showInTable",
          "defaultValue",
          "placeholder",
          "options",
          "relationship",
          "validation",
        ],
      },
    },
  },
  required: ["appName", "title", "description", "appMode", "sourceTable", "tableColumns", "validations", "uniqueRules", "overlapRules", "dependencies", "relationships", "ui", "fields", "chartConfig", "dashboardConfig", "calendarConfig"],
});

async function getAppBySlug(appSlug) {
  const { rows } = await pool.query(
    `SELECT * FROM aiappbuilder_applications WHERE app_slug = $1 LIMIT 1`,
    [appSlug]
  );
  const app = rows[0] || null;
  if (!app) {
    return null;
  }

  const { rows: relationshipRows } = await pool.query(
    `SELECT *
       FROM aiappbuilder_relationships
      WHERE app_slug = $1
      ORDER BY id ASC`,
    [appSlug]
  );

  const relationshipPayload = relationshipRows.map((row) => ({
    name: row.relationship_name,
    label: row.label || row.relationship_name,
    sourceField: row.source_field,
    columnName: row.column_name,
    targetTable: row.target_table,
    targetField: row.target_field,
    displayField: row.display_field,
    lookupLabel: row.lookup_label,
    widgetType: row.widget_type,
    relationshipType: row.relationship_type,
    required: Boolean(row.required),
    multiple: Boolean(row.multiple),
    onDelete: row.on_delete,
    validation: row.validation_json || {},
    metadata: row.metadata || {},
  }));

  app.relationships = relationshipPayload;
  app.schema_json = {
    ...(app.schema_json || {}),
    relationships: relationshipPayload.length
      ? relationshipPayload
      : Array.isArray(app.schema_json?.relationships)
        ? app.schema_json.relationships
        : [],
  };
  return app;
}

async function getTableColumns(tableName) {
  const { rows } = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
    `,
    [tableName]
  );
  return new Set(rows.map((row) => row.column_name));
}

async function syncRelationshipMetadata(app, schema = null) {
  const relationships = collectRelationships(schema || app?.schema_json || {});
  if (!app || !relationships.length) {
    return [];
  }

  await pool.query(
    `DELETE FROM aiappbuilder_relationships WHERE app_id = $1 OR app_slug = $2`,
    [app.id, app.app_slug]
  );

  const created = [];
  for (const relationship of relationships) {
    created.push(
      await pool.query(
        `INSERT INTO aiappbuilder_relationships (
          app_id,
          app_slug,
          table_name,
          relationship_name,
          label,
          source_field,
          column_name,
          target_table,
          target_field,
          display_field,
          lookup_label,
          widget_type,
          relationship_type,
          required,
          multiple,
          on_delete,
          validation_json,
          metadata,
          tenant_id,
          created_by,
          date_modified
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19,$20, now())
        ON CONFLICT (app_slug, column_name)
        DO UPDATE SET
          app_id = EXCLUDED.app_id,
          table_name = EXCLUDED.table_name,
          relationship_name = EXCLUDED.relationship_name,
          label = EXCLUDED.label,
          source_field = EXCLUDED.source_field,
          target_table = EXCLUDED.target_table,
          target_field = EXCLUDED.target_field,
          display_field = EXCLUDED.display_field,
          lookup_label = EXCLUDED.lookup_label,
          widget_type = EXCLUDED.widget_type,
          relationship_type = EXCLUDED.relationship_type,
          required = EXCLUDED.required,
          multiple = EXCLUDED.multiple,
          on_delete = EXCLUDED.on_delete,
          validation_json = EXCLUDED.validation_json,
          metadata = EXCLUDED.metadata,
          tenant_id = EXCLUDED.tenant_id,
          created_by = EXCLUDED.created_by,
          date_modified = now()`,
        [
          app.id,
          app.app_slug,
          app.table_name,
          relationship.name,
          relationship.label,
          relationship.sourceField,
          relationship.columnName,
          relationship.targetTable,
          relationship.targetField,
          relationship.displayField || null,
          relationship.lookupLabel || null,
          relationship.widgetType,
          relationship.relationshipType,
          relationship.required,
          relationship.multiple,
          relationship.onDelete || null,
          JSON.stringify(relationship.validation || {}),
          JSON.stringify(relationship.metadata || {}),
          app.tenant_id ?? null,
          app.created_by ?? null,
        ]
      )
    );
  }

  return created;
}

const validateUniqueCombinations = async (app, payload, excludeId = null) => {
  const validations = Array.isArray(app?.schema_json?.validations) ? app.schema_json.validations : [];
  for (const validation of validations) {
    if (String(validation?.type || "").toLowerCase() !== "unique_combination") {
      continue;
    }
    const fields = Array.isArray(validation.fields)
      ? validation.fields.map((value) => String(value).trim()).filter(Boolean)
      : [];
    if (fields.length < 2) {
      continue;
    }
    const clauses = [];
    const params = [];
    for (const field of fields) {
      if (!IDENT.test(field)) {
        throw new Error(`Invalid validation field: ${field}`);
      }
      params.push(String(payload?.[field] ?? "").trim());
      clauses.push(`COALESCE(transaction_data->>'${field}', '') = $${params.length}`);
    }

    let sql = `SELECT id FROM "${app.table_name}" WHERE ${clauses.join(" AND ")}`;
    sql += " AND COALESCE(is_deleted, false) = false";
    if (excludeId !== null && excludeId !== undefined && excludeId !== "") {
      params.push(excludeId);
      sql += ` AND id <> $${params.length}`;
    }
    sql += " LIMIT 1";

    const { rows } = await pool.query(sql, params);
    if (rows.length) {
      const error = new Error(String(validation.message || "Duplicate record is not allowed"));
      error.statusCode = 409;
      throw error;
    }
  }
};

const validateFieldRules = (app, payload) => {
  const fields = Array.isArray(app?.schema_json?.fields) ? app.schema_json.fields : [];
  for (const field of fields) {
    const name = String(field?.name || "").trim();
    if (!name) {
      continue;
    }
    const value = payload?.[name];
    const textValue = String(value ?? "").trim();
    const validation = field?.validation && typeof field.validation === "object" ? field.validation : {};

    if (field.required && (value === undefined || value === null || textValue === "")) {
      const error = new Error(`${field.label || name} is required`);
      error.statusCode = 400;
      throw error;
    }

    if (field.type === "email" && textValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textValue)) {
      const error = new Error("Enter a valid email address");
      error.statusCode = 400;
      throw error;
    }

    if (field.type === "tel" && textValue && !/^[0-9+\-()\s]{7,}$/.test(textValue)) {
      const error = new Error("Enter a valid phone number");
      error.statusCode = 400;
      throw error;
    }

    if (field.type === "number" && textValue !== "") {
      const numberValue = Number(textValue);
      if (Number.isNaN(numberValue)) {
        const error = new Error("Enter a valid number");
        error.statusCode = 400;
        throw error;
      }
      if (validation.min !== undefined && numberValue < Number(validation.min)) {
        const error = new Error(`Minimum value is ${validation.min}`);
        error.statusCode = 400;
        throw error;
      }
      if (validation.max !== undefined && numberValue > Number(validation.max)) {
        const error = new Error(`Maximum value is ${validation.max}`);
        error.statusCode = 400;
        throw error;
      }
    }

    if (validation.minLength && textValue.length < Number(validation.minLength)) {
      const error = new Error(`Minimum length is ${validation.minLength}`);
      error.statusCode = 400;
      throw error;
    }
    if (validation.maxLength && textValue.length > Number(validation.maxLength)) {
      const error = new Error(`Maximum length is ${validation.maxLength}`);
      error.statusCode = 400;
      throw error;
    }
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern, validation.flags || "");
      if (textValue && !regex.test(textValue)) {
        const error = new Error(validation.message || `${field.label || name} is invalid`);
        error.statusCode = 400;
        throw error;
      }
    }
    if (validation.type === "date_not_past" || validation.dateNotPast) {
      const parsed = new Date(`${textValue}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (textValue && !Number.isNaN(parsed.getTime()) && parsed < today) {
        const error = new Error(validation.message || `${field.label || name} cannot be in the past`);
        error.statusCode = 400;
        throw error;
      }
    }
    if (validation.type === "greater_than" && validation.compareWith) {
      const compareValue = payload?.[validation.compareWith];
      const currentMinutes = parseTimeToMinutes(textValue);
      const compareMinutes = parseTimeToMinutes(compareValue);
      if (currentMinutes !== null && compareMinutes !== null && currentMinutes <= compareMinutes) {
        const error = new Error(validation.message || `${field.label || name} must be after ${validation.compareWith}`);
        error.statusCode = 400;
        throw error;
      }
    }
    if ((field.type === "select" || field.type === "radio") && Array.isArray(field.options) && field.options.length && textValue) {
      const allowed = field.options.map((option) => String(option));
      if (!allowed.includes(String(value))) {
        const error = new Error(`${field.label || name} must be one of the allowed values`);
        error.statusCode = 400;
        throw error;
      }
    }
  }
};

const parseTimeToMinutes = (value) => {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const resolveRuleSet = (app) => {
  const schema = app?.schema_json || {};
  return {
    uniqueRules: Array.isArray(schema.uniqueRules) ? schema.uniqueRules : [],
    overlapRules: Array.isArray(schema.overlapRules) ? schema.overlapRules : [],
  };
};

const validateUniqueRules = async (app, payload, excludeId = null) => {
  const { uniqueRules } = resolveRuleSet(app);
  const fallbackRules = Array.isArray(app?.schema_json?.validations) ? app.schema_json.validations : [];
  const rules = [
    ...uniqueRules,
    ...fallbackRules
      .filter((validation) => String(validation?.type || "").toLowerCase() === "unique_combination")
      .map((validation, index) => ({
        name: String(validation.name || `unique_combination_${index + 1}`),
        fields: Array.isArray(validation.fields) ? validation.fields : [],
        message: validation.message,
      })),
  ];

  for (const rule of rules) {
    const fields = Array.isArray(rule.fields)
      ? rule.fields.map((value) => String(value).trim()).filter(Boolean)
      : [];
    if (fields.length < 2) {
      continue;
    }
    const clauses = [];
    const params = [];
    for (const field of fields) {
      if (!IDENT.test(field)) {
        throw new Error(`Invalid validation field: ${field}`);
      }
      params.push(String(payload?.[field] ?? "").trim());
      clauses.push(`COALESCE(transaction_data->>'${field}', '') = $${params.length}`);
    }

    let sql = `SELECT id FROM "${app.table_name}" WHERE ${clauses.join(" AND ")}`;
    if (excludeId !== null && excludeId !== undefined && excludeId !== "") {
      params.push(excludeId);
      sql += ` AND id <> $${params.length}`;
    }
    sql += " LIMIT 1";

    const { rows } = await pool.query(sql, params);
    if (rows.length) {
      const error = new Error(String(rule.message || "Duplicate record is not allowed"));
      error.statusCode = 409;
      throw error;
    }
  }
};

const validateOverlapRules = async (app, payload, excludeId = null) => {
  const { overlapRules } = resolveRuleSet(app);
  for (const rule of overlapRules) {
    const resourceField = String(rule.resourceField || "").trim();
    const dateField = String(rule.dateField || "").trim();
    const startTimeField = String(rule.startTimeField || "").trim();
    const endTimeField = String(rule.endTimeField || "").trim();
    const durationField = String(rule.durationField || "").trim();
    const slotMinutes = clamp(Number(rule.slotMinutes || 30), 1, 1440);

    if (!resourceField || !dateField || !startTimeField) {
      continue;
    }
    if (!IDENT.test(resourceField) || !IDENT.test(dateField) || !IDENT.test(startTimeField)) {
      throw new Error("Invalid overlap rule field configuration");
    }

    const resourceValue = String(payload?.[resourceField] ?? "").trim();
    const dateValue = String(payload?.[dateField] ?? "").trim();
    const startMinutes = parseTimeToMinutes(payload?.[startTimeField]);
    if (!resourceValue || !dateValue || startMinutes === null) {
      continue;
    }

    let endMinutes = null;
    if (endTimeField && IDENT.test(endTimeField)) {
      endMinutes = parseTimeToMinutes(payload?.[endTimeField]);
    }
    if (endMinutes === null && durationField && IDENT.test(durationField)) {
      const durationValue = Number(payload?.[durationField]);
      if (!Number.isNaN(durationValue) && durationValue > 0) {
        endMinutes = startMinutes + Math.round(durationValue * slotMinutes);
      }
    }
    if (endMinutes === null) {
      endMinutes = startMinutes + slotMinutes;
    }

    const params = [resourceValue, dateValue];
    let sql = `
      SELECT id, transaction_data
      FROM "${app.table_name}"
      WHERE COALESCE(transaction_data->>'${resourceField}', '') = $1
        AND COALESCE(transaction_data->>'${dateField}', '') = $2
    `;
    sql += ` AND COALESCE(is_deleted, false) = false`;
    if (excludeId !== null && excludeId !== undefined && excludeId !== "") {
      params.push(excludeId);
      sql += ` AND id <> $${params.length}`;
    }

    const { rows } = await pool.query(sql, params);
    const hasOverlap = rows.some((row) => {
      const otherStart = parseTimeToMinutes(row?.transaction_data?.[startTimeField]);
      if (otherStart === null) return false;
      let otherEnd = null;
      if (endTimeField && IDENT.test(endTimeField)) {
        otherEnd = parseTimeToMinutes(row?.transaction_data?.[endTimeField]);
      }
      if (otherEnd === null && durationField && IDENT.test(durationField)) {
        const durationValue = Number(row?.transaction_data?.[durationField]);
        if (!Number.isNaN(durationValue) && durationValue > 0) {
          otherEnd = otherStart + Math.round(durationValue * slotMinutes);
        }
      }
      if (otherEnd === null) {
        otherEnd = otherStart + slotMinutes;
      }
      return startMinutes < otherEnd && endMinutes > otherStart;
    });

    if (hasOverlap) {
      const error = new Error(String(rule.message || "Time slot conflict detected"));
      error.statusCode = 409;
      throw error;
    }
  }
};

const validateSchemaRules = async (app, payload, excludeId = null) => {
  await validateUniqueRules(app, payload, excludeId);
  await validateOverlapRules(app, payload, excludeId);
};

async function generateSchemaFromAi(appName, requirement, builderSpec = null, appType = "auto", sourceTable = "") {
  const builderSchema = buildSchemaFromBuilderSpec(builderSpec, appName, requirement);

  if (builderSchema) {
    return builderSchema;
  }
  if (!process.env.OPENAI_API_KEY) {
    return buildHeuristicSchema(appName, requirement, builderSpec, appType, sourceTable);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const prompt = [
    "Classify the requested application first. The app can be: crud, chart, dashboard, report, calendar, booking_chart, workflow, inventory, checklist.",
    "Return JSON only with keys: appName, title, description, appMode, sourceTable, fields, validations, uniqueRules, overlapRules, dependencies, tableColumns, chartConfig, dashboardConfig, calendarConfig, ui.",
    "Do not force every request into CRUD. If the user asks for chart, graph, trend, report, analytics, dashboard, booking chart, or visual view, generate the matching appMode instead of CRUD fields.",
    "Allowed field types: text, textarea, number, date, time, select, checkbox, radio, email, tel.",
    "Each field must include: name, label, type, required, showInTable, defaultValue, options, validation.",
    "Use cust_<slug> as the application table naming convention.",
    "If the app has relationships, emit a top-level relationships array and promote those link fields to typed BIGINT columns outside transaction_data.",
    "Use JSONB only for flexible app-specific fields; important relationship fields and hot predicates should be typed columns.",
    "For each relationship, include its metadata so the UI can render dropdowns, related-record tabs, lookup display fields, and validation.",
    "For dashboard apps, return dashboardConfig with cards, charts, tables, textBlocks, and sourceTables arrays. Do not reduce dashboards to widgets-only output.",
    "For time-slot requirements, prefer a select field with explicit allowed slot options when the user asks for dropdown time selection; do not use time input unless the user asks for free time entry.",
    "System fields date_created, created_by, date_modified, and modified_by are automatic backend fields and must never be included in user input fields.",
    "Do not hardcode business values. Extract field names, dropdown options, slot duration, allowed time range, uniqueness rules, and overlap rules only from the user's requirement and builderSpec.",
    builderSpec ? `Advanced builder spec JSON: ${JSON.stringify(builderSpec)}` : "",
    `Requested app type/mode: ${appType || "auto"}`,
    `Source table: ${sourceTable}`,
    `Application name: ${appName}`,
    `Requirement: ${requirement}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: Number(process.env.OPENAI_TEMPERATURE || 0.4),
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ai_app_builder_schema",
          strict: true,
          schema: buildPromptSchema(),
        },
      },
    }),
  });

  const rawResponse = await response.text();
  if (!rawResponse.trim()) {
    return buildHeuristicSchema(appName, requirement, builderSpec, appType, sourceTable);
  }

  let payload;
  try {
    payload = JSON.parse(rawResponse);
  } catch (error) {
    throw new Error(`OpenAI returned non-JSON response: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || "AI schema generation failed");
  }

  const output = extractJsonText(payload);
  if (!output) {
    return buildHeuristicSchema(appName, requirement, builderSpec, appType, sourceTable);
  }

  let schema;
  try {
    schema = JSON.parse(output);
  } catch (error) {
    throw new Error(`AI returned invalid JSON: ${error.message}`);
  }
  return normalizeSchema(schema, appName, requirement);
}

router.use(verifyToken, checkSubscription("Business Automation"));

router.get("/", async (_req, res) => {
  try {
    await ensureTables();
    const { rows } = await pool.query(
    `SELECT id, app_name, app_slug, table_name, requirement, schema_json, status, created_by, tenant_id, date_created, date_modified
       FROM aiappbuilder_applications
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/source-tables", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_type = 'BASE TABLE'
        AND table_name LIKE 'cust_%'
      ORDER BY table_name
    `);

    res.json(rows.map((row) => row.table_name));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const appName = String(req.body?.appName || "").trim();
    const requirement = String(req.body?.requirement || "").trim();
    const builderSpec = req.body?.builderSpec && typeof req.body.builderSpec === "object" ? req.body.builderSpec : null;
    const appType = String(req.body?.appType || "auto").trim() || "auto";
    const sourceTable = String(req.body?.sourceTable || "").trim();
    if (!appName) {
      return res.status(400).json({ error: "appName is required" });
    }
    const schema = await generateSchemaFromAi(appName, requirement, builderSpec, appType, sourceTable);
    res.json({ schema });
  } catch (error) {
    console.error("[AIAPPBUILDER_GENERATE_ERROR]", error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureTables();
    const appName = String(req.body?.appName || "").trim();
    const requirement = String(req.body?.requirement || "").trim();
    const schema = normalizeSchema(req.body?.schema || {}, appName || "New Application", requirement);
    const appSlug = slugify(req.body?.appSlug || schema.appSlug || appName);
    const tableName = `cust_${appSlug}`;
    if (!appName) return res.status(400).json({ error: "appName is required" });

    const { rows } = await pool.query(
      `INSERT INTO aiappbuilder_applications (app_name, app_slug, table_name, requirement, schema_json, created_by, tenant_id)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
       RETURNING *`,
      [
        appName,
        appSlug,
        tableName,
        requirement || null,
        JSON.stringify({ ...schema, appName, appSlug, tableName }),
        req.user?.id || null,
        req.user?.tenant_id ?? null,
      ]
    );
    await ensureAppTable(tableName, rows[0]?.schema_json || schema);
    await syncRelationshipMetadata(rows[0], rows[0]?.schema_json || schema);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:appSlug/publish", async (req, res) => {
  try {
    await ensureTables();
    const appSlug = String(req.params.appSlug || "").trim();
    if (!appSlug) {
      return res.status(400).json({ error: "appSlug is required" });
    }
    const { rows } = await pool.query(
      `UPDATE aiappbuilder_applications
          SET status = 'Published',
              date_modified = now()
        WHERE app_slug = $1
        RETURNING id, app_name, app_slug, table_name, requirement, schema_json, status, created_by, tenant_id, date_created, date_modified`,
      [appSlug]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:appSlug/schema", async (req, res) => {
  try {
    await ensureTables();
    const appSlug = String(req.params.appSlug || "").trim();
    if (!appSlug) {
      return res.status(400).json({ error: "appSlug is required" });
    }

    const app = await getAppBySlug(appSlug);
    if (!app) {
      return res.status(404).json({ error: "Application not found" });
    }

    const incomingSchema = req.body?.schema && typeof req.body.schema === "object"
      ? req.body.schema
      : req.body?.schema_json && typeof req.body.schema_json === "object"
        ? req.body.schema_json
        : req.body && typeof req.body === "object"
          ? req.body
          : {};

    const mergedSchema = normalizeSchema(
      {
        ...(app.schema_json || {}),
        ...incomingSchema,
        dashboardConfig: normalizeDashboardConfig(
          incomingSchema.dashboardConfig ?? app.schema_json?.dashboardConfig ?? {}
        ),
      },
      app.app_name,
      app.requirement
    );

    const { rows } = await pool.query(
      `UPDATE aiappbuilder_applications
          SET app_name = $1,
              requirement = $2,
              schema_json = $3::jsonb,
              date_modified = now()
        WHERE app_slug = $4
        RETURNING id, app_name, app_slug, table_name, requirement, schema_json, status, created_by, tenant_id, date_created, date_modified`,
      [
        String(mergedSchema.appName || app.app_name || "").trim() || app.app_name,
        String(mergedSchema.description || app.requirement || "").trim() || null,
        JSON.stringify(mergedSchema),
        appSlug,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Application not found" });
    }

    await ensureAppTable(rows[0].table_name, rows[0].schema_json);
    await syncRelationshipMetadata(rows[0], rows[0].schema_json);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:appSlug", async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureTables();
    const appSlug = String(req.params.appSlug || "").trim();
    if (!appSlug) {
      return res.status(400).json({ error: "appSlug is required" });
    }

    const app = await getAppBySlug(appSlug);
    if (!app) {
      return res.status(404).json({ error: "Application not found" });
    }

    await client.query("BEGIN");
    await client.query(
      `DELETE FROM aiappbuilder_applications WHERE app_slug = $1`,
      [appSlug]
    );

    if (IDENT.test(app.table_name)) {
      await client.query(`DROP TABLE IF EXISTS "${app.table_name}"`);
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message || "Failed to delete application." });
  } finally {
    client.release();
  }
});

router.get("/:appSlug/schema", async (req, res) => {
  try {
    await ensureTables();
    const app = await getAppBySlug(req.params.appSlug);
    if (!app) return res.status(404).json({ error: "Application not found" });
    await ensureAppTable(app.table_name, app.schema_json);
    res.json({ schema: app.schema_json, app });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:appSlug/records", async (req, res) => {
  try {
    await ensureTables();

    const app = await getAppBySlug(req.params.appSlug);
    if (!app) {
      return res.status(404).json({ error: "Application not found" });
    }

    const schema = app.schema_json || {};
    const appMode = String(schema.appMode || "crud").toLowerCase();

    const isDataViewMode = [
      "chart",
      "dashboard",
      "report",
      "booking_chart",
      "calendar",
    ].includes(appMode);

    if (appMode === "dashboard") {
      const dashboardConfig = normalizeDashboardConfig(schema.dashboardConfig);
      const preferredTables = toSafeArray(dashboardConfig.sourceTables).length
        ? dashboardConfig.sourceTables
        : [schema.sourceTable || app.table_name];
      const uniqueTables = Array.from(
        new Set(
          preferredTables
            .map((value) => String(value || "").trim())
            .filter((value) => Boolean(value) && IDENT.test(value))
        )
      );
      const dashboardRows = {};

      for (const tableName of uniqueTables) {
        if (tableName === app.table_name || tableName.startsWith("cust_")) {
          await ensureAppTable(tableName, tableName === app.table_name ? schema : null);
        }
        const targetColumns = await getTableColumns(tableName);
        const softDeleteFilter = targetColumns.has("is_deleted")
          ? "WHERE COALESCE(is_deleted, false) = false"
          : "";
        const { rows } = await pool.query(`
          SELECT *
          FROM "${tableName}"
          ${softDeleteFilter}
          ORDER BY 1 DESC
        `);
        dashboardRows[tableName] = rows.map((row) => mergeRowWithRelationships(row, collectRelationships(schema)));
      }

      return res.json(dashboardRows);
    }

    // Use source table for non-dashboard data-view applications
    const targetTable = isDataViewMode && schema.sourceTable
      ? String(schema.sourceTable).trim()
      : app.table_name;

    if (!IDENT.test(targetTable)) {
      return res.status(400).json({
        error: `Invalid table name: ${targetTable}`,
      });
    }

    if (targetTable === app.table_name || targetTable.startsWith("cust_")) {
      await ensureAppTable(targetTable, targetTable === app.table_name ? schema : null);
    }
    const targetColumns = await getTableColumns(targetTable);
    const relationships = collectRelationships(schema);
    const softDeleteFilter = targetColumns.has("is_deleted")
      ? "WHERE COALESCE(is_deleted, false) = false"
      : "";

    const { rows } = await pool.query(`
      SELECT *
      FROM "${targetTable}"
      ${softDeleteFilter}
      ORDER BY 1 DESC
    `);

    res.json(rows.map((row) => mergeRowWithRelationships(row, relationships)));
  } catch (error) {
    console.error("[AIAPPBUILDER_RECORDS_ERROR]", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/:appSlug/records", async (req, res) => {
  try {
    await ensureTables();
    const app = await getAppBySlug(req.params.appSlug);
    if (!app) return res.status(404).json({ error: "Application not found" });
    await ensureAppTable(app.table_name, app.schema_json);
    const payload = req.body?.transaction_data && typeof req.body.transaction_data === "object"
      ? req.body.transaction_data
      : req.body || {};
    validateFieldRules(app, payload);
    await validateSchemaRules(app, payload);
    const { transactionData, relationValues, relationships } = splitPayloadForTable(app.schema_json, payload);
    const relationColumns = relationships.map((relationship) => relationship.columnName);
    const insertColumns = [
      "transaction_data",
      "created_by",
      "tenant_id",
      "modified_by",
      "is_active",
      "is_deleted",
      "version_no",
      ...relationColumns,
    ];
    const values = [
      JSON.stringify(transactionData),
      req.user?.id || null,
      req.user?.tenant_id ?? 1,
      req.user?.id || null,
      true,
      false,
      1,
      ...relationColumns.map((columnName) => relationValues[columnName] ?? null),
    ];
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO "${app.table_name}" (${insertColumns.map((column) => `"${column}"`).join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      values
    );
    res.status(201).json(mergeRowWithRelationships(rows[0], relationships));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.put("/:appSlug/records/:id", async (req, res) => {
  try {
    await ensureTables();
    const app = await getAppBySlug(req.params.appSlug);
    if (!app) return res.status(404).json({ error: "Application not found" });
    await ensureAppTable(app.table_name, app.schema_json);
    const payload = req.body?.transaction_data && typeof req.body.transaction_data === "object"
      ? req.body.transaction_data
      : req.body || {};
    validateFieldRules(app, payload);
    await validateSchemaRules(app, payload, req.params.id);
    const { transactionData, relationValues, relationships, presentKeys } = splitPayloadForTable(app.schema_json, payload);
    const setClauses = [
      `transaction_data = $1::jsonb`,
      `date_modified = now()`,
      `modified_by = $2`,
      `tenant_id = COALESCE(tenant_id, $3)`,
      `version_no = COALESCE(version_no, 1) + 1`,
    ];
    const values = [
      JSON.stringify(transactionData),
      req.user?.id || null,
      req.user?.tenant_id ?? 1,
    ];
    for (const relationship of relationships) {
      const keyPresent = presentKeys.has(relationship.columnName) || presentKeys.has(relationship.sourceField);
      if (!keyPresent) {
        continue;
      }
      values.push(relationValues[relationship.columnName] ?? null);
      setClauses.push(`"${relationship.columnName}" = $${values.length}`);
    }
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE "${app.table_name}"
       SET ${setClauses.join(", ")}
       WHERE id = $${values.length}
         AND COALESCE(is_deleted, false) = false
       RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: "Record not found" });
    res.json(mergeRowWithRelationships(rows[0], relationships));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.delete("/:appSlug/records/:id", async (req, res) => {
  try {
    await ensureTables();
    const app = await getAppBySlug(req.params.appSlug);
    if (!app) return res.status(404).json({ error: "Application not found" });
    await ensureAppTable(app.table_name, app.schema_json);
    const { rows } = await pool.query(
      `UPDATE "${app.table_name}"
       SET is_deleted = true,
           deleted_by = $1,
           deleted_at = now(),
           modified_by = $1,
           date_modified = now(),
           version_no = COALESCE(version_no, 1) + 1
       WHERE id = $2
         AND COALESCE(is_deleted, false) = false
       RETURNING id`,
      [req.user?.id || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Record not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
