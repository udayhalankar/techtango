import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconButton, Menu, MenuItem, ListItemText, Tooltip } from "@mui/material";
import TranslateIcon from "@mui/icons-material/Translate";

const LANGS = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "hi", label: "हिन्दी", dir: "ltr" },
  { code: "ta", label: "தமிழ்", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "mr", label: "मराठी", dir: "ltr" },
  { code: "bn", label: "বাংলা", dir: "ltr" },
  { code: "gu", label: "ગુજરાતી", dir: "ltr" },
  { code: "kn", label: "ಕನ್ನಡ", dir: "ltr" },
  { code: "te", label: "తెలుగు", dir: "ltr" },
  { code: "ml", label: "മലയാളം", dir: "ltr" },
];

export default function LanguageMenu({ floating = false }) {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);

  // Ensure <html dir> matches current i18n language on first paint
  useEffect(() => {
    const initial = LANGS.find(l => i18n.language?.startsWith(l.code));
    document.documentElement.setAttribute("dir", initial?.dir === "rtl" ? "rtl" : "ltr");
  }, [i18n.language]);

  const open = Boolean(anchorEl);
  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const change = async (code) => {
    await i18n.changeLanguage(code);
    // Persist explicitly (detector also caches, but this makes it deterministic)
    localStorage.setItem("i18nextLng", code);
    const lang = LANGS.find(l => l.code === code);
    document.documentElement.setAttribute("dir", lang?.dir === "rtl" ? "rtl" : "ltr");
    handleClose();
  };

  const button = (
    <Tooltip title="Language">
      <IconButton color="inherit" onClick={handleOpen} size="large">
        <TranslateIcon />
      </IconButton>
    </Tooltip>
  );

  return (
    <>
      {floating ? (
        <div style={{ position: "fixed", right: 16, bottom: 72, zIndex: 1300 }}>
          {button}
        </div>
      ) : button}

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {LANGS.map((l) => (
          <MenuItem
            key={l.code}
            selected={i18n.language?.startsWith(l.code)}
            onClick={() => change(l.code)}
          >
            <ListItemText primary={l.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
