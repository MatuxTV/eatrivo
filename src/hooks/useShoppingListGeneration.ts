"use client";

import { useState, useCallback, useRef } from "react";

export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentNode: string;
  currentLabel: string;
  retryCount: number;
  error: string | null;
  result: {
    shoppingList: Record<string, unknown>;
    mealPlan: Record<string, unknown> | null;
    status: "draft" | "active" | null;
  } | null;
}

export function useShoppingListGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentNode, setCurrentNode] = useState("");
  const [currentLabel, setCurrentLabel] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationState["result"]>(null);
  const resumePollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * On page load, check if a generation was already in progress (e.g. user refreshed).
   * If the Redis lock is active, show the generating UI and poll until it clears,
   * then call onDone() so the caller can refresh shopping lists.
   */
  const checkAndResume = useCallback(async (onDone: () => void) => {
    try {
      const res = await fetch("/api/shopping-lists/generate/status");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.isGenerating) return;

      console.debug("[Generation] Lock detected on mount — resuming UI", { remainingTime: data.remainingTime });
      setIsGenerating(true);
      setCurrentLabel("loader.generatingList");
      setProgress(10); // indicate something is happening

      // Clear any existing poller
      if (resumePollerRef.current) clearInterval(resumePollerRef.current);

      resumePollerRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch("/api/shopping-lists/generate/status");
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();
          console.debug("[Generation] Poll", { isGenerating: pollData.isGenerating, remaining: pollData.remainingTime });

          if (!pollData.isGenerating) {
            clearInterval(resumePollerRef.current!);
            resumePollerRef.current = null;
            setIsGenerating(false);
            setProgress(100);
            setCurrentLabel("loader.done");
            console.debug("[Generation] Lock released — calling onDone");
            onDone();
          }
        } catch {
          // ignore transient errors
        }
      }, 3000);
    } catch {
      // ignore
    }
  }, []);

  const generate = useCallback(async () => {
    // 1. Reset state
    setIsGenerating(true);
    setProgress(0);
    setCurrentNode("");
    setCurrentLabel("");
    setRetryCount(0);
    setError(null);
    setResult(null);

    try {
      // 2. Fetch SSE stream
      const response = await fetch("/api/shopping-lists/generate", {
        method: "POST",
      });

      // 3. Handle non-OK response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate shopping list");
      }

      // 4. Read the stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(line.slice(6));

            if (json.type === "done") {
              setResult({
                shoppingList: json.shoppingList,
                mealPlan: json.mealPlan ?? null,
                status: json.status ?? null,
              });
              setProgress(100);
              setCurrentLabel("loader.done");
              return; // Exit the while loop
            }

            if (json.type === "error") {
              setError(json.message);
              return;
            }

            // Progress event
            setProgress(json.progress);
            setCurrentNode(json.node);
            setCurrentLabel(json.label);
            setRetryCount(json.retryCount ?? 0);
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate shopping list. Please try again.",
      );
    } finally {
      // 5. Always mark as done
      setIsGenerating(false);
    }
  }, []);

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
