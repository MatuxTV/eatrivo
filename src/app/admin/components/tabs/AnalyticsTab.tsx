"use client";

import { useState, useEffect } from "react";
import { Users, Crown, Activity, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Tooltip from "@radix-ui/react-tooltip";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    premiumUsers: number;
    activeToday: number;
  };
  recentEvents: {
    id: string;
    eventType: string;
    eventName: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    userId: string | null;
    userFullName?: string | null;
  }[];
  eventsByType: {
    eventType: string;
    count: number;
  }[];
  componentInteractions: {
    id: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    userFullName: string | null;
  }[];
  recentAiInsights: {
    id: string;
    insightType: string;
    title: string;
    generatedAt: string | null;
    userFullName: string | null;
  }[];
  dailyActiveUsers: {
    date: string;
    count: number;
    activeUsers: string[] | null;
  }[];
  subscriptionStats: {
    membership: string;
    count: number;
  }[];
  featureUsage: {
    eventName: string;
    count: number;
  }[];
}

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInteraction, setExpandedInteraction] = useState<string | null>(
    null,
  );

  const eventNameTranslations: Record<string, string> = {
    login: "Prihlásenie",
    signup: "Vytvorenie používateľa",
    logout: "Odhlásenie",
    shopping_list_created: "Vytvorenie nákupného zoznamu",
    shopping_list_viewed: "Zobrazenie nákupného zoznamu",
    shopping_list_downloaded: "Stiahnutie nákupného zoznamu",
    meal_plan_generated: "Generovanie jedálnička",
    upgrade: "Upgrade predplatného",
    downgrade: "Zmena predplatného nadol",
    cancel: "Zrušenie predplatného",
    onboarding_complete: "Dokončenie onboardingu",
    push_subscribed: "Aktivácia notifikácií",
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

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
        <Button onClick={fetchAnalytics} variant="outline" className="mt-4">
          Skúsiť znova
        </Button>
      </div>
    );
  }

  if (!data) return null;

  // Calculate conversion rate
  const conversionRate =
    data.overview.totalUsers > 0
      ? ((data.overview.premiumUsers / data.overview.totalUsers) * 100).toFixed(
          1,
        )
      : "0";

  // Get max value for bar chart scaling
  const maxDailyUsers = Math.max(
    ...data.dailyActiveUsers.map((d) => d.count),
    1,
  );

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics (posledných 30 dní)</h2>
        <Button
          onClick={fetchAnalytics}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Obnoviť
        </Button>
      </div>

      {/* Top Level: Last 3 Days Login Ratio */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-center font-semibold">
          Aktivita používateľov (Posledné 3 dni)
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {data.dailyActiveUsers.slice(-3).map((day) => {
            const ratio =
              data.overview.totalUsers > 0
                ? (day.count / data.overview.totalUsers) * 100
                : 0;
            const isGood = ratio > 20;
            const strokeColor = isGood ? "#22c55e" : "#ef4444"; // green-500 : red-500
            const bgColor = isGood ? "#dcfce7" : "#fee2e2"; // green-100 : red-100

            // SVG Circle stuff
            const size = 120;
            const strokeWidth = 10;
            const center = size / 2;
            const radius = center - strokeWidth;
            const circumference = 2 * Math.PI * radius;
            // Cap at 100% for the visual arc
            const strokeDashoffset =
              circumference - (Math.min(ratio, 100) / 100) * circumference;

            return (
              <div key={day.date} className="flex flex-col items-center gap-2">
                <div className="relative" style={{ width: size, height: size }}>
                  {/* Background Circle */}
                  <svg
                    className="absolute top-0 left-0 -rotate-90 transform"
                    width={size}
                    height={size}
                  >
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="transparent"
                      stroke={bgColor}
                      strokeWidth={strokeWidth}
                    />
                    {/* Foreground Circle */}
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="transparent"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={`text-2xl font-bold ${isGood ? "text-green-600" : "text-red-500"}`}
                    >
                      {ratio.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {day.count} / {data.overview.totalUsers}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {new Date(day.date).toLocaleDateString("sk-SK", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Celkom userov</p>
              <p className="text-2xl font-bold">{data.overview.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Crown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Premium userov</p>
              <p className="text-2xl font-bold">{data.overview.premiumUsers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2.5">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aktívni dnes</p>
              <p className="text-2xl font-bold">{data.overview.activeToday}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2.5">
              <TrendingUp className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Konverzia</p>
              <p className="text-2xl font-bold">{conversionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Active Users Chart */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Denní aktívni používatelia</h3>
          <Tooltip.Provider delayDuration={100}>
            <div className="flex h-48 items-end gap-1">
              {data.dailyActiveUsers.slice(-14).map((day, i) => (
                <Tooltip.Root key={i}>
                  <Tooltip.Trigger asChild>
                    <div className="flex flex-1 flex-col items-center gap-1 cursor-help group">
                      <span className="text-[10px] font-bold text-violet-600 mb-0.5">
                        {day.count > 0 ? day.count : ""}
                      </span>
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-violet-500 to-violet-400 transition-all group-hover:from-violet-600 group-hover:to-violet-500"
                        style={{
                          height: `${(day.count / maxDailyUsers) * 100}%`,
                          minHeight: day.count > 0 ? "4px" : "0px",
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="z-50 max-w-[220px] px-3 py-2.5 text-sm text-gray-900 rounded-xl shadow-xl bg-white/95 backdrop-blur-md border border-gray-100 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
                      sideOffset={5}
                      side="top"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-2 gap-4">
                          <span className="font-semibold">
                            {new Date(day.date).toLocaleDateString("sk-SK", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span className="text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-full text-xs">
                            {day.count}{" "}
                            <Users className="inline w-3 h-3 ml-0.5" />
                          </span>
                        </div>
                        {day.activeUsers && day.activeUsers.length > 0 ? (
                          <ul className="max-h-32 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                            {day.activeUsers.map((name, idx) => (
                              <li
                                key={idx}
                                className="truncate text-xs text-gray-600 flex items-center gap-1.5"
                              >
                                <div className="w-1 h-1 rounded-full bg-green-500" />
                                {name}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-500 italic">
                            Žiadni používatelia
                          </p>
                        )}
                      </div>
                      <Tooltip.Arrow className="fill-white" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              ))}
            </div>
          </Tooltip.Provider>
        </div>

        {/* Subscription Distribution */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Rozdelenie predplatného</h3>
          <div className="space-y-3">
            {data.subscriptionStats.map((stat) => {
              const percentage = data.overview.totalUsers
                ? ((stat.count / data.overview.totalUsers) * 100).toFixed(1)
                : "0";
              const colors: Record<string, string> = {
                basic: "bg-gray-400",
                premium: "bg-amber-500",
                pro: "bg-violet-500",
                trainer: "bg-emerald-500",
              };
              return (
                <div key={stat.membership} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{stat.membership}</span>
                    <span className="text-muted-foreground">
                      {stat.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full ${colors[stat.membership] || "bg-gray-400"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feature Usage */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Rozdelenie akcií používateľov</h3>
        {data.featureUsage.length > 0 ? (
          <div className="space-y-4">
            {(() => {
              const totalEvents = data.featureUsage.reduce(
                (sum, f) => sum + Number(f.count),
                0,
              );
              return data.featureUsage.map((feature) => {
                const percentage =
                  totalEvents > 0
                    ? ((Number(feature.count) / totalEvents) * 100).toFixed(1)
                    : "0";
                return (
                  <div key={feature.eventName} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">
                        {eventNameTranslations[feature.eventName] ||
                          feature.eventName.replace(/_/g, " ")}
                      </span>
                      <span className="text-muted-foreground">
                        {feature.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            Zatiaľ žiadne dáta
          </p>
        )}
      </div>

      {/* Recent Events */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Posledné udalosti</h3>
        {data.recentEvents.length > 0 ? (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Používateľ</th>
                  <th className="pb-2 font-medium">Typ</th>
                  <th className="pb-2 font-medium">Udalosť</th>
                  <th className="pb-2 font-medium">Čas</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEvents.slice(0, 20).map((event) => (
                  <tr key={event.id} className="border-b border-gray-100">
                    <td className="py-2">
                      <span className="font-medium text-gray-900">
                        {event.userFullName || "Neznámy"}
                      </span>
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          event.eventType === "auth"
                            ? "bg-blue-100 text-blue-700"
                            : event.eventType === "feature"
                              ? "bg-green-100 text-green-700"
                              : event.eventType === "subscription"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {event.eventType}
                      </span>
                    </td>
                    <td className="py-2">
                      {eventNameTranslations[event.eventName] ||
                        event.eventName.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString("sk-SK")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            Zatiaľ žiadne udalosti
          </p>
        )}
      </div>

      {/* Component Interactions */}
      <div className="rounded-xl border bg-white p-5 shadow-sm mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold mt-1">
            Interakcie s komponentami (Prehľad)
          </h3>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            {data.componentInteractions?.length || 0} záznamov
          </span>
        </div>

        {!data.componentInteractions ||
        data.componentInteractions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 italic">
            Zatiaľ žiadne interakcie.
          </p>
        ) : (
          <div className="space-y-4">
            {(() => {
              const totalInteractions = data.componentInteractions.length;

              // Group by componentName
              const grouped = data.componentInteractions.reduce(
                (
                  acc: Record<string, typeof data.componentInteractions>,
                  curr,
                ) => {
                  const name =
                    (curr.metadata?.componentName as string) || "Neznáme";
                  if (!acc[name]) acc[name] = [];
                  acc[name].push(curr);
                  return acc;
                },
                {},
              );

              // Sort by count descending
              const sortedGroups = Object.entries(grouped).sort(
                (a, b) => b[1].length - a[1].length,
              );

              return sortedGroups.map(([componentName, events]) => {
                const percentage =
                  totalInteractions > 0
                    ? ((events.length / totalInteractions) * 100).toFixed(1)
                    : "0";

                return (
                  <div
                    key={componentName}
                    className="border rounded-lg overflow-hidden bg-white shadow-sm transition-all"
                  >
                    {/* Header - Summary */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() =>
                        setExpandedInteraction(
                          expandedInteraction === componentName
                            ? null
                            : componentName,
                        )
                      }
                    >
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-gray-900">
                            {componentName}
                          </span>
                          <span className="text-muted-foreground font-medium">
                            {events.length} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedInteraction === componentName && (
                      <div className="border-t bg-gray-50/50 p-0 text-sm animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="max-h-60 overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-100 shadow-sm text-xs text-gray-500 z-10">
                              <tr className="border-b text-left">
                                <th className="px-4 py-3 font-medium">Akcia</th>
                                <th className="px-4 py-3 font-medium">
                                  Používateľ
                                </th>
                                <th className="px-4 py-3 font-medium">
                                  Detaily
                                </th>
                                <th className="px-4 py-3 font-medium text-right">
                                  Čas
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {events.map((event) => (
                                <tr
                                  key={event.id}
                                  className="border-b border-gray-100 hover:bg-white transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                        event.metadata?.action === "click"
                                          ? "bg-blue-100 text-blue-700"
                                          : event.metadata?.action === "view"
                                            ? "bg-purple-100 text-purple-700"
                                            : event.metadata?.action ===
                                                "submit"
                                              ? "bg-green-100 text-green-700"
                                              : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {String(
                                        event.metadata?.action || "Unknown",
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-medium text-gray-700 text-xs">
                                      {event.userFullName || "Neznámy"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                                    {event.metadata &&
                                    Object.keys(event.metadata).length > 2 ? (
                                      Object.entries(event.metadata)
                                        .filter(
                                          ([key]) =>
                                            key !== "componentName" &&
                                            key !== "action",
                                        )
                                        .map(
                                          ([key, value]) => `${key}: ${value}`,
                                        )
                                        .join(", ")
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground text-right w-24">
                                    {new Date(
                                      event.createdAt,
                                    ).toLocaleTimeString("sk-SK", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* AI Insights */}
      <div className="rounded-xl border bg-white p-5 shadow-sm mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold mt-1">AI Výstupy</h3>
          <span className="rounded-full bg-eatrivo-pink/10 px-2.5 py-0.5 text-xs font-semibold text-eatrivo-pink">
            {data.recentAiInsights?.length || 0} záznamov
          </span>
        </div>

        {!data.recentAiInsights || data.recentAiInsights.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 italic">
            Zatiaľ žiadne AI výstupy.
          </p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white shadow-sm">
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Typ</th>
                  <th className="pb-2 font-medium">Názov / Detail</th>
                  <th className="pb-2 font-medium">Používateľ</th>
                  <th className="pb-2 font-medium text-right">
                    Čas Vytvorenia
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentAiInsights.map((insight) => (
                  <tr
                    key={insight.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-3">
                      <span className="rounded-md px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 uppercase tracking-wide">
                        {insight.insightType}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-gray-900">
                        {insight.title}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-gray-700 text-xs">
                        {insight.userFullName || "Neznámy"}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground text-right w-32">
                      {insight.generatedAt
                        ? new Date(insight.generatedAt).toLocaleString(
                            "sk-SK",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "Neznámy čas"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
