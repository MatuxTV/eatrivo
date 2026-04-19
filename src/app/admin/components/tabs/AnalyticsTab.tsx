"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChefHat,
  Eye,
  Flame,
  MessageCircle,
  RefreshCw,
  Users,
  Utensils,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent: string | null;
  createdAt: string;
}

interface AnalyticsData {
  generatedAt: string;
  rangeDays: number;
  summary: {
    totalUsers: number;
    pantryUsers: number;
    kitchenCounterAttempts30d: number;
    chatSessions30d: number;
    customRecipesAccepted30d: number;
  };
  comparisons: {
    pantryViews: DeltaMetric;
    kitchenCounterAttempts: DeltaMetric;
    chatSessions: DeltaMetric;
    customRecipesAccepted: DeltaMetric;
  };
  attention: {
    severity: "info" | "warning" | "critical";
    title: string;
    description: string;
  }[];
  weeklySnapshot: {
    currentWeek: WeeklySnapshotMetricSet;
    previousWeek: WeeklySnapshotMetricSet;
    highlights: {
      label: string;
      value: string;
      note: string;
    }[];
  };
  product: {
    source: string;
    pantry: {
      usersWithItems: number;
      totalItems: number;
      activeRestockRules: number;
      viewed30d: number;
      userPenetrationRate: number;
    };
    kitchenCounter: {
      viewed30d: number;
      completed30d: number;
      completedWithMissingIngredients30d: number;
      completionRate: number;
    };
    recipes: {
      opened30d: number;
    };
    customRecipes: {
      started30d: number;
      generated30d: number;
      failed30d: number;
      accepted30d: number;
      resultOpens30d: number;
      fallbackOpens30d: number;
    };
    chat: {
      totalMessages30d: number;
      totalSessions30d: number;
      uniqueUsers30d: number;
      avgMessagesPerSession: number;
      limitHits30d: number;
    };
    quality: {
      kitchenCounterMissingRate: number;
      customRecipeFailureRate: number;
      customRecipeFallbackShare: number;
      chatLimitHitRate: number;
    };
    posthog: {
      configured: boolean;
      status: "ready" | "not_configured" | "error";
      source: "posthog" | "fallback";
      message: string;
      counts: {
        pantryViewed: number;
        kitchenCounterViewed: number;
        kitchenCounterCompleted: number;
        kitchenCounterCompletedWithMissingIngredients: number;
        recipeOpened: number;
        customRecipeStarts: number;
        customRecipeGenerated: number;
        customRecipeFailures: number;
        customRecipeResultOpens: number;
        customRecipeFallbackOpens: number;
      };
    };
    coverageNotes: {
      title: string;
      source: string;
      description: string;
    }[];
  };
  trends: {
    dailyActiveUsers: {
      date: string;
      count: number;
    }[];
    dailyChatMessages: {
      date: string;
      messageCount: number;
      sessionCount: number;
      uniqueUsers: number;
    }[];
  };
  ops: {
    recentEvents: {
      id: string;
      eventType: string;
      eventName: string;
      metadata: Record<string, unknown> | null;
      createdAt: string;
      userId: string | null;
      userFullName?: string | null;
    }[];
    recentChatSessions: {
      sessionId: string;
      userProfileId: string;
      fullName: string | null;
      messageCount: number;
      firstMessage: string | null;
      startedAt: string;
    }[];
  };
}

interface DeltaMetric {
  current: number;
  previous: number;
  change: number;
  percentChange: number | null;
  direction: "up" | "down" | "flat";
}

interface WeeklySnapshotMetricSet {
  pantryViews: number;
  kitchenCounterAttempts: number;
  chatSessions: number;
  customRecipesAccepted: number;
  recipeOpens: number;
}

