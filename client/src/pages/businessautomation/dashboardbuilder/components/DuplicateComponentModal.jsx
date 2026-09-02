import React, {
  useEffect,
  useState,
} from "react";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Radio,
  Typography,
} from "@mui/material";


export default function DuplicateComponentModal({
  open,
  component,
  sourceSlotId,
  availableSlots = [],
  onClose,
  onDuplicate,
}) {

  const [
    selectedSlotId,
    setSelectedSlotId,
  ] = useState("");


  useEffect(() => {

    if (!open) {
      return;
    }


    setSelectedSlotId(
      ""
    );

  }, [
    open,
    sourceSlotId,
  ]);


  const compatibleSlots =
    availableSlots.filter(
      (slot) => {

        if (
          !slot?.slotId ||
          slot.slotId ===
            sourceSlotId
        ) {
          return false;
        }


        return (
          Array.isArray(
            slot.accepts
          ) &&
          slot.accepts.includes(
            component?.type
          )
        );
      }
    );


  const handleDuplicate =
    () => {

      if (!selectedSlotId) {
        return;
      }


      onDuplicate?.(
        selectedSlotId
      );
    };


  return (
    <Dialog
      open={Boolean(open)}
      onClose={onClose}
      maxWidth={false}

      BackdropProps={{
        sx: {
          backdropFilter:
            "none !important",

          WebkitBackdropFilter:
            "none !important",

          backgroundColor:
            "rgba(17,31,46,.42) !important",
        },
      }}

      PaperProps={{
        sx: {
          width:
            "min(520px,92vw)",

          borderRadius:
            "14px",

          overflow:
            "hidden",

          bgcolor:
            "#f8fbfe",

          border:
            "1px solid #cfdae5",

          boxShadow:
            "0 22px 60px rgba(22,42,61,.22)",
        },
      }}
    >

      {/* HEADER */}

      <Box
        sx={{
          px: 2.3,
          py: 1.65,

          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "flex-start",

          background:
            "linear-gradient(105deg,#187f96 0%,#16849c 45%,#247c98 100%)",

          color:
            "#ffffff",
        }}
      >

        <Box>

          <Typography
            sx={{
              fontSize: 17,

              fontWeight: 700,
            }}
          >
            Duplicate Component
          </Typography>


          <Typography
            sx={{
              mt: 0.3,

              fontSize: 10.5,

              color:
                "rgba(255,255,255,.84)",
            }}
          >
            Choose an empty compatible dashboard area.
          </Typography>

        </Box>


        <Button
          onClick={onClose}

          sx={{
            minWidth: 31,
            width: 31,
            height: 31,

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
          }}
        >
          ×
        </Button>

      </Box>


      {/* BODY */}

      <DialogContent
        sx={{
          p: 2.2,

          bgcolor:
            "#f8fbfe",
        }}
      >

        <Box
          sx={{
            mb: 1.4,

            px: 1.3,
            py: 0.9,

            borderRadius:
              "8px",

            bgcolor:
              "#ffffff",

            border:
              "1px solid #dce5ed",
          }}
        >

          <Typography
            sx={{
              fontSize: 9.5,

              color:
                "#8595a6",
            }}
          >
            Component
          </Typography>


          <Typography
            sx={{
              mt: 0.1,

              fontSize: 11.5,

              fontWeight: 600,

              color:
                "#33485d",
            }}
          >
            {component?.title ||
              component?.type ||
              "Component"}
          </Typography>

        </Box>


        {compatibleSlots.length ? (

          <Box
            sx={{
              display:
                "grid",

              gap: 0.8,
            }}
          >

            {compatibleSlots.map(
              (slot) => {

                const selected =
                  selectedSlotId ===
                  slot.slotId;


                return (
                  <Box
                    key={
                      slot.slotId
                    }

                    role="button"

                    tabIndex={0}

                    onClick={() =>
                      setSelectedSlotId(
                        slot.slotId
                      )
                    }

                    sx={{
                      px: 1.2,
                      py: 0.75,

                      display:
                        "flex",

                      alignItems:
                        "center",

                      cursor:
                        "pointer",

                      borderRadius:
                        "8px",

                      bgcolor:
                        selected
                          ? "#edf6fc"
                          : "#ffffff",

                      border:
                        selected
                          ? "1px solid #82b5da"
                          : "1px solid #dce5ed",

                      "&:hover": {
                        borderColor:
                          "#a9bfd2",

                        bgcolor:
                          "#f7fafc",
                      },
                    }}
                  >

                    <Radio
                      checked={
                        selected
                      }

                      size="small"

                      sx={{
                        p: 0.4,

                        mr: 0.7,
                      }}
                    />


                    <Box>

                      <Typography
                        sx={{
                          fontSize:
                            11,

                          fontWeight:
                            600,

                          color:
                            "#40566d",
                        }}
                      >
                        {
                          slot.slotId
                        }
                      </Typography>


                      <Typography
                        sx={{
                          mt: 0.05,

                          fontSize:
                            9,

                          color:
                            "#91a0af",
                        }}
                      >
                        {slot.accepts.join(
                          " · "
                        )}
                      </Typography>

                    </Box>

                  </Box>
                );
              }
            )}

          </Box>

        ) : (

          <Box
            sx={{
              py: 3.5,

              textAlign:
                "center",
            }}
          >

            <Typography
              sx={{
                fontSize: 11,

                color:
                  "#8292a2",
              }}
            >
              No empty compatible areas are available.
            </Typography>

          </Box>
        )}

      </DialogContent>


      <DialogActions
        sx={{
          px: 2.2,
          py: 1.4,

          borderTop:
            "1px solid #dce5ed",

          bgcolor:
            "#f6f9fc",
        }}
      >

        <Button
          onClick={onClose}

          sx={{
            height: 35,

            px: 1.7,

            borderRadius:
              "7px",

            bgcolor:
              "#e5e9ed",

            color:
              "#53677b",

            fontSize: 11,

            textTransform:
              "none",
          }}
        >
          Cancel
        </Button>


        <Button
          variant="contained"

          disabled={
            !selectedSlotId
          }

          onClick={
            handleDuplicate
          }

          sx={{
            height: 35,

            px: 1.8,

            borderRadius:
              "7px",

            bgcolor:
              "#0a74d7",

            fontSize: 11,

            fontWeight: 700,

            textTransform:
              "none",
          }}
        >
          Duplicate
        </Button>

      </DialogActions>

    </Dialog>
  );
}