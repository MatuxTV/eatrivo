"use client";

import { useState, useId } from "react";
import {
  MessageSquarePlus,
  X,
  Bug,
  Lightbulb,
  Zap,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function FeedbackButton() {
  const t = useTranslations("feedback");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    title: "",
    description: "",
  });

  const typeId = useId();
  const titleId = useId();
  const descriptionId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type || !formData.title || !formData.description) {
      toast.error(t("errors.fillAllFields"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      toast.success(t("success"));
      setIsOpen(false);
      setFormData({
        type: "",
        title: "",
        description: "",
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error(
        error instanceof Error ? error.message : t("errors.submitFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackTypes = [
    {
      value: "bug",
      label: t("types.bug.label"),
      icon: Bug,
      description: t("types.bug.description"),
    },
    {
      value: "feature",
      label: t("types.feature.label"),
      icon: Lightbulb,
      description: t("types.feature.description"),
    },
    {
      value: "improvement",
      label: t("types.improvement.label"),
      icon: Zap,
      description: t("types.improvement.description"),
    },
  ];

  return (
    <>
      {/* Floating Button - Fixed Bottom Right */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group flex items-center justify-center w-14 h-14 bg-white rounded-full shadow-lg border border-gray-100 hover:border-eatrivo-purple/20 hover:shadow-xl transition-[box-shadow,border-color,transform] duration-300 hover:scale-105 touch-action-manipulation"
        aria-label={t("buttonLabel")}
      >
        <MessageSquarePlus className="w-6 h-6 text-gray-500 group-hover:text-eatrivo-purple transition-colors" />
      </button>

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white max-h-[90vh] overflow-y-auto border-gray-100 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
              <span className="flex items-center justify-center p-2 bg-eatrivo-purple/10 rounded-lg">
                <MessageSquarePlus className="w-5 h-5 text-eatrivo-purple" />
              </span>
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            {/* Feedback Type */}
            <div className="space-y-2">
              <Label htmlFor={typeId} className="text-sm font-semibold">
                {t("typeLabel")} *
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger id={typeId} className="h-11">
                  <SelectValue placeholder={t("typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {feedbackTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-3 py-1">
                        <type.icon className="w-4 h-4 text-eatrivo-purple" />
                        <div className="flex flex-col">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-gray-500">
                            {type.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor={titleId} className="text-sm font-semibold">
                {t("subjectLabel")} *
              </Label>
              <Input
                id={titleId}
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder={t("subjectPlaceholder")}
                maxLength={200}
                className="h-11"
                required
              />
              <p className="text-xs text-gray-500">
                {formData.title.length}/200 {t("chars")}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor={descriptionId} className="text-sm font-semibold">
                {t("descriptionLabel")} *
              </Label>
              <Textarea
                id={descriptionId}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={t("descriptionPlaceholder")}
                maxLength={2000}
                rows={6}
                className="resize-none"
                required
              />
              <p className="text-xs text-gray-500">
                {formData.description.length}/2000 {t("chars")}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="flex-1 h-11 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-2" />
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-11 bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("sending")}
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="w-4 h-4 mr-2" />
                    {t("submit")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