const eventNameTranslations: Record<string, string> = {
  pantry_viewed: "Zobrazenie špajze",
  kitchen_counter_viewed: "Zobrazenie kitchen counter",
  kitchen_counter_completed: "Dokončenie receptu v kitchen counter",
  kitchen_counter_completed_with_missing_ingredients:
    "Dokončenie receptu s chýbajúcimi ingredienciami",
  recipe_opened: "Otvorenie receptu",
  custom_recipe_generation_started: "Začiatok generovania custom receptu",
  custom_recipe_generated: "Vygenerovanie custom receptu",
  custom_recipe_generation_failed: "Zlyhanie generovania custom receptu",
  custom_recipe_result_opened: "Otvorenie custom recipe výsledku",
  custom_recipe_fallback_opened: "Otvorenie fallback receptu",
  chat_session_started: "Začiatok chatu s Rivom",
  chat_limit_reached: "Dosiahnutý limit chatu",
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatEventName(eventName: string) {
  return eventNameTranslations[eventName] ?? eventName.replace(/_/g, " ");
}

function formatMetricKey(metricKey: string) {
  const labels: Record<string, string> = {
    pantryViews: "Pantry views",
    kitchenCounterAttempts: "Kitchen counter attempts",
    chatSessions: "Chat sessions",
    customRecipesAccepted: "Custom recipes accepted",
    recipeOpens: "Recipe opens",
  };

  return labels[metricKey] ?? metricKey;
}

function formatDelta(metric: DeltaMetric) {
  if (metric.percentChange === null) {
    return metric.current > 0 ? "new activity" : "0.0% vs previous";
  }

  if (metric.percentChange === 0) {
    return "0.0% vs previous";
  }

  const prefix = metric.percentChange > 0 ? "+" : "";
  return `${prefix}${metric.percentChange}% vs previous`;
}

function getChatSessionBadge(messageCount: number) {
  if (messageCount >= 8) {
    return {
      label: "Long",
      tone: "bg-emerald-50 text-emerald-700",
    };
  }

  if (messageCount >= 4) {
    return {
      label: "Medium",
      tone: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Short",
    tone: "bg-slate-100 text-slate-600",
  };
}

function getEventMeaningNote(eventName: string) {
  const notes: Record<string, string> = {
    pantry_viewed: "Používateľ otvoril pantry a pracoval so zásobami.",
    kitchen_counter_viewed:
      "Používateľ prešiel do režimu varenia pre konkrétny recept.",
    kitchen_counter_completed:
      "Recept bol dokončený a pantry sa odpísalo bez chýbajúcich ingrediencií.",
    kitchen_counter_completed_with_missing_ingredients:
      "Používateľ dokončil recept aj napriek tomu, že časť ingrediencií chýbala.",
    recipe_opened:
      "Bol otvorený detail receptu, čo je silný signál reálneho záujmu o recept.",
    custom_recipe_generation_started:
      "Používateľ spustil generovanie vlastného receptu.",
    custom_recipe_generated:
      "Custom recipe flow úspešne doručil výsledok.",
    custom_recipe_generation_failed:
      "Generovanie custom receptu zlyhalo a treba sledovať frekvenciu týchto prípadov.",
    custom_recipe_result_opened:
      "Používateľ si otvoril výsledný custom recept.",
    custom_recipe_fallback_opened:
      "Používateľ otvoril fallback odporúčanie namiesto vygenerovaného receptu.",
    chat_session_started:
      "Začala sa nová konverzácia s Rivom.",
    chat_limit_reached:
      "Používateľ narazil na limit správ alebo usage guardrail v chate.",
  };

  return (
    notes[eventName] ??
    "Tento záznam reprezentuje jednu používateľskú alebo systémovú udalosť v produkte."
  );
}

function getChatSessionNote(messageCount: number) {
  if (messageCount >= 8) {
    return "Dlhšia konverzácia, pravdepodobne riešila konkrétny problém alebo viac krokov za sebou.";
  }

  if (messageCount >= 4) {
    return "Stredne dlhá konverzácia, vhodná na kontrolu kvality odpovedí a follow-upov.";
  }

  return "Krátka konverzácia, často ide o rýchlu otázku alebo okamžitý check-in.";
}

function StatCard({
  title,
  value,
  subtitle,
  note,
  delta,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  note: string;
  delta?: DeltaMetric;
  icon: typeof Users;
  tone: string;
}) {
  const DeltaIcon =
    delta?.direction === "up"
      ? ArrowUpRight
      : delta?.direction === "down"
        ? ArrowDownRight
        : ArrowRight;
  const deltaTone =
    delta?.direction === "up"
      ? "bg-emerald-50 text-emerald-700"
      : delta?.direction === "down"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          {delta ? (
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${deltaTone}`}
              >
                <DeltaIcon className="h-3.5 w-3.5" />
                {formatDelta(delta)}
              </span>
            </div>
          ) : null}
          <p className="mt-2 max-w-[28ch] text-xs leading-5 text-slate-500">{note}</p>
        </div>
        <div className={`rounded-xl p-3 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function AttentionCard({
  severity,
  title,
  description,
}: {
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
}) {
  const tone =
    severity === "critical"
      ? "border-rose-200 bg-rose-50"
      : severity === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-sky-200 bg-sky-50";
  const badgeTone =
    severity === "critical"
      ? "bg-rose-100 text-rose-700"
      : severity === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-sky-100 text-sky-700";

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${badgeTone}`}>
          {severity}
        </span>
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="rounded-lg bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-slate-900">{value}</span>
      </div>
    </div>
  );
}

function MiniBarChart({
  title,
  description,
  data,
  valueKey,
  color,
}: {
  title: string;
  description: string;
  data: Record<string, number | string>[];
  valueKey: string;
  color: string;
}) {
  const recent = data.slice(-14);
  const maxValue = Math.max(
    ...recent.map((item) => Number(item[valueKey] ?? 0)),
    1,
  );

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex h-44 items-end gap-2">
        {recent.map((item) => {
          const value = Number(item[valueKey] ?? 0);
          return (
            <div
              key={String(item.date)}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span className="text-[10px] font-medium text-slate-600">
                {value > 0 ? value : ""}
              </span>
              <div
                className={`w-full rounded-t-md ${color}`}
                style={{
                  height: `${(value / maxValue) * 100}%`,
                  minHeight: value > 0 ? "6px" : "0px",
                }}
              />
              <span className="text-[10px] text-muted-foreground">
                {new Date(String(item.date)).getDate()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsTab() {
  const t = useTranslations("emails.admin.dashboard.analyticsTab");
  const locale = useLocale();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [rangeDays, setRangeDays] = useState("30");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingSession, setViewingSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const fetchAnalytics = useCallback(async (selectedRangeDays: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/analytics?rangeDays=${selectedRangeDays}`,
      );
      if (!response.ok) {
        throw new Error(t("errors.fetchAnalytics"));
      }

      const result = (await response.json()) as AnalyticsData;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSessionMessages = async (sessionId: string) => {
    setViewingSession(sessionId);
    setIsLoadingMessages(true);

    try {
      const response = await fetch(`/api/admin/chat-analytics?sessionId=${sessionId}`);
      if (!response.ok) {
        throw new Error(t("errors.fetchMessages"));
      }

      const result = await response.json();
      setSessionMessages(result.messages || []);
    } catch (err) {
      console.error("Session messages error:", err);
      setSessionMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    void fetchAnalytics(rangeDays);
  }, [fetchAnalytics, rangeDays]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Button onClick={() => void fetchAnalytics(rangeDays)} variant="outline" className="mt-4">
          {t("actions.retry")}
        </Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const posthogReady = data.product.posthog.status === "ready";
  const posthogCounts = data.product.posthog.counts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_42%),linear-gradient(180deg,_#ffffff,_#f8fafc)] p-4 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {t("hero.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("hero.description", { days: data.rangeDays })}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("hero.lastUpdated", {
              date: new Date(data.generatedAt).toLocaleString(
                locale === "sk" ? "sk-SK" : "en-GB",
              ),
            })}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger className="min-w-36 bg-white">
              <SelectValue placeholder={t("filters.rangePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t("filters.last7Days")}</SelectItem>
              <SelectItem value="30">{t("filters.last30Days")}</SelectItem>
              <SelectItem value="90">{t("filters.last90Days")}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => void fetchAnalytics(rangeDays)} variant="outline" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {t("actions.refresh")}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Ako čítať tento dashboard
        </h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm font-medium text-slate-900">Overview</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Horné karty ukazujú rýchly stav adoption a používania za zvolený časový rozsah.
            </p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm font-medium text-slate-900">Product blocks</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Každá sekcia rozpisuje, čo konkrétny surface znamená a ktoré čísla sú skôr usage než business KPI.
            </p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm font-medium text-slate-900">Recent activity</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Spodné zoznamy pomáhajú vysvetliť konkrétne správanie používateľov, nie len agregované trendy.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Celkom používateľov"
          value={data.summary.totalUsers}
          subtitle={`${data.summary.pantryUsers} používateľov má pantry items`}
          note="Veľkosť základne, voči ktorej vieš porovnať adoption jednotlivých funkcií."
          icon={Users}
          tone="bg-sky-100 text-sky-700"
        />
        <StatCard
          title="Kitchen counter attempts"
          value={data.summary.kitchenCounterAttempts30d}
          subtitle={`${data.product.kitchenCounter.completed30d} clean completes, ${data.product.kitchenCounter.completedWithMissingIngredients30d} s missing ingredients`}
          note="Koľkokrát ľudia reálne prešli cez cooking flow, nie len otvorili recept."
          delta={data.comparisons.kitchenCounterAttempts}
          icon={ChefHat}
          tone="bg-amber-100 text-amber-700"
        />
        <StatCard
          title="Chat sessions"
          value={data.summary.chatSessions30d}
          subtitle={`${data.product.chat.totalMessages30d} správ, ${data.product.chat.uniqueUsers30d} unikátnych používateľov`}
          note="Ukazuje, či je Rivo pravidelne používaný a koľko ľudí sa k nemu vracia."
          delta={data.comparisons.chatSessions}
          icon={MessageCircle}
          tone="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          title="Custom recipes accepted"
          value={data.summary.customRecipesAccepted30d}
          subtitle={`${data.product.customRecipes.generated30d} generated, ${data.product.customRecipes.failed30d} failed`}
          note="Prijaté AI custom recepty sú dobrý signál, že generovaný obsah má pre ľudí hodnotu."
          delta={data.comparisons.customRecipesAccepted}
          icon={Activity}
          tone="bg-violet-100 text-violet-700"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">What needs attention</h3>
              <p className="text-sm text-muted-foreground">
                Krátky zoznam signálov, ktoré si pýtajú kontrolu alebo aspoň monitoring.
              </p>
            </div>
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.attention.map((item) => (
              <AttentionCard
                key={`${item.severity}-${item.title}`}
                severity={item.severity}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Weekly snapshot</h3>
              <p className="text-sm text-muted-foreground">
                Porovnanie tohto týždňa s predchádzajúcim týždňom pre hlavné active surfaces.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              7d vs previous 7d
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(data.weeklySnapshot.currentWeek).map(([key, value]) => {
              const previousValue =
                data.weeklySnapshot.previousWeek[
                  key as keyof WeeklySnapshotMetricSet
                ];
              const metric: DeltaMetric = {
                current: value,
                previous: previousValue,
                change: value - previousValue,
                percentChange:
                  previousValue === 0
                    ? value === 0
                      ? 0
                      : null
                    : Number((((value - previousValue) / previousValue) * 100).toFixed(1)),
                direction:
                  value === previousValue ? "flat" : value > previousValue ? "up" : "down",
              };

              return (
                <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">{formatMetricKey(key)}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Predchádzajúci týždeň: {previousValue}</p>
                  <p className="mt-2 text-xs font-medium text-slate-600">{formatDelta(metric)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            {data.weeklySnapshot.highlights.map((highlight) => (
              <div key={highlight.label} className="rounded-lg bg-slate-50 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{highlight.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{highlight.note}</p>
                  </div>
                  <span className="max-w-[13rem] rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                    {highlight.label === "Most used surface this week"
                      ? formatMetricKey(highlight.value)
                      : highlight.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Active Surface Coverage</h3>
              <p className="text-sm text-muted-foreground">Zdroj: {data.product.source.toUpperCase()}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              recipe opens {data.product.recipes.opened30d}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Pantry</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Pantry ukazuje, či si používatelia udržiavajú zásoby a vracajú sa do tejto časti produktu.
              </p>
              <div className="mt-3 space-y-3 text-sm">
                <MetricItem
                  label="Users with items"
                  value={data.product.pantry.usersWithItems}
                  note="Počet ľudí, ktorí majú v pantry aspoň jednu evidovanú položku."
                />
                <MetricItem
                  label="Items total"
                  value={data.product.pantry.totalItems}
                  note="Celkový objem pantry položiek naprieč všetkými používateľmi."
                />
                <MetricItem
                  label="Restock rules"
                  value={data.product.pantry.activeRestockRules}
                  note="Aktívne pravidlá naznačujú, že ľudia pantry používajú dlhodobejšie a nie len jednorazovo."
                />
                <MetricItem
                  label="Pantry views"
                  value={data.product.pantry.viewed30d}
                  note="Koľkokrát bola pantry otvorená v zvolenom období."
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Kitchen counter</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Kitchen counter meria používanie cooking flow a to, či sa recepty dajú dokončiť bez problémov so zásobami.
              </p>
              <div className="mt-3 space-y-3 text-sm">
                <MetricItem
                  label="Viewed"
                  value={data.product.kitchenCounter.viewed30d}
                  note="Koľkokrát ľudia otvorili cooking mode pri recepte."
                />
                <MetricItem
                  label="Completed"
                  value={data.product.kitchenCounter.completed30d}
                  note="Dokončené recepty bez hlásených chýbajúcich ingrediencií."
                />
                <MetricItem
                  label="Completed with missing"
                  value={data.product.kitchenCounter.completedWithMissingIngredients30d}
                  note="Dokončenia, kde si ľudia poradili aj bez kompletnej pantry zhody."
                />
                <MetricItem
                  label="Completion rate"
                  value={formatPercent(data.product.kitchenCounter.completionRate)}
                  note="Podiel dokončení voči samotným otvoreniam kitchen counter flow."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Chat with Rivo</h3>
              <p className="text-sm text-muted-foreground">DB-backed operational view</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
              {data.product.chat.limitHits30d} chat limit hits
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-rose-50 p-4">
              <p className="text-sm text-rose-700">Messages 30d</p>
              <p className="mt-2 text-3xl font-semibold text-rose-950">{data.product.chat.totalMessages30d}</p>
              <p className="mt-2 text-xs leading-5 text-rose-900/70">
                Objem správ ukazuje, ako intenzívne sa Rivo používa, nie len koľko ľudí ho otvorilo.
              </p>
            </div>
            <div className="rounded-xl border bg-violet-50 p-4">
              <p className="text-sm text-violet-700">Sessions 30d</p>
              <p className="mt-2 text-3xl font-semibold text-violet-950">{data.product.chat.totalSessions30d}</p>
              <p className="mt-2 text-xs leading-5 text-violet-900/70">
                Sessions sú samostatné chat návštevy, vhodné na sledovanie opakovaného používania.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-dashed p-4">
            <p className="text-sm font-medium text-slate-800">Čo tu sledujeme</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Len živý chat traffic, limit hits a session drilldown. Bez meal-plan, shopping-list a billing noise.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Product Telemetry</h3>
            <p className="text-sm text-muted-foreground">Zdroj: {data.product.source.toUpperCase()}</p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            active-only coverage
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border bg-sky-50 p-4">
            <div className="flex items-center gap-2 text-sky-700">
              <Utensils className="h-4 w-4" />
              <p className="text-sm font-medium">Pantry</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{data.product.pantry.viewed30d}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.product.pantry.usersWithItems} používateľov má aktívne pantry položky
            </p>
            <p className="mt-2 text-xs leading-5 text-sky-900/70">
              Rýchly indikátor, či sa pantry vracia do každodenného používania.
            </p>
          </div>

          <div className="rounded-xl border bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <ChefHat className="h-4 w-4" />
              <p className="text-sm font-medium">Kitchen counter</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{data.product.kitchenCounter.viewed30d}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.product.kitchenCounter.completed30d} dokončení bez missing ingredients</p>
            <p className="mt-2 text-xs leading-5 text-emerald-900/70">
              Pomáha odlíšiť otvorenie cooking flow od skutočného dokončenia receptu.
            </p>
          </div>

          <div className="rounded-xl border bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <Eye className="h-4 w-4" />
              <p className="text-sm font-medium">Recipe opens</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{data.product.recipes.opened30d}</p>
            <p className="mt-1 text-xs text-muted-foreground">explicitné otvorenia receptového detailu</p>
            <p className="mt-2 text-xs leading-5 text-amber-900/70">
              Silný signál záujmu o konkrétny recept alebo detailné inštrukcie.
            </p>
          </div>

          <div className="rounded-xl border bg-violet-50 p-4">
            <div className="flex items-center gap-2 text-violet-700">
              <MessageCircle className="h-4 w-4" />
              <p className="text-sm font-medium">Chat with Rivo</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{data.product.chat.totalSessions30d}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.product.chat.totalMessages30d} správ, avg {data.product.chat.avgMessagesPerSession} / session
            </p>
            <p className="mt-2 text-xs leading-5 text-violet-900/70">
              Kombinuje frekvenciu konverzácií aj ich hĺbku cez priemer správ na session.
            </p>
          </div>

          <div className="rounded-xl border bg-rose-50 p-4">
            <div className="flex items-center gap-2 text-rose-700">
              <Flame className="h-4 w-4" />
              <p className="text-sm font-medium">Custom recipes</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{data.product.customRecipes.accepted30d}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              starts {data.product.customRecipes.started30d}, generated {data.product.customRecipes.generated30d}
            </p>
            <p className="mt-2 text-xs leading-5 text-rose-900/70">
              Ukazuje, či AI recepty nekončia len generovaním, ale aj reálnym prijatím používateľom.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border p-4">
            <h4 className="font-medium text-slate-900">Usage</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Usage metriky ukazujú dopyt po produktoch a frekvenciu reálneho používania.
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <MetricItem
                label="Pantry views"
                value={data.product.pantry.viewed30d}
                note={`Trend: ${formatDelta(data.comparisons.pantryViews)}`}
              />
              <MetricItem
                label="Kitchen counter attempts"
                value={data.summary.kitchenCounterAttempts30d}
                note={`Trend: ${formatDelta(data.comparisons.kitchenCounterAttempts)}`}
              />
              <MetricItem
                label="Chat sessions"
                value={data.summary.chatSessions30d}
                note={`Trend: ${formatDelta(data.comparisons.chatSessions)}`}
              />
              <MetricItem
                label="Custom recipes accepted"
                value={data.summary.customRecipesAccepted30d}
                note={`Trend: ${formatDelta(data.comparisons.customRecipesAccepted)}`}
              />
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <h4 className="font-medium text-slate-900">Quality</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Quality metriky oddeľujú čisté používanie od toho, či flow doručuje dobrý výsledok.
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <MetricItem
                label="Kitchen counter missing rate"
                value={formatPercent(data.product.quality.kitchenCounterMissingRate)}
                note="Vyššie číslo znamená, že recepty sa často dokončujú bez plnej pantry zhody."
              />
              <MetricItem
                label="Custom recipe failure rate"
                value={formatPercent(data.product.quality.customRecipeFailureRate)}
                note="Priamo ukazuje, ako často sa AI recipe flow pokazí ešte pred doručením výsledku."
              />
              <MetricItem
                label="Fallback share"
                value={formatPercent(data.product.quality.customRecipeFallbackShare)}
                note="Podiel fallback opens voči všetkým openom po custom recipe flow." 
              />
              <MetricItem
                label="Chat limit hit rate"
                value={formatPercent(data.product.quality.chatLimitHitRate)}
                note="Pomáha odhaliť, či usage guardrails príliš skoro prerušujú konverzácie."
              />
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <h4 className="font-medium text-slate-900">Custom recipes</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Tento blok rozkladá AI custom recipe funnel na štart, úspech, zlyhanie a následné otvorenie výsledkov.
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <MetricItem
                label="Started / generated / failed"
                value={`${data.product.customRecipes.started30d} / ${data.product.customRecipes.generated30d} / ${data.product.customRecipes.failed30d}`}
                note="Porovnaj štarty, úspešné výsledky a chyby v jednom riadku."
              />
              <MetricItem
                label="Result opens"
                value={data.product.customRecipes.resultOpens30d}
                note="Koľkokrát si ľudia otvorili úspešne vygenerovaný recept."
              />
              <MetricItem
                label="Fallback opens"
                value={data.product.customRecipes.fallbackOpens30d}
                note="Koľkokrát sa používatelia opreli o fallback namiesto AI výsledku."
              />
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-medium text-slate-900">PostHog bridge</h4>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  posthogReady
                    ? "bg-emerald-50 text-emerald-700"
                    : data.product.posthog.status === "error"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {data.product.posthog.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{data.product.posthog.message}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricItem
                label="Surface views"
                value={`P ${posthogCounts.pantryViewed} / KC ${posthogCounts.kitchenCounterViewed} / R ${posthogCounts.recipeOpened}`}
                note="PostHog pohľad na hlavné view eventy v aktívnych surfaces."
              />
              <MetricItem
                label="Kitchen counter"
                value={`${posthogCounts.kitchenCounterCompleted} / ${posthogCounts.kitchenCounterCompletedWithMissingIngredients}`}
                note="Prvé číslo sú clean completes, druhé completes s missing ingredients."
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-dashed p-4">
            <h4 className="font-medium text-slate-900">Custom recipe funnel</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Funnel pomáha zistiť, či problém vzniká už pri štarte flowu, pri samotnom AI výsledku alebo až pri open behavior.
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <MetricItem
                label="Custom recipe starts / generated / fails"
                value={`${posthogCounts.customRecipeStarts} / ${posthogCounts.customRecipeGenerated} / ${posthogCounts.customRecipeFailures}`}
                note="Pomáha rýchlo odhaliť, či sa AI flow láme na úspešnosti generovania."
              />
            </div>
          </div>

          <div className="rounded-xl border border-dashed p-4">
            <h4 className="font-medium text-slate-900">Open behavior</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Po vygenerovaní je dôležité vedieť, či ľudia otvoria výsledok alebo radšej fallback odporúčanie.
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <MetricItem
                label="Result opens"
                value={posthogCounts.customRecipeResultOpens}
                note="Otvorenia AI výsledku sú pozitívny signál relevance výsledkov."
              />
              <MetricItem
                label="Fallback opens"
                value={posthogCounts.customRecipeFallbackOpens}
                note="Vyššie číslo môže znamenať slabší AI output alebo potrebu lepšieho fallbacku."
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border p-4">
          <h4 className="font-medium text-slate-900">Coverage notes</h4>
          <div className="mt-3 space-y-3">
            {data.product.coverageNotes.map((gap) => (
              <div key={gap.title} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{gap.title}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                    {gap.source}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{gap.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <MiniBarChart
          title="Denní aktívni používatelia"
          description="Len aktívne surface eventy bez legacy flowov."
          data={data.trends.dailyActiveUsers}
          valueKey="count"
          color="bg-gradient-to-t from-sky-600 to-sky-400"
        />
        <MiniBarChart
          title="Denné chat správy"
          description="Chat traffic za posledných 14 dní."
          data={data.trends.dailyChatMessages}
          valueKey="messageCount"
          color="bg-gradient-to-t from-violet-600 to-fuchsia-400"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="min-w-0 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Recent Event Stream</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Posledné produktové eventy. Každý riadok vysvetľuje, čo konkrétna udalosť v praxi znamená.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              posledných {data.ops.recentEvents.length}
            </span>
          </div>
          <div className="space-y-3 md:hidden">
            {data.ops.recentEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {event.userFullName || "Neznámy"}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{formatEventName(event.eventName)}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {getEventMeaningNote(event.eventName)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString("sk-SK")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] text-slate-600">
                    {event.eventType}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden max-h-[28rem] overflow-x-auto overflow-y-auto md:block">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 font-medium">Používateľ</th>
                  <th className="pb-3 font-medium">Typ</th>
                  <th className="pb-3 font-medium">Udalosť</th>
                  <th className="pb-3 font-medium">Čas</th>
                </tr>
              </thead>
              <tbody>
                {data.ops.recentEvents.map((event) => (
                  <tr key={event.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 text-slate-900">{event.userFullName || "Neznámy"}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {event.eventType}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700">
                      <p>{formatEventName(event.eventName)}</p>
                      <p className="mt-1 max-w-[28ch] text-xs leading-5 text-slate-500">
                        {getEventMeaningNote(event.eventName)}
                      </p>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString("sk-SK")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Recent Chat Sessions</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Každý záznam je jedna chat session. Poznámka pomáha rýchlo odhadnúť intenzitu a účel konverzácie.
              </p>
            </div>
            <MessageCircle className="h-4 w-4 shrink-0 text-violet-500" />
          </div>
          <div className="space-y-3">
            {data.ops.recentChatSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zatiaľ žiadne konverzácie.</p>
            ) : (
              data.ops.recentChatSessions.map((session) => (
                <div key={session.sessionId} className="min-w-0 rounded-xl border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {(() => {
                          const sessionBadge = getChatSessionBadge(session.messageCount);

                          return (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sessionBadge.tone}`}
                            >
                              {sessionBadge.label}
                            </span>
                          );
                        })()}
                        <p className="min-w-0 break-words text-sm font-medium text-slate-900 sm:truncate">
                          {session.fullName || "Neznámy"}
                        </p>
                        <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                          {session.messageCount} správ
                        </span>
                      </div>
                      <p className="mt-1 break-words text-xs text-muted-foreground sm:truncate">
                        {session.firstMessage || "Žiadna úvodná správa"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {getChatSessionNote(session.messageCount)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(session.startedAt).toLocaleString("sk-SK")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full shrink-0 text-violet-700 hover:bg-violet-50 sm:w-auto"
                      onClick={() => fetchSessionMessages(session.sessionId)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      Zobraziť
                    </Button>
                  </div>

                  {viewingSession === session.sessionId && (
                    <div className="mt-3 border-t pt-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                          Konverzácia
                        </span>
                        <button
                          onClick={() => {
                            setViewingSession(null);
                            setSessionMessages([]);
                          }}
                          className="text-slate-400 transition-colors hover:text-slate-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {isLoadingMessages ? (
                        <div className="flex justify-center py-6">
                          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : sessionMessages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Žiadne správy.</p>
                      ) : (
                        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                          {sessionMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`rounded-xl px-3 py-2 text-sm break-words ${
                                message.role === "user"
                                  ? "ml-8 bg-violet-50 text-slate-900"
                                  : "mr-8 bg-slate-100 text-slate-800"
                              }`}
                            >
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  {message.role === "user" ? "Používateľ" : "Rivo"}
                                </span>
                                {message.intent ? (
                                  <span className="max-w-full break-all rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-500">
                                    {message.intent}
                                  </span>
                                ) : null}
                                <span className="text-[10px] text-slate-400 sm:ml-auto">
                                  {new Date(message.createdAt).toLocaleTimeString("sk-SK", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-xs leading-relaxed">
                                {message.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}