import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CompactDataGridTable from "./CompactDataGridTable";
import RecordDialog from "./RecordDialog";

const toTitle = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeRecord = (record) => ({
  id: record?.id ?? record?.transaction_id,
  date_created: record?.date_created,
  created_by: record?.created_by_name || record?.created_by,
  ...(record?.transaction_data || {}),
});

export default function CrudAppRenderer({
  selectedApp,
  schema,
  records,
  search,
  setSearch,
  onSaveRecord,
  onDeleteRecord,
}) {
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const normalizedRecords = useMemo(() => records.map(normalizeRecord), [records]);
  const tableFields = useMemo(() => schema?.fields || [], [schema]);

  const auditColumns = useMemo(
    () => [
      { name: "date_created", label: "Date Created", type: "date" },
      { name: "created_by", label: "Created By", type: "text" },
    ],
    []
  );

  const tableColumns = useMemo(() => {
    const schemaColumns =
      Array.isArray(schema?.tableColumns) && schema.tableColumns.length
        ? schema.tableColumns
        : tableFields.filter((field) => field.showInTable !== false).map((field) => field.name);

    return Array.from(new Set([...schemaColumns, ...auditColumns.map((field) => field.name)]));
  }, [schema, tableFields, auditColumns]);

  const openNewRecord = () => {
    setEditingRecord(null);
    setRecordDialogOpen(true);
  };

  const openEditRecord = (record) => {
    setEditingRecord(record);
    setRecordDialogOpen(true);
  };

  return (
    <Stack gap={0}>
      <Box
        sx={{
          px: 3,
          py: 2,
          background: "linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%)",
          borderBottom: "1px solid #dbeafe",
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#0f2f57", lineHeight: 1.15 }}>
            {schema.title || schema.appName}
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 12.5, color: "#64748b" }}>
            {schema.description || selectedApp.requirement || "Manage records for this application."}
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={openNewRecord}
          sx={{
            height: 34,
            minHeight: 34,
            px: 1.6,
            py: 0,
            lineHeight: 1,
            fontSize: 11.5,
            fontWeight: 500,
            textTransform: "none",
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            boxShadow: "0 4px 14px rgba(30, 64, 175, 0.22)",
          }}
        >
          Create New
        </Button>
      </Box>

      <CompactDataGridTable
        rows={normalizedRecords}
        columns={tableColumns.map((column) => {
          const field =
            tableFields.find((item) => item.name === column) ||
            auditColumns.find((item) => item.name === column);
          return {
            field: column,
            headerName: field?.label || toTitle(column),
            type: field?.type || "string",
          };
        })}
        search={search}
        setSearch={setSearch}
        onEditRow={openEditRecord}
        onDeleteRow={onDeleteRecord}
        defaultVisibleCount={6}
      />

      <RecordDialog
        open={recordDialogOpen}
        schema={schema}
        record={editingRecord}
        existingRecords={normalizedRecords}
        onClose={() => {
          setRecordDialogOpen(false);
          setEditingRecord(null);
        }}
        onSave={(values) => {
          onSaveRecord(values, editingRecord);
          setRecordDialogOpen(false);
        }}
      />
    </Stack>
  );
}
