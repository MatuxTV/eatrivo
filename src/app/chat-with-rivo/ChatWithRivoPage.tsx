"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Crown,
  Loader2,
  MessageSquarePlus,
  PanelLeft,
  Plus,
  Send,
} from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { FeedbackDialog } from "@/components/FeedbackButton";
import Link from "next/link";
import AppShellViewport from "@/app/home/components/AppShellViewport";
import { MOBILE_BOTTOM_NAV_OFFSET } from "@/app/home/constants/app-shell";
import { useTutorialSurface } from "@/components/tutorial/TutorialProvider";
import { trackClientEvent } from "@/lib/analytics-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSessionSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  lastMessagePreview: string | null;
}

interface ChatSessionDetailResponse {
  session: {
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
  };
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
}

const NARRATIVE_LOADER_STEPS = [
  "Rivo premýšľa...",
  "Analyzujem tvoj profil...",
  "Hľadám v tvojej špajzi...",
  "Kukám na kalórie...",
  "Pripravujem odpoveď...",
];

const SESSION_ID_KEY = "rivo-chat-session";
const MOBILE_COMPOSER_GAP = "0.75rem";

function loadSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_ID_KEY);
}

function saveSessionId(id: string) {
  sessionStorage.setItem(SESSION_ID_KEY, id);
}

interface ChatLimit {
  limited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
}

const MAX_INPUT_CHARS = 600;

function formatSessionTimestamp(value: string, locale: string): string {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat(locale === "sk" ? "sk-SK" : "en-US", sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "2-digit" }).format(date);
}

