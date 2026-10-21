"use client";

import { useEffect } from "react";

/**
 * The server cannot reliably tell a tablet (iPadOS Safari reports a Mac UA) from
 * a desktop, so the gate page re-checks on the client: a coarse pointer with
 * touch support proves the device is touch-first. We then persist that in the
 * device cookie and reload once, so the middleware stops rewriting to the gate.
 */
export default function DesktopTouchCheck() {
  useEffect(() => {
    if (
      navigator.maxTouchPoints <= 1 ||
      !window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }

    try {
      if (sessionStorage.getItem("eatrivo_touch_reloaded") === "1") {
        return;
      }

      sessionStorage.setItem("eatrivo_touch_reloaded", "1");
      document.cookie = "eatrivo_device=touch; path=/; max-age=31536000; samesite=lax";
      window.location.reload();
    } catch {
      // Storage or cookie access can be blocked; the gate simply stays.
    }
  }, []);

  return null;
}
