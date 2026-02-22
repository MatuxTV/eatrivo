"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function Loading() {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ backgroundColor: "#fafafa" }}
    >
      {/* Animated gradient overlay for depth */}
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{
          background: [
            "radial-gradient(circle at 30% 40%, rgba(236,72,153,0.4) 0%, transparent 60%)",
            "radial-gradient(circle at 70% 60%, rgba(236,72,153,0.4) 0%, transparent 60%)",
            "radial-gradient(circle at 30% 40%, rgba(236,72,153,0.4) 0%, transparent 60%)",
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Soft ambient light blob */}
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        animate={{
          x: ["-20%", "20%", "-20%"],
          y: ["-10%", "15%", "-10%"],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo with glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Pulsing glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl scale-[1.8]"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1.6, 1.9, 1.6],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          <Image
            src="/logo/LOGO_ROW.png"
            alt="EatRivo"
            width={180}
            height={48}
            className="relative z-10 drop-shadow-2xl"
            priority
          />
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 160 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="h-1 bg-white/15 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              width: "200%",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