function ChatSessionList({
  sessions,
  activeSessionId,
  isLoading,
  isDisabled,
  locale,
  loadingLabel,
  emptyTitle,
  emptyDescription,
  untitledLabel,
  onSelect,
}: {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  isLoading: boolean;
  isDisabled: boolean;
  locale: string;
  loadingLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  untitledLabel: string;
  onSelect: (sessionId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-eatrivo-purple/20 bg-white/70 px-4 text-sm text-eatrivo-black-secondary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {loadingLabel}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center rounded-[1.5rem] border border-dashed border-eatrivo-purple/20 bg-white/70 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-eatrivo-black-primary">{emptyTitle}</p>
        <p className="mt-1 text-xs leading-5 text-eatrivo-black-secondary">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1 scrollbar-hide">
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId;

        return (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session.id)}
            disabled={isDisabled}
            className={`rounded-[1.25rem] border px-4 py-3 text-left transition-all ${
              isActive
                ? "border-eatrivo-purple/30 bg-eatrivo-purple/8 shadow-sm"
                : "border-transparent bg-white/80 hover:border-eatrivo-purple/15 hover:bg-white"
            } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-eatrivo-black-primary">
                  {session.title?.trim() || untitledLabel}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-eatrivo-black-secondary">
                  {session.lastMessagePreview?.trim() || emptyDescription}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-medium text-eatrivo-black-secondary/70">
                  {formatSessionTimestamp(session.lastMessageAt, locale)}
                </p>
                <p className="mt-1 text-[11px] text-eatrivo-black-secondary/60">
                  {session.messageCount}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function ChatWithRivoPage() {
  const t = useTranslations("home.comingSoon.chatWithRivo");
  const locale = useLocale();
  useTutorialSurface("chatWithRivo");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [loaderStepIndex, setLoaderStepIndex] = useState(0);
  const [chatLimit, setChatLimit] = useState<ChatLimit | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(loadSessionId);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchChatLimit = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/limit");
      if (res.ok) {
        const data = await res.json();
        setChatLimit(data);
      }
    } catch {
      // silently ignore
    }
  }, []);

  const trackedSessionIds = useRef<Set<string>>(new Set());
  const initialViewportHeight = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInputFocusedRef = useRef(false);
  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const fetchChatSessions = useCallback(async () => {
    const response = await fetch("/api/chat/sessions", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load chat sessions");
    }

    const data = (await response.json()) as { sessions: ChatSessionSummary[] };
    setChatSessions(data.sessions);
    return data.sessions;
  }, []);

  const loadChatSession = useCallback(async (sessionId: string) => {
    setHistoryError(null);
    setIsSessionLoading(true);

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load chat session");
      }

      const data = (await response.json()) as ChatSessionDetailResponse;
      setMessages(
        data.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        })),
      );
      setActiveSessionId(data.session.id);
      saveSessionId(data.session.id);
    } catch {
      setHistoryError(t("history.errors.loadSession"));
    } finally {
      setIsSessionLoading(false);
    }
  }, [t]);

  const createChatSession = useCallback(async (shouldFocusInput = false) => {
    setHistoryError(null);

    const response = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to create chat session");
    }

    const data = (await response.json()) as { session: ChatSessionSummary };

    setChatSessions((prev) => [data.session, ...prev.filter((session) => session.id !== data.session.id)]);
    setMessages([]);
    setActiveSessionId(data.session.id);
    saveSessionId(data.session.id);

    if (shouldFocusInput) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
    }

    return data.session.id;
  }, []);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    if (sessionId === activeSessionId || isStreaming) {
      return;
    }

    await loadChatSession(sessionId);
    setIsHistoryOpen(false);
  }, [activeSessionId, isStreaming, loadChatSession]);

  const handleCreateNewChat = useCallback(async () => {
    if (isStreaming) {
      return;
    }

    try {
      await createChatSession(true);
      setIsHistoryOpen(false);
    } catch {
      setHistoryError(t("history.errors.createSession"));
    }
  }, [createChatSession, isStreaming, t]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      setHistoryError(null);

      try {
        const sessions = await fetchChatSessions();
        if (cancelled) {
          return;
        }

        const storedSessionId = loadSessionId();
        const preferredSessionId =
          sessions.find((session) => session.id === storedSessionId)?.id ??
          sessions[0]?.id ??
          null;

        if (preferredSessionId) {
          await loadChatSession(preferredSessionId);
        } else {
          await createChatSession(false);
        }
      } catch {
        if (!cancelled) {
          setHistoryError(t("history.errors.loadSessions"));
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [createChatSession, fetchChatSessions, loadChatSession, t]);

  useEffect(() => {
    if (!activeSessionId || trackedSessionIds.current.has(activeSessionId)) {
      return;
    }

    trackedSessionIds.current.add(activeSessionId);
    trackClientEvent({
      eventName: "chat_session_started",
      metadata: {
        sessionId: activeSessionId,
        locale,
        restoredMessages: messages.length,
      },
    });
  }, [activeSessionId, locale, messages.length]);

  useEffect(() => {
    fetchChatLimit();
  }, [fetchChatLimit]);

  useEffect(() => {
    scrollChatToBottom("smooth");
  }, [loaderStepIndex, messages, isStreaming, scrollChatToBottom]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    const isStandaloneMode = () => {
      const navigatorWithStandalone = window.navigator as Navigator & {
        standalone?: boolean;
      };

      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        navigatorWithStandalone.standalone === true
      );
    };

    const getBaselineHeight = () =>
      Math.max(
        isStandaloneMode() ? window.innerHeight : 0,
        viewport.height + viewport.offsetTop,
      );

    const syncBaselineHeight = () => {
      initialViewportHeight.current = getBaselineHeight();
    };

    const updateKeyboardOffset = () => {
      if (initialViewportHeight.current === null) {
        syncBaselineHeight();
      }

      const baselineHeight = initialViewportHeight.current ?? getBaselineHeight();
      const visibleHeight = viewport.height + viewport.offsetTop;
      const nextOffset = Math.max(0, baselineHeight - visibleHeight);

      if (!isInputFocusedRef.current && nextOffset < 80) {
        setKeyboardOffset(0);
        syncBaselineHeight();
        return;
      }

      setKeyboardOffset(nextOffset > 80 ? nextOffset : 0);
    };

    const settleViewport = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          syncBaselineHeight();
          updateKeyboardOffset();
        });
      });
    };

    syncBaselineHeight();
    updateKeyboardOffset();

    viewport.addEventListener("resize", updateKeyboardOffset);
    viewport.addEventListener("scroll", updateKeyboardOffset);
    window.addEventListener("orientationchange", settleViewport);
    window.addEventListener("pageshow", settleViewport);
    window.addEventListener("focusin", settleViewport);
    window.addEventListener("focusout", settleViewport);
    document.addEventListener("visibilitychange", settleViewport);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardOffset);
      viewport.removeEventListener("scroll", updateKeyboardOffset);
      window.removeEventListener("orientationchange", settleViewport);
      window.removeEventListener("pageshow", settleViewport);
      window.removeEventListener("focusin", settleViewport);
      window.removeEventListener("focusout", settleViewport);
      document.removeEventListener("visibilitychange", settleViewport);
    };
  }, []);

  useEffect(() => {
    if (keyboardOffset === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      scrollChatToBottom("auto");
    }, 140);

    return () => window.clearTimeout(timeout);
  }, [keyboardOffset, scrollChatToBottom]);

  useEffect(() => {
    if (!isStreaming) return;

    setLoaderStepIndex(0);
    const interval = setInterval(() => {
      setLoaderStepIndex((prev) => (prev + 1) % NARRATIVE_LOADER_STEPS.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const hasProcessedUrlPrompt = useRef(false);

  const sendMessage = useCallback(async (overrideInput?: string) => {
    const textToSend = overrideInput ?? input;
    if (!textToSend.trim() || isStreaming) return;
    if (textToSend.length > MAX_INPUT_CHARS) return;
    if (chatLimit?.limited && chatLimit.remaining === 0) return;

    let nextSessionId = activeSessionId;

    if (!nextSessionId) {
      try {
        nextSessionId = await createChatSession(false);
      } catch {
        setHistoryError(t("history.errors.createSession"));
        return;
      }
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: textToSend,
    };
    const assistantMessageId = crypto.randomUUID();

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: nextSessionId,
          message: textToSend,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          try {
            const errorData = await res.json();
            if (errorData.error === "daily_limit_reached") {
              setChatLimit((prev) =>
                prev ? { ...prev, used: errorData.used, remaining: 0 } : prev,
              );
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (
                  lastMsg &&
                  lastMsg.role === "assistant" &&
                  lastMsg.content === ""
                ) {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content:
                      "Dosiahol si denný limit správ. Prejdi na Plus pre neobmedzeny chat s Rivom! 💜",
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    role: "assistant",
                    content:
                      "Dosiahol si denný limit správ. Prejdi na Plus pre neobmedzeny chat s Rivom! 💜",
                  },
                ];
              });
              return;
            }
          } catch {
            // fall through to generic error
          }
        }
        throw new Error("Request failed");
      }

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            id: assistantMessageId,
            role: "assistant",
            content: accumulated,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && lastMsg.content === "") {
          const updated = [...prev];
          updated[updated.length - 1] = {
            id: assistantMessageId,
            role: "assistant",
            content: "Ups, Rivo práve odpočíva... Skús to znova 😴",
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "Ups, Rivo práve odpočíva... Skús to znova 😴",
          },
        ];
      });
    } finally {
      setIsStreaming(false);
      fetchChatLimit();
      fetchChatSessions().catch(() => {
        setHistoryError(t("history.errors.refreshSessions"));
      });
    }
  }, [
    activeSessionId,
    chatLimit?.limited,
    chatLimit?.remaining,
    createChatSession,
    fetchChatLimit,
    fetchChatSessions,
    input,
    isStreaming,
    t,
  ]);

  useEffect(() => {
    if (
      hasProcessedUrlPrompt.current ||
      typeof window === "undefined" ||
      isBootstrapping ||
      !activeSessionId
    ) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const promptQuery = params.get("prompt");

    if (promptQuery) {
      hasProcessedUrlPrompt.current = true;

      setTimeout(() => {
        sendMessage(promptQuery);
      }, 100);

      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [activeSessionId, isBootstrapping, sendMessage]);

  const isKeyboardOpen = keyboardOffset > 0;
  const currentSession = chatSessions.find((session) => session.id === activeSessionId) ?? null;
  const mobileComposerStyle = {
    bottom: isKeyboardOpen
      ? `calc(env(safe-area-inset-bottom) + ${keyboardOffset}px + ${MOBILE_COMPOSER_GAP})`
      : `calc(${MOBILE_BOTTOM_NAV_OFFSET} + ${MOBILE_COMPOSER_GAP})`,
    transition: "bottom 220ms cubic-bezier(0.22, 1, 0.36, 1)",
    willChange: "bottom",
  } satisfies CSSProperties;

  return (
    <AppShellViewport
      data-tutorial-anchor="chat-root"
      className="flex h-full w-full flex-1 flex-col mx-auto bg-eatrivo-white-primary relative overflow-hidden px-4 pt-20 md:px-8 md:pt-0"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-eatrivo-purple/10 blur-[100px] rounded-full opacity-60"></div>
        <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] bg-eatrivo-pink/5 blur-[120px] rounded-full opacity-40"></div>
      </div>

      <div className="relative z-20 flex items-center justify-between gap-3 pb-4 md:mx-auto md:w-full md:max-w-6xl">
        <div className="flex min-w-0 items-center gap-3">
          <button
            data-tutorial-anchor="chat-history-trigger"
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            disabled={isStreaming}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-eatrivo-purple/15 bg-white/85 text-eatrivo-black-primary shadow-sm transition-colors hover:border-eatrivo-purple/30 hover:text-eatrivo-purple disabled:cursor-not-allowed disabled:opacity-60 md:hidden"
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-eatrivo-black-secondary/60">
              {t("history.currentLabel")}
            </p>
            <p className="truncate text-sm font-semibold text-eatrivo-black-primary sm:text-base">
              {currentSession?.title?.trim() || t("history.untitled")}
            </p>
          </div>
        </div>

        <button
          data-tutorial-anchor="chat-new-chat"
          type="button"
          onClick={handleCreateNewChat}
          disabled={isStreaming || isBootstrapping}
          className="inline-flex items-center gap-2 rounded-2xl bg-eatrivo-purple px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-eatrivo-purple/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-eatrivo-purple/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          <span>{t("history.newChat")}</span>
        </button>
      </div>

      {historyError ? (
        <div className="relative z-20 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:mx-auto md:w-full md:max-w-6xl">
          {historyError}
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-0 flex-1 gap-6 md:mx-auto md:w-full md:max-w-6xl">
        <aside className="hidden md:flex md:w-72 md:flex-col md:rounded-[2rem] md:border md:border-eatrivo-purple/10 md:bg-white/80 md:p-4 md:shadow-[0_16px_50px_rgba(123,63,242,0.08)] md:backdrop-blur-xl">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-eatrivo-black-secondary/60">
              {t("history.title")}
            </p>
            <p className="mt-1 text-sm leading-6 text-eatrivo-black-secondary">
              {t("history.description")}
            </p>
          </div>

          <ChatSessionList
            sessions={chatSessions}
            activeSessionId={activeSessionId}
            isLoading={isBootstrapping}
            isDisabled={isStreaming}
            locale={locale}
            loadingLabel={t("history.loading")}
            emptyTitle={t("history.emptyTitle")}
            emptyDescription={t("history.emptyDescription")}
            untitledLabel={t("history.untitled")}
            onSelect={handleSelectSession}
          />
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto overscroll-y-contain space-y-6 pt-4 pb-28 scrollbar-hide relative md:pb-6">
            {chatLimit?.limited && (
              <div className="absolute top-2 right-2 z-20">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm ${
                    chatLimit.remaining === 0
                      ? "bg-red-100 text-red-600 border border-red-200"
                      : (chatLimit.remaining ?? 0) <= 3
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-white text-eatrivo-purple border border-eatrivo-purple/20"
                  }`}
                >
                  {chatLimit.remaining}/{chatLimit.limit} správy
                </span>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.length === 0 && !isSessionLoading && !isBootstrapping && (
                <>
                  <div className="mb-3 px-1 md:max-w-3xl md:w-full">
                    <div className="overflow-hidden rounded-[1.1rem] border border-amber-200/70 bg-gradient-to-r from-amber-50/90 via-white to-orange-50/80 shadow-[0_8px_24px_-20px_rgba(245,158,11,0.45)]">
                      <div className="flex items-start gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3">
                        <div className="mt-0.5 rounded-xl bg-amber-100 p-1.5 text-amber-700 ring-1 ring-amber-200/80">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold tracking-tight text-[#172033] sm:text-sm">
                            {t("warning.title")}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-5 text-eatrivo-black-secondary sm:text-xs">
                            {t("warning.body")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.15 },
                      },
                    }}
                    className="flex h-full flex-col items-center justify-center space-y-8 text-center md:mt-8"
                  >
                    <motion.div
                      variants={{
                        hidden: { opacity: 0, scale: 0.8, filter: "blur(10px)" },
                        visible: {
                          opacity: 1,
                          scale: 1,
                          filter: "blur(0px)",
                          transition: {
                            type: "spring",
                            damping: 20,
                            stiffness: 100,
                          },
                        },
                      }}
                      className="relative"
                    >
                      <Image
                        src="/rivo/RIVO2-remove.png"
                        alt="Rivo Avatar"
                        className="h-24 w-24 rounded-full border-4 border-eatrivo-purple/20 p-0.5 shadow-lg"
                        width={96}
                        height={96}
                      />
                    </motion.div>

                    <motion.div
                      variants={{
                        hidden: { opacity: 0, y: 15 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                      }}
                      className="relative z-20 space-y-2"
                    >
                      <h2 className="bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                        Ahoj! Som Rivo 👋
                      </h2>
                      <p className="mx-auto max-w-[280px] text-[15px] leading-relaxed text-eatrivo-black-secondary">
                        Som tu, aby som ti pomohol s tvojím jedálničkom, kalóriami a špajzou.
                      </p>
                    </motion.div>
                  </motion.div>
                </>
              )}

              {(isBootstrapping || isSessionLoading) && messages.length === 0 ? (
                <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-eatrivo-black-secondary">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("history.loading")}
                </div>
              ) : null}

              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id ?? `${msg.role}-${i}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="mr-3 mb-1 flex h-8 w-8 shrink-0 self-end items-center justify-center rounded-xl border border-eatrivo-purple/20 bg-white shadow-[0_2px_8px_-2px_rgba(123,63,242,0.2)]">
                      <Image
                        src="/rivo/RIVO2-remove.png"
                        alt="Rivo Avatar"
                        className="h-6 w-6 rounded-full border-2 border-eatrivo-purple/20 p-0.5 shadow-md"
                        width={24}
                        height={24}
                      />
                    </div>
                  )}
                  <div className="flex max-w-[88%] flex-col gap-1.5 md:max-w-[80%]">
                    <div
                      className={`whitespace-pre-wrap px-5 py-3.5 text-[15px] leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-[24px] rounded-br-[8px] bg-gradient-to-tr from-eatrivo-purple to-eatrivo-pink text-white shadow-md shadow-eatrivo-purple/30"
                          : "rounded-[24px] rounded-bl-[8px] border border-eatrivo-purple/10 bg-white text-eatrivo-black-primary shadow-sm shadow-eatrivo-purple/5"
                      }`}
                    >
                      {msg.content ||
                        (isStreaming && i === messages.length - 1 ? (
                          <span className="inline-flex items-center gap-1">
                            <span
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"
                              style={{ animationDelay: "0ms" }}
                            ></span>
                            <span
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"
                              style={{ animationDelay: "150ms" }}
                            ></span>
                            <span
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"
                              style={{ animationDelay: "300ms" }}
                            ></span>
                          </span>
                        ) : (
                          ""
                        ))}
                    </div>
                    {msg.role === "assistant" &&
                      msg.content &&
                      i === messages.length - 1 &&
                      !isStreaming && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.4 }}
                        >
                          <FeedbackDialog>
                            <button className="group flex items-center gap-1.5 py-0.5 text-[12px] text-eatrivo-black-secondary/60 transition-colors hover:text-eatrivo-purple">
                              <MessageSquarePlus className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                              <span>Pomohla ti odpoveď?</span>
                            </button>
                          </FeedbackDialog>
                        </motion.div>
                      )}
                  </div>
                </motion.div>
              ))}

              {isStreaming &&
                (!messages.length ||
                  messages[messages.length - 1].role !== "assistant" ||
                  messages[messages.length - 1].content !== "") && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-start gap-3 pl-12 text-sm text-eatrivo-black-secondary"
                  >
                    <Image
                      src="/rivo/RIVO2-remove.png"
                      alt="Rivo Avatar"
                      className="h-6 w-6 rounded-full border-2 border-eatrivo-purple/20 p-0.5 shadow-md"
                      width={24}
                      height={24}
                    />

                    <AnimatePresence mode="wait">
                      <motion.span
                        key={loaderStepIndex}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-r from-eatrivo-purple to-purple-400 bg-clip-text font-medium text-transparent"
                      >
                        {NARRATIVE_LOADER_STEPS[loaderStepIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                )}
            </AnimatePresence>

            <div ref={bottomRef} className="h-4" />
          </div>

          <div
            className="fixed left-4 right-4 z-20 md:static md:left-auto md:right-auto md:mt-4 md:w-full"
            style={mobileComposerStyle}
          >
            <div className="bg-gradient-to-t from-eatrivo-white-primary via-eatrivo-white-primary/95 to-transparent pb-2 pt-2 md:bg-none md:pb-6">
              {chatLimit?.limited && chatLimit.remaining === 0 ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="px-4 text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      Dosiahol si denný limit {chatLimit.limit} správ
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Prejdi na Plus pre neobmedzeny chat s Rivom
                    </p>
                  </div>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-eatrivo-purple/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-eatrivo-purple/40"
                  >
                    <Crown className="h-4 w-4" />
                    Upgrade na Plus
                  </Link>
                </div>
              ) : (
                <div
                  data-tutorial-anchor="chat-composer"
                  className="relative flex items-center rounded-[2rem] border border-eatrivo-purple/10 bg-white/90 p-1.5 shadow-[0_8px_30px_rgb(123,63,242,0.12)] backdrop-blur-xl transition-all duration-300 focus-within:border-eatrivo-purple/50 focus-within:ring-2 focus-within:ring-eatrivo-purple/30"
                >
                  <input
                    ref={inputRef}
                    className="min-h-[44px] flex-1 bg-transparent px-5 py-3 text-base text-eatrivo-black-primary placeholder:text-eatrivo-black-secondary/70 focus:outline-none md:text-[15px]"
                    placeholder={t("history.inputPlaceholder")}
                    value={input}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_INPUT_CHARS) setInput(e.target.value);
                    }}
                    onFocus={() => {
                      isInputFocusedRef.current = true;
                      if (window.visualViewport) {
                        initialViewportHeight.current = Math.max(
                          window.innerHeight,
                          window.visualViewport.height + window.visualViewport.offsetTop,
                        );
                      }
                      window.setTimeout(() => {
                        scrollChatToBottom("auto");
                      }, 220);
                    }}
                    onBlur={() => {
                      isInputFocusedRef.current = false;
                      window.setTimeout(() => {
                        if (!window.visualViewport) {
                          setKeyboardOffset(0);
                          return;
                        }

                        const visibleHeight =
                          window.visualViewport.height + window.visualViewport.offsetTop;
                        const baselineHeight =
                          initialViewportHeight.current ?? Math.max(window.innerHeight, visibleHeight);
                        const nextOffset = Math.max(0, baselineHeight - visibleHeight);

                        if (nextOffset < 80) {
                          initialViewportHeight.current = Math.max(
                            window.innerHeight,
                            visibleHeight,
                          );
                          setKeyboardOffset(0);
                        }
                      }, 260);
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && sendMessage()
                    }
                    disabled={isStreaming || isBootstrapping || isSessionLoading}
                    maxLength={MAX_INPUT_CHARS}
                    enterKeyHint="send"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage()}
                    disabled={isStreaming || !input.trim() || isBootstrapping || isSessionLoading}
                    className="mr-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-eatrivo-purple to-eatrivo-pink text-white shadow-md shadow-eatrivo-purple/30 transition-all hover:shadow-lg hover:shadow-eatrivo-purple/40 disabled:opacity-50 disabled:shadow-none"
                  >
                    <Send className="ml-0.5 h-5 w-5" />
                  </motion.button>
                </div>
              )}
              <p className="mt-3 hidden text-center text-[11px] font-medium text-eatrivo-black-secondary opacity-80 md:block">
                Rivo môže robiť chyby. Odporúčame overovať dôležité informácie.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[1.75rem] border-none bg-eatrivo-white-primary p-0 shadow-2xl sm:max-w-md">
          <DialogHeader className="border-b border-eatrivo-purple/10 px-5 pb-4 pt-5 text-left">
            <DialogTitle className="text-base font-semibold text-eatrivo-black-primary">
              {t("history.title")}
            </DialogTitle>
            <p className="text-sm text-eatrivo-black-secondary">
              {t("history.description")}
            </p>
          </DialogHeader>

          <div className="flex max-h-[72dvh] min-h-[26rem] flex-col px-4 py-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-eatrivo-black-secondary/60">
                {t("history.mobileListLabel")}
              </p>
              <button
                type="button"
                onClick={handleCreateNewChat}
                disabled={isStreaming || isBootstrapping}
                className="inline-flex items-center gap-2 rounded-2xl bg-eatrivo-purple px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-eatrivo-purple/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {t("history.newChat")}
              </button>
            </div>

            <ChatSessionList
              sessions={chatSessions}
              activeSessionId={activeSessionId}
              isLoading={isBootstrapping}
              isDisabled={isStreaming}
              locale={locale}
              loadingLabel={t("history.loading")}
              emptyTitle={t("history.emptyTitle")}
              emptyDescription={t("history.emptyDescription")}
              untitledLabel={t("history.untitled")}
              onSelect={handleSelectSession}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AppShellViewport>
  );
}