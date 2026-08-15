import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Editor } from "@tinymce/tinymce-react";

export default function MailContentEditor({
  local,
  change,
  isInitiate,
  mailDraftRef,
  showTableBorders,
  setShowTableBorders,
  wrapContent,
  applyMailToFuture,
  setApplyMailToFuture,
  blueLabelSx,
  inputWhiteSx,
}) {
  const hasRecipients = Array.isArray(local.mail_notification_users) && local.mail_notification_users.length > 0;

  return (
    <Accordion defaultExpanded disableGutters sx={{ mt: 1 }} elevation={0}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Mail content
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {hasRecipients ? (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={!!local.mail_content?.dear_recipient}
                    onChange={(e) =>
                      change("mail_content", {
                        ...local.mail_content,
                        dear_recipient: e.target.checked,
                      })
                    }
                  />
                }
                label={<Typography variant="body2">Dear &lt;Recipient&gt; (adds greeting before mail content)</Typography>}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography variant="subtitle2">Mail content</Typography>
                <Typography variant="caption" color="text.secondary">
                  Basic formatting supported
                </Typography>
              </Box>
              <Paper
                variant="outlined"
                sx={{
                  p: 1,
                  backgroundColor: "#fff",
                  borderColor: "#d1d5db",
                }}
              >
                <Editor
                  tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@7.9.1/tinymce.min.js"
                  key={showTableBorders ? "editor-borders-on" : "editor-borders-off"}
                  value={mailDraftRef.current ?? local.mail_content?.body ?? ""}
                  init={{
                    height: 320,
                    base_url: "https://cdn.jsdelivr.net/npm/tinymce@7.9.1",
                    license_key: "gpl",
                    menubar: false,
                    statusbar: true,
                    branding: false,
                    promotion: false,
                    skin: "oxide",
                    content_css: "default",
                    toolbar_location: "top",
                    toolbar_sticky: true,
                    plugins: "advlist autolink lists link image charmap code table",
                    toolbar:
                      "undo redo | bold italic underline forecolor backcolor | fontsize | alignleft aligncenter alignright | bullist numlist | table | link image | removeformat",
                    toolbar_mode: "wrap",
                    table_toolbar:
                      "tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",
                    paste_data_images: true,
                    images_upload_handler: (blobInfo) =>
                      Promise.resolve(`data:${blobInfo.blob().type};base64,${blobInfo.base64()}`),
                    content_style: `
                      body { font-family: 'Roboto','Helvetica Neue',Arial,sans-serif; direction:ltr; text-align:left; }
                      table, th, td { border: ${showTableBorders ? "1px solid #9ca3af" : "1px solid transparent"}; border-collapse: collapse; padding: 6px; }
                      img { max-width: 100%; height: auto; display: block; }
                    `,
                  }}
                  onEditorChange={(content) => {
                    mailDraftRef.current = content;
                    change("mail_content", {
                      ...local.mail_content,
                      body: content,
                    });
                  }}
                />
                <FormControlLabel
                  sx={{ mt: 1 }}
                  control={<Checkbox size="small" checked={showTableBorders} onChange={(e) => setShowTableBorders(e.target.checked)} />}
                  label={<Typography variant="caption">Show table borders</Typography>}
                />
                <FormControlLabel
                  sx={{ mt: 0.5 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={wrapContent}
                      onChange={(e) =>
                        change("mail_content", {
                          ...local.mail_content,
                          wrap_content: e.target.checked,
                        })
                      }
                    />
                  }
                  label={<Typography variant="caption">Add border & fixed width container for mail body</Typography>}
                />
                {isInitiate && (
                  <Box
                    sx={{
                      mt: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={!!local.mail_content?.click_here_enabled}
                          onChange={(e) =>
                            change("mail_content", {
                              ...local.mail_content,
                              click_here_enabled: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Add 'Click here' link"
                    />
                    {local.mail_content?.click_here_enabled && (
                      <>
                        <TextField
                          label="Link text"
                          size="small"
                          value={local.mail_content?.click_here_text || ""}
                          onChange={(e) =>
                            change("mail_content", {
                              ...local.mail_content,
                              click_here_text: e.target.value,
                            })
                          }
                          sx={{ minWidth: 140 }}
                          InputLabelProps={{ sx: blueLabelSx }}
                        />
                        <TextField
                          label="Link URL"
                          size="small"
                          value={local.mail_content?.click_here_url || ""}
                          onChange={(e) =>
                            change("mail_content", {
                              ...local.mail_content,
                              click_here_url: e.target.value,
                            })
                          }
                          sx={{ minWidth: 200, flex: 1 }}
                          InputLabelProps={{ sx: blueLabelSx }}
                        />
                      </>
                    )}
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={!!local.mail_content?.attach_pdf}
                          onChange={(e) =>
                            change("mail_content", {
                              ...local.mail_content,
                              attach_pdf: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Attach PDF"
                    />
                    <Button
                      size="small"
                      variant={applyMailToFuture ? "contained" : "outlined"}
                      onClick={() => setApplyMailToFuture((v) => !v)}
                      sx={{ textTransform: "none" }}
                    >
                      {applyMailToFuture ? "Will apply to all future steps" : "Apply to all future steps"}
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Add at least one Mail notification recipient to configure mail content.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
