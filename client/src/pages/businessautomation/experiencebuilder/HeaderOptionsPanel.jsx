import { Box, Button, TextField, Typography } from "@mui/material";

const clampInt = (value, min, max) => {
  const next = Math.floor(Number(value) || 0);
  return Math.max(min, Math.min(max, next));
};

const HeaderOptionsPanel = ({
  pageWidth = 100,
  headerWidth = 100,
  headerHeight = 72,
  logoUrl = "",
  logoHeight = 32,
  logoWidth = 20,
  menuItemsText = "",
  rightIconsText = "",
  onPageWidthChange,
  onHeaderWidthChange,
  onHeaderHeightChange,
  onLogoUrlChange,
  onLogoHeightChange,
  onLogoWidthChange,
  onMenuItemsTextChange,
  onRightIconsTextChange,
  onUploadLogo,
}) => (
  <Box sx={{ display: "grid", gap: 1.25 }}>
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
      <TextField
        size="small"
        type="number"
        label="Page Width (%)"
        value={pageWidth}
        onChange={(event) => onPageWidthChange?.(clampInt(event.target.value, 20, 100))}
        inputProps={{ min: 20, max: 100, step: 1 }}
        helperText="Default is 100. Header and page content stay within this width."
      />
      <TextField
        size="small"
        type="number"
        label="Header Width (%)"
        value={headerWidth}
        onChange={(event) => onHeaderWidthChange?.(clampInt(event.target.value, 20, 100))}
        inputProps={{ min: 20, max: 100, step: 1 }}
        helperText="Header width cannot exceed the page width."
      />
    </Box>
    <TextField
      size="small"
      type="number"
      label="Header Height (px)"
      value={headerHeight}
      onChange={(event) => onHeaderHeightChange?.(clampInt(event.target.value, 40, 100))}
      inputProps={{ min: 40, max: 100, step: 1 }}
      helperText="Maximum height is 100px."
    />
    <TextField size="small" label="Logo Image URL" value={logoUrl} onChange={(event) => onLogoUrlChange?.(event.target.value)} />
    <Button variant="outlined" component="label" sx={{ justifySelf: "start" }}>
      Upload Logo Image
      <input hidden type="file" accept="image/*" onChange={onUploadLogo} />
    </Button>
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
      <TextField
        size="small"
        type="number"
        label="Logo Height (px)"
        value={logoHeight}
        onChange={(event) => onLogoHeightChange?.(clampInt(event.target.value, 16, 100))}
        inputProps={{ min: 16, max: 100, step: 1 }}
      />
      <TextField
        size="small"
        type="number"
        label="Logo Width (% of header)"
        value={logoWidth}
        onChange={(event) => onLogoWidthChange?.(clampInt(event.target.value, 5, 20))}
        inputProps={{ min: 5, max: 20, step: 1 }}
        helperText="Logo width is capped at 20%."
      />
    </Box>
    <TextField
      size="small"
      label="Header Menu Items"
      value={menuItemsText}
      onChange={(event) => onMenuItemsTextChange?.(event.target.value)}
      multiline
      minRows={3}
      placeholder={"Home | /home\nReports | /reports\nAnalytics | /analytics"}
    />
    <TextField
      size="small"
      label="Header Right Icons"
      value={rightIconsText}
      onChange={(event) => onRightIconsTextChange?.(event.target.value)}
      multiline
      minRows={3}
      placeholder={"Search | /search | S\nAlerts | /alerts | !\nProfile | /profile | U"}
      helperText="One item per line: Label | URL | icon text or image URL"
    />
    <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>
      Fixed 5px header spacing is enforced by the renderer.
    </Typography>
  </Box>
);

export default HeaderOptionsPanel;
