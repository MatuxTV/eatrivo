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

  /** Stop any active polling interval */
  const stopPolling = useCallback(() => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
  }, []);

  /** Clean up on unmount */
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  /**
   * Start polling the status endpoint until generation completes or errors.
   * Sets result state on completion; consumer reacts via useEffect.
   */
  const startPolling = useCallback(
    () => {
      stopPolling();

      pollerRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/shopping-lists/generate/status");
          if (!res.ok) return;
          const data = await res.json();

          if (data.isGenerating) {
            // Still generating — update progress state
            setProgress(data.progress ?? 0);
            setCurrentLabel(data.label ?? "");
            setRetryCount(data.retryCount ?? 0);
            return;
          }

          // Generation finished
          stopPolling();

          if (data.error) {
            // Generation failed
            setError(data.error);
            setIsGenerating(false);
            return;
          }

          // Generation completed successfully — set result so the consumer's
          // generationResult effect handles any follow-up actions (single call site).
          setProgress(100);
          setCurrentLabel("loader.done");
          setResult({ done: true });
          setIsGenerating(false);
          // onDone intentionally NOT called here — consumer should react to result state
        } catch {
          // Ignore transient network errors — keep polling
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  /**
   * Kick off a new shopping list generation.
   * POST fires the background job, then we poll for progress.
   */
  const generate = useCallback(
    async () => {
      // Reset state
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

        // Backend accepted — start polling for progress
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

  /**
   * On page load, check if a generation was already in progress (e.g. user refreshed).
   * If the Redis lock is active, restores the generating UI and polls until done.
   * Completion sets result state, which the consumer's generationResult effect handles.
   */
  const checkAndResume = useCallback(
    async () => {
      try {
        const res = await fetch("/api/shopping-lists/generate/status");
        if (!res.ok) return;
        const data = await res.json();

        if (!data.isGenerating) {
          // If generation just completed while page was loading, fire result
          // so the generationResult effect picks it up
          if (data.done) {
            setProgress(100);
            setCurrentLabel("loader.done");
            setResult({ done: true });
          }
          return;
        }

        // Generation is in progress — resume UI
        console.debug("[Generation] Lock detected on mount — resuming UI", {
          progress: data.progress,
          label: data.label,
        });
        setIsGenerating(true);
        setProgress(data.progress ?? 5);
        setCurrentLabel(data.label ?? "loader.fetchingProfile");
        setRetryCount(data.retryCount ?? 0);

        // Start polling
        startPolling();
      } catch {
        // Ignore
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
