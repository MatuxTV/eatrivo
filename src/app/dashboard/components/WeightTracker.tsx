"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Scale, Plus, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTranslations, useLocale } from "next-intl";

interface WeightEntry {
  id: string;
  weight: number;
  recordedAt: string;
  note: string | null;
}

type GoalType = "lose_weight" | "maintain_weight" | "gain_muscle";

interface WeightTrackerProps {
  initialWeight?: number;
  goal?: GoalType;
  onWeightUpdate?: (weight: number) => void;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { weight: number; fullDate: string } }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
        <p className="text-sm font-semibold text-gray-900">{payload[0].payload.weight.toFixed(1)} kg</p>
        <p className="text-xs text-gray-500">{payload[0].payload.fullDate}</p>
      </div>
    );
  }
  return null;
};

export default function WeightTracker({ initialWeight, goal, onWeightUpdate }: WeightTrackerProps) {
  const t = useTranslations("dashboard.weightTracker");
  const locale = useLocale();
  const [currentWeight, setCurrentWeight] = useState<number | null>(initialWeight || null);
  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [note, setNote] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchWeightHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWeightHistory = async () => {
    try {
      const response = await fetch("/api/user/weight");
      if (!response.ok) throw new Error("Failed to fetch weight history");
      const data = await response.json();
      setCurrentWeight(data.currentWeight);
      setHistory(data.history || []);
    } catch (error) {
      console.error("Error fetching weight:", error);
      toast.error(t("errors.fetch"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const weightValue = parseFloat(newWeight);
    if (isNaN(weightValue) || weightValue < 20 || weightValue > 500) {
      toast.error(t("errors.invalid"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/user/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: weightValue,
          note: note.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to add weight");

      const data = await response.json();
      
      setCurrentWeight(data.entry.weight);
      setHistory((prev) => [data.entry, ...prev].slice(0, 30));
      onWeightUpdate?.(data.entry.weight);
      
      setNewWeight("");
      setNote("");
      setIsDialogOpen(false);
      
      toast.success(t("success.added"));
    } catch (error) {
      console.error("Error adding weight:", error);
      toast.error(t("errors.add"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWeightChange = () => {
    if (history.length < 2) return null;
    const change = history[0].weight - history[1].weight;
    return {
      value: Math.abs(change).toFixed(1),
      isGain: change > 0,
      isLoss: change < 0,
    };
  };

  // Determine if weight change is positive based on goal
  const isPositiveChange = (weightChange: { isGain: boolean; isLoss: boolean }) => {
    if (goal === "gain_muscle") {
      // For muscle gain, weight gain is positive
      return weightChange.isGain;
    } else {
      // For weight loss or maintain, weight loss is positive
      return weightChange.isLoss;
    }
  };

  const weightChange = getWeightChange();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
  };

  // Prepare chart data - reverse to show oldest first (left to right)
  const chartData = [...history]
    .slice(0, 14)
    .reverse()
    .map((entry) => ({
      date: formatDate(entry.recordedAt),
      weight: entry.weight,
      fullDate: new Date(entry.recordedAt).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      timestamp: entry.recordedAt,
    }));

  // Calculate min/max for Y axis with padding
  const weights = history.map((e) => e.weight);
  const minWeight = weights.length > 0 ? Math.floor(Math.min(...weights) - 2) : 0;
  const maxWeight = weights.length > 0 ? Math.ceil(Math.max(...weights) + 2) : 100;
  const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;



  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-16 bg-gray-200 rounded mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Scale className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900">{t("title")}</h3>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t("add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-eatrivo-white-primary">
            <DialogHeader>
              <DialogTitle>{t("addTitle")}</DialogTitle>
              <DialogDescription>
                {t("addDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="weight">{t("weightLabel")}</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="20"
                  max="500"
                  placeholder={t("weightPlaceholder")}
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="text-lg"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">{t("noteLabel")}</Label>
                <Input
                  id="note"
                  type="text"
                  placeholder={t("notePlaceholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  className="flex-1 bg-eatrivo-white-secondary border-2 border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-eatrivo-purple hover:border-eatrivo-purple/30 transition-all"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !newWeight}
                  className="flex-1 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    t("save")
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-center py-4">
        <div className="text-4xl font-bold text-gray-900">
          {currentWeight !== null ? currentWeight.toFixed(1) : ""}
          <span className="text-lg font-medium text-gray-400 ml-1">kg</span>
        </div>
        
        {weightChange && isMounted && (
          <div className={`flex items-center justify-center gap-1 mt-2 text-sm font-medium ${isPositiveChange(weightChange) ? "text-green-600" : weightChange.isGain || weightChange.isLoss ? "text-red-500" : "text-gray-500"}`}>
            {weightChange.isLoss ? (
              <TrendingDown className="w-4 h-4" />
            ) : weightChange.isGain ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            <span>
              {weightChange.isLoss ? "-" : weightChange.isGain ? "+" : ""}
              {weightChange.value} kg
            </span>
            <span className="text-gray-400 text-xs ml-1">{t("sinceLast")}</span>
          </div>
        )}
      </div>

      {/* Weight Chart */}
      {chartData.length >= 1 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            {t("chartTitle")}
          </p>
          <div className="h-40 w-full -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="timestamp"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  dy={5}
                  tickFormatter={(value) => formatDate(value)}
                />
                <YAxis
                  domain={[minWeight, maxWeight]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  tickFormatter={(value) => `${value}`}
                  width={35}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={avgWeight}
                  stroke="#E5E7EB"
                  strokeDasharray="3 3"
                  label={{
                    value: t("average"),
                    position: "right",
                    fill: "#9CA3AF",
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                  dot={{
                    fill: "#8B5CF6",
                    strokeWidth: 2,
                    stroke: "#fff",
                    r: 4,
                  }}
                  activeDot={{
                    fill: "#8B5CF6",
                    strokeWidth: 2,
                    stroke: "#fff",
                    r: 6,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent entries list */}
      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            {t("recentHistory")}
          </p>
          <div className="space-y-2">
            {history.slice(0, 5).map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${index === 0 ? "bg-eatrivo-purple/5" : "bg-gray-50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {entry.weight.toFixed(1)} kg
                  </span>
                  {entry.note && (
                    <span className="text-xs text-gray-400"> {entry.note}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {formatDate(entry.recordedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length === 0 && !currentWeight && (
        <div className="text-center py-6 text-gray-400">
          <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("noData")}</p>
          <p className="text-xs mt-1">{t("addFirst")}</p>
        </div>
      )}
    </div>
  );
}
