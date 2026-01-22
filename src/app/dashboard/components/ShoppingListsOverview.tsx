"use client";

import { useState, useMemo } from "react";
import { ShoppingBag } from "lucide-react";
import ShoppingListCard from "@/components/dashboard/ShoppingListCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface ShoppingList {
  id: string;
  title: string;
  description?: string;
  weekStartDate: string;
  weekEndDate: string;
  status: "active" | "completed" | "cancelled";
  markdownContent?: string;
  createdAt: string;
}

interface ShoppingListsOverviewProps {
  lists: ShoppingList[];
  isLoading: boolean;
}

export default function ShoppingListsOverview({
  lists,
  isLoading,
}: ShoppingListsOverviewProps) {
  const t = useTranslations("dashboard");
  const [showAll, setShowAll] = useState(false);

  // Filter lists - show only active by default
  const displayedLists = useMemo(() => {
    if (showAll) return lists;
    return lists.filter(list => list.status === "active");
  }, [lists, showAll]);

  const hasInactiveLists = lists.some(list => list.status !== "active");

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-eatrivo-purple/10 rounded-xl text-eatrivo-purple">
            <ShoppingBag className="w-5 h-5" />
          </div>
          {t("shoppingLists.title")}
        </h2>
        <div className="flex items-center gap-3">
          {!isLoading && displayedLists.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-full shadow-sm">
              {displayedLists.length}{" "}
              {displayedLists.length === 1
                ? t("shoppingLists.count.one")
                : displayedLists.length >= 2 && displayedLists.length <= 4
                ? t("shoppingLists.count.few")
                : t("shoppingLists.count.many")}
            </span>
          )}
          {!isLoading && hasInactiveLists && (
            <Button
              onClick={() => setShowAll(!showAll)}
              size="sm"
              className="text-xs font-medium bg-eatrivo-purple "
            >
              {showAll 
                ? t("shoppingLists.showActiveOnly") 
                : t("shoppingLists.showAll")}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <div className="flex justify-between">
                <Skeleton className="h-5 w-1/2 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <div className="pt-4 flex gap-3">
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <Skeleton className="h-9 flex-1 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedLists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedLists.map((list) => (
            <ShoppingListCard key={list.id} {...list} />
          ))}
        </div>
      ) : lists.length > 0 ? (
        <Card className="bg-white border-dashed border-2 border-gray-200 shadow-none rounded-3xl overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t("shoppingLists.noActive.title")}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed mb-4">
              {t("shoppingLists.noActive.description")}
            </p>
            <Button
              onClick={() => setShowAll(true)}
              size="sm"
              className="text-xs font-medium bg-eatrivo-purple "
            >
              {t("shoppingLists.showAll")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-dashed border-2 border-gray-200 shadow-none rounded-3xl overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <ShoppingBag className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t("shoppingLists.empty.title")}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              {t("shoppingLists.empty.description")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
