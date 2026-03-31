"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Send, Sprout, Target, MessageSquarePlus, Crown } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { FeedbackDialog } from "@/components/FeedbackButton";
import Link from "next/link";
import AppShellViewport from "@/app/home/components/AppShellViewport";
import { trackClientEvent } from "@/lib/analytics-client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const NARRATIVE_LOADER_STEPS = [
  "Rivo premýšľa...",
  "Analyzujem tvoj profil...",
  "Hľadám v tvojej špajzi...",
  "Kukám na kalórie...",
  "Pripravujem odpoveď...",
];

const CHAT_STORAGE_KEY = "rivo-chat-cache";
const SESSION_ID_KEY = "rivo-chat-session";

function loadCachedMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedMessages(msgs: Message[]) {
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    // storage full - silently ignore
  }
}

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

export default function ChatWithRivoPage() {
  const t = useTranslations("home.comingSoon.chatWithRivo");
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[]>(loadCachedMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loaderStepIndex, setLoaderStepIndex] = useState(0);
  const [chatLimit, setChatLimit] = useState<ChatLimit | null>(null);

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

  const sessionId = useRef(loadSessionId() || crypto.randomUUID());
  const hasTrackedSessionStart = useRef(false);

  useEffect(() => {
    saveSessionId(sessionId.current);
  }, []);

  useEffect(() => {
    if (hasTrackedSessionStart.current) return;

    hasTrackedSessionStart.current = true;
    trackClientEvent({
      eventName: "chat_session_started",
      metadata: {
        sessionId: sessionId.current,
        locale,
        restoredMessages: messages.length,
      },
    });
  }, [locale, messages.length]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveCachedMessages(messages);
  }, [messages]);

  useEffect(() => {
    fetchChatLimit();
  }, [fetchChatLimit]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, loaderStepIndex]);

  useEffect(() => {
    if (!isStreaming) return;

    setLoaderStepIndex(0);
    const interval = setInterval(() => {
      setLoaderStepIndex((prev) => (prev + 1) % NARRATIVE_LOADER_STEPS.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const hasProcessedUrlPrompt = useRef(false);

  useEffect(() => {
    if (hasProcessedUrlPrompt.current || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const promptQuery = params.get("prompt");

    if (promptQuery) {
      hasProcessedUrlPrompt.current = true;

      setTimeout(() => {
        sendMessage(promptQuery);
      }, 100);

      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSuggestedPrompt = (promptText: string) => {
    setInput(promptText);
  };

  async function sendMessage(overrideInput?: string) {
    const textToSend = overrideInput ?? input;
    if (!textToSend.trim() || isStreaming) return;
    if (textToSend.length > MAX_INPUT_CHARS) return;
    if (chatLimit?.limited && chatLimit.remaining === 0) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          sessionId: sessionId.current,
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

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
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
            role: "assistant",
            content: "Ups, Rivo práve odpočíva... Skús to znova 😴",
          };
          return updated;
        }
        return [
          ...prev,
          {
            role: "assistant",
            content: "Ups, Rivo práve odpočíva... Skús to znova 😴",
          },
        ];
      });
    } finally {
      setIsStreaming(false);
      fetchChatLimit();
    }
  }

  return (
    <AppShellViewport className="flex h-full w-full flex-1 flex-col mx-auto bg-eatrivo-white-primary relative overflow-hidden px-4 pt-20 md:px-8 md:pt-0">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-eatrivo-purple/10 blur-[100px] rounded-full opacity-60"></div>
        <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] bg-eatrivo-pink/5 blur-[120px] rounded-full opacity-40"></div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pt-4 pb-6 scrollbar-hide relative z-10 md:max-w-4xl md:mx-auto md:w-full">
        {chatLimit?.limited && (
          <div className="absolute top-2 right-2 md:top-4 md:-right-4 z-20">
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
          {messages.length === 0 && (
            <>
              <div className="mb-3 px-1 md:max-w-3xl md:mx-auto md:w-full">
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
                className="flex flex-col items-center justify-center h-full text-center space-y-8 mt-12"
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
                    className="w-24 h-24 p-0.5 rounded-full border-4 border-eatrivo-purple/20 shadow-lg"
                    width={96}
                    height={96}
                  />
                </motion.div>

                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                  }}
                  className="space-y-2 relative z-20"
                >
                  <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink bg-clip-text text-transparent">
                    Ahoj! Som Rivo 👋
                  </h2>
                  <p className="text-eatrivo-black-secondary max-w-[280px] mx-auto text-[15px] leading-relaxed">
                    Som tu, aby som ti pomohol s tvojím jedálničkom, kalóriami a
                    špajzou.
                  </p>
                </motion.div>

                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                  }}
                  className="grid grid-cols-1 gap-3 w-full max-w-[320px] relative z-20 top-2"
                >
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSuggestedPrompt("Aké mám dnes makrá?")}
                    className="group flex items-center gap-4 p-3.5 rounded-2xl bg-white shadow-sm hover:shadow-md border border-eatrivo-purple/10 hover:border-eatrivo-purple/30 hover:shadow-eatrivo-purple/10 transition-all text-left"
                  >
                    <div className="p-2.5 bg-eatrivo-purple/10 rounded-xl shadow-sm text-eatrivo-purple group-hover:scale-110 group-hover:bg-eatrivo-purple group-hover:text-white transition-all">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="text-[15px] font-medium text-eatrivo-black-primary transition-colors">
                      Aké mám dnes makrá?
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      handleSuggestedPrompt("Daj mi recept na dnešný obed")
                    }
                    className="group flex items-center gap-4 p-3.5 rounded-2xl bg-white shadow-sm hover:shadow-md border border-eatrivo-green/10 hover:border-eatrivo-green/30 hover:shadow-eatrivo-green/10 transition-all text-left"
                  >
                    <div className="p-2.5 bg-eatrivo-green/10 rounded-xl shadow-sm text-eatrivo-green group-hover:scale-110 group-hover:bg-eatrivo-green group-hover:text-white transition-all">
                      <Sprout className="w-4 h-4" />
                    </div>
                    <span className="text-[15px] font-medium text-eatrivo-black-primary transition-colors">
                      Daj mi recept na dnešný obed
                    </span>
                  </motion.button>
                </motion.div>
              </motion.div>
            </>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.98, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center mr-3 shrink-0 self-end mb-1 border border-eatrivo-purple/20 shadow-[0_2px_8px_-2px_rgba(123,63,242,0.2)]">
                  <Image
                    src="/rivo/RIVO2-remove.png"
                    alt="Rivo Avatar"
                    className="w-6 h-6 p-0.5 rounded-full border-2 border-eatrivo-purple/20 shadow-md"
                    width={24}
                    height={24}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5 max-w-[88%] md:max-w-[80%]">
                <div
                  className={`px-5 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-gradient-to-tr from-eatrivo-purple to-eatrivo-pink text-white rounded-[24px] rounded-br-[8px] shadow-md shadow-eatrivo-purple/30"
                      : "bg-white border border-eatrivo-purple/10 rounded-[24px] rounded-bl-[8px] text-eatrivo-black-primary shadow-sm shadow-eatrivo-purple/5"
                  }`}
                >
                  {msg.content ||
                    (isStreaming && i === messages.length - 1 ? (
                      <span className="inline-flex gap-1 items-center">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></span>
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></span>
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
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
                        <button className="flex items-center gap-1.5 text-[12px] text-eatrivo-black-secondary/60 hover:text-eatrivo-purple transition-colors py-0.5 group">
                          <MessageSquarePlus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
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
                className="flex justify-start items-center gap-3 text-eatrivo-black-secondary text-sm pl-12"
              >
                <Image
                  src="/rivo/RIVO2-remove.png"
                  alt="Rivo Avatar"
                  className="w-6 h-6 p-0.5 rounded-full border-2 border-eatrivo-purple/20 shadow-md"
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
                    className="font-medium bg-gradient-to-r from-eatrivo-purple to-purple-400 bg-clip-text text-transparent"
                  >
                    {NARRATIVE_LOADER_STEPS[loaderStepIndex]}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-4" />
      </div>

      <div className="pt-2 pb-2 md:pb-6 mt-auto relative z-20 md:max-w-4xl md:mx-auto md:w-full">
        {chatLimit?.limited && chatLimit.remaining === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="text-center px-4">
              <p className="text-sm font-semibold text-gray-700">
                Dosiahol si denný limit {chatLimit.limit} správ
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Prejdi na Plus pre neobmedzeny chat s Rivom
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink text-white text-sm font-semibold rounded-full shadow-md shadow-eatrivo-purple/25 hover:shadow-lg hover:shadow-eatrivo-purple/40 hover:-translate-y-0.5 transition-all"
            >
              <Crown className="w-4 h-4" />
              Upgrade na Plus
            </Link>
          </div>
        ) : (
          <div className="relative flex items-center bg-white/90 backdrop-blur-xl p-1.5 rounded-[2rem] border border-eatrivo-purple/10 shadow-[0_8px_30px_rgb(123,63,242,0.12)] focus-within:ring-2 focus-within:ring-eatrivo-purple/30 focus-within:border-eatrivo-purple/50 transition-all duration-300">
            <input
              className="flex-1 bg-transparent px-5 py-3 min-h-[44px] text-[15px] text-eatrivo-black-primary focus:outline-none placeholder:text-eatrivo-black-secondary/70"
              placeholder="Opýtaj sa na svoj jedálniček..."
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= MAX_INPUT_CHARS) setInput(e.target.value);
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && sendMessage()
              }
              disabled={isStreaming}
              maxLength={MAX_INPUT_CHARS}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => sendMessage()}
              disabled={isStreaming || !input.trim()}
              className="h-11 w-11 shrink-0 bg-gradient-to-tr from-eatrivo-purple to-eatrivo-pink text-white rounded-full shadow-md shadow-eatrivo-purple/30 disabled:opacity-50 disabled:shadow-none hover:shadow-lg hover:shadow-eatrivo-purple/40 transition-all mr-0.5 flex items-center justify-center"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </motion.button>
          </div>
        )}
        <p className="text-center text-[11px] text-eatrivo-black-secondary mt-3 font-medium opacity-80 hidden md:block">
          Rivo môže robiť chyby. Odporúčame overovať dôležité informácie.
        </p>
      </div>
    </AppShellViewport>
  );
}