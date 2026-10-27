"use client";

import { Check, Package } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ShoppingListItem } from "@/hooks/useShoppingList";

interface MoveToPantrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkedItems: ShoppingListItem[];
  remainingCount: number;
  isMoving: boolean;
  onUncheck: (itemId: string) => void;
  onConfirm: () => void;
  localizeAmount: (item: ShoppingListItem) => string | null;
}

export default function MoveToPantrySheet({
  open,
  onOpenChange,
  checkedItems,
  remainingCount,
  isMoving,
  onUncheck,
  onConfirm,
  localizeAmount,
}: MoveToPantrySheetProps) {
  const t = useTranslations("home.basic.shoppingList");
  const count = checkedItems.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="font-brand top-auto bottom-0 left-0 max-h-[92dvh] max-w-full translate-x-0 translate-y-0 gap-0 overflow-y-auto overscroll-contain rounded-b-none rounded-t-[28px] border-0 bg-white p-0 shadow-[0_-8px_40px_rgba(17,24,39,0.18)] data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[28px] sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95"
      >
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-gray-200" />
        </div>

        <div className="space-y-3.5 px-4 pt-3.5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] sm:pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-[#EAF8EF] text-green-700">
              <Package className="h-[22px] w-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900">{t("sheetTitle")}</DialogTitle>
              <DialogDescription className="text-[13px] font-medium leading-[18px] text-gray-500">
                {t("sheetDescription", { count })}
              </DialogDescription>
            </div>
          </div>

          <ul className="overflow-hidden rounded-[18px] border border-[#ECE8F5] bg-white">
            {checkedItems.map((item, index) => {
              const amount = item.quantity ? localizeAmount(item) : null;
              return (
                <li
                  key={item.id ?? item.name}
                  className={`flex items-center gap-3 px-3.5 py-2 ${index > 0 ? "border-t border-gray-100" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => item.id && onUncheck(item.id)}
                    aria-label={t("uncheckItemLabel", { name: item.name })}
                    className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                  >
                    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-eatrivo-green">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </span>
                  </button>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-gray-900">
                    {item.name}
                  </span>
                  {amount ? (
                    <span className="shrink-0 rounded-full bg-[#F3EEFE] px-2.5 py-1 text-xs font-bold text-eatrivo-purple">
                      {amount}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {remainingCount > 0 ? (
            <p className="rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-medium text-gray-500">
              {t("sheetRemaining", { count: remainingCount })}
            </p>
          ) : null}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-12 rounded-[14px] border border-gray-200 bg-white px-[18px] text-[15px] font-bold text-gray-500 transition-colors hover:bg-gray-50"
            >
              {t("addCancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isMoving || count === 0}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-eatrivo-green px-[18px] text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(34,197,94,0.3)] transition-opacity disabled:opacity-60"
            >
              <Package className="h-[18px] w-[18px]" />
              {t("sheetSubmit", { count })}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
