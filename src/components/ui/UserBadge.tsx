"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface UserBadgeProps {
  type: string;
}

export function UserBadge({ type }: UserBadgeProps) {
  if (type !== "legacy") return null;

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 15,
              delay: 0.2,
            }}
            whileHover={{ scale: 1.15, rotate: 10 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center justify-center w-6 h-6 rounded-full cursor-help shadow-sm"
            style={{
              background: "linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)",
              boxShadow:
                "0 0 12px rgba(245, 158, 11, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.6)",
            }}
          >
            {/* Shimmer effect inside the badge */}
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
              <motion.div
                className="w-full h-[200%] bg-white/30 skew-x-12 -translate-y-full"
                animate={{ translateY: ["-100%", "200%"] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 4,
                  ease: "easeInOut",
                }}
              />
            </div>

            <Crown className="w-3.5 h-3.5 text-white drop-shadow-md relative z-10" />
          </motion.div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 max-w-[200px] px-3 py-2 text-xs text-white rounded-lg shadow-xl shadow-eatrivo-purple/10 bg-eatrivo-black-primary/95 backdrop-blur-md font-medium border border-white/10"
            sideOffset={5}
            side="top"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-yellow-400">Legacy Člen 👑</span>
              <span className="text-white/80 leading-snug">
                Ďakujeme, že ste s nami od úplného začiatku! O.G. EatRivo
                používateľ.
              </span>
            </div>
            <Tooltip.Arrow className="fill-eatrivo-black-primary/95" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
