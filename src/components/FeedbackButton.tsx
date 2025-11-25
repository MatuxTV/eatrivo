"use client";

import { useState } from "react";
import { MessageSquarePlus, X, Bug, Lightbulb, Zap, Loader2 } from "lucide-react";
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

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    title: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type || !formData.title || !formData.description) {
      toast.error("Prosim vyplnte vsetky polia");
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

      toast.success("Dakujeme za vas feedback!");
      setIsOpen(false);
      setFormData({
        type: "",
        title: "",
        description: "",
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa odoslat feedback"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackTypes = [
    {
      value: "bug",
      label: "Bug / Chyba",
      icon: Bug,
      description: "Nieco nefunguje spravne",
    },
    {
      value: "feature",
      label: "Napad na vylepšenie",
      icon: Lightbulb,
      description: "Novy napad alebo funkcia",
    },
    {
      value: "improvement",
      label: "Zlepsenie",
      icon: Zap,
      description: "Vylepsenie existujucej funkcie",
    },
  ];

  return (
    <>
      {/* Floating Button - Fixed Bottom Right */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Odoslat feedback"
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Button */}
          <div className="relative flex items-center gap-2 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <MessageSquarePlus className="w-5 h-5" />
          </div>
        </div>
      </button>

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-eatrivo-light max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <MessageSquarePlus className="w-6 h-6 text-eatrivo-purple" />
              Poslite nam feedback
            </DialogTitle>
            <DialogDescription>
              Pomozte nam vylepsit Eatrivo. Nahlaste bug, navrhnite nove funkcie
              alebo zdielate svoje napady.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            {/* Feedback Type */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-semibold">
                Typ feedbacku *
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Vyberte typ..." />
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
              <Label htmlFor="title" className="text-sm font-semibold">
                Nazov *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Napr. Tlacidlo nefunguje na mobile"
                maxLength={200}
                className="h-11"
                required
              />
              <p className="text-xs text-gray-500">
                {formData.title.length}/200 znakov
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Popis *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Popiste problem alebo vas napad co najpodrobnejsie..."
                maxLength={2000}
                rows={6}
                className="resize-none"
                required
              />
              <p className="text-xs text-gray-500">
                {formData.description.length}/2000 znakov
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 h-11 bg-eatrivo-light border-1 text-eatrivo-black-primary/90"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-2" />
                Zrusit
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-11 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:from-eatrivo-purple/90 hover:to-eatrivo-pink/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Odosiela sa...
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="w-4 h-4 mr-2" />
                    Odoslat feedback
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