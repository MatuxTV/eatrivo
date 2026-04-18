"use client";

import { useEffect, useRef } from "react";

import {
  trackClientEvent,
  type TrackClientEventParams,
} from "@/lib/analytics-client";

export function TrackPageEvent({
  eventName,
  metadata,
}: TrackClientEventParams) {
  const metadataKey = JSON.stringify(metadata ?? null);
  const metadataRef = useRef(metadata);

  metadataRef.current = metadata;

  useEffect(() => {
    trackClientEvent({ eventName, metadata: metadataRef.current });
  }, [eventName, metadataKey]);

  return null;
}