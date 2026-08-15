//src/pages/physicalrecords/rm_configuration.jsx
import React, { useState } from "react";
import { Box, Card, CardActionArea, CardContent, Grid, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import LeftMenu from "../../components/rmsMenu/RmsMenu";

// Define minimal schemas per modal (add more fields any time)
const SCHEMAS = {
  "retention-policies": [
    { key: "tenant_id", label: "Tenant Id", type: "number" },
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "trigger_event", label: "Trigger Event" },
    { key: "period_years", label: "Years", type: "number" },
    { key: "period_months", label: "Months", type: "number" },
    { key: "cutoff_on_event", label: "Cutoff On Event", type: "checkbox" },
    { key: "disposition_action", label: "Disposition Action" },
    { key: "is_default", label: "Default", type: "checkbox" },
  ],
  "fileplan-nodes": [
    { key: "tenant_id", label: "Tenant Id", type: "number" },
    { key: "parent_id", label: "Parent Id", type: "number" },
    { key: "code", label: "Code" },
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "retention_policy_id", label: "Retention Policy Id", type: "number" },
    { key: "order_no", label: "Order", type: "number" },
    { key: "path", label: "Path" },
  ],
  "record-events": [
    { key: "tenant_id", label: "Tenant Id", type: "number" },
    { key: "record_id", label: "Record Id", type: "number" },
    { key: "type", label: "Type" },
    { key: "event_ts", label: "Event TS (ISO)" },
    { key: "user_id", label: "User Id", type: "number" },
    { key: "data", label: "Data (JSON)" },
  ],
  "disposition-batches": [
    { key: "tenant_id", label: "Tenant Id", type: "number" },
    { key: "status", label: "Status" },
    { key: "scheduled_date", label: "Scheduled (ISO)" },
    { key: "approved_by", label: "Approved By", type: "number" },
    { key: "executed_by", label: "Executed By", type: "number" },
    { key: "notes", label: "Notes" },
  ],
  "disposition-items": [
    { key: "batch_id", label: "Batch Id", type: "number" },
    { key: "record_id", label: "Record Id", type: "number" },
    { key: "proposed_action", label: "Proposed Action" },
    { key: "eligible_on", label: "Eligible On (ISO)" },
    { key: "decision", label: "Decision" },
    { key: "decision_by", label: "Decision By", type: "number" },
    { key: "decision_ts", label: "Decision TS (ISO)" },
  ],
  "holds": [
    { key: "tenant_id", label: "Tenant Id", type: "number" },
    { key: "title", label: "Title" },
    { key: "reason", label: "Reason" },
    { key: "status", label: "Status" },
    { key: "requested_by", label: "Requested By", type: "number" },
    { key: "date_released", label: "Date Released (ISO)" },
  ],
  "hold-records": [
    { key: "hold_id", label: "Hold Id", type: "number" },
    { key: "record_id", label: "Record Id", type: "number" },
  ],
  "locations": [
    { key: "tenant_id", label: "Tenant Id", type: "number" },
    { key: "facility", label: "Facility" },
    { key: "room", label: "Room" },
    { key: "aisle", label: "Aisle" },
    { key: "bay", label: "Bay" },
    { key: "shelf", label: "Shelf" },
    { key: "bin", label: "Bin" },
    { key: "barcode", label: "Barcode" },
    { key: "is_active", label: "Active", type: "checkbox" },
  ],
  "acl": [
    { key: "tenant_id", label: "Tenant Id", type: "number" },
    { key: "entity_type", label: "Entity Type" },
    { key: "entity_id", label: "Entity Id", type: "number" },
    { key: "principal_type", label: "Principal Type" },
    { key: "principal_id", label: "Principal Id", type: "number" },
    { key: "permission", label: "Permission" },
    { key: "grant", label: "Grant", type: "checkbox" },
  ],
  "audit-log": [
    { key: "tenant_id", label: "Tenant Id", type: "number" },
    { key: "actor_user_id", label: "Actor User", type: "number" },
    { key: "action", label: "Action" },
    { key: "entity_type", label: "Entity Type" },
    { key: "entity_id", label: "Entity Id", type: "number" },
    { key: "before", label: "Before (JSON)" },
    { key: "after", label: "After (JSON)" },
    { key: "ip", label: "IP" },
    { key: "ts", label: "Timestamp (ISO)" },
  ],
  "classifications": [
    { key: "tenant_id", label: "Tenant Id", type: "number" },
    { key: "code", label: "Code" },
    { key: "label", label: "Label" },
    { key: "description", label: "Description" },
    { key: "rank", label: "Rank", type: "number" },
    { key: "is_default", label: "Default", type: "checkbox" },
  ],
  "metadata-categories": [
    { key: "tenant_id", label: "Tenant Id", type: "number" },
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "is_active", label: "Active", type: "checkbox" },
  ],
};

const CARDS = Object.keys(SCHEMAS).map((k) => ({
  key: k,
  title: k.replace(/-/g, " ").replace(/\b\w/g, s => s.toUpperCase())
}));

export default function RMConfiguration() {
const nav = useNavigate();
const go = (key) => nav(`/rmconfig/${key}`);

const NAVBAR_H = 66;
const SIDENAV_W = 232;
  return (
    <Box sx={{ display: "flex" }}>
       {/* <LeftMenu width={SIDENAV_W} offsetTop={NAVBAR_H} /> */}
        <Box sx={{ position: "fixed", top: NAVBAR_H, left: SIDENAV_W, right: 0, bottom: 0, overflowY: "auto", p: 2 }}>
        <Typography variant="h5" sx={{ color: "#f0772c", mb: 3 }}>RM Configuration</Typography>
        <Grid container spacing={3} justifyContent="flex-start" sx={{ mt: 2 }}>
        {CARDS.map(c => (
          <Grid key={c.key} item xs={12} sm={6} md={4} lg={3}>
            <Card variant="outlined">
           <CardActionArea onClick={() => go(c.key)}>
                <CardContent sx={{ minHeight: 90 }}>
                  <Typography sx={{ fontWeight: 600 }}>{c.title}</Typography>
                  <Typography variant="body2" color="text.secondary">Add new</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      </Box>
    </Box>
  );
}
