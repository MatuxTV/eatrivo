"use client";

import { FileText, CheckCircle2, TrendingUp } from "lucide-react";

interface Template {
  id: string;
  goal: string;
  diet: string;
  created_at: string;
}

interface Coverage {
  total: number;
  maxPossible: number;
  percentage: number;
}

interface TemplateSummaryCardProps {
  templates: Template[];
  coverage: Coverage | null;
  onCreateNew: () => void;
}

export default function TemplateSummaryCard({
  templates,
  coverage,
  onCreateNew,
}: TemplateSummaryCardProps) {
  // Get recent templates (last 3)
  const recentTemplates = [...templates]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 3);

  // Calculate completion percentage
  const completionPercentage = coverage?.percentage || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Pokrytie šablón
        </h2>
        <p className="text-sm text-gray-600">
          Prehľad vytvorených šablón
        </p>
      </div>

      {/* Coverage Stats */}
      <div className="space-y-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Pokrytie</span>
            <span className="text-2xl font-bold text-eatrivo-purple">
              {completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {coverage?.total || 0} z {coverage?.maxPossible || 21} kombinácií
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <FileText className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-900">{templates.length}</p>
            <p className="text-xs text-blue-700">Celkom</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-900">
              {templates.filter((t) => t).length}
            </p>
            <p className="text-xs text-green-700">Aktívne</p>
          </div>
        </div>
      </div>

      {/* Recent Templates */}
      {recentTemplates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Nedávne
          </h3>
          <div className="space-y-2">
            {recentTemplates.map((template) => (
              <div
                key={template.id}
                className="text-xs bg-gray-50 rounded-lg p-2"
              >
                <p className="font-medium text-gray-900 truncate">
                  {template.goal} • {template.diet}
                </p>
                <p className="text-gray-500 text-[10px]">
                  {new Date(template.created_at).toLocaleDateString("sk-SK")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Message */}
      <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          {completionPercentage === 100
            ? "Všetky kombináciemate pokryté! 🎉"
            : `Zostáva ${21 - (coverage?.total || 0)} kombinácií na dokončenie.`}
        </p>
      </div>

      {/* Create New Button */}
      <button
        onClick={onCreateNew}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-md hover:shadow-lg"
      >
        + Vytvoriť novú šablónu
      </button>
    </div>
  );
}
