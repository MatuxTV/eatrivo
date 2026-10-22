"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 100;

interface BookmarksPageItem {
  id?: string;
}

interface BookmarksPage {
  items?: BookmarksPageItem[];
  pagination?: {
    hasMore?: boolean;
  };
}

export interface RecipeBookmarks {
  isBookmarked(id: string): boolean;
  setBookmarked(id: string, value: boolean): void;
  toggle(id: string): Promise<void>;
  isPending(id: string): boolean;
}

/**
 * Tracks which recipes the current user has bookmarked and toggles them
 * optimistically. Bookmarks are a progressive enhancement: unauthenticated or
 * failed requests simply leave the set empty.
 */
export function useRecipeBookmarks(options?: {
  enabled?: boolean;
}): RecipeBookmarks {
  const enabled = options?.enabled ?? true;
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const isMountedRef = useRef(false);
  const bookmarkedRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      return () => {
        isMountedRef.current = false;
      };
    }

    let cancelled = false;

    const loadBookmarks = async () => {
      const ids = new Set<string>();
      let offset = 0;

      try {
        for (;;) {
          const response = await fetch(
            `/api/user/bookmarks?limit=${PAGE_SIZE}&offset=${offset}`,
            { method: "GET", cache: "no-store" },
          );

          // 401 / 404 / offline: keep the empty set instead of failing the UI.
          if (!response.ok) {
            return;
          }

          const payload = (await response.json().catch(() => null)) as
            | BookmarksPage
            | null;

          if (cancelled || !isMountedRef.current) {
            return;
          }

          const items = payload?.items ?? [];

          for (const item of items) {
            if (item?.id) {
              ids.add(item.id);
            }
          }

          if (!payload?.pagination?.hasMore || items.length === 0) {
            break;
          }

          offset += items.length;
        }
      } catch {
        return;
      }

      if (cancelled || !isMountedRef.current) {
        return;
      }

      bookmarkedRef.current = ids;
      setBookmarkedIds(ids);
    };

    void loadBookmarks();

    return () => {
      cancelled = true;
      isMountedRef.current = false;
    };
  }, [enabled]);

  const applyBookmarked = useCallback(
    (updater: (current: Set<string>) => Set<string>) => {
      const next = updater(bookmarkedRef.current);
      bookmarkedRef.current = next;

      if (isMountedRef.current) {
        setBookmarkedIds(next);
      }
    },
    [],
  );

  const applyPending = useCallback(
    (updater: (current: Set<string>) => Set<string>) => {
      const next = updater(pendingRef.current);
      pendingRef.current = next;

      if (isMountedRef.current) {
        setPendingIds(next);
      }
    },
    [],
  );

  const toggle = useCallback(
    async (id: string) => {
      if (!id || pendingRef.current.has(id)) {
        return;
      }

      const wasBookmarked = bookmarkedRef.current.has(id);

      applyPending((current) => {
        const next = new Set(current);
        next.add(id);
        return next;
      });

      applyBookmarked((current) => {
        const next = new Set(current);

        if (wasBookmarked) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      });

      try {
        const response = await fetch(`/api/recipes/${id}/bookmark`, {
          method: wasBookmarked ? "DELETE" : "POST",
        });

        if (!response.ok) {
          throw new Error("Bookmark request failed.");
        }
      } catch {
        // Roll the optimistic update back so the UI matches the server.
        applyBookmarked((current) => {
          const next = new Set(current);

          if (wasBookmarked) {
            next.add(id);
          } else {
            next.delete(id);
          }

          return next;
        });
      } finally {
        applyPending((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    },
    [applyBookmarked, applyPending],
  );

  const isBookmarked = useCallback(
    (id: string) => bookmarkedIds.has(id),
    [bookmarkedIds],
  );

  const isPending = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  const setBookmarked = useCallback(
    (id: string, value: boolean) => {
      if (!id) {
        return;
      }

      const alreadyBookmarked = bookmarkedRef.current.has(id);

      if (alreadyBookmarked === value) {
        return;
      }

      applyBookmarked((current) => {
        const next = new Set(current);

        if (value) {
          next.add(id);
        } else {
          next.delete(id);
        }

        return next;
      });
    },
    [applyBookmarked],
  );

  return { isBookmarked, setBookmarked, toggle, isPending };
}
