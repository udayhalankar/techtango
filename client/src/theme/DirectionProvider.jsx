import React, {
  useEffect,
  useMemo,
} from "react";

import {
  CacheProvider,
} from "@emotion/react";

import createCache from
  "@emotion/cache";

import {
  prefixer,
} from "stylis";

import rtlPlugin from
  "stylis-plugin-rtl";

import {
  createTheme,
  ThemeProvider,
  CssBaseline,
} from "@mui/material";


export default function DirectionProvider({
  dir = "ltr",
  children,
}) {

  const cache =
    useMemo(
      () =>
        createCache({
          key:
            dir === "rtl"
              ? "mui-rtl"
              : "mui",

          stylisPlugins:
            dir === "rtl"
              ? [
                  prefixer,
                  rtlPlugin,
                ]
              : [],
        }),
      [
        dir,
      ]
    );


  const theme =
    useMemo(
      () =>
        createTheme({

          /* ============================================================
             CORE
          ============================================================ */

          direction:
            dir,


          /* ============================================================
             TYPOGRAPHY
          ============================================================ */

          typography: {
            fontFamily:
              '"Inter", "Roboto", "Arial", sans-serif',

            fontSize:
              12,

            button: {
              textTransform:
                "none",

              fontWeight:
                600,
            },
          },


          /* ============================================================
             SHAPE
          ============================================================ */

          shape: {
            borderRadius:
              3,
          },


          /* ============================================================
             PALETTE
          ============================================================ */

          palette: {

            primary: {
              main:
                "#0879df",
            },

            background: {
              default:
                "#f5f7fa",

              paper:
                "#ffffff",
            },

            text: {
              primary:
                "#203a50",

              secondary:
                "#60778a",
            },
          },


          /* ============================================================
             COMPONENT OVERRIDES
          ============================================================ */

          components: {

            /* ----------------------------------------------------------
               BACKDROP
            ---------------------------------------------------------- */

            MuiBackdrop: {

              styleOverrides: {

                root: {
                  backdropFilter:
                    "none !important",

                  WebkitBackdropFilter:
                    "none !important",
                },
              },
            },


            /* ----------------------------------------------------------
               MENU
            ---------------------------------------------------------- */

            MuiMenu: {

              defaultProps: {
                disableScrollLock:
                  true,
              },

              styleOverrides: {

                paper: {
                  borderRadius:
                    "3px",

                  border:
                    "1px solid #d9e2e9",

                  boxShadow:
                    "0 8px 22px rgba(25,45,65,.14)",

                  "& .MuiMenuItem-root":
                    {
                      minHeight:
                        "30px",

                      fontSize:
                        "10.5px !important",

                      lineHeight:
                        "1.4 !important",

                      fontWeight:
                        "400 !important",

                      fontFamily:
                        "inherit !important",
                    },
                },
              },
            },


            /* ----------------------------------------------------------
               MENU ITEM
            ---------------------------------------------------------- */

            MuiMenuItem: {

              styleOverrides: {

                root: {
                  minHeight:
                    "30px",

                  fontSize:
                    "10.5px !important",

                  lineHeight:
                    "1.4 !important",

                  fontWeight:
                    "400 !important",

                  fontFamily:
                    "inherit !important",
                },
              },
            },


            /* ----------------------------------------------------------
               SELECT
            ---------------------------------------------------------- */

            MuiSelect: {

              styleOverrides: {

                select: {
                  minHeight:
                    "unset",

                  fontSize:
                    "10.5px !important",

                  lineHeight:
                    "1.4 !important",

                  fontWeight:
                    "400 !important",

                  fontFamily:
                    "inherit !important",
                },
              },
            },


            /* ----------------------------------------------------------
               INPUT BASE
            ---------------------------------------------------------- */

            MuiInputBase: {

              styleOverrides: {

                root: {
                  fontSize:
                    "10.5px",
                },

                input: {
                  fontSize:
                    "10.5px !important",

                  lineHeight:
                    "1.4 !important",

                  fontFamily:
                    "inherit !important",
                },
              },
            },


            /* ----------------------------------------------------------
               OUTLINED INPUT
            ---------------------------------------------------------- */

            MuiOutlinedInput: {

              styleOverrides: {

                root: {
                  borderRadius:
                    "3px",

                  fontSize:
                    "10.5px",
                },

                input: {
                  fontSize:
                    "10.5px !important",
                },
              },
            },


            /* ----------------------------------------------------------
               INPUT LABEL
            ---------------------------------------------------------- */

            MuiInputLabel: {

              styleOverrides: {

                root: {
                  fontSize:
                    "10.5px !important",

                  fontFamily:
                    "inherit !important",
                },
              },
            },


            /* ----------------------------------------------------------
               BUTTON
            ---------------------------------------------------------- */

            MuiButton: {

              styleOverrides: {

                root: {
                  borderRadius:
                    "3px",

                  textTransform:
                    "none",

                  fontSize:
                    "10.5px",

                  fontWeight:
                    600,
                },
              },
            },


            /* ----------------------------------------------------------
               DIALOG
            ---------------------------------------------------------- */

            MuiDialog: {

              styleOverrides: {

                paper: {
                  borderRadius:
                    "3px",
                },
              },
            },


            /* ----------------------------------------------------------
               POPOVER
            ---------------------------------------------------------- */

            MuiPopover: {

              defaultProps: {
                disableScrollLock:
                  true,
              },
            },


            /* ----------------------------------------------------------
               PAPER
            ---------------------------------------------------------- */

            MuiPaper: {

              styleOverrides: {

                rounded: {
                  borderRadius:
                    "3px",
                },
              },
            },
          },
        }),
      [
        dir,
      ]
    );


  useEffect(() => {

    document
      .documentElement
      .setAttribute(
        "dir",
        dir
      );

  }, [
    dir,
  ]);


  return (
    <CacheProvider
      value={
        cache
      }
    >

      <ThemeProvider
        theme={
          theme
        }
      >

        <CssBaseline />

        {children}

      </ThemeProvider>

    </CacheProvider>
  );
}