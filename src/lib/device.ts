import { userAgent, type NextRequest } from "next/server";

export const DEVICE_COOKIE = "eatrivo_device"; // value "touch" = verified touch device (set client-side)
export const DESKTOP_GATE_PATH = "/desktop"; // served as /{locale}/desktop

/** Device types reported by `userAgent()` that are never treated as desktop. */
const NON_DESKTOP_DEVICE_TYPES = [
  "mobile",
  "tablet",
  "wearable",
  "console",
  "smarttv",
  "embedded",
] as const;

/** True when the request comes from a desktop/laptop browser that should see the gate. */
export function isDesktopRequest(req: NextRequest): boolean {
  const ua = userAgent(req);

  return isDesktopUserAgent(req.headers.get("user-agent") ?? "", {
    mobileHint: req.headers.get("sec-ch-ua-mobile"),
    deviceCookie: req.cookies.get(DEVICE_COOKIE)?.value,
    isBot: ua.isBot,
    deviceType: ua.device.type,
  });
}

/**
 * Pure variant of {@link isDesktopRequest} that does not depend on `NextRequest`,
 * so it can be unit-tested.
 */
export function isDesktopUserAgent(
  uaString: string,
  opts: {
    mobileHint?: string | null;
    deviceCookie?: string | null;
    isBot?: boolean;
    deviceType?: string;
  },
): boolean {
  // 1. Verified touch device — the client already confirmed this.
  if (opts.deviceCookie === "touch") return false;

  // 2. Bots/crawlers are never gated.
  if (opts.isBot) return false;

  // 3. Client hints say the device is mobile.
  if (opts.mobileHint === "?1") return false;

  // 4. Known non-desktop device type.
  if (
    opts.deviceType &&
    (NON_DESKTOP_DEVICE_TYPES as readonly string[]).includes(opts.deviceType)
  ) {
    return false;
  }

  // 5. Unknown clients (no UA) are not blocked.
  if (!uaString) return false;

  // 6. Everything else is a desktop/laptop. iPadOS Safari sends a Mac UA, so it
  //    lands here on purpose — the gate page fixes this on the client by setting
  //    the cookie and reloading.
  return true;
}
