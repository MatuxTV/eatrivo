"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

interface ReceiptScanUpgradeHeroProps {
  mode?: "receipt" | "barcode";
}

export default function ReceiptScanUpgradeHero({
  mode = "receipt",
}: ReceiptScanUpgradeHeroProps) {
  const t = useTranslations("pantry");
  const titleKey =
    mode === "barcode" ? "barcode_upgrade_title" : "scan_upgrade_title";
  const descriptionKey =
    mode === "barcode"
      ? "barcode_upgrade_description"
      : "scan_upgrade_description";

  return (
    <div className="relative overflow-hidden rounded-[1.8rem] px-3 pb-1 pt-2 text-center">

      <div className="relative mx-auto mt-3 h-[280px] w-full max-w-[320px]">
        <div className="absolute inset-x-10 bottom-2 h-6 rounded-full bg-slate-200/70 blur-md" />
        <Image
          src="/rivo/RIVO7-login.png"
          alt="Rivo"
          fill
          priority
          className="object-contain"
          sizes="320px"
        />
      </div>

      <h2 className="mx-auto mt-2 max-w-[18rem] text-[1.95rem] font-black leading-[1.02] tracking-[-0.04em] text-slate-950">
        {t(titleKey)}
      </h2>
      <p className="mx-auto mt-3 max-w-[19rem] text-sm leading-6 text-slate-600">
        {t(descriptionKey)}
      </p>
    </div>
  );
}