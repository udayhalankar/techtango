import React from "react";
import useSessionExpiry from "../hooks/useSessionExpiry";

export default function SessionBoundary({
  children,
  enabled = true,
  inactivityMinutes,
  checkIntervalMs,
}) {
  useSessionExpiry({
    enabled,
    inactivityMinutes,
    checkIntervalMs,
  });

  return <>{children}</>;
}
