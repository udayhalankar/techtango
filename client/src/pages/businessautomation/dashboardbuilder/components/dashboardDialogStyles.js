export const dialogBackdropSx = {
  backdropFilter:
    "none !important",

  WebkitBackdropFilter:
    "none !important",

  backgroundColor:
    "rgba(17,31,46,.42) !important",
};


export const dialogPaperSx = {
  width:
    "min(720px,92vw)",

  borderRadius:
    "15px",

  overflow:
    "hidden",

  bgcolor:
    "#f8fbfe",

  border:
    "1px solid #cfdae5",

  boxShadow:
    "0 22px 60px rgba(22,42,61,.22)",
};


export const dialogHeaderSx = {
  px: 2.4,
  py: 1.8,

  display:
    "flex",

  alignItems:
    "flex-start",

  justifyContent:
    "space-between",

  background:
    "linear-gradient(105deg,#187f96 0%,#16849c 45%,#247c98 100%)",

  color:
    "#ffffff",
};


export const dialogTitleSx = {
  fontSize: 18,

  fontWeight: 700,

  lineHeight: 1.2,
};


export const dialogSubtitleSx = {
  mt: 0.35,

  fontSize: 10.5,

  fontWeight: 400,

  color:
    "rgba(255,255,255,.86)",
};


export const dialogBodySx = {
  p: 2.4,

  bgcolor:
    "#f8fbfe",
};


export const dialogFooterSx = {
  px: 2.4,
  py: 1.5,

  gap: 1,

  borderTop:
    "1px solid #dce5ed",

  bgcolor:
    "#f6f9fc",
};


export const gentleFieldSx = {

  "& .MuiOutlinedInput-root": {
    minHeight: 42,

    borderRadius:
      "7px",

    bgcolor:
      "#ffffff",

    fontSize:
      "11px",

    fontWeight:
      400,

    color:
      "#52677b",

    "& fieldset": {
      borderColor:
        "#d8e2eb",
    },

    "&:hover fieldset": {
      borderColor:
        "#c3d0dc",
    },

    "&.Mui-focused fieldset": {
      borderColor:
        "#82a9c8",

      borderWidth:
        "1px",
    },
  },


  "& .MuiInputBase-input": {
    px: 1.4,

    py: 1,

    fontSize:
      "11px",

    fontWeight:
      400,

    color:
      "#52677b",
  },


  "& .MuiSelect-select": {
    display:
      "flex",

    alignItems:
      "center",

    px:
      "13px !important",

    py:
      "9px !important",

    fontSize:
      "11px !important",

    fontWeight:
      "400 !important",

    color:
      "#52677b !important",
  },


  "& .MuiInputLabel-root": {
    fontSize:
      "10.5px",

    fontWeight:
      400,

    color:
      "#8091a2",
  },


  "& .MuiInputLabel-root.Mui-focused":
    {
      color:
        "#6488a8",
    },


  "& .MuiSvgIcon-root": {
    fontSize: 17,

    color:
      "#8091a2",
  },
};


export const gentleMenuProps = {
  disableScrollLock: true,

  PaperProps: {
    sx: {
      mt: 0.4,

      maxHeight: 280,

      borderRadius:
        "7px",

      border:
        "1px solid #d8e2eb",

      boxShadow:
        "0 8px 24px rgba(30,55,80,.12)",

      "& .MuiMenuItem-root": {
        minHeight: 34,

        px: 1.4,

        py: 0.6,

        fontSize:
          "11px",

        fontWeight:
          400,

        color:
          "#52677b",

        "&:hover": {
          bgcolor:
            "#f4f8fb",
        },

        "&.Mui-selected": {
          bgcolor:
            "#edf5fb",

          color:
            "#315f83",
        },
      },
    },
  },
};


export const cancelButtonSx = {
  height: 36,

  px: 1.8,

  borderRadius:
    "7px",

  bgcolor:
    "#e5e9ed",

  color:
    "#53677b",

  fontSize: 11,

  fontWeight: 600,

  textTransform:
    "none",

  boxShadow:
    "none",

  "&:hover": {
    bgcolor:
      "#dce2e8",
  },
};


export const primaryButtonSx = {
  height: 36,

  px: 2,

  borderRadius:
    "7px",

  bgcolor:
    "#0a74d7",

  color:
    "#ffffff",

  fontSize: 11,

  fontWeight: 700,

  textTransform:
    "none",

  boxShadow:
    "none",

  "&:hover": {
    bgcolor:
      "#0868c2",

    boxShadow:
      "none",
  },
};


export const closeIconButtonSx = {
  minWidth: 32,

  width: 32,

  height: 32,

  p: 0,

  borderRadius:
    "50%",

  color:
    "#ffffff",

  fontSize: 18,

  bgcolor:
    "rgba(255,255,255,.10)",

  "&:hover": {
    bgcolor:
      "rgba(255,255,255,.18)",
  },
};