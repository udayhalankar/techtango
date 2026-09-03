import React, { useState } from "react";

import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ViewWeekOutlinedIcon from "@mui/icons-material/ViewWeekOutlined";


export default function DashboardComponentMenu({
  onConfigure,
  onDuplicate,

  onMergeRight,
  canMergeRight = false,

  onRemove,
}) {

  const [
    anchorEl,
    setAnchorEl,
  ] = useState(null);


  const open =
    Boolean(anchorEl);


  const handleOpen = (
    event
  ) => {

    event.stopPropagation();

    setAnchorEl(
      event.currentTarget
    );
  };


  const handleClose = () => {

    setAnchorEl(
      null
    );
  };


  const handleAction = (
    callback
  ) => {

    setAnchorEl(
      null
    );

    callback?.();
  };


  return (
    <>

      {/* =========================================================
          ELLIPSIS BUTTON
      ========================================================= */}

      <IconButton
        size="small"

        onClick={
          handleOpen
        }

        sx={{
          width: 27,
          height: 27,

          color: "#8393a4",

          "&:hover": {
            bgcolor:
              "#f2f6f9",

            color:
              "#46647f",
          },
        }}
      >

        <MoreVertIcon
          sx={{
            fontSize: 17,
          }}
        />

      </IconButton>


      {/* =========================================================
          COMPONENT MENU
      ========================================================= */}

      <Menu
        anchorEl={
          anchorEl
        }

        open={
          open
        }

        onClose={
          handleClose
        }

        /*
         * Prevent page shifting when
         * the menu opens.
         */
        disableScrollLock


        /*
         * IMPORTANT:
         *
         * Keep the MUI backdrop alive so
         * clicking outside closes the menu.
         *
         * But make it completely transparent
         * and remove any inherited blur.
         */
        BackdropProps={{
          sx: {
            display:
              "block !important",

            backgroundColor:
              "transparent !important",

            backdropFilter:
              "none !important",

            WebkitBackdropFilter:
              "none !important",
          },
        }}


        /*
         * Prevent clicks inside the menu
         * from reaching the dashboard slot.
         */
        MenuListProps={{
          onClick: (
            event
          ) => {

            event.stopPropagation();
          },
        }}


        /*
         * Floating menu styling.
         */
        PaperProps={{
          sx: {
            minWidth: 170,

            mt: 0.4,

            py: 0.35,

            borderRadius:
              "8px",

            border:
              "1px solid #dce5ed",

            bgcolor:
              "#ffffff",

            boxShadow:
              "0 8px 24px rgba(30,55,80,.12)",


            "& .MuiMenuItem-root": {
              minHeight: 34,

              px: 1.25,

              py: 0.55,

              fontSize:
                "11px",

              fontWeight:
                400,

              color:
                "#52677b",

              borderRadius:
                "5px",

              mx: 0.35,

              "&:hover": {
                bgcolor:
                  "#f4f8fb",
              },


              "&.Mui-disabled": {
                opacity: 0.42,

                color:
                  "#8fa0af",
              },
            },


            "& .MuiListItemIcon-root": {
              minWidth:
                "28px",

              color:
                "#77899a",
            },


            "& .MuiListItemText-primary":
              {
                fontSize:
                  "11px",

                fontWeight:
                  400,
              },
          },
        }}
      >

        {/* CONFIGURE */}

        <MenuItem
          onClick={() =>
            handleAction(
              onConfigure
            )
          }
        >

          <ListItemIcon>

            <SettingsOutlinedIcon
              sx={{
                fontSize: 16,
              }}
            />

          </ListItemIcon>


          <ListItemText
            primary="Configure"
          />

        </MenuItem>


        {/* DUPLICATE */}

        <MenuItem
          onClick={() =>
            handleAction(
              onDuplicate
            )
          }
        >

          <ListItemIcon>

            <ContentCopyOutlinedIcon
              sx={{
                fontSize: 16,
              }}
            />

          </ListItemIcon>


          <ListItemText
            primary="Duplicate"
          />

        </MenuItem>


        {/* MERGE RIGHT */}

        <MenuItem
          disabled={
            !canMergeRight
          }

          onClick={() =>
            handleAction(
              onMergeRight
            )
          }
        >

          <ListItemIcon>

            <ViewWeekOutlinedIcon
              sx={{
                fontSize: 16,
              }}
            />

          </ListItemIcon>


          <ListItemText
            primary="Merge Right"
          />

        </MenuItem>


        {/* REMOVE */}

        <MenuItem
          onClick={() =>
            handleAction(
              onRemove
            )
          }

          sx={{
            color:
              "#b42318 !important",

            "& .MuiListItemIcon-root":
              {
                color:
                  "#b42318 !important",
              },

            "&:hover": {
              bgcolor:
                "#fff4f2 !important",
            },
          }}
        >

          <ListItemIcon>

            <DeleteOutlineOutlinedIcon
              sx={{
                fontSize: 16,
              }}
            />

          </ListItemIcon>


          <ListItemText
            primary="Remove Component"
          />

        </MenuItem>

      </Menu>

    </>
  );
}