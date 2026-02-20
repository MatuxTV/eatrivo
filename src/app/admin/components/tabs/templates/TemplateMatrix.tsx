"use client";

import { Check, Plus, Edit2, Trash2 } from "lucide-react";
import { type Goal, type Diet } from "@/lib/schemas/template";

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

interface TemplateMatrixProps {
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  onCreateNew: (goal: Goal, diet: Diet) => void;
}

const goals: { value: Goal; label: string }[] = [
  { value: "lose_weight", label: "Schudnúť" },
  { value: "maintain_weight", label: "Udržať váhu" },
  { value: "gain_muscle", label: "Nabrať svaly" },
];

const diets: { value: Diet; label: string }[] = [
  { value: "none", label: "Žiadna" },
  { value: "lactosefree", label: "Bez laktózy" },
  { value: "vegetarian", label: "Vegetariánska" },
  { value: "vegan", label: "Vegánska" },
  { value: "pescatarian", label: "Pescatariánska" },
  { value: "ketogenic", label: "Ketogénna" },
  { value: "paleolithic", label: "Paleo" },
];

export default function TemplateMatrix({
  templates,
  onEdit,
  onDelete,
  onCreateNew,
}: TemplateMatrixProps) {
  const getTemplateForCombo = (goal: Goal, diet: Diet) => {
    return templates.find(
      (t) => t.goal === goal && t.diet === diet && t.isActive,
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Matrica šablón</h2>
        <p className="text-sm text-gray-600">
          Zelená = existuje | Červená = chýba | Klikni pre úpravu/vytvorenie
        </p>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 bg-gray-50 p-3 text-left text-sm font-medium text-gray-700 sticky left-0 z-10">
                Cieľ / Diéta
              </th>
              {diets.map((diet) => (
                <th
                  key={diet.value}
                  className="border border-gray-200 bg-gray-50 p-3 text-center text-xs font-medium text-gray-700"
                >
                  {diet.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => (
              <tr key={goal.value}>
                <td className="border border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-700 sticky left-0 z-10">
                  {goal.label}
                </td>
                {diets.map((diet) => {
                  const template = getTemplateForCombo(goal.value, diet.value);
                  const hasTemplate = !!template;

                  return (
                    <td
                      key={`${goal.value}-${diet.value}`}
                      className={`border border-gray-200 p-2 ${
                        hasTemplate
                          ? "bg-green-50 hover:bg-green-100"
                          : "bg-red-50 hover:bg-red-100"
                      } transition-colors cursor-pointer group`}
                    >
                      {hasTemplate ? (
                        <div className="flex items-center justify-center gap-1">
                          <Check className="w-4 h-4 text-green-600" />
                          <div className="hidden group-hover:flex gap-1">
                            <button
                              onClick={() => onEdit(template)}
                              className="p-1 rounded hover:bg-white transition-colors"
                              title="Upraviť"
                            >
                              <Edit2 className="w-3 h-3 text-blue-600" />
                            </button>
                            <button
                              onClick={() => onDelete(template.id)}
                              className="p-1 rounded hover:bg-white transition-colors"
                              title="Deaktivovať"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => onCreateNew(goal.value, diet.value)}
                          className="w-full flex items-center justify-center gap-1 text-gray-600 hover:text-gray-900"
                          title="Vytvoriť šablónu"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-xs hidden group-hover:inline">
                            Vytvoriť
                          </span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-gray-600">Šablóna existuje</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-gray-600">Šablóna chýba</span>
        </div>
      </div>
    </div>
  );
}
