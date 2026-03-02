"use client";

import { useState, useCallback } from "react";

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
  };
}
