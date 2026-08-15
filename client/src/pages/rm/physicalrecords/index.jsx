import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Container, Box } from "@mui/material";
import LeftMenu from "../../components/LeftMenu";


const SearchSubmitRequest = lazy(() => import("./searchsubmitrequest"));
const ManageRequest = lazy(() => import("./managerequest"));
const InwardBoxes = lazy(() => import("./inwardboxes"));
const InwardFiles = lazy(() => import("./inwardfiles"));


export default function PhysicalRecordsModule() {
return (
<Box sx={{ display: "flex", height: "100%" }}>
<LeftMenu
title="Physical Records"
items={[
{ label: "Search & Submit", to: "search" },
{ label: "Manage Requests", to: "manage" },
{ label: "Inward Boxes", to: "inward/boxes" },
{ label: "Inward Files", to: "inward/files" },
]}
/>


<Container maxWidth={false} sx={{ flex: 1, py: 2 }}>
<Suspense fallback={<div>Loading…</div>}>
<Routes>
<Route path="search" element={<SearchSubmitRequest />} />
<Route path="manage" element={<ManageRequest />} />
<Route path="inward/boxes" element={<InwardBoxes />} />
<Route path="inward/files" element={<InwardFiles />} />
<Route path="*" element={<Navigate to="search" replace />} />
</Routes>
</Suspense>
</Container>
</Box>
);
}