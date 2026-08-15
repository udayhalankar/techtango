import React from "react";
import { Drawer, Box } from "@mui/material";

/**
 * LeftMenu
 * - Sits under the top navbar (offsetTop)
 * - No top border (so it won't interfere with the navbar's bottom border)
 * - Permanent Drawer with fixed width
 */
export default function LeftMenu({
  width = 232,
  offsetTop = 64,     // set to your real AppBar height
  children,
  PaperProps = {},
}) {
  return (
    <Drawer
      variant="permanent"
      PaperProps={{
        sx: (t) => ({
          position: "fixed",
          top: offsetTop,                         // start below navbar
          height: `calc(100% - ${offsetTop}px)`,
          width,
          borderRight: "1px solid #e0e4ee",      // only right border
          // IMPORTANT: no top border here
          boxShadow: "none",
          backgroundColor: "#fff",
          overflow: "hidden",
          zIndex: t.zIndex.appBar - 1,           // always beneath the navbar
        }),
        ...PaperProps,
      }}
    >
      <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
        {children}
      </Box>
    </Drawer>
  );
}
