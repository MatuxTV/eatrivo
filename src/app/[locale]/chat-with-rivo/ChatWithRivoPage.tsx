"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sprout, Target, MessageSquarePlus } from "lucide-react";
import Image from "next/image";
import { FeedbackDialog } from "@/components/FeedbackButton";

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

// Global in-memory cache to persist chat across dashboard tab switches (clears on hard refresh)
let globalMessagesCache: Message[] = [];
let globalSessionId: string | null = null;

const MAX_INPUT_CHARS = 600;

export default function ChatWithRivoPage() {
  const [messages, setMessages] = useState<Message[]>(globalMessagesCache);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loaderStepIndex, setLoaderStepIndex] = useState(0);

  const sessionId = useRef(globalSessionId || crypto.randomUUID());
  if (!globalSessionId) {
    globalSessionId = sessionId.current;
  }

  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync state to memory cache
  useEffect(() => {
    globalMessagesCache = messages;
  }, [messages]);

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

  // Auto-send prompt from URL query parameter if present
  const hasProcessedUrlPrompt = useRef(false);

  useEffect(() => {
    if (hasProcessedUrlPrompt.current || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const promptQuery = params.get("prompt");

    if (promptQuery) {
      hasProcessedUrlPrompt.current = true;

      // Auto-send after a tiny bit to ensure initial mount is clean
      setTimeout(() => {
        sendMessage(promptQuery);
      }, 100);

      // Clean up the URL to prevent re-sending on refresh
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // Empty deps so it only runs on mount

  const handleSuggestedPrompt = (promptText: string) => {
    setInput(promptText);
    // Optional: automatically send after short delay
    // setTimeout(() => sendMessage(promptText), 300);
  };

  async function sendMessage(overrideInput?: string) {
    const textToSend = overrideInput ?? input;
    if (!textToSend.trim() || isStreaming) return;
    if (textToSend.length > MAX_INPUT_CHARS) return;

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

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      // Add a placeholder message for the assistant
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
        // Find if we already added a blank assistant placeholder
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && lastMsg.content === "") {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Ups, Rivo práve odpočíva... Skús to znova 😴",
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              role: "assistant",
              content: "Ups, Rivo práve odpočíva... Skús to znova 😴",
            },
          ];
        }
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full flex-1 w-full mx-auto px-4 md:px-8 bg-eatrivo-white-primary relative overflow-hidden pt-20 pb-16 md:pt-0 md:pb-0">
      {/* Decorative ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-eatrivo-purple/10 blur-[100px] rounded-full opacity-60"></div>
        <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] bg-eatrivo-pink/5 blur-[120px] rounded-full opacity-40"></div>
      </div>

      {/* Top Header Placeholder (Optional) */}
      <div className="flex items-center justify-between pb-4 pt-4 md:pt-6 border-b relative z-10 border-eatrivo-purple/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-eatrivo-purple/10 to-eatrivo-purple/5 flex items-center justify-center border border-eatrivo-purple/20 shadow-[0_2px_8px_-2px_rgba(123,63,242,0.15)]">
            <Image
              src="/rivo/RIVO2-remove.png"
              alt="Rivo Avatar"
              className="w-10 h-10 p-0.5 rounded-full border-2 border-eatrivo-purple/20 shadow-md"
              width={24}
              height={24}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-semibold text-eatrivo-black-primary leading-none tracking-tight">
                Rivo AI
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-eatrivo-purple/10 text-eatrivo-purple border border-eatrivo-purple/20 leading-none">
                BETA
              </span>
            </div>
            <p className="text-[13px] text-eatrivo-black-secondary font-medium">
              Tvoj nutričný asistent
            </p>
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-6 pt-4 pb-6 scrollbar-hide relative z-10 md:max-w-4xl md:mx-auto md:w-full">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
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
                    handleSuggestedPrompt("Chcem vymeniť dnešný obed")
                  }
                  className="group flex items-center gap-4 p-3.5 rounded-2xl bg-white shadow-sm hover:shadow-md border border-eatrivo-green/10 hover:border-eatrivo-green/30 hover:shadow-eatrivo-green/10 transition-all text-left"
                >
                  <div className="p-2.5 bg-eatrivo-green/10 rounded-xl shadow-sm text-eatrivo-green group-hover:scale-110 group-hover:bg-eatrivo-green group-hover:text-white transition-all">
                    <Sprout className="w-4 h-4" />
                  </div>
                  <span className="text-[15px] font-medium text-eatrivo-black-primary transition-colors">
                    Chcem vymeniť obed
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>
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

      {/* Input bar */}
      <div className="pt-2 pb-2 md:pb-6 mt-auto relative z-20 md:max-w-4xl md:mx-auto md:w-full">
        <div className="relative flex items-center bg-white/90 backdrop-blur-xl p-1.5 rounded-[2rem] border border-eatrivo-purple/10 shadow-[0_8px_30px_rgb(123,63,242,0.12)] focus-within:ring-2 focus-within:ring-eatrivo-purple/30 focus-within:border-eatrivo-purple/50 transition-all duration-300">
          <input
            className="flex-1 bg-transparent px-5 py-3 min-h-[44px] text-[15px] text-eatrivo-black-primary focus:outline-none placeholder:text-eatrivo-black-secondary/70"
            placeholder="Opýtaj sa na svoj jedálniček..."
            value={input}
            onChange={(e) => {
              if (e.target.value.length <= MAX_INPUT_CHARS) setInput(e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
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
        <p className="text-center text-[11px] text-eatrivo-black-secondary mt-3 font-medium opacity-80 hidden md:block">
          Rivo môže robiť chyby. Odporúčame overovať dôležité informácie.
        </p>
      </div>
    </div>
  );
}
