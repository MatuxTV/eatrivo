"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Calendar, FileText, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";

// ak máš util na classNames, použi ho (ináč vynechaj a spoj reťazce ručne)
const cn = (...a: (string | false | null | undefined)[]) =>
  a.filter(Boolean).join(" ");

interface ShoppingListCardProps {
  id: string;
  title: string;
  description?: string;
  weekStartDate: string;
  weekEndDate: string;
  status: "active" | "completed" | "cancelled";
}

export default function ShoppingListCard({
  id,
  title,
  description,
  weekStartDate,
  weekEndDate,
  status,
}: ShoppingListCardProps) {
  const t = useTranslations("dashboard.shoppingList");
  const locale = useLocale();
  const [isViewing, setIsViewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const getStatusConfig = (status: ShoppingListCardProps["status"]) => {
    switch (status) {
      case "active":
        return { color: "text-green-700", bg: "bg-green-50", border: "border-green-100", label: t("status.active") };
      case "completed":
        return { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100", label: t("status.completed") };
      case "cancelled":
        return { color: "text-red-700", bg: "bg-red-50", border: "border-red-100", label: t("status.cancelled") };
      default:
        return { color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-100", label: t("status.unknown") };
    }
  };

  const statusConfig = getStatusConfig(status);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      // Open view page with download functionality
      const url = `/api/shopping-lists/${id}/view`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      logger.error("Download error", error, {
        context: "ShoppingListCard",
        metadata: { shoppingListId: id }
      });
      toast.error(t("errors.download"));
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  };

  const handleView = async () => {
    try {
      setIsViewing(true);
      // View as rendered HTML markdown
      const url = `/api/shopping-lists/${id}/view`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      logger.error("View error", error, {
        context: "ShoppingListCard",
        metadata: { shoppingListId: id }
      });
      toast.error(t("errors.view"));
    } finally {
      setIsViewing(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className="group relative overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white h-full flex flex-col">
        {/* Status Bar */}
        <div className={`h-1.5 w-full ${status === 'active' ? 'bg-eatrivo-purple' : 'bg-gray-200'}`} />

        <div className="p-5 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="secondary" 
                  className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 h-5 border", statusConfig.bg, statusConfig.color, statusConfig.border)}
                >
                  {statusConfig.label}
                </Badge>
              </div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-eatrivo-purple transition-colors">
                {title}
              </h3>
            </div>
            
            <div className="w-10 h-10 rounded-xl bg-eatrivo-purple/10 flex items-center justify-center flex-shrink-0 text-eatrivo-purple">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">
              {description}
            </p>
          )}

          {/* Meta Info */}
          <div className="space-y-2 mb-5 pt-4 border-t border-gray-50 mt-auto">
            <div className="flex items-center text-xs text-gray-500 font-medium">
              <Calendar className="w-3.5 h-3.5 mr-2 text-gray-400" />
              {formatDate(weekStartDate)} - {formatDate(weekEndDate)}
            </div>
            <div className="flex items-center text-xs text-gray-500 font-medium">
              <FileText className="w-3.5 h-3.5 mr-2 text-gray-400" />
              {t("pdfDocument")}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="sm"
              onClick={handleView}
              disabled={isViewing}
              className="w-full bg-eatrivo-white-secondary border-2 border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-eatrivo-purple hover:border-eatrivo-purple/30 transition-all"
            >
              <Eye className="w-4 h-4 mr-2" />
              {t("view")}
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white shadow-sm hover:shadow transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              {t("download")}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
