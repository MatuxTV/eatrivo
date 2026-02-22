"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { type Goal, type Diet } from "@/lib/schemas/template";
import TemplateMatrix from "./templates/TemplateMatrix";
import TemplateForm from "./templates/TemplateForm";
import TemplateSummaryCard from "./templates/TemplateSummaryCard";

interface Template {
  id: string;
  goal: Goal;
  diet: Diet;
  title: string;
  description?: string;
  markdownContent: string;
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

interface Coverage {
  total: number;
  maxPossible: number;
  percentage: number;
}

export default function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [selectedDiet, setSelectedDiet] = useState<Diet | null>(null);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");

      const data = await response.json();
      setTemplates(data.templates);
      setCoverage(data.coverage);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Nepodarilo sa načítať šablóny");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateNew = (goal: Goal, diet: Diet) => {
    setSelectedGoal(goal);
    setSelectedDiet(diet);
    setEditingTemplate(null);
    setIsCreating(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setSelectedGoal(null);
    setSelectedDiet(null);
    setIsCreating(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Naozaj chcete deaktivovať túto šablónu?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete template");

      toast.success("Šablóna bola deaktivovaná");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Nepodarilo sa deaktivovať šablónu");
    }
  };

  const handleSave = async (templateData: Partial<Template>) => {
    try {
      if (editingTemplate) {
        // Update existing template
        const response = await fetch(
          `/api/admin/templates/${editingTemplate.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(templateData),
          },
        );

        if (!response.ok) throw new Error("Failed to update template");

        toast.success("Šablóna bola aktualizovaná");
      } else {
        // Create new template
        toast.loading("Vytváram šablónu...", { id: "template-save" });

        const response = await fetch("/api/admin/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shoppingList: {
              goal: selectedGoal,
              diet: selectedDiet,
              ...templateData,
            },
            includeMealPlan: false, // Not used anymore - always auto-generates
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create template");
        }

        const result = await response.json();

        // Dismiss loading toast
        toast.dismiss("template-save");

        // Show success with meal plan info
        if (result.mealPlanTemplate) {
          toast.success("Šablóna a jedálny lístok vytvorené! 🎉");
        } else {
          toast.success(
            "Šablóna vytvorená (jedálny lístok sa nepodaril vygenerovať)",
            {
              duration: 4000,
            },
          );
        }
      }

      setIsCreating(false);
      setEditingTemplate(null);
      setSelectedGoal(null);
      setSelectedDiet(null);
      fetchTemplates();
    } catch (error: unknown) {
      toast.dismiss("template-save");
      console.error("Error saving template:", error);
      toast.error(
        error instanceof Error ? error.message : "Nepodarilo sa uložiť šablónu",
      );
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    setSelectedGoal(null);
    setSelectedDiet(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eatrivo-purple mx-auto mb-4"></div>
          <p className="text-gray-600">Načítavam šablóny...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Template Matrix/List View */}
      <div className="lg:col-span-2">
        <TemplateMatrix
          templates={templates}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
        />
      </div>

      {/* Right: Create/Edit Form or Summary */}
      <div>
        {isCreating || editingTemplate ? (
          <TemplateForm
            template={editingTemplate}
            selectedGoal={selectedGoal}
            selectedDiet={selectedDiet}
            onSave={(data) => handleSave(data as Partial<Template>)}
            onCancel={handleCancel}
          />
        ) : (
          <TemplateSummaryCard
            templates={templates}
            coverage={coverage}
            onCreateNew={() => setIsCreating(true)}
          />
        )}
      </div>
    </div>
  );
}
