// businessautomation/components/BAAsideNav.jsx
import * as React from "react";
import {
  Box, Drawer, Toolbar, List, ListItemButton, ListItemText,
  ListSubheader, Divider, Typography
} from "@mui/material";

const DRAWER_WIDTH = 260;

export default function BAAsideNav({
  title = "Business Automation",
  sections = [],
  onItemClick = () => {},
  drawerWidth = DRAWER_WIDTH,
}) {
  return (
    <Drawer
      variant="permanent"
      PaperProps={{ sx: { width: drawerWidth, borderRightColor: "divider" } }}
    >
      <Toolbar sx={{ minHeight: 56, px: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: "auto" }}>
        {sections.map((sec, idx) => (
          <List
            key={idx}
            dense
            subheader={
              <ListSubheader
                disableSticky
                sx={{ bgcolor: "transparent", color: "text.secondary" }}
              >
                {sec.label}
              </ListSubheader>
            }
          >
            {(sec.items || []).map((it) => (
              <ListItemButton
                key={it.key || it.label}
                onClick={() => onItemClick(it)}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  "&.MuiButtonBase-root": { py: 0.5 },
                }}
              >
                <ListItemText primaryTypographyProps={{ fontSize: 14 }} primary={it.label} />
              </ListItemButton>
            ))}
            {idx < sections.length - 1 && <Divider sx={{ my: 1 }} />}
          </List>
        ))}
      </Box>
    </Drawer>
  );
}

export const BA_DRAWER_WIDTH = DRAWER_WIDTH;
