"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface PostHogClientLike {
  init: (apiKey: string, options: Record<string, unknown>) => void;
  capture: (eventName: string, properties?: Record<string, unknown>) => void;
}

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

export function PostHogProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const posthogRef = useRef<PostHogClientLike | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!POSTHOG_KEY || initializedRef.current) {
      return;
    }

    let disposed = false;

    void import("posthog-js").then(({ default: posthog }) => {
      if (disposed || initializedRef.current) {
        return;
      }

      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
        persistence: "localStorage+cookie",
      });

      posthogRef.current = posthog;
      initializedRef.current = true;
    });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!initializedRef.current || !posthogRef.current || typeof window === "undefined") {
      return;
    }

    posthogRef.current.capture("$pageview", {
      $current_url: window.location.href,
      path: pathname,
      search,
    });
  }, [pathname, search]);

  return null;
}