"use client";

import { useEffect } from "react";

import {
  trackClientEvent,
  type TrackClientEventParams,
} from "@/lib/analytics-client";

export function TrackPageEvent({
  eventName,
  metadata,
}: TrackClientEventParams) {
  const metadataKey = JSON.stringify(metadata ?? null);

  useEffect(() => {
    trackClientEvent({ eventName, metadata });
  }, [eventName, metadataKey]);

  return null;
}