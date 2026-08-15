// Example usage (parent page)
import React, { useState } from "react";
import CanvasList from "./CanvasList";
import UICreator from "./UICreator"; // your modal/component

export default function CanvasHome() {
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  return (
    <>
      <CanvasList
        onView={(id) => setViewingId(id)}
        onEdit={(id) => setEditingId(id)}
      />
      {/* open your modal in view/edit mode based on these ids */}
    </>
  );
}
