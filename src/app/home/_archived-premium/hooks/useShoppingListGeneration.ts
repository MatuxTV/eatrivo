"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentNode: string;
  currentLabel: string;
  retryCount: number;
  error: string | null;
  result: {
    done: boolean;
  } | null;
}

const POLL_INTERVAL_MS = 5000; // 12 req/min — well within the 30/min standard rate limit

export function useShoppingListGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentNode, setCurrentNode] = useState("");
  const [currentLabel, setCurrentLabel] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationState["result"]>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback(
    () => {
      stopPolling();

      pollerRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/shopping-lists/generate/status");
          if (!res.ok) return;
          const data = await res.json();

          if (data.isGenerating) {
            setProgress(data.progress ?? 0);
            setCurrentLabel(data.label ?? "");
            setRetryCount(data.retryCount ?? 0);
            return;
          }

          stopPolling();

          if (data.error) {
            setError(data.error);
            setIsGenerating(false);
            return;
          }

          setProgress(100);
          setCurrentLabel("loader.done");
          setResult({ done: true });
          setIsGenerating(false);
        } catch {
          // Ignore transient network errors and keep polling.
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  const generate = useCallback(
    async () => {
      setIsGenerating(true);
      setProgress(0);
      setCurrentNode("");
      setCurrentLabel("loader.fetchingProfile");
      setRetryCount(0);
      setError(null);
      setResult(null);

      try {
        const response = await fetch("/api/shopping-lists/generate", {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to generate shopping list",
          );
        }

        startPolling();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate shopping list. Please try again.",
        );
        setIsGenerating(false);
      }
    },
    [startPolling],
  );

  const checkAndResume = useCallback(
    async () => {
      try {
        const res = await fetch("/api/shopping-lists/generate/status");
        if (!res.ok) return;
        const data = await res.json();

        if (!data.isGenerating) {
          if (data.done) {
            setProgress(100);
            setCurrentLabel("loader.done");
            setResult({ done: true });
          }
          return;
        }

        console.warn("[Generation] Lock detected on mount — resuming UI", {
          progress: data.progress,
          label: data.label,
        });
        setIsGenerating(true);
        setProgress(data.progress ?? 5);
        setCurrentLabel(data.label ?? "loader.fetchingProfile");
        setRetryCount(data.retryCount ?? 0);
        startPolling();
      } catch {
        // Ignore.
      }
    },
    [startPolling],
  );

  return {
    isGenerating,
    progress,
    currentNode,
    currentLabel,
    retryCount,
    error,
    result,
    generate,
    checkAndResume,
  };
}