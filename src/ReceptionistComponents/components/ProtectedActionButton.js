import React from "react";
import { useSelector } from "react-redux";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

const ProtectedActionButton = React.forwardRef(({
  ipdId,
  hideWhenDischarged = false,
  className,
  children,
  disabled: externalDisabled,
  sx,
  ...props
}, ref) => {

  const { dischargedPatients, ipdDataLoaded } = useSelector(
    (state) => state.ipd
  );

  // Only treat as discharged once data is actually loaded
  // Before load completes, we don't know yet — so don't disable
  const isDischarged = ipdDataLoaded && !!dischargedPatients?.[ipdId];
  const isLoading = !ipdDataLoaded;

  // Hide the button entirely if discharged and hideWhenDischarged=true
  if (hideWhenDischarged && isDischarged) return null;

  const derivedColor =
    className?.includes("edit")   ? "primary" :
    className?.includes("delete") ? "error"   :
    undefined;

  const derivedVariant =
    (className?.includes("edit") || className?.includes("delete"))
      ? "contained"
      : undefined;

  const derivedSx = {
    minWidth: "unset",
    ...(className?.includes("delete") && { ml: 0.8 }),
    ...sx,
  };

  return (
    <Button
      ref={ref}
      color={derivedColor}
      variant={derivedVariant}
      sx={derivedSx}
      {...props}
      // Only disable if actually discharged OR caller explicitly disabled
      disabled={isDischarged || !!externalDisabled}
      startIcon={
        // Show spinner inside the button while IPD data loads
        isLoading
          ? <CircularProgress size={12} color="inherit" />
          : props.startIcon
      }
    >
      {children}
    </Button>
  );
});

ProtectedActionButton.displayName = "ProtectedActionButton";

export default ProtectedActionButton;