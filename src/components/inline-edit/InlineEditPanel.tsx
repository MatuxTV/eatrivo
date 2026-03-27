"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface InlineEditPanelProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
}

export default function InlineEditPanel({
  isOpen,
  children,
  className,
  panelClassName,
}: InlineEditPanelProps) {
  return (
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn("overflow-hidden", className)}
        >
          <div
            className={cn(
              "rounded-2xl border border-eatrivo-purple/15 bg-gradient-to-r from-white via-eatrivo-purple/[0.03] to-eatrivo-blue/[0.05] p-3 shadow-[0_10px_30px_rgba(139,92,246,0.08)]",
              panelClassName,
            )}
          >
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}