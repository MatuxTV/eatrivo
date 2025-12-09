"use client";

import { useMemo } from "react";
import { Activity, Scale, Heart, TrendingUp } from "lucide-react";

interface BodyHealthCircleProps {
  weight: number; // kg
  height: number; // cm
  activityLevel: string; // sedentary, lightly_active, moderately_active, very_active, athlete
}

// Activity level multipliers for health score
const activityScores: Record<string, number> = {
  sedentary: 0.5,
  lightly_active: 0.65,
  moderately_active: 0.8,
  very_active: 0.9,
  athlete: 1.0,
};

const activityLabels: Record<string, string> = {
  sedentary: "Sedavý",
  lightly_active: "Mierne aktívny",
  moderately_active: "Stredne aktívny",
  very_active: "Veľmi aktívny",
  athlete: "Atléta",
};

// BMI categories and their health scores
function getBMICategory(bmi: number): { label: string; score: number; color: string } {
  if (bmi < 16) return { label: "Závažná podváha", score: 0.3, color: "#ef4444" };
  if (bmi < 17) return { label: "Mierna podváha", score: 0.5, color: "#f97316" };
  if (bmi < 18.5) return { label: "Podváha", score: 0.7, color: "#eab308" };
  if (bmi < 25) return { label: "Normálna váha", score: 1.0, color: "#22c55e" };
  if (bmi < 30) return { label: "Nadváha", score: 0.7, color: "#eab308" };
  if (bmi < 35) return { label: "Obezita I", score: 0.5, color: "#f97316" };
  if (bmi < 40) return { label: "Obezita II", score: 0.35, color: "#ef4444" };
  return { label: "Obezita III", score: 0.2, color: "#dc2626" };
}

function getHealthScoreColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#84cc16"; // lime
  if (score >= 40) return "#eab308"; // yellow
  if (score >= 20) return "#f97316"; // orange
  return "#ef4444"; // red
}

function getHealthScoreLabel(score: number): string {
  if (score >= 80) return "Výborné";
  if (score >= 60) return "Dobré";
  if (score >= 40) return "Priemerné";
  if (score >= 20) return "Slabé";
  return "Kritické";
}

export default function BodyHealthCircle({ weight, height, activityLevel }: BodyHealthCircleProps) {
  const healthData = useMemo(() => {
    // Calculate BMI
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    const bmiCategory = getBMICategory(bmi);

    // Get activity score
    const activityScore = activityScores[activityLevel] || 0.5;

    // Calculate overall health score (0-100)
    // BMI contributes 60%, Activity contributes 40%
    const healthScore = Math.round((bmiCategory.score * 0.6 + activityScore * 0.4) * 100);
   
    return {
      bmi: Math.round(bmi * 10) / 10,
      bmiCategory,
      activityScore: Math.round(activityScore * 100),
      activityLabel: activityLabels[activityLevel] || "Neznáma",
      healthScore,
      healthColor: getHealthScoreColor(healthScore),
      healthLabel: getHealthScoreLabel(healthScore),
    };
  }, [weight, height, activityLevel]);

  // SVG circle calculations
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (healthData.healthScore / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-eatrivo-purple/10 to-eatrivo-pink/10 rounded-lg">
          <Heart className="w-5 h-5 text-eatrivo-purple" />
        </div>
        <h3 className="font-bold text-gray-900">Zdravotné skóre</h3>
      </div>

      <div className="flex flex-col items-center">
        {/* Circular Progress */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            className="transform -rotate-90"
            width={size}
            height={size}
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={healthData.healthColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="text-4xl font-bold"
              style={{ color: healthData.healthColor }}
            >
              {healthData.healthScore}
            </span>
            <span className="text-sm font-medium text-gray-500">
              {healthData.healthLabel}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 w-full mt-6">
          {/* BMI */}
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">BMI</span>
            </div>
            <div 
              className="text-2xl font-bold"
              style={{ color: healthData.bmiCategory.color }}
            >
              {healthData.bmi}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {healthData.bmiCategory.label}
            </div>
          </div>

          {/* Activity Level */}
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aktivita</span>
            </div>
            <div className="text-2xl font-bold text-eatrivo-purple">
              {healthData.activityScore}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {healthData.activityLabel}
            </div>
          </div>
        </div>

        {/* Info footer */}
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
          <TrendingUp className="w-3 h-3" />
          <span>BMI 60% + Aktivita 40% = Skóre</span>
        </div>
      </div>
    </div>
  );
}