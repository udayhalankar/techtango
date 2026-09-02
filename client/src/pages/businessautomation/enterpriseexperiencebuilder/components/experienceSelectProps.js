export const EXPERIENCE_SELECT_MENU_PROPS = {
  disableScrollLock: true,

  PaperProps: {
    sx: {
      mt: 0.4,

      border:
        "1px solid #d9e2e9",

      borderRadius:
        "3px",

      boxShadow:
        "0 8px 24px rgba(30,50,70,.14)",

      maxHeight:
        280,

      "& .MuiMenuItem-root":
        {
          minHeight:
            30,

          px:
            1.2,

          py:
            0.55,

          fontSize:
            10.5,

          color:
            "#40576b",
        },

      "& .MuiMenuItem-root.Mui-selected":
        {
          bgcolor:
            "#edf5f9",
        },

      "& .MuiMenuItem-root.Mui-selected:hover":
        {
          bgcolor:
            "#e5f0f5",
        },
    },
  },

  MenuListProps: {
    dense:
      true,

    sx: {
      py:
        0.35,
    },
  },

  BackdropProps: {
    invisible:
      true,

    sx: {
      backgroundColor:
        "transparent !important",

      backdropFilter:
        "none !important",

      WebkitBackdropFilter:
        "none !important",
    },
  },
};