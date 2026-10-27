"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Package, Pencil, Plus, ShoppingBasket } from "lucide-react";
import { useTranslations } from "next-intl";
import type { useShoppingList } from "@/hooks/useShoppingList";
import AddItemComposer from "./shopping-list/AddItemComposer";
import MoveToPantrySheet from "./shopping-list/MoveToPantrySheet";
import ShoppingCategoryCard from "./shopping-list/ShoppingCategoryCard";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type ShoppingListHook = ReturnType<typeof useShoppingList>;

interface ShoppingListSectionProps {
  shopping: ShoppingListHook;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ShoppingListSection({ shopping }: ShoppingListSectionProps) {
  const t = useTranslations("home");
  const [isPantrySheetOpen, setIsPantrySheetOpen] = useState(false);

  const {
    shoppingListItems,
    currentShoppingList,
    isMovingToPantry,
    isEditingTitle,
    editTitleValue,
    setEditTitleValue,
    titleInputRef,
    totalChecked,
    checkedItems,
    visibleFrequentItems,
    shoppingListItemsByCategory,
    shoppingListCategories,
    toggleCheckItem,
    handleStartEditTitle,
    cancelEditTitle,
    handleSaveTitle,
    handleMoveCheckedToPantry,
    handleAddCustomItem,
    getShoppingCategoryLabel,
    localizeAmount,
  } = shopping;

  const totalItems = shoppingListItems.length;
  const progressPercent = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  return (
    <motion.div
      data-tutorial-anchor="home-shopping-section"
      key="home-shopping-list"
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.985 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="font-brand mb-8 space-y-5"
    >
      {/* Title */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onBlur={() => { void handleSaveTitle(); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSaveTitle();
                if (e.key === "Escape") cancelEditTitle();
              }}
              className="min-w-0 flex-1 rounded-lg border border-eatrivo-purple/30 bg-eatrivo-purple/5 px-3 py-1 text-2xl font-bold text-gray-900 outline-none transition-all focus:border-eatrivo-purple focus:ring-2 focus:ring-eatrivo-purple/20"
              maxLength={200}
            />
          ) : (
            <div className="group flex min-w-0 items-center gap-1.5">
              <h2
                className="truncate text-2xl font-bold text-gray-900"
                onClick={currentShoppingList?.id ? handleStartEditTitle : undefined}
                role={currentShoppingList?.id ? "button" : undefined}
                tabIndex={currentShoppingList?.id ? 0 : undefined}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && currentShoppingList?.id) {
                    e.preventDefault();
                    handleStartEditTitle();
                  }
                }}
              >
                {currentShoppingList?.title || t("greeting.actions.shoppingList")}
              </h2>
              {currentShoppingList?.id ? (
                <button
                  type="button"
                  onClick={handleStartEditTitle}
                  className="shrink-0 rounded-md p-1 opacity-0 transition-opacity hover:bg-gray-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 group-hover:opacity-100"
                  aria-label={t("basic.shoppingList.editTitleLabel")}
                >
                  <Pencil className="h-4 w-4 text-gray-400" />
                </button>
              ) : null}
            </div>
          )}
          <span className="shrink-0 rounded-full bg-[#F3EEFE] px-2.5 py-1 text-xs font-bold text-eatrivo-purple">
            {totalItems} {t("basic.shoppingList.itemsCount")}
          </span>
        </div>
        <p className="text-[13px] font-medium leading-[18px] text-gray-500">
          {t("basic.shoppingList.description")}
        </p>
      </div>

      {/* Progress */}
      {totalItems > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px] font-bold">
            <span className="text-gray-500">
              {t("basic.shoppingList.progressLabel", { checked: totalChecked, total: totalItems })}
            </span>
            <span className="text-green-700">{progressPercent} %</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <motion.div
              className="h-full rounded-full bg-eatrivo-green"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
      ) : null}

      {/* Move checked items to pantry */}
      <AnimatePresence initial={false}>
        {totalChecked > 0 && currentShoppingList?.id ? (
          <motion.div
            key="pantry-bar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-[20px] border border-green-200 bg-[#EAF8EF] py-2.5 pr-2.5 pl-4">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-gray-900">
                  {t("basic.shoppingList.inCart", { count: totalChecked })}
                </p>
                <p className="truncate text-xs font-medium text-gray-500">
                  {t("basic.shoppingList.moveHint")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPantrySheetOpen(true)}
                disabled={isMovingToPantry}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-eatrivo-green px-3.5 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(34,197,94,0.3)] transition-transform active:scale-[0.97] disabled:opacity-60"
              >
                <Package className="h-[18px] w-[18px]" />
                {t("basic.shoppingList.moveButton", { count: totalChecked })}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Add own item */}
      <AddItemComposer
        onAdd={handleAddCustomItem}
        getCategoryLabel={getShoppingCategoryLabel}
      />

      {/* Frequently bought */}
      {visibleFrequentItems.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500">
            <History className="h-3.5 w-3.5 text-eatrivo-purple" />
            {t("basic.shoppingList.frequentTitle")}
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleFrequentItems.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  handleAddCustomItem({
                    name: item.name,
                    quantity: null,
                    unit: null,
                    category: item.category,
                  });
                }}
                aria-label={t("basic.shoppingList.frequentAddLabel", { name: item.name })}
                className="flex items-center gap-1.5 rounded-full border border-[#E4DAFB] bg-white py-1.5 pr-3 pl-2.5 text-[13px] font-semibold text-gray-900 transition-[background-color,transform] hover:bg-[#F3EEFE] active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 text-eatrivo-purple" strokeWidth={2.5} />
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Items by category */}
      {totalItems > 0 ? (
        <div className="space-y-4">
          {shoppingListCategories.map((category) => (
            <ShoppingCategoryCard
              key={category}
              category={category}
              items={shoppingListItemsByCategory[category] ?? []}
              shopping={shopping}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2.5 rounded-[20px] border border-[#ECE8F5] bg-white px-6 py-7 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#F3EEFE] text-eatrivo-purple">
            <ShoppingBasket className="h-7 w-7" />
          </div>
          <p className="text-[17px] font-bold text-gray-900">{t("basic.shoppingList.emptyTitle")}</p>
          <p className="text-[13px] font-medium leading-[18px] text-gray-500">
            {t("basic.shoppingList.emptyDescription")}
          </p>
        </div>
      )}

      <MoveToPantrySheet
        open={isPantrySheetOpen}
        onOpenChange={setIsPantrySheetOpen}
        checkedItems={checkedItems}
        remainingCount={totalItems - checkedItems.length}
        isMoving={isMovingToPantry}
        onUncheck={(itemId) => {
          toggleCheckItem(itemId);
          if (checkedItems.length <= 1) setIsPantrySheetOpen(false);
        }}
        onConfirm={() => {
          void handleMoveCheckedToPantry().then((moved) => {
            if (moved) setIsPantrySheetOpen(false);
          });
        }}
        localizeAmount={localizeAmount}
      />
    </motion.div>
  );
}
