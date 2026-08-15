import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import HeaderOptionsPanel from "./HeaderOptionsPanel";

const clampInt = (value, min, max) => {
  const next = Math.floor(Number(value) || 0);
  return Math.max(min, Math.min(max, next));
};

const SectionOptionsModal = ({
  open,
  title = "Section Options",
  subtitle = "",
  sectionOptionsTab = 0,
  onSectionOptionsTabChange,
  showRowConfigurationTab = true,
  rowLabel = "",
  splitColumnsCount = 2,
  onSplitColumnsCountChange,
  onSplitColumns,
  splitRowsCount = 2,
  onSplitRowsCountChange,
  onSplitRows,
  selectedWidgetType = "",
  onSelectedWidgetTypeChange,
  availableWidgets = [],
  widgetConfig = {},
  onUpdateWidgetField,
  tableOptions = [],
  columnsByTable = {},
  chartTypes = [],
  aggregations = [],
  imagePositions = [],
  onLoadColumns,
  onLoadTableRows,
  onHandleImageUpload,
  sectionPadding = { top: 0, right: 0, bottom: 0, left: 0 },
  onSetSectionPaddingSide,
  sectionStyle = {},
  onUpdateSectionStyleField,
  rowFormColumns = 1,
  onRowFormColumnsChange,
  rowFormHeight = 1,
  onRowFormHeightChange,
  rowFormPadding = 0,
  onRowFormPaddingChange,
  rowFormGap = 0,
  onRowFormGapChange,
  onDuplicateRow,
  onDeleteRow,
  onSaveRowSettings,
  canDeleteRow = true,
  canMergeRight = false,
  canMergeDown = false,
  canUnmerge = false,
  onMergeRight,
  onMergeDown,
  onUnmerge,
  onRemoveComponent,
  canRemoveComponent = true,
  onRemoveSection,
  canRemoveSection = true,
  shellSlotKey = "",
  onClose,
}) => {
  const widgetType = String(selectedWidgetType || "").trim();
  const normalizedShellSlotKey = String(shellSlotKey || "").trim().toLowerCase();
  const normalizedChartTypes = Array.isArray(chartTypes) ? chartTypes : [];
  const normalizedAggregations = Array.isArray(aggregations) ? aggregations : [];
  const normalizedImagePositions = Array.isArray(imagePositions) ? imagePositions : [];
  const normalizedAvailableWidgets = Array.isArray(availableWidgets) ? availableWidgets : [];
  const normalizedTableOptions = Array.isArray(tableOptions) ? tableOptions : [];
  const headerMenuItemsValue = String(widgetConfig.menuItemsText || widgetConfig.menuItems || "").trim();
  const headerRightIconsValue = String(widgetConfig.rightIconsText || widgetConfig.rightIcons || "").trim();
  const modalTitle = normalizedShellSlotKey === "header" ? "Header options" : title;
  const modalSubtitle = normalizedShellSlotKey === "header" ? "Configure header-only layout, branding, and navigation." : subtitle || rowLabel;

  if (normalizedShellSlotKey === "header") {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{modalTitle}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: "#5f6f8a", mb: 1.5 }}>{modalSubtitle}</Typography>
          <HeaderOptionsPanel
            pageWidth={widgetConfig.pageWidth ?? 100}
            headerWidth={widgetConfig.width ?? 100}
            headerHeight={widgetConfig.height ?? 72}
            logoUrl={widgetConfig.logoUrl || ""}
            logoHeight={widgetConfig.logoHeight ?? 32}
            logoWidth={widgetConfig.logoWidth ?? 20}
            menuItemsText={headerMenuItemsValue}
            rightIconsText={headerRightIconsValue}
            onPageWidthChange={(value) => onUpdateWidgetField?.("pageWidth", value)}
            onHeaderWidthChange={(value) => onUpdateWidgetField?.("width", value)}
            onHeaderHeightChange={(value) => onUpdateWidgetField?.("height", value)}
            onLogoUrlChange={(value) => onUpdateWidgetField?.("logoUrl", value)}
            onLogoHeightChange={(value) => onUpdateWidgetField?.("logoHeight", value)}
            onLogoWidthChange={(value) => onUpdateWidgetField?.("logoWidth", value)}
            onMenuItemsTextChange={(value) => onUpdateWidgetField?.("menuItemsText", value)}
            onRightIconsTextChange={(value) => onUpdateWidgetField?.("rightIconsText", value)}
            onUploadLogo={onHandleImageUpload}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: "#5f6f8a", mb: 1.5 }}>{subtitle || rowLabel}</Typography>
        <Tabs
          value={sectionOptionsTab}
          onChange={(_event, next) => onSectionOptionsTabChange?.(next)}
          sx={{ borderBottom: "1px solid #e1e6ef", mb: 1.5 }}
        >
          <Tab label="Section Options" />
          {showRowConfigurationTab ? <Tab label="Row Configuration" /> : null}
        </Tabs>

        {sectionOptionsTab === 0 ? (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1, alignItems: "center" }}>
              <TextField
                size="small"
                type="number"
                label="Split into Columns"
                value={splitColumnsCount}
                onChange={(event) => onSplitColumnsCountChange?.(clampInt(event.target.value, 2, 8))}
                inputProps={{ min: 2, max: 8, step: 1 }}
              />
              <Button variant="outlined" onClick={onSplitColumns}>
                Split
              </Button>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1, alignItems: "center" }}>
              <TextField
                size="small"
                type="number"
                label="Split into Rows"
                value={splitRowsCount}
                onChange={(event) => onSplitRowsCountChange?.(clampInt(event.target.value, 2, 8))}
                inputProps={{ min: 2, max: 8, step: 1 }}
              />
              <Button variant="outlined" onClick={onSplitRows}>
                Split
              </Button>
            </Box>
            <TextField
              select
              size="small"
              label="Add Widget"
              value={widgetType}
              onChange={(event) => onSelectedWidgetTypeChange?.(event.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {normalizedAvailableWidgets.map((widget) => (
                <MenuItem key={`section-widget-${widget}`} value={widget}>
                  Add {widget}
                </MenuItem>
              ))}
            </TextField>

            {widgetType === "Chart" ? (
              <>
                <TextField
                  select
                  size="small"
                  label="Select Table"
                  value={widgetConfig.tableName || ""}
                  onChange={(event) => {
                    const tableName = event.target.value;
                    onUpdateWidgetField?.("tableName", tableName);
                    onUpdateWidgetField?.("xAxis", "");
                    onUpdateWidgetField?.("yAxis", "");
                    onLoadColumns?.(tableName);
                    onLoadTableRows?.(tableName);
                  }}
                >
                  {normalizedTableOptions.map((tableName) => (
                    <MenuItem key={`chart-table-${tableName}`} value={tableName}>
                      {tableName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Chart Type"
                  value={widgetConfig.chartType || ""}
                  onChange={(event) => onUpdateWidgetField?.("chartType", event.target.value)}
                >
                  {normalizedChartTypes.map((type) => (
                    <MenuItem key={`chart-type-${type}`} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField size="small" label="Chart Name" value={widgetConfig.chartName || ""} onChange={(event) => onUpdateWidgetField?.("chartName", event.target.value)} />
                <TextField
                  select
                  size="small"
                  label="X-Axis (Column)"
                  value={widgetConfig.xAxis || ""}
                  onChange={(event) => onUpdateWidgetField?.("xAxis", event.target.value)}
                  disabled={!widgetConfig.tableName}
                >
                  {(columnsByTable[widgetConfig.tableName] || []).map((column) => (
                    <MenuItem key={`chart-x-${column}`} value={column}>
                      {column}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Y-Axis (Column)"
                  value={widgetConfig.yAxis || ""}
                  onChange={(event) => onUpdateWidgetField?.("yAxis", event.target.value)}
                  disabled={!widgetConfig.tableName}
                >
                  {(columnsByTable[widgetConfig.tableName] || []).map((column) => (
                    <MenuItem key={`chart-y-${column}`} value={column}>
                      {column}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Aggregation"
                  value={widgetConfig.aggregation || "actual"}
                  onChange={(event) => onUpdateWidgetField?.("aggregation", event.target.value)}
                >
                  {normalizedAggregations.map((agg) => (
                    <MenuItem key={`agg-${agg}`} value={agg}>
                      {agg}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            ) : null}

            {widgetType === "Table" ? (
              <>
                <TextField
                  select
                  size="small"
                  label="Select Table"
                  value={widgetConfig.tableName || ""}
                  onChange={(event) => {
                    const tableName = event.target.value;
                    onUpdateWidgetField?.("tableName", tableName);
                    onLoadColumns?.(tableName);
                    onLoadTableRows?.(tableName);
                  }}
                >
                  {normalizedTableOptions.map((tableName) => (
                    <MenuItem key={`table-widget-${tableName}`} value={tableName}>
                      {tableName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  label="Rows Limit"
                  value={widgetConfig.limit || 10}
                  onChange={(event) => onUpdateWidgetField?.("limit", clampInt(event.target.value, 1, 100))}
                  inputProps={{ min: 1, max: 100, step: 1 }}
                />
              </>
            ) : null}

            {widgetType === "Text Block" ? (
              <>
                <TextField size="small" label="Text" value={widgetConfig.text || ""} onChange={(event) => onUpdateWidgetField?.("text", event.target.value)} multiline minRows={3} />
                <TextField size="small" type="number" label="Font Size" value={widgetConfig.fontSize || 16} onChange={(event) => onUpdateWidgetField?.("fontSize", clampInt(event.target.value, 8, 96))} inputProps={{ min: 8, max: 96, step: 1 }} />
                <TextField size="small" label="Color" value={widgetConfig.color || "#1e2d4a"} onChange={(event) => onUpdateWidgetField?.("color", event.target.value)} />
                <FormControlLabel control={<Switch checked={Boolean(widgetConfig.bold)} onChange={(_e, checked) => onUpdateWidgetField?.("bold", checked)} />} label="Bold" />
                <FormControlLabel control={<Switch checked={Boolean(widgetConfig.italic)} onChange={(_e, checked) => onUpdateWidgetField?.("italic", checked)} />} label="Italic" />
                <FormControlLabel control={<Switch checked={Boolean(widgetConfig.underline)} onChange={(_e, checked) => onUpdateWidgetField?.("underline", checked)} />} label="Underline" />
              </>
            ) : null}

            {widgetType === "Image" ? (
              <>
                <TextField size="small" label="Image URL" value={widgetConfig.src || ""} onChange={(event) => onUpdateWidgetField?.("src", event.target.value)} />
                <Button variant="outlined" component="label">
                  Upload Image
                  <input hidden type="file" accept="image/*" onChange={onHandleImageUpload} />
                </Button>
                <TextField
                  select
                  size="small"
                  label="Position"
                  value={widgetConfig.position || "center"}
                  onChange={(event) => onUpdateWidgetField?.("position", event.target.value)}
                >
                  {normalizedImagePositions.map((position) => (
                    <MenuItem key={`img-pos-${position}`} value={position}>
                      {position}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select size="small" label="Fit" value={widgetConfig.fit || "contain"} onChange={(event) => onUpdateWidgetField?.("fit", event.target.value)}>
                  <MenuItem value="contain">contain</MenuItem>
                  <MenuItem value="cover">cover</MenuItem>
                </TextField>
              </>
            ) : null}

            {widgetType === "Icon" ? (
              <>
                <TextField size="small" label="Icon Text" value={widgetConfig.iconText || "*"} onChange={(event) => onUpdateWidgetField?.("iconText", event.target.value)} />
                <TextField size="small" type="number" label="Icon Size" value={widgetConfig.fontSize || 24} onChange={(event) => onUpdateWidgetField?.("fontSize", clampInt(event.target.value, 8, 120))} inputProps={{ min: 8, max: 120, step: 1 }} />
                <TextField size="small" label="Icon Color" value={widgetConfig.color || "#1e2d4a"} onChange={(event) => onUpdateWidgetField?.("color", event.target.value)} />
              </>
            ) : null}

            {widgetType === "Form" ? (
              <>
                <TextField size="small" label="Form Name" value={widgetConfig.formName || ""} onChange={(event) => onUpdateWidgetField?.("formName", event.target.value)} />
                <TextField size="small" label="Submit Label" value={widgetConfig.submitLabel || "Submit"} onChange={(event) => onUpdateWidgetField?.("submitLabel", event.target.value)} />
                <TextField select size="small" label="Action" value={widgetConfig.action || "ajax"} onChange={(event) => onUpdateWidgetField?.("action", event.target.value)}>
                  <MenuItem value="ajax">AJAX Submit</MenuItem>
                  <MenuItem value="static">Static Submit</MenuItem>
                </TextField>
              </>
            ) : null}

            {widgetType === "Synced Block" ? (
              <>
                <TextField size="small" label="Block Name" value={widgetConfig.blockName || ""} onChange={(event) => onUpdateWidgetField?.("blockName", event.target.value)} />
                <TextField size="small" label="Shared Content" value={widgetConfig.content || ""} onChange={(event) => onUpdateWidgetField?.("content", event.target.value)} />
                <FormControlLabel control={<Switch checked={widgetConfig.sync !== false} onChange={(_e, checked) => onUpdateWidgetField?.("sync", checked)} />} label="Sync across uses" />
              </>
            ) : null}

            {widgetType === "Template Part" ? (
              <>
                <TextField select size="small" label="Template Part" value={widgetConfig.templatePart || "header"} onChange={(event) => onUpdateWidgetField?.("templatePart", event.target.value)}>
                  <MenuItem value="header">Header</MenuItem>
                  <MenuItem value="footer">Footer</MenuItem>
                  <MenuItem value="single">Single</MenuItem>
                  <MenuItem value="archive">Archive</MenuItem>
                </TextField>
                <TextField size="small" label="Variant" value={widgetConfig.variant || "default"} onChange={(event) => onUpdateWidgetField?.("variant", event.target.value)} />
              </>
            ) : null}

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <TextField size="small" type="number" label="Padding Top" value={sectionPadding.top ?? 0} onChange={(event) => onSetSectionPaddingSide?.("top", event.target.value)} inputProps={{ min: 0, step: 1 }} />
              <TextField size="small" type="number" label="Padding Right" value={sectionPadding.right ?? 0} onChange={(event) => onSetSectionPaddingSide?.("right", event.target.value)} inputProps={{ min: 0, step: 1 }} />
              <TextField size="small" type="number" label="Padding Bottom" value={sectionPadding.bottom ?? 0} onChange={(event) => onSetSectionPaddingSide?.("bottom", event.target.value)} inputProps={{ min: 0, step: 1 }} />
              <TextField size="small" type="number" label="Padding Left" value={sectionPadding.left ?? 0} onChange={(event) => onSetSectionPaddingSide?.("left", event.target.value)} inputProps={{ min: 0, step: 1 }} />
            </Box>
            <TextField
              size="small"
              type="number"
              label="Row Height (px)"
              value={rowFormHeight}
              onChange={(event) => onRowFormHeightChange?.(Math.max(1, Number(event.target.value) || 1))}
              inputProps={{ min: 1, step: 1 }}
              helperText="Increase this to make all widgets in the row taller."
            />
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: "#334363" }}>Background Color</Typography>
              <TextField size="small" type="color" value={sectionStyle.backgroundColor ?? "#ffffff"} onChange={(event) => onUpdateSectionStyleField?.("backgroundColor", event.target.value)} sx={{ width: 90 }} />
            </Box>
            <TextField size="small" type="number" label="Border Thickness" value={sectionStyle.borderWidth ?? 1} onChange={(event) => onUpdateSectionStyleField?.("borderWidth", clampInt(event.target.value, 0, 24))} inputProps={{ min: 0, max: 24, step: 1 }} />
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: "#334363" }}>Border Color</Typography>
              <TextField size="small" type="color" value={sectionStyle.borderColor ?? "#d8dde7"} onChange={(event) => onUpdateSectionStyleField?.("borderColor", event.target.value)} sx={{ width: 90 }} />
            </Box>
            <TextField size="small" type="number" label="Corner Radius" value={sectionStyle.borderRadius ?? 8} onChange={(event) => onUpdateSectionStyleField?.("borderRadius", clampInt(event.target.value, 0, 120))} inputProps={{ min: 0, max: 120, step: 1 }} />
          </Box>
        ) : null}

        {showRowConfigurationTab && sectionOptionsTab === 1 ? (
          <Box sx={{ display: "grid", gap: 1.25, pt: 0.25 }}>
            <Typography sx={{ fontSize: 13, color: "#5f6f8a" }}>{rowLabel || "Row -"}</Typography>
            <TextField select size="small" label="No. of Columns" value={String(rowFormColumns)} onChange={(event) => onRowFormColumnsChange?.(clampInt(event.target.value, 1, 8))}>
              {Array.from({ length: 8 }).map((_item, index) => (
                <MenuItem key={`section-row-col-${index + 1}`} value={index + 1}>
                  {index + 1}
                </MenuItem>
              ))}
            </TextField>
            <TextField size="small" type="number" label="Row Height (px)" value={rowFormHeight} onChange={(event) => onRowFormHeightChange?.(Math.max(1, Number(event.target.value) || 1))} inputProps={{ min: 1, step: 1 }} helperText="Exact row height in pixels" />
            <TextField size="small" type="number" label="Row Padding" value={rowFormPadding} onChange={(event) => onRowFormPaddingChange?.(Math.max(0, Number(event.target.value) || 0))} inputProps={{ min: 0, step: 1 }} />
            <TextField size="small" type="number" label="Gap Between Sections" value={rowFormGap} onChange={(event) => onRowFormGapChange?.(Math.max(0, Number(event.target.value) || 0))} inputProps={{ min: 0, step: 1 }} />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
              <Button size="small" variant="outlined" onClick={onDuplicateRow}>
                Duplicate Row
              </Button>
              <Button size="small" variant="outlined" color="error" onClick={onDeleteRow} disabled={!canDeleteRow}>
                Delete Row
              </Button>
              <Button size="small" variant="contained" onClick={onSaveRowSettings}>
                Save
              </Button>
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {showRowConfigurationTab && sectionOptionsTab === 0 ? (
            <>
              <Button variant="outlined" onClick={onMergeRight} disabled={!canMergeRight}>
                Merge Horizontal (Right)
              </Button>
              <Button variant="outlined" onClick={onMergeDown} disabled={!canMergeDown}>
                Merge Vertical (Down)
              </Button>
              <Button variant="outlined" color="error" onClick={onUnmerge} disabled={!canUnmerge}>
                Unmerge
              </Button>
            </>
          ) : null}
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {onRemoveComponent ? (
            <Button variant="outlined" color="error" onClick={onRemoveComponent} disabled={!canRemoveComponent}>
              Remove Component
            </Button>
          ) : null}
          {onRemoveSection ? (
            <Button variant="outlined" color="error" onClick={onRemoveSection} disabled={!canRemoveSection}>
              Remove Card
            </Button>
          ) : null}
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SectionOptionsModal;
