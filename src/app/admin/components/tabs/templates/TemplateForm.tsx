"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import MarkdownIt from "markdown-it";
import { toast } from "sonner";
import { Sparkles, Save, X } from "lucide-react";
import { type Goal, type Diet } from "@/lib/schemas/template";
import "react-markdown-editor-lite/lib/index.css";

// Dynamic import for MdEditor to avoid SSR issues
const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

// Initialize markdown parser
const mdParser = new MarkdownIt();

interface Template {
  id: string;
  goal: Goal;
  diet: Diet;
  title: string;
  description?: string;
  markdownContent: string;
  isActive: boolean;
}

interface TemplateFormProps {
  template: Template | null;
  selectedGoal: Goal | null;
  selectedDiet: Diet | null;
  onSave: (data: unknown) => void;
  onCancel: () => void;
}

const goalLabels: Record<Goal, string> = {
  lose_weight: "Schudnúť",
  maintain_weight: "Udržať váhu",
  gain_muscle: "Nabrať svaly",
};

const dietLabels: Record<Diet, string> = {
  none: "Žiadna diéta",
  lactosefree: "Bez laktózy",
  vegetarian: "Vegetariánska",
  vegan: "Vegánska",
  pescatarian: "Pescatariánska",
  ketogenic: "Ketogénna",
  paleolithic: "Paleo",
};

export default function TemplateForm({
  template,
  selectedGoal,
  selectedDiet,
  onSave,
  onCancel,
}: TemplateFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [markdownContent, setMarkdownContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const isEditing = !!template;
  const goal = isEditing ? template.goal : selectedGoal;
  const diet = isEditing ? template.diet : selectedDiet;

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setDescription(template.description || "");
      setMarkdownContent(template.markdownContent);
      setIsActive(template.isActive);
    } else {
      // Set default title for new templates
      if (selectedGoal && selectedDiet) {
        setTitle(`${goalLabels[selectedGoal]} - ${dietLabels[selectedDiet]}`);
      }
    }
  }, [template, selectedGoal, selectedDiet]);

  const handleGenerateWithAI = async () => {
    if (!goal || !diet) {
      toast.error("Cieľ a diéta musia byť vybrané");
      console.error("Missing goal or diet:", { goal, diet });
      return;
    }

    console.log("Generating AI template for:", { goal, diet });
    setIsGenerating(true);
    try {
      const response = await fetch("/api/admin/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, diet }),
      });

      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to generate template");
      }

      const data = await response.json();
      console.log("AI Response:", data);

      if (data.markdownContent) {
        setMarkdownContent(data.markdownContent);
        toast.success("Šablóna vygenerovaná pomocou AI!");
      } else {
        console.error("No markdownContent in response:", data);
        toast.error("AI vrátilo prázdnu šablónu");
      }
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa vygenerovať šablónu",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Názov je povinný");
      return;
    }

    if (!markdownContent.trim()) {
      toast.error("Obsah je povinný");
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      markdownContent: markdownContent.trim(),
      isActive,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {isEditing ? "Upraviť šablónu" : "Nová šablóna"}
        </h2>
        {goal && diet && (
          <p className="text-sm text-gray-600">
            {goalLabels[goal]} • {dietLabels[diet]}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Názov
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eatrivo-purple focus:border-transparent"
            placeholder="Názov šablóny"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Popis (voliteľné)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eatrivo-purple focus:border-transparent resize-none"
            rows={2}
            placeholder="Krátky popis šablóny"
          />
        </div>

        {/* AI Generate Button */}
        {!isEditing && (
          <>
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "Generujem..." : "Vygenerovať pomocou AI"}
            </button>

            {/* Meal Plan Auto-Generation Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Automatická generácia:</strong> Po uložení šablóny sa
                automaticky vytvorí aj jedálny lístok na základe nákupného
                zoznamu.
              </p>
            </div>
          </>
        )}

        {/* Markdown Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Obsah (Markdown)
          </label>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <MdEditor
              value={markdownContent}
              style={{ height: "300px" }}
              renderHTML={(text) => mdParser.render(text)}
              onChange={({ text }) => setMarkdownContent(text)}
              placeholder="Sem vložte obsah nákupného zoznamu v Markdown formáte..."
            />
          </div>
          {/* Debug info */}
          <p className="text-xs text-gray-500 mt-1">
            Content length: {markdownContent.length} characters
          </p>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 text-eatrivo-purple focus:ring-eatrivo-purple border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">
            Aktívna šablóna
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-eatrivo-purple text-white rounded-lg hover:bg-eatrivo-purple/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            Uložiť
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Zrušiť
          </button>
        </div>
      </form>
    </div>
  );
}
