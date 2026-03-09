"use client";

import { useState } from "react";
import { X, Flame, Clock, ChefHat, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// --- Dummy Data ---
const DUMMY_RECIPE = {
  title: "Proteínové smoothie so škoricovým osím hniezdom",
  prepTime: "5 min",
  macros: { calories: 162 },
  ingredients: [
    { name: "banán", amount: "1 ks" },
    { name: "vanilkový proteín", amount: "30 g" },
    { name: "škorica", amount: "1 lyžička" },
    { name: "mandľové mlieko", amount: "250 ml" },
  ],
  instructions: [
    {
      id: 1,
      text: "Vložte všetky prísady do mixéra a vymixujte dohladka.",
    },
    {
      id: 2,
      text: "Podávajte okamžite pre najlepšiu chuť a konzistenciu.",
    },
    {
      id: 3,
      text: "Môžete pridať ľad pre chladnejšie smoothie.",
    },
  ],
};

export default function KitchenCounterPage() {
  const router = useRouter();
  const [recipe] = useState(DUMMY_RECIPE);

  return (
    <div className="min-h-[100dvh] bg-[#FDFCFE] relative pb-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ─── Top Header ────────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-eatrivo-purple font-semibold">
            <div className="p-1.5 bg-eatrivo-purple/10 rounded-lg">
              <ChefHat className="w-5 h-5" />
            </div>
            <span className="text-[15px] tracking-wide font-bold">
              Kuchynský Pult
            </span>
          </div>

          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-eatrivo-purple hover:bg-eatrivo-purple/10 rounded-full w-10 h-10 p-0 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </header>

        {/* ─── Title & Meta ──────────────────────────────────────── */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a1625] leading-tight mb-5 drop-shadow-sm">
          {recipe.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-1.5 bg-white border border-eatrivo-purple/10 shadow-sm text-gray-700 px-3.5 py-1.5 rounded-full text-sm font-semibold">
            <Clock className="w-4 h-4 text-eatrivo-purple" />
            {recipe.prepTime}
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-eatrivo-purple/10 shadow-sm text-gray-700 px-3.5 py-1.5 rounded-full text-sm font-semibold">
            <Flame className="w-4 h-4 text-eatrivo-purple" />
            {recipe.macros.calories} kcal
          </div>
        </div>

        {/* ─── Ingredients ───────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_2px_15px_rgba(0,0,0,0.015)] border border-eatrivo-purple/10 mb-8">
          <h2 className="text-[1.1rem] font-bold text-[#1a1625] mb-5 font-sans">
            Suroviny
          </h2>
          <ul className="space-y-3.5">
            {recipe.ingredients.map((item, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C4A9FF] shrink-0" />
                <span className="text-[15px] font-medium text-gray-500 leading-relaxed">
                  {item.name}{" "}
                  <span className="text-gray-400">({item.amount})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ─── Instructions ──────────────────────────────────────── */}
        <section className="bg-[#F6EFFF] rounded-2xl p-6 sm:p-8 border border-white">
          <h2 className="text-[1.1rem] font-bold text-[#1a1625] mb-5 font-sans">
            Postup prípravy
          </h2>
          <div className="space-y-4">
            {recipe.instructions.map((step) => (
              <div
                key={step.id}
                className="bg-white rounded-2xl p-4 sm:p-5 flex gap-4 sm:gap-5 shadow-sm items-center transition-colors"
              >
                <div className="w-[42px] h-[42px] sm:w-[48px] sm:h-[48px] rounded-[14px] bg-[#D4BBFF] text-[#5527A1] text-lg sm:text-xl font-bold flex items-center justify-center shrink-0">
                  {step.id}
                </div>
                <p className="text-[15px] sm:text-base text-gray-500 font-medium leading-relaxed self-center">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ─── Bottom Floating Action ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-[#F8F6FC] via-[#F8F6FC]/90 to-transparent flex justify-center pb-8 pt-12 pointer-events-none">
        <div className="max-w-3xl w-full flex justify-end">
          <Button
            onClick={() => router.back()}
            className="pointer-events-auto bg-[#1a1a2e] hover:bg-[#2a2a4a] text-white text-lg font-bold py-6 px-8 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.25)] transition-all flex items-center gap-2"
          >
            Dokončiť <Check className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
