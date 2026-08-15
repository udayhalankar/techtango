// src/pages/physicalrecords/RmConfigLayout.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import LeftMenu from "../../components/rmsMenu/RmsMenu";

// index (tiles) page
import RmConfig from "./rmConfiguration";

// list pages (adjust paths if your files live elsewhere)
import RetentionPoliciesPage from "../rm/lists/RetentionPoliciesPage";
import FileplanNodesPage from "../rm/lists/FileplanNodesPage";
import RecordEventsPage from "../rm/lists/RecordEventsPage";
import DispositionBatchesPage from "../rm/lists/DispositionBatchesPage";
import DispositionItemsPage from "../rm/lists/DispositionItemsPage";
import HoldsPage from "../rm/lists/HoldsPage";
import HoldRecordsPage from "../rm/lists/HoldRecordsPage";
import LocationsPage from "../rm/lists/LocationsPage";
import AclPage from "../rm/lists/AclPage";
import AuditLogPage from "../rm/lists/AuditLogPage";
import ClassificationsPage from "../rm/lists/ClassificationsPage";
import MetadataCategoriesPage from "../rm/lists/MetadataCategoriesPage";


const NAVBAR_H = 66;
const SIDENAV_W = 232;

export default function RmConfigLayout() {
  return (
    <Box sx={{ display: "flex" }}>
      <LeftMenu width={SIDENAV_W} offsetTop={NAVBAR_H} />
      <Box
        sx={{
          position: "fixed",
          top: NAVBAR_H,
          left: SIDENAV_W,
          right: 0,
          bottom: 0,
          overflowY: "auto",
          p: 2,
        }}
      >
        <Routes>
          {/* tiles page */}
          <Route index element={<RmConfig />} />

          {/* list pages */}
          <Route path="retention-policies"  element={<RetentionPoliciesPage />} />
          <Route path="fileplan-nodes"      element={<FileplanNodesPage />} />
          <Route path="record-events"       element={<RecordEventsPage />} />
          <Route path="disposition-batches" element={<DispositionBatchesPage />} />
          <Route path="disposition-items"   element={<DispositionItemsPage />} />
          <Route path="holds"               element={<HoldsPage />} />
          <Route path="hold-records"        element={<HoldRecordsPage />} />
          <Route path="locations"           element={<LocationsPage />} />
          <Route path="acl"                 element={<AclPage />} />
          <Route path="audit-log"           element={<AuditLogPage />} />
          <Route path="classifications"     element={<ClassificationsPage />} />
          <Route path="metadata-categories" element={<MetadataCategoriesPage />} />

          {/* safety net */}
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </Box>
    </Box>
  );
}
