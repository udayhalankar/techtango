import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_INACTIVITY_MINUTES,
  endSession,
  getAuthToken,
  isSessionExpired,
  markSessionActivity,
} from "../auth/sessionManager";

export default function useSessionExpiry(options = {}) {
  const {
    enabled = true,
    inactivityMinutes = DEFAULT_INACTIVITY_MINUTES,
    checkIntervalMs = 60_000,
  } = options;
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return undefined;
    }

    let active = true;

    const expireNow = () => {
      if (!active) return;
      endSession({ navigate });
    };

    const checkSession = () => {
      if (!active) return;
      const token = getAuthToken();
      if (!token || isSessionExpired({ token, inactivityMinutes })) {
        expireNow();
      }
    };

    const recordActivity = () => {
      if (!active) return;
      markSessionActivity();
    };

    const handleStorage = (event) => {
      if (event.key === "token" && !event.newValue) {
        expireNow();
      }
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    checkSession();
    const timerId = window.setInterval(checkSession, checkIntervalMs);

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      window.clearInterval(timerId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.removeEventListener("storage", handleStorage);
    };
  }, [enabled, inactivityMinutes, checkIntervalMs, navigate]);
}
