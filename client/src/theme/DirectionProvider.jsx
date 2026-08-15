import React, { useEffect, useMemo } from "react";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";

export default function DirectionProvider({ dir = "ltr", children }) {
  const cache = useMemo(
    () =>
      createCache({
        key: dir === "rtl" ? "mui-rtl" : "mui",
        stylisPlugins: dir === "rtl" ? [prefixer, rtlPlugin] : []
      }),
    [dir]
  );

  const theme = useMemo(() => createTheme({ direction: dir }), [dir]);

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
  }, [dir]);

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
